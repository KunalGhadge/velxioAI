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
                  try {
                    const actionData = JSON.parse(actionMatch[1]);
                    if (actionData.reasoning && !reasoningText) {
                      reasoningText = actionData.reasoning;
                    }
                    if (actionData.steps) steps = actionData.steps;

                    if (actionData.circuit) {
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

                    if (actionData.code) {
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

                    if (actionData.learningCard) {
                      learningCard = {
                        id: `learn-${Date.now()}`,
                        ...actionData.learningCard,
                      };
                    }

                    if (actionData.bom) {
                      bomData = {
                        id: `bom-${Date.now()}`,
                        ...actionData.bom,
                      };
                    }
                  } catch (e) {
                    console.error('Failed to parse velxio-action block:', e);
                  }
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

        // 1. Add Components
        if (proposal.componentsToAdd) {
          for (const comp of proposal.componentsToAdd) {
            const metadataId = comp.type.replace(/^wokwi-/, '');
            const safeId = comp.id || `${metadataId.replace(/-/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            
            simStore.recordAddComponent({
              id: safeId,
              metadataId: metadataId,
              x: comp.left || 300,
              y: comp.top || 200,
              properties: { ...(comp.attrs || {}) },
            });
          }
        }

        // 2. Add Wires
        if (proposal.wiresToAdd) {
          const board = simStore.boards[0];
          const boardId = board?.id || 'uno';

          for (const w of proposal.wiresToAdd) {
            const fromId =
              w.fromPart === 'board' || w.fromPart === 'arduino' || w.fromPart === 'mcu' || w.fromPart === board?.boardKind
                ? boardId
                : w.fromPart;
            const toId =
              w.toPart === 'board' || w.toPart === 'arduino' || w.toPart === 'mcu' || w.toPart === board?.boardKind
                ? boardId
                : w.toPart;

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
        }, 100);

        proposal.applied = true;
        set((s) => ({ messages: [...s.messages] }));
      },

      applyCodeProposal: (proposal) => {
        const editorStore = useEditorStore.getState();
        const targetFile = editorStore.files.find((f) => f.name === proposal.fileName) || editorStore.files[0];

        if (targetFile) {
          editorStore.setFileContent(targetFile.id, proposal.proposedContent);
        } else {
          editorStore.createFile(proposal.fileName, proposal.proposedContent);
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
