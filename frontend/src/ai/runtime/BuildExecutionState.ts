/**
 * VelxioAI Studio — Build Execution State Model
 *
 * Tracks the deterministic execution lifecycle of an autonomous build request:
 * GENERATING -> COMPILING -> STARTING_SIMULATION -> VERIFYING -> SUCCESS / FAILED
 */

export type BuildStatus =
  | 'IDLE'
  | 'GENERATING'
  | 'COMPILING'
  | 'STARTING_SIMULATION'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'FAILED';

export interface BuildExecutionState {
  status: BuildStatus;
  compileSuccessful: boolean;
  simulationStarted: boolean;
  runtimeVerified: boolean;
  error?: string;
  target?: string;
  diagnostics?: string[];
  startTime?: number;
  completedTime?: number;
}
