/**
 * VelxioAI Studio — Core Type Definitions
 *
 * Exhaustive type system for multi-model BYOK, live hardware context,
 * action checklists, circuit proposals, code diffs, hardware learning cards,
 * BOM generation, and electrical pin conflict watchdogs.
 */

import type { BoardKind } from '../types/board';
import type { CircuitWarning } from '../simulation/verify/circuitVerifier';

export type AIProviderId = 'gemini' | 'groq' | 'claude' | 'openai' | 'ollama';

export interface ModelOption {
  id: string;
  name: string;
  provider: AIProviderId;
  description: string;
  contextWindow?: string;
  isRecommended?: boolean;
}

export interface AISettings {
  provider: AIProviderId;
  apiKeys: Partial<Record<AIProviderId, string>>;
  selectedModel: string;
  customEndpoint?: string;
  temperature: number;
  autoHealEnabled: boolean;
  explainMode: boolean; // whether to attach interactive hardware learning cards
}

export interface CircuitComponentSpec {
  id: string;
  type: string; // e.g. 'wokwi-led', 'wokwi-resistor', 'wokwi-dht22'
  left: number;
  top: number;
  rotate?: number;
  attrs?: Record<string, any>;
}

export interface CircuitWireSpec {
  fromPart: string; // component or board ID, e.g. 'uno' or 'led1'
  fromPin: string;  // pin name, e.g. '13', 'A', 'VCC', 'GND'
  toPart: string;
  toPin: string;
  color?: string;
}

export interface CircuitProposal {
  id: string;
  title: string;
  description: string;
  boardKind?: BoardKind;
  componentsToAdd: CircuitComponentSpec[];
  componentsToRemove?: string[]; // IDs to remove
  wiresToAdd: CircuitWireSpec[];
  wiresToRemove?: string[]; // IDs of wires to remove
  applied?: boolean;
}

export interface CodeProposal {
  id: string;
  fileId: string;
  fileName: string;
  originalContent: string;
  proposedContent: string;
  summary: string;
  applied?: boolean;
}

export interface HardwareLearningCardData {
  id: string;
  title: string;
  concept: string; // e.g. "Pull-up Resistors", "Voltage Divider", "PWM Duty Cycle"
  summary: string;
  howItWorks: string[];
  commonMistakes: string[];
  tryItLiveExperiment?: string;
  visualHint?: string; // Diagram or text illustration
}

export interface HardwareBOMItem {
  partName: string;
  type: string;
  value?: string;
  quantity: number;
  purpose: string;
  pinWiring: string;
}

export interface HardwareBOMData {
  id: string;
  title: string;
  board: string;
  items: HardwareBOMItem[];
  breadboardSteps: string[];
}

export type ConflictType =
  | 'timer_clash'
  | 'voltage_mismatch'
  | 'occupied'
  | 'non_pwm'
  | 'non_adc'
  | 'fan_out_exceeded';

export interface PinConflictWarning {
  pin: string;
  componentId: string;
  conflictType: ConflictType;
  description: string;
  suggestedFix: string;
}

export interface ActionStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

export interface AIToolCall {
  id: string;
  name:
    | 'generate_circuit'
    | 'modify_code'
    | 'install_libraries'
    | 'run_simulation'
    | 'explain_hardware'
    | 'generate_bom'
    | 'fix_error';
  args: Record<string, any>;
  result?: any;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  intent?: 'BUILD' | 'DEBUG' | 'EXPLAIN' | 'CHAT';
  reasoning?: string; // Collapsible model thought block
  isStreaming?: boolean;
  steps?: ActionStep[];
  toolCalls?: AIToolCall[];
  circuitProposal?: CircuitProposal;
  codeProposal?: CodeProposal;
  learningCard?: HardwareLearningCardData;
  bomData?: HardwareBOMData;
  conflictWarnings?: PinConflictWarning[];
  error?: string;
}

export interface HardwareContextSnapshot {
  activeBoard: {
    kind: BoardKind;
    fqbn: string;
    description: string;
  };
  components: Array<{
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    properties: Record<string, any>;
  }>;
  wires: Array<{
    id: string;
    from: string;
    to: string;
    color: string;
  }>;
  files: Array<{
    id: string;
    name: string;
    content: string;
    isActive: boolean;
  }>;
  compileLogs?: string[];
  circuitWarnings?: CircuitWarning[];
  serialOutputTail?: string;
  spiceNodeVoltages?: Record<string, number>;
}
