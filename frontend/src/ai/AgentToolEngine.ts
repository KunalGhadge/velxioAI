/**
 * VelxioAI Studio — Unified Autonomous Agent Tool Engine
 *
 * Provides a clean, programmatic tool execution layer that the AI Agent
 * uses to inspect, build, edit, compile, simulate, and debug embedded projects.
 */

import { useEditorStore } from '../store/useEditorStore';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { useCompileLogsStore } from '../store/useCompileLogsStore';
import { ComponentRegistry } from '../services/ComponentRegistry';
import { runEditorCommand, hasEditorCommand } from '../lib/editorCommands';
import { CircuitLayoutEngine } from './CircuitLayoutEngine';
import { CircuitValidator } from './tools/CircuitValidator';
import { PinAllocator } from './hardware/PinAllocator';
import { PinAssignmentRegistry } from './hardware/PinAssignmentRegistry';
import { LibraryDependencyManager } from './firmware/LibraryDependencyManager';
import { ProjectArchitectureEngine } from './architecture/ProjectArchitectureEngine';
import type { BoardKind } from '../types/board';
import type { CircuitProposal, CodeProposal } from './types';

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

export class AgentToolEngine {
  // ── File Management Tools ──────────────────────────────────────────

  /**
   * Creates or overwrites a file in the workspace and opens it in Monaco.
   */
  public static async writeFile(fileName: string, content: string): Promise<ToolExecutionResult> {
    try {
      let finalContent = content;
      if (fileName.endsWith('.ino') || fileName.endsWith('.cpp')) {
        const pinReg = PinAssignmentRegistry.getInstance();
        if (pinReg.getAllAssignments().length > 0) {
          finalContent = pinReg.synchronizeFirmwareCode(content);
        }

        // Auto-detect and inject missing library headers
        const sim = useSimulatorStore.getState();
        const componentTypes = sim.components.map((c) => c.metadataId);
        const { headersToInclude } = LibraryDependencyManager.resolveLibraries(componentTypes, finalContent);
        finalContent = LibraryDependencyManager.injectHeaders(finalContent, headersToInclude);
      }

      const editor = useEditorStore.getState();
      const existing = editor.files.find((f) => f.name === fileName);

      if (existing) {
        editor.setFileContent(existing.id, finalContent);
        editor.openFile(existing.id);
        editor.setActiveFile(existing.id);
        return { success: true, message: `Updated file "${fileName}"`, data: { id: existing.id } };
      } else {
        const newId = editor.createFile(fileName);
        editor.setFileContent(newId, finalContent);
        editor.openFile(newId);
        editor.setActiveFile(newId);
        return { success: true, message: `Created file "${fileName}"`, data: { id: newId } };
      }
    } catch (err: any) {
      return { success: false, message: `Failed to write file "${fileName}": ${err.message}` };
    }
  }

  /**
   * Reads a file's content from the workspace.
   */
  public static readFile(fileName: string): string | null {
    const editor = useEditorStore.getState();
    const file = editor.files.find((f) => f.name === fileName);
    return file ? file.content : null;
  }

  /**
   * Deletes a file from the workspace.
   */
  public static deleteFile(fileName: string): ToolExecutionResult {
    try {
      const editor = useEditorStore.getState();
      const file = editor.files.find((f) => f.name === fileName);
      if (!file) {
        return { success: false, message: `File "${fileName}" not found` };
      }
      editor.deleteFile(file.id);
      return { success: true, message: `Deleted file "${fileName}"` };
    } catch (err: any) {
      return { success: false, message: `Failed to delete file "${fileName}": ${err.message}` };
    }
  }

  /**
   * Installs required C++/MicroPython libraries into libraries.txt and active board manifest.
   */
  public static installLibraries(requiredLibs: string[]): ToolExecutionResult {
    if (!requiredLibs || requiredLibs.length === 0) {
      return { success: true, message: 'No libraries requested' };
    }

    try {
      const editor = useEditorStore.getState();
      const sim = useSimulatorStore.getState();

      const libFile = editor.files.find((f) => f.name === 'libraries.txt');
      if (libFile) {
        const existing = libFile.content.split('\n').map((l) => l.trim());
        const toAdd = requiredLibs.filter((l) => !existing.includes(l));
        if (toAdd.length > 0) {
          editor.setFileContent(libFile.id, `${libFile.content.trim()}\n${toAdd.join('\n')}\n`);
        }
      } else {
        const id = editor.createFile('libraries.txt');
        editor.setFileContent(id, `# Libraries managed by VelxioAI Studio\n${requiredLibs.join('\n')}\n`);
      }

      // Sync into active board manifest
      const activeBoard = sim.boards.find((b) => b.id === sim.activeBoardId) || sim.boards[0];
      if (activeBoard) {
        const existing = activeBoard.libraries || [];
        const merged = Array.from(new Set([...existing, ...requiredLibs]));
        sim.updateBoard(activeBoard.id, { libraries: merged });
      }

      return {
        success: true,
        message: `Installed libraries: ${requiredLibs.join(', ')}`,
        data: { libraries: requiredLibs },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to install libraries: ${err.message}` };
    }
  }

  // ── Board & Circuit Management Tools ───────────────────────────────

  /**
   * Sets or switches the active microcontroller board on canvas.
   */
  public static setBoard(boardKind: BoardKind): ToolExecutionResult {
    try {
      const sim = useSimulatorStore.getState();
      const existing = sim.boards.find((b) => b.boardKind === boardKind);

      if (existing) {
        sim.setActiveBoard(existing.id);
        return { success: true, message: `Active board set to ${boardKind}` };
      }

      // If current board is different, add the requested board
      if (sim.boards.length === 0) {
        sim.addBoard(boardKind);
      } else {
        // Switch board kind of the primary board
        const primary = sim.boards[0];
        sim.updateBoard(primary.id, { boardKind });
      }

      // Position the board neatly on the left
      const activeBoardId = useSimulatorStore.getState().activeBoardId || sim.boards[0]?.id;
      if (activeBoardId) {
        sim.setBoardPosition(CircuitLayoutEngine.BOARD_ORIGIN, activeBoardId);
      }

      return { success: true, message: `Configured board: ${boardKind}` };
    } catch (err: any) {
      return { success: false, message: `Failed to set board: ${err.message}` };
    }
  }

  /**
   * Clears all peripheral components and wires from the canvas (keeps the board).
   */
  public static clearCircuit(): ToolExecutionResult {
    try {
      const sim = useSimulatorStore.getState();
      sim.clearAllComponents();
      return { success: true, message: 'Cleared canvas circuit' };
    } catch (err: any) {
      return { success: false, message: `Failed to clear circuit: ${err.message}` };
    }
  }

  /**
   * Applies a complete circuit proposal with deterministic auto-layout & color-coding.
   */
  public static applyCircuit(proposal: CircuitProposal): ToolExecutionResult {
    try {
      const sim = useSimulatorStore.getState();
      const registry = ComponentRegistry.getInstance();

      // 0. Deterministic Hardware Pin & Wire Planning
      const currentBoardKind = sim.boards[0]?.boardKind || 'arduino-uno';
      const targetBoardKind = proposal.boardKind || currentBoardKind;

      let effectiveComponents = proposal.componentsToAdd || [];
      let effectiveWires = proposal.wiresToAdd || [];

      if ((!effectiveWires || effectiveWires.length === 0) && effectiveComponents.length > 0) {
        const allocator = new PinAllocator(targetBoardKind);
        const plan = allocator.buildCompletePlan(targetBoardKind, effectiveComponents, proposal.title);
        effectiveComponents = plan.componentsToAdd;
        effectiveWires = plan.wiresToAdd;
      }

      const activeProposal: CircuitProposal = {
        ...proposal,
        boardKind: targetBoardKind,
        componentsToAdd: effectiveComponents,
        wiresToAdd: effectiveWires,
      };

      // 1. Pre-Flight Circuit Validation
      const validation = CircuitValidator.validate(activeProposal, targetBoardKind);
      if (!validation.valid) {
        return {
          success: false,
          message: `Circuit validation rejected proposal:\n${validation.errors.map((e) => `• ${e}`).join('\n')}`,
        };
      }

      // 2. Ensure board matches proposal
      if (activeProposal.boardKind) {
        this.setBoard(activeProposal.boardKind);
      } else if (sim.boards.length === 0) {
        this.setBoard('arduino-uno');
      }

      // 3. Position board at standard origin
      const currentBoard = sim.boards[0];
      const boardId = currentBoard?.id || 'arduino-uno';
      if (currentBoard) {
        sim.setBoardPosition(CircuitLayoutEngine.BOARD_ORIGIN, currentBoard.id);
      }

      // 4. Remove obsolete components
      if (activeProposal.componentsToRemove && activeProposal.componentsToRemove.length > 0) {
        activeProposal.componentsToRemove.forEach((cid) => {
          try {
            sim.recordRemoveComponent(cid);
          } catch (e: any) {
            console.warn(`[AgentToolEngine] Could not remove component ${cid}:`, e?.message);
          }
        });
      }

      // 5. Calculate clean grid positions for all new components
      const existingCount = sim.components.length;
      const laidOutComponents = CircuitLayoutEngine.layoutComponents(
        activeProposal.componentsToAdd || [],
        existingCount
      );

      const partIdMap: Record<string, string> = {
        board: boardId,
        arduino: boardId,
        uno: boardId,
        'arduino-uno': boardId,
        mcu: boardId,
      };

      for (let idx = 0; idx < laidOutComponents.length; idx++) {
        const comp = laidOutComponents[idx];
        if (!comp.type || typeof comp.type !== 'string' || comp.type.trim().length === 0) {
          return {
            success: false,
            message: `Component at index ${idx} has an empty or invalid type definition.`,
          };
        }

        const rawType = comp.type.replace(/^(wokwi|velxio)-/, '').toLowerCase();
        const meta = registry.getById(rawType) || registry.getById(comp.type);
        const canonicalMetadataId = meta ? meta.id : rawType;
        const safeId = comp.id || `${canonicalMetadataId.replace(/-/g, '_')}_${Date.now()}_${idx}`;

        partIdMap[comp.id || ''] = safeId;
        partIdMap[rawType] = safeId;
        if (comp.type) partIdMap[comp.type] = safeId;

        const existingComp = sim.components.find((c) => c.id === safeId);
        if (existingComp) {
          sim.updateComponent(safeId, {
            properties: {
              ...existingComp.properties,
              ...(comp.attrs || (comp as any).properties || {}),
            },
          });
        } else {
          sim.recordAddComponent({
            id: safeId,
            metadataId: canonicalMetadataId,
            x: comp.left || (380 + (idx % 3) * 190),
            y: comp.top || (80 + Math.floor(idx / 3) * 150),
            properties: { ...(comp.attrs || (comp as any).properties || {}) },
          });
        }
      }

      // 6. Connect wires with standardized colors
      const normalizedWires = CircuitLayoutEngine.normalizeWires(activeProposal.wiresToAdd || []);

      for (const wire of normalizedWires) {
        const fromId = partIdMap[wire.fromPart] || wire.fromPart;
        const toId = partIdMap[wire.toPart] || wire.toPart;

        // Prevent duplicate wire connections between same pins
        const wireExists = sim.wires.some(
          (w) =>
            (w.start.componentId === fromId &&
              w.start.pinName === wire.fromPin &&
              w.end.componentId === toId &&
              w.end.pinName === wire.toPin) ||
            (w.start.componentId === toId &&
              w.start.pinName === wire.toPin &&
              w.end.componentId === fromId &&
              w.end.pinName === wire.fromPin)
        );
        if (wireExists) continue;

        sim.recordAddWire({
          id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          start: { componentId: fromId, pinName: wire.fromPin, x: 0, y: 0 },
          end: { componentId: toId, pinName: wire.toPin, x: 0, y: 0 },
          waypoints: [],
          color: wire.color || '#2563eb',
        });
      }

      // Recalculate wire geometry after DOM settles
      setTimeout(() => {
        sim.recalculateAllWirePositions?.();
      }, 150);

      return {
        success: true,
        message: `Built circuit: ${activeProposal.title || 'Components & Wires Placed'}`,
        data: {
          componentsAdded: laidOutComponents.length,
          wiresAdded: normalizedWires.length,
        },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to apply circuit: ${err.message}` };
    }
  }

  /**
   * Auto-arranges all placed components in a clean non-overlapping grid next to the board.
   */
  public static beautifyCircuit(): ToolExecutionResult {
    try {
      const sim = useSimulatorStore.getState();
      const comps = sim.components;
      if (comps.length === 0) {
        return { success: true, message: 'No components to beautify' };
      }

      comps.forEach((comp, idx) => {
        const col = Math.floor(idx / CircuitLayoutEngine.MAX_ROWS_PER_COL);
        const row = idx % CircuitLayoutEngine.MAX_ROWS_PER_COL;
        const newX = CircuitLayoutEngine.GRID_START_X + col * CircuitLayoutEngine.COLUMN_SPACING;
        const newY = CircuitLayoutEngine.GRID_START_Y + row * CircuitLayoutEngine.ROW_SPACING;
        sim.updateComponent(comp.id, { x: newX, y: newY } as any);
      });

      setTimeout(() => {
        sim.recalculateAllWirePositions();
      }, 100);

      return { success: true, message: `Beautified ${comps.length} components into clean layout` };
    } catch (err: any) {
      return { success: false, message: `Failed to beautify circuit: ${err.message}` };
    }
  }

  // ── Simulation & Compilation Execution Tools ───────────────────────

  /**
   * Triggers project compilation via the editor command bus.
   */
  public static async compileProject(): Promise<ToolExecutionResult> {
    try {
      if (hasEditorCommand('sim.compile')) {
        runEditorCommand('sim.compile');
        return { success: true, message: 'Compilation started' };
      }
      return { success: false, message: 'Compiler is not currently available' };
    } catch (err: any) {
      return { success: false, message: `Failed to start compilation: ${err.message}` };
    }
  }

  /**
   * Starts the simulation.
   */
  public static startSimulation(): ToolExecutionResult {
    try {
      if (hasEditorCommand('sim.run')) {
        runEditorCommand('sim.run');
        return { success: true, message: 'Simulation started' };
      }
      const sim = useSimulatorStore.getState();
      const activeBoard = sim.boards.find((b) => b.id === sim.activeBoardId) || sim.boards[0];
      if (activeBoard && typeof (sim as any).startBoard === 'function') {
        (sim as any).startBoard(activeBoard.id);
        return { success: true, message: 'Simulation started via active board runner' };
      }
      if (typeof (sim as any).startSimulation === 'function') {
        (sim as any).startSimulation();
        return { success: true, message: 'Simulation started via simulator store' };
      }
      return { success: false, message: 'Simulation runner is not currently ready' };
    } catch (err: any) {
      return { success: false, message: `Failed to start simulation: ${err.message}` };
    }
  }

  /**
   * Stops the running simulation.
   */
  public static stopSimulation(): ToolExecutionResult {
    try {
      if (hasEditorCommand('sim.stop')) {
        runEditorCommand('sim.stop');
        return { success: true, message: 'Simulation stopped' };
      }
      return { success: false, message: 'Simulation stop command not found' };
    } catch (err: any) {
      return { success: false, message: `Failed to stop simulation: ${err.message}` };
    }
  }

  /**
   * Resets the active microcontroller.
   */
  public static resetBoard(): ToolExecutionResult {
    try {
      if (hasEditorCommand('sim.resetBoard')) {
        runEditorCommand('sim.resetBoard');
        return { success: true, message: 'Microcontroller reset' };
      }
      return { success: false, message: 'Reset command not found' };
    } catch (err: any) {
      return { success: false, message: `Failed to reset board: ${err.message}` };
    }
  }

  /**
   * Reads recent Serial Monitor text from the active board.
   */
  public static readSerial(): string {
    const sim = useSimulatorStore.getState();
    const activeBoard = sim.boards.find((b) => b.id === sim.activeBoardId) || sim.boards[0];
    return activeBoard?.serialOutput || '';
  }

  /**
   * Writes input text to the running board's Serial port.
   */
  public static writeSerial(input: string): ToolExecutionResult {
    try {
      const sim = useSimulatorStore.getState();
      const activeBoard = sim.boards.find((b) => b.id === sim.activeBoardId) || sim.boards[0];
      if (!activeBoard) {
        return { success: false, message: 'No active board found' };
      }
      sim.serialWriteToBoard(activeBoard.id, input);
      return { success: true, message: `Sent "${input}" to Serial` };
    } catch (err: any) {
      return { success: false, message: `Failed to write serial: ${err.message}` };
    }
  }

  /**
   * Retrieves recent compiler errors and warnings.
   */
  public static getCompileLogs(): string[] {
    const logs = useCompileLogsStore.getState().logs || [];
    return logs.map((l) => (typeof l === 'string' ? l : `[${l.type.toUpperCase()}] ${l.message}`));
  }
}
