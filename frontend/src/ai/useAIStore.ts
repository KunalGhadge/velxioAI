/**
 * VelxioAI Studio — Central AI Agent State & Execution Store (Zustand)
 *
 * Coordinates real-time context collection, multi-model streaming,
 * discrete tool execution (files, circuit synthesis, libraries,
 * simulation runner, serial monitor), and instant 1-click rollback.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLMClient } from './LLMClient';
import { AIContextCollector } from './AIContextCollector';
import { AgentToolEngine } from './AgentToolEngine';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { useEditorStore } from '../store/useEditorStore';
import type {
  AIMessage,
  AISettings,
  CircuitProposal,
  CodeProposal,
  HardwareLearningCardData,
  HardwareBOMData,
  ActionStep,
} from './types';

interface WorkspaceSnapshot {
  components: any[];
  wires: any[];
  files: any[];
  activeBoard: string;
}

interface AIStoreState {
  settings: AISettings;
  messages: AIMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingReasoning: string;
  streamingSteps: ActionStep[];
  dockOpen: boolean;
  dockWidth: number;
  selectedTemplateId: string | null;
  checkpointSnapshot: WorkspaceSnapshot | null;
  repairAttempts: number;
  settingsModalOpen: boolean;

  // Actions
  setDockOpen: (open: boolean) => void;
  toggleDock: (open?: boolean) => void;
  setDockWidth: (width: number) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  updateSettings: (partial: Partial<AISettings>) => void;
  setApiKey: (provider: any, key: string) => void;
  sendMessage: (promptText: string, options?: { isAutoRepair?: boolean }) => Promise<void>;
  clearMessages: () => void;
  applyCircuitProposal: (proposal: CircuitProposal) => void;
  applyCodeProposal: (proposal: CodeProposal) => void;
  rollbackCheckpoint: () => void;
  compileProject: () => Promise<void>;
  startSimulation: () => void;
  stopSimulation: () => void;
  beautifyCircuit: () => void;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKeys: {},
  selectedModel: 'gemini-2.5-flash',
  temperature: 0.2,
  autoHealEnabled: true,
  explainMode: false,
};

/**
 * Extracts raw C++/Python firmware code from markdown blocks
 */
function extractFirmwareCode(text: string): string | null {
  if (!text) return null;

  const cppMatch = text.match(/```(?:cpp|c|arduino|ino)\s*([\s\S]*?)\s*```/i);
  if (cppMatch && cppMatch[1].trim().length > 20) {
    return cppMatch[1].trim();
  }

  const pyMatch = text.match(/```(?:python|py|micropython)\s*([\s\S]*?)\s*```/i);
  if (pyMatch && pyMatch[1].trim().length > 20) {
    return pyMatch[1].trim();
  }

  const genericMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (genericMatch && genericMatch[1].trim().length > 30) {
    const code = genericMatch[1].trim();
    if (
      code.includes('void setup()') ||
      code.includes('void loop()') ||
      code.includes('#include') ||
      code.includes('pinMode(') ||
      code.includes('digitalWrite(') ||
      code.includes('import machine') ||
      code.includes('from machine import')
    ) {
      return code;
    }
  }

  return null;
}

/**
 * Resilient Action & JSON parser that handles markdown fences, raw JSON,
 * Python triple quotes ("""), and unescaped newlines.
 */
export function extractVelxioAction(text: string): { cleanContent: string; actionData: any } {
  if (!text) return { cleanContent: text, actionData: null };

  let rawActionStr = '';
  let cleanContent = text;

  // 1. Try matching with markdown fences ```velxio-action ... ``` or ```json ... ```
  const fenceMatch = text.match(/```(?:velxio-action|json)?\s*([\s\S]*?)\s*```/i);
  if (
    fenceMatch &&
    (fenceMatch[1].includes('"circuit"') ||
      fenceMatch[1].includes('"code"') ||
      fenceMatch[1].includes('"boardKind"') ||
      fenceMatch[1].includes('"steps"'))
  ) {
    rawActionStr = fenceMatch[1];
    cleanContent = text.replace(fenceMatch[0], '').trim();
  } else {
    // 2. Try matching raw JSON block without backticks if it has action keys
    const rawMatch = text.match(/(?:velxio-action\s*)?(\{[\s\S]*"(?:circuit|code|boardKind|steps)"[\s\S]*\})/i);
    if (rawMatch) {
      rawActionStr = rawMatch[1];
      cleanContent = text.replace(rawMatch[0], '').replace(/^velxio-action\s*/i, '').trim();
    }
  }

  if (!rawActionStr) {
    return { cleanContent: text, actionData: null };
  }

  // Pre-process rawActionStr to repair invalid JSON patterns commonly produced by LLMs:
  // a) Replace Python-style triple quotes """ ... """ with standard JSON string
  let sanitized = rawActionStr.replace(/"""([\s\S]*?)"""/g, (_, code) => {
    return JSON.stringify(code.trim());
  });

  // b) Strip trailing commas before } or ]
  sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');

  let parsed: any = null;
  try {
    parsed = JSON.parse(sanitized);
  } catch (e1) {
    try {
      // Fix unquoted keys
      const repaired = sanitized.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      parsed = JSON.parse(repaired);
    } catch (e2) {
      // Direct regex fallback
      parsed = {};
      const boardMatch = sanitized.match(/"boardKind"\s*:\s*"([^"]+)"/);
      if (boardMatch) parsed.boardKind = boardMatch[1];

      const reasoningMatch = sanitized.match(/"reasoning"\s*:\s*"([^"]+)"/);
      if (reasoningMatch) parsed.reasoning = reasoningMatch[1];

      const codeMatch = sanitized.match(/"proposedContent"\s*:\s*(?:"""|"|`)([\s\S]*?)(?:"""|"|`)(?=\s*,\s*"\w+"|\s*})/);
      if (codeMatch) {
        parsed.code = {
          fileName: 'sketch.ino',
          proposedContent: codeMatch[1].trim(),
          summary: 'Firmware Code',
        };
      }

      const compMatches = [...sanitized.matchAll(/\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"/g)];
      if (compMatches.length > 0) {
        parsed.circuit = {
          title: 'Synthesized Circuit',
          componentsToAdd: compMatches.map((m) => ({ id: m[1], type: m[2] })),
          wiresToAdd: [],
        };
      }
    }
  }

  return {
    cleanContent: cleanContent || parsed?.reasoning || 'Executed requested actions.',
    actionData: parsed,
  };
}

export const useAIStore = create<AIStoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      messages: [],
      isStreaming: false,
      streamingContent: '',
      streamingReasoning: '',
      streamingSteps: [],
      dockOpen: false,
      dockWidth: 420,
      selectedTemplateId: null,
      checkpointSnapshot: null,
      repairAttempts: 0,
      settingsModalOpen: false,

      setDockOpen: (open) => set({ dockOpen: open }),
      toggleDock: (open?: boolean) => set((s) => ({ dockOpen: open !== undefined ? open : !s.dockOpen })),
      setDockWidth: (width) => set({ dockWidth: Math.max(320, Math.min(800, width)) }),
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
            apiKeys: { ...(state.settings?.apiKeys || {}), [provider]: key.trim() },
          },
        }));
      },

      clearMessages: () => set({ messages: [] }),

      sendMessage: async (promptText: string, options?: { isAutoRepair?: boolean }) => {
        const state = get();
        if (state.isStreaming || !promptText.trim()) return;

        // Auto-heal bounded attempt guard (max 3 attempts)
        const isAutoRepair = Boolean(options?.isAutoRepair || promptText.includes('COMPILATION ERROR DETECTED'));
        if (isAutoRepair) {
          if (state.repairAttempts >= 3) {
            const maxAttemptsMsg: AIMessage = {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `⚠️ **Auto-Repair Halted**: Maximum automated repair attempts (3) reached for this error. Please inspect the compiler output and modify the code manually.`,
              timestamp: Date.now(),
            };
            set((s) => ({ messages: [...s.messages, maxAttemptsMsg] }));
            return;
          }
          set((s) => ({ repairAttempts: s.repairAttempts + 1 }));
        } else {
          // Reset repair counter on manual user prompt
          set({ repairAttempts: 0 });
        }

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

        set((s) => ({
          messages: [...s.messages, userMsg],
          isStreaming: true,
          streamingContent: '',
          streamingReasoning: '',
          streamingSteps: [],
          checkpointSnapshot: checkpoint,
        }));

        try {
          // 2. Gather Real-Time Context
          const snapshot = AIContextCollector.captureSnapshot();
          const systemPrompt = AIContextCollector.buildSystemPrompt(snapshot, state.settings);

          let fullText = '';
          let reasoningText = '';

          const chatHistory = [...state.messages, userMsg].map((m) => ({
            role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant' | 'system',
            content: m.content,
          }));

          await LLMClient.streamMessage(
            systemPrompt,
            chatHistory,
            state.settings,
            {
              onToken: (token) => {
                fullText += token;
                set({ streamingContent: fullText });
              },
              onReasoning: (reasoning) => {
                reasoningText += reasoning;
                set({ streamingReasoning: reasoningText });
              },
              onComplete: () => {
                // 3. Resilient Action Extraction
                const { cleanContent, actionData } = extractVelxioAction(fullText);

                let steps: ActionStep[] = [];
                let circuitProposal: CircuitProposal | undefined;
                let codeProposal: CodeProposal | undefined;
                let learningCard: HardwareLearningCardData | undefined;
                let bomData: HardwareBOMData | undefined;

                if (actionData) {
                  if (actionData.steps && Array.isArray(actionData.steps)) {
                    steps = actionData.steps.map((st: any, i: number) => ({
                      id: st.id || String(i + 1),
                      title: st.title || 'Execute Step',
                      status: st.status || 'completed',
                    }));
                  }

                  // Board switch
                  if (actionData.boardKind) {
                    AgentToolEngine.setBoard(actionData.boardKind);
                  }

                  // Circuit Synthesis
                  if (
                    actionData.circuit &&
                    ((actionData.circuit.componentsToAdd && actionData.circuit.componentsToAdd.length > 0) ||
                      (actionData.circuit.wiresToAdd && actionData.circuit.wiresToAdd.length > 0))
                  ) {
                    circuitProposal = {
                      id: `circuit-${Date.now()}`,
                      title: actionData.circuit.title || 'Circuit Modification',
                      description: actionData.circuit.description || '',
                      boardKind: actionData.boardKind || actionData.circuit.boardKind,
                      componentsToAdd: actionData.circuit.componentsToAdd || [],
                      componentsToRemove: actionData.circuit.componentsToRemove || [],
                      wiresToAdd: actionData.circuit.wiresToAdd || [],
                      wiresToRemove: actionData.circuit.wiresToRemove || [],
                      applied: false,
                    };
                  }

                  // Code Synthesis
                  if (actionData.code && actionData.code.proposedContent && actionData.code.proposedContent.trim().length > 0) {
                    const freshEditorState = useEditorStore.getState();
                    const activeFile = freshEditorState.files.find((f) => f.name === actionData.code.fileName) || freshEditorState.files[0];
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

                  // Learning Card (if requested)
                  if (
                    (state.settings.explainMode || promptText.toLowerCase().includes('learn') || promptText.toLowerCase().includes('explain')) &&
                    actionData.learningCard &&
                    actionData.learningCard.title &&
                    actionData.learningCard.summary
                  ) {
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

                // Execute Agent Actions deterministically
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
                  content: `❌ **Error**: ${error.message || 'Failed to communicate with AI model.'}`,
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
        AgentToolEngine.applyCircuit(proposal);
        proposal.applied = true;
        set((s) => ({ messages: [...s.messages] }));
      },

      applyCodeProposal: (proposal) => {
        AgentToolEngine.writeFile(proposal.fileName || 'sketch.ino', proposal.proposedContent);

        // Auto-detect and install required Arduino libraries
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
          AgentToolEngine.installLibraries(requiredLibs);
        }

        proposal.applied = true;
        set((s) => ({ messages: [...s.messages] }));
      },

      compileProject: async () => {
        await AgentToolEngine.compileProject();
      },

      startSimulation: () => {
        AgentToolEngine.startSimulation();
      },

      stopSimulation: () => {
        AgentToolEngine.stopSimulation();
      },

      beautifyCircuit: () => {
        AgentToolEngine.beautifyCircuit();
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
