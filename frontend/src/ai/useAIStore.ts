/**
 * VelxioAI Studio — AI Agent Zustand Store
 *
 * Manages chat history, streaming state, BYOK settings, active circuit
 * proposals, code diffs, hardware learning cards, and 1-click workspace rollback.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AIMessage,
  AISettings,
  AIProviderId,
  CircuitProposal,
  CodeProposal,
  HardwareLearningCardData,
  HardwareBOMData,
  ActionStep,
} from './types';
import { AIContextCollector } from './AIContextCollector';
import { LLMClient } from './LLMClient';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { useEditorStore } from '../store/useEditorStore';
import { CircuitSynthesizer } from './CircuitSynthesizer';
import { ComponentRegistry } from '../services/ComponentRegistry';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKeys: {},
  selectedModel: 'gemini-2.0-flash',
  temperature: 0.2,
  autoHealEnabled: true,
  explainMode: true,
};

interface AIState {
  messages: AIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingReasoning: string;
  streamingSteps: ActionStep[];
  dockOpen: boolean;
  dockWidth: number;
  settingsModalOpen: boolean;
  settings: AISettings;
  checkpointSnapshot: any | null;

  // Actions
  toggleDock: (open?: boolean) => void;
  setDockWidth: (width: number) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  updateSettings: (partial: Partial<AISettings>) => void;
  setApiKey: (provider: AIProviderId, key: string) => void;
  clearMessages: () => void;

  // Send message & execute actions
  sendMessage: (content: string) => Promise<void>;
  applyCircuitProposal: (proposal: CircuitProposal) => void;
  applyCodeProposal: (proposal: CodeProposal) => void;
  rollbackCheckpoint: () => void;
}

/**
 * Fault-tolerant JSON parser for LLM action outputs.
 * Handles unescaped newlines, trailing commas, single quotes, unclosed brackets, etc.
 */
function safeParseActionJson(rawStr: string): any {
  if (!rawStr || !rawStr.trim()) return null;

  let str = rawStr.trim();
  str = str.replace(/^```(?:json|velxio-action)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Attempt 1: Direct parse
  try {
    return JSON.parse(str);
  } catch {}

  // Attempt 2: Strip trailing commas
  try {
    const noTrailing = str.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(noTrailing);
  } catch {}

  // Attempt 3: Precise char-by-char string literal newline & tab escaping
  try {
    let inString = false;
    let escaped = false;
    let result = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"' && !escaped) {
        inString = !inString;
        result += char;
      } else if (inString) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          // ignore CR
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
      } else {
        result += char;
      }
      escaped = char === '\\' && !escaped;
    }

    result = result.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(result);
  } catch {}

  // Attempt 4: Auto-close brackets/braces
  try {
    let fixed = str.replace(/,(\s*[}\]])/g, '$1');
    fixed = fixed.replace(/"((?:\\.|[^"\\])*)"/g, (_, p1) => {
      return '"' + p1.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t') + '"';
    });

    let openBraces = (fixed.match(/{/g) || []).length;
    let closeBraces = (fixed.match(/}/g) || []).length;
    while (closeBraces < openBraces) {
      fixed += '}';
      closeBraces++;
    }
    let openBrackets = (fixed.match(/\[/g) || []).length;
    let closeBrackets = (fixed.match(/\]/g) || []).length;
    while (closeBrackets < openBrackets) {
      fixed += ']';
      closeBrackets++;
    }

    return JSON.parse(fixed);
  } catch {}

  // Attempt 5: Fallback regex extraction
  const result: any = {};
  try {
    const codeMatch = str.match(/"proposedContent"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*\}|"$)/);
    if (codeMatch) {
      result.code = {
        proposedContent: codeMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"'),
        fileName: 'sketch.ino',
        summary: 'Updated firmware code',
      };
    }
  } catch {}

  return Object.keys(result).length > 0 ? result : null;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: `👋 **Welcome to VelxioAI Studio!**\n\nI am your **Embedded Hardware & Firmware Co-Pilot**.\n\nYou can ask me to design circuits from scratch, write pin-accurate microcontroller code, diagnose compilation or SPICE errors, or explain electronic concepts.\n\n⚡ **Try asking:**\n- *"Build an ultrasonic distance alarm with an HC-SR04 and buzzer"* \n- *"Create a night-light using an LDR sensor and LED"* \n- *"Optimize my code to use non-blocking millis() instead of delay()"*\n- *"Explain how pull-up resistors work"*\n\n*(Click ⚙️ in the top-right to configure your Gemini, Groq, or Claude API key)*`,
          timestamp: Date.now(),
        },
      ],
      isStreaming: false,
      streamingContent: '',
      streamingReasoning: '',
      streamingSteps: [],
      dockOpen: false,
      dockWidth: 380,
      settingsModalOpen: false,
      settings: DEFAULT_SETTINGS,
      checkpointSnapshot: null,

      toggleDock: (open) => {
        set((state) => ({
          dockOpen: open !== undefined ? open : !state.dockOpen,
        }));
      },

      setDockWidth: (width) => {
        const clamped = Math.max(280, Math.min(750, width));
        set({ dockWidth: clamped });
      },

      openSettingsModal: () => set({ settingsModalOpen: true }),
      closeSettingsModal: () => set({ settingsModalOpen: false }),

      updateSettings: (partial) => {
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }));
      },

      setApiKey: (provider, key) => {
        set((state) => ({
          settings: {
            ...state.settings,
            apiKeys: { ...state.settings.apiKeys, [provider]: key.trim() },
          },
        }));
      },

      clearMessages: () => set({ messages: [] }),

      sendMessage: async (promptText: string) => {
        const state = get();
        if (state.isStreaming || !promptText.trim()) return;

        // 1. Stash Workspace Snapshot for 1-Click Rollback
        const simState = useSimulatorStore.getState();
        const editorState = useEditorStore.getState();
        const checkpoint = {
          components: JSON.parse(JSON.stringify(simState.components || [])),
          wires: JSON.parse(JSON.stringify(simState.wires || [])),
          files: JSON.parse(JSON.stringify(editorState.files || [])),
          activeBoard: simState.boards[0]?.kind || 'uno',
        };

        const userMsg: AIMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: promptText.trim(),
          timestamp: Date.now(),
        };

        const updatedMessages = [...state.messages, userMsg];

        set({
          messages: updatedMessages,
          isStreaming: true,
          streamingContent: '',
          streamingReasoning: '',
          streamingSteps: [],
          checkpointSnapshot: checkpoint,
        });

        try {
          // 2. Gather Real-Time Context
          const snapshot = AIContextCollector.captureSnapshot();
          const systemPrompt = AIContextCollector.buildSystemPrompt(snapshot, state.settings);

          const chatPayload = updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          let accumulatedText = '';
          let accumulatedReasoning = '';

          await LLMClient.streamMessage(
            systemPrompt,
            chatPayload,
            state.settings,
            {
              onToken: (chunk) => {
                accumulatedText += chunk;
                set({ streamingContent: accumulatedText });
              },
              onReasoning: (chunk) => {
                accumulatedReasoning += chunk;
                set({ streamingReasoning: accumulatedReasoning });
              },
              onComplete: (fullText, fullReasoning) => {
                // 3. Parse Action Blocks (```velxio-action ... ```)
                let cleanContent = fullText;
                let circuitProposal: CircuitProposal | undefined;
                let codeProposal: CodeProposal | undefined;
                let learningCard: HardwareLearningCardData | undefined;
                let bomData: HardwareBOMData | undefined;
                let steps: ActionStep[] | undefined;
                let reasoningText = fullReasoning;

                const actionMatch = fullText.match(/```velxio-action\s*([\s\S]*?)\s*```/);
                if (actionMatch) {
                  cleanContent = fullText.replace(actionMatch[0], '').trim();
                  const actionData = safeParseActionJson(actionMatch[1]);
                  if (actionData) {
                    if (actionData.reasoning && !reasoningText) {
                      reasoningText = actionData.reasoning;
                    }
                    if (actionData.steps) steps = actionData.steps;

                    if (
                      actionData.circuit &&
                      ((actionData.circuit.componentsToAdd && actionData.circuit.componentsToAdd.length > 0) ||
                        (actionData.circuit.wiresToAdd && actionData.circuit.wiresToAdd.length > 0))
                    ) {
                      circuitProposal = {
                        id: `circuit-${Date.now()}`,
                        title: actionData.circuit.title || 'Circuit Modification',
                        description: actionData.circuit.description || '',
                        componentsToAdd: actionData.circuit.componentsToAdd || [],
                        componentsToRemove: actionData.circuit.componentsToRemove || [],
                        wiresToAdd: actionData.circuit.wiresToAdd || [],
                        wiresToRemove: actionData.circuit.wiresToRemove || [],
                        applied: false,
                      };
                    }

                    if (actionData.code && actionData.code.proposedContent && actionData.code.proposedContent.trim().length > 0) {
                      const activeFile = editorState.files.find((f) => f.name === actionData.code.fileName) || editorState.files[0];
                      codeProposal = {
                        id: `code-${Date.now()}`,
                        fileId: activeFile?.id || 'sketch.ino',
                        fileName: actionData.code.fileName || 'sketch.ino',
                        originalContent: activeFile?.content || '',
                        proposedContent: actionData.code.proposedContent || '',
                        summary: actionData.code.summary || 'Updated firmware code',
                        applied: false,
                      };
                    }

                    if (actionData.learningCard && actionData.learningCard.title && actionData.learningCard.summary) {
                      learningCard = {
                        id: `learn-${Date.now()}`,
                        ...actionData.learningCard,
                      };
                    }

                    if (actionData.bom && actionData.bom.items && actionData.bom.items.length > 0) {
                      bomData = {
                        id: `bom-${Date.now()}`,
                        ...actionData.bom,
                      };
                    }
                  }
                }

                // Fallback: If no codeProposal extracted yet, check for markdown code blocks
                if (!codeProposal) {
                  const codeFenceMatch = fullText.match(/```(?:cpp|c|arduino|ino|python|py)\s*([\s\S]*?)\s*```/i);
                  if (codeFenceMatch && codeFenceMatch[1].trim().length > 30) {
                    const activeFile =
                      editorState.files.find((f) => f.name.endsWith('.ino') || f.name.endsWith('.py')) ||
                      editorState.files[0];
                    codeProposal = {
                      id: `code-${Date.now()}`,
                      fileId: activeFile?.id || 'sketch.ino',
                      fileName: activeFile?.name || 'sketch.ino',
                      originalContent: activeFile?.content || '',
                      proposedContent: codeFenceMatch[1].trim(),
                      summary: 'Generated Firmware Code',
                      applied: false,
                    };
                  }
                }

                // Fallback: If no circuitProposal extracted yet, synthesize hardware components & wiring from text
                if (!circuitProposal && !cleanContent.toLowerCase().startsWith('hi') && !cleanContent.toLowerCase().startsWith('hello')) {
                  const synth = CircuitSynthesizer.synthesizeFromText(fullText, simState.boards[0]?.boardKind || 'arduino-uno');
                  if (synth) {
                    circuitProposal = synth;
                  }
                }

                // Auto-apply circuit and code proposals autonomously (Cursor IDE mode)
                if (circuitProposal) {
                  get().applyCircuitProposal(circuitProposal);
                }
                if (codeProposal) {
                  get().applyCodeProposal(codeProposal);
                }

                const assistantMsg: AIMessage = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: cleanContent,
                  reasoning: reasoningText,
                  steps,
                  circuitProposal,
                  codeProposal,
                  learningCard,
                  bomData,
                  timestamp: Date.now(),
                };

                set((s) => ({
                  messages: [...s.messages, assistantMsg],
                  isStreaming: false,
                  streamingContent: '',
                  streamingReasoning: '',
                  streamingSteps: [],
                }));
              },
              onError: (error) => {
                const errorMsg: AIMessage = {
                  id: `error-${Date.now()}`,
                  role: 'assistant',
                  content: `❌ **Error**: ${error.message}`,
                  error: error.message,
                  timestamp: Date.now(),
                };

                set((s) => ({
                  messages: [...s.messages, errorMsg],
                  isStreaming: false,
                  streamingContent: '',
                  streamingReasoning: '',
                  streamingSteps: [],
                }));
              },
            }
          );
        } catch (err: any) {
          const errorMsg: AIMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `❌ **Error**: ${err.message || 'Failed to connect to AI provider'}`,
            error: err.message || 'Connection error',
            timestamp: Date.now(),
          };

          set((s) => ({
            messages: [...s.messages, errorMsg],
            isStreaming: false,
            streamingContent: '',
            streamingReasoning: '',
            streamingSteps: [],
          }));
        }
      },

      applyCircuitProposal: (proposal) => {
        const simStore = useSimulatorStore.getState();
        const registry = ComponentRegistry.getInstance();
        const board = simStore.boards.find((b) => b.id === simStore.activeBoardId) || simStore.boards[0];
        const boardId = board?.id || 'arduino-uno';

        // Helper to check if an ID or type refers to the active MCU board
        const isBoardRef = (partName: string) => {
          if (!partName) return false;
          const p = partName.toLowerCase().replace(/[-_]/g, '');
          const bKind = (board?.boardKind || '').toLowerCase().replace(/[-_]/g, '');
          return (
            p === 'board' ||
            p === 'arduino' ||
            p === 'arduinouno' ||
            p === 'mcu' ||
            p === 'uno' ||
            p === 'esp32' ||
            p === 'pico' ||
            p === bKind ||
            p.includes('arduino') ||
            p.includes('board') ||
            p.includes('uno')
          );
        };

        const partIdMap: Record<string, string> = {
          board: boardId,
          arduino: boardId,
          uno: boardId,
          'arduino-uno': boardId,
        };

        // 1. Add Components with normalized metadata IDs
        if (proposal.componentsToAdd && proposal.componentsToAdd.length > 0) {
          proposal.componentsToAdd.forEach((comp, idx) => {
            if (isBoardRef(comp.id) || isBoardRef(comp.type)) {
              if (comp.id) partIdMap[comp.id] = boardId;
              if (comp.type) partIdMap[comp.type] = boardId;
              return;
            }

            const rawType = (comp.type || 'led').replace(/^(wokwi|velxio)-/, '').toLowerCase();
            const meta = registry.getById(rawType) || registry.getById('led');
            const canonicalMetadataId = meta ? meta.id : rawType;

            const safeId = comp.id || `${canonicalMetadataId.replace(/-/g, '_')}_${Date.now()}_${idx}`;
            partIdMap[comp.id || ''] = safeId;
            partIdMap[rawType] = safeId;

            simStore.recordAddComponent({
              id: safeId,
              metadataId: canonicalMetadataId,
              x: comp.left || (280 + (idx % 3) * 140),
              y: comp.top || (120 + Math.floor(idx / 3) * 120),
              properties: { ...(comp.attrs || {}) },
            });
          });
        }

        // 2. Add Wires with resolved component IDs
        if (proposal.wiresToAdd && proposal.wiresToAdd.length > 0) {
          for (const w of proposal.wiresToAdd) {
            const fromId = isBoardRef(w.fromPart) ? boardId : (partIdMap[w.fromPart] || w.fromPart);
            const toId = isBoardRef(w.toPart) ? boardId : (partIdMap[w.toPart] || w.toPart);

            simStore.recordAddWire({
              id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              start: { componentId: fromId, pinName: w.fromPin, x: 0, y: 0 },
              end: { componentId: toId, pinName: w.toPin, x: 0, y: 0 },
              waypoints: [],
              color: w.color || '#2563eb',
            });
          }
        }

        // 3. Request recalculation of wire positions
        setTimeout(() => {
          simStore.recalculateAllWirePositions?.();
        }, 150);

        proposal.applied = true;
        set((s) => ({ messages: [...s.messages] }));
      },

      applyCodeProposal: (proposal) => {
        const editorStore = useEditorStore.getState();
        const targetFile =
          editorStore.files.find((f) => f.name === proposal.fileName) ||
          editorStore.files.find((f) => f.name.endsWith('.ino') || f.name.endsWith('.py') || f.name.endsWith('.cpp')) ||
          editorStore.files[0];

        if (targetFile) {
          editorStore.setFileContent(targetFile.id, proposal.proposedContent);
        } else {
          editorStore.createFile(proposal.fileName || 'sketch.ino', proposal.proposedContent);
        }

        // Auto-detect and add required Arduino libraries to libraries.txt
        const requiredLibs: string[] = [];
        if (
          proposal.proposedContent.includes('LiquidCrystal.h') ||
          proposal.proposedContent.includes('LiquidCrystal_I2C.h')
        ) {
          requiredLibs.push('LiquidCrystal');
        }
        if (proposal.proposedContent.includes('DHT.h')) {
          requiredLibs.push('DHT sensor library');
        }
        if (proposal.proposedContent.includes('Adafruit_SSD1306.h')) {
          requiredLibs.push('Adafruit SSD1306', 'Adafruit GFX Library');
        }
        if (proposal.proposedContent.includes('Servo.h')) {
          requiredLibs.push('Servo');
        }
        if (proposal.proposedContent.includes('Adafruit_NeoPixel.h')) {
          requiredLibs.push('Adafruit NeoPixel');
        }

        if (requiredLibs.length > 0) {
          const libFile = editorStore.files.find((f) => f.name === 'libraries.txt');
          if (libFile) {
            const existing = libFile.content.split('\n').map((l) => l.trim());
            const toAdd = requiredLibs.filter((lib) => !existing.includes(lib));
            if (toAdd.length > 0) {
              editorStore.setFileContent(libFile.id, `${libFile.content.trim()}\n${toAdd.join('\n')}\n`);
            }
          } else {
            editorStore.createFile(
              'libraries.txt',
              `# Libraries automatically installed by VelxioAI\n${requiredLibs.join('\n')}\n`
            );
          }
        }

        proposal.applied = true;
        set((s) => ({ messages: [...s.messages] }));
      },

      rollbackCheckpoint: () => {
        const state = get();
        if (!state.checkpointSnapshot) return;

        const { components, wires, files } = state.checkpointSnapshot;
        useSimulatorStore.setState({ components, wires });
        useEditorStore.setState({ files });

        set({ checkpointSnapshot: null });
      },
    }),
    {
      name: 'velxio_ai_store',
      partialize: (state) => ({
        settings: state.settings,
        dockWidth: state.dockWidth,
        messages: state.messages.slice(-50),
      }),
    }
  )
);
