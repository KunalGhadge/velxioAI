/**
 * VelxioAI Studio — Snapshot-Based History & Undo/Redo Manager
 *
 * Implements a 50-state deep snapshot history system capturing full circuit topology,
 * wire netlists, editor files, and board configuration. Restores state atomically
 * without page reloads or simulator disruption.
 */

import { useSimulatorStore } from '../../store/useSimulatorStore';
import { useEditorStore } from '../../store/useEditorStore';
import { AIEventBus } from '../events/AIEventBus';

export interface ProjectSnapshot {
  id: string;
  timestamp: number;
  description: string;
  components: any[];
  wires: any[];
  files: any[];
  activeBoardKind?: string;
  activeBoardId?: string;
}

export class AIHistoryManager {
  public static readonly MAX_HISTORY_STATES = 50;
  private static instance: AIHistoryManager;

  private undoStack: ProjectSnapshot[] = [];
  private redoStack: ProjectSnapshot[] = [];
  private initialSnapshot: ProjectSnapshot | null = null;
  private isRestoring = false;

  private constructor() {}

  public static getInstance(): AIHistoryManager {
    if (!AIHistoryManager.instance) {
      AIHistoryManager.instance = new AIHistoryManager();
    }
    return AIHistoryManager.instance;
  }

  /**
   * Captures the current active studio state (components, wires, files, board).
   */
  public captureCurrentState(description: string = 'State Snapshot'): ProjectSnapshot {
    const simState = useSimulatorStore.getState();
    const editorState = useEditorStore.getState();

    const activeBoard = simState.boards.find((b) => b.id === simState.activeBoardId) || simState.boards[0];

    const snapshot: ProjectSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      description,
      components: JSON.parse(JSON.stringify(simState.components || [])),
      wires: JSON.parse(JSON.stringify(simState.wires || [])),
      files: JSON.parse(JSON.stringify(editorState.files || [])),
      activeBoardKind: activeBoard?.kind || 'uno',
      activeBoardId: activeBoard?.id,
    };

    if (!this.initialSnapshot) {
      this.initialSnapshot = JSON.parse(JSON.stringify(snapshot));
    }

    return snapshot;
  }

  /**
   * Pushes a new snapshot to the undo history stack.
   */
  public pushSnapshot(description: string): void {
    if (this.isRestoring) return;

    const snapshot = this.captureCurrentState(description);

    this.undoStack.push(snapshot);
    if (this.undoStack.length > AIHistoryManager.MAX_HISTORY_STATES) {
      this.undoStack.shift();
    }

    // Clear redo stack on new action
    this.redoStack = [];

    AIEventBus.getInstance().publish('HISTORY_SNAPSHOT_CREATED', {
      snapshotId: snapshot.id,
      description,
      undoCount: this.undoStack.length,
    });
  }

  /**
   * Reverts to the previous historical state.
   */
  public undo(): boolean {
    if (this.undoStack.length <= 1) {
      console.warn('[AIHistoryManager] No further undo states available.');
      return false;
    }

    // Current state moves to redo stack
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    // Target previous state
    const target = this.undoStack[this.undoStack.length - 1];
    if (!target) return false;

    this.applySnapshot(target);

    AIEventBus.getInstance().publish('UNDO_EXECUTED', {
      restoredSnapshot: target,
      undoRemaining: this.undoStack.length,
      redoCount: this.redoStack.length,
    });

    return true;
  }

  /**
   * Re-applies a previously undone state.
   */
  public redo(): boolean {
    if (this.redoStack.length === 0) {
      console.warn('[AIHistoryManager] No redo states available.');
      return false;
    }

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);

    this.applySnapshot(next);

    AIEventBus.getInstance().publish('REDO_EXECUTED', {
      restoredSnapshot: next,
      undoRemaining: this.undoStack.length,
      redoCount: this.redoStack.length,
    });

    return true;
  }

  /**
   * Restores the project to its initial state before any AI generations.
   */
  public revertToOriginal(): boolean {
    if (!this.initialSnapshot) return false;

    this.pushSnapshot('Before Reverting to Original');
    this.applySnapshot(this.initialSnapshot);
    return true;
  }

  /**
   * Restores state into both useSimulatorStore and useEditorStore atomically.
   */
  private applySnapshot(snapshot: ProjectSnapshot): void {
    this.isRestoring = true;
    try {
      const sim = useSimulatorStore.getState();
      const editor = useEditorStore.getState();

      // 1. Stop active simulation before state mutation
      if (typeof (sim as any).stopSimulation === 'function') {
        (sim as any).stopSimulation();
      }

      // 2. Restore Simulator Components and Wires
      sim.setComponents(JSON.parse(JSON.stringify(snapshot.components)));
      sim.setWires(JSON.parse(JSON.stringify(snapshot.wires)));

      // 3. Restore Editor Files
      editor.setFiles(JSON.parse(JSON.stringify(snapshot.files)));

      // 4. Trigger Wire Geometry Recalculation
      setTimeout(() => {
        useSimulatorStore.getState().recalculateAllWirePositions();
      }, 50);

      console.log(`[AIHistoryManager] Restored state: "${snapshot.description}" (${snapshot.components.length} components, ${snapshot.files.length} files)`);
    } finally {
      this.isRestoring = false;
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoCount(): number {
    return Math.max(0, this.undoStack.length - 1);
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.initialSnapshot = null;
  }
}
