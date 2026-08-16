/**
 * VelxioAI Studio — Deterministic Repair Engine
 *
 * Implements non-speculative, zero-LLM repairs for compiler and hardware errors:
 * - Installs missing libraries directly into libraries.txt
 * - Injects missing #include statements
 * - Synchronizes pin definitions with the physical netlist
 * - Regenerates verified firmware from FirmwareTemplateEngine
 *
 * Strictly eliminates sending compiler logs to LLMs or asking users for fixes.
 */

import { CompilerDiagnosticEngine, type CompilerDiagnostic } from './CompilerDiagnosticEngine';
import { AgentToolEngine } from '../AgentToolEngine';
import { FirmwareTemplateEngine } from '../firmware/FirmwareTemplateEngine';
import { PinAssignmentRegistry } from '../hardware/PinAssignmentRegistry';
import { useEditorStore } from '../../store/useEditorStore';
import { useSimulatorStore } from '../../store/useSimulatorStore';

export interface DeterministicRepairReport {
  repaired: boolean;
  actionsApplied: string[];
  diagnostics: CompilerDiagnostic[];
}

export class DeterministicRepairEngine {
  /**
   * Applies deterministic fixes based on compiler stderr output.
   */
  public static repair(compilerStderr: string): DeterministicRepairReport {
    const diagnostics = CompilerDiagnosticEngine.diagnose(compilerStderr);
    const actionsApplied: string[] = [];

    if (diagnostics.length === 0) {
      return { repaired: false, actionsApplied, diagnostics };
    }

    const editor = useEditorStore.getState();
    const sim = useSimulatorStore.getState();
    const sketchFile = editor.files.find((f) => f.name === 'sketch.ino' || f.name.endsWith('.ino'));
    const libsFile = editor.files.find((f) => f.name === 'libraries.txt');

    let currentSketch = sketchFile?.content || '';
    let currentLibs = libsFile?.content || '';

    const librariesToInstall = new Set<string>();

    for (const diag of diagnostics) {
      // 1. Repair Missing Library
      if (diag.type === 'MISSING_LIBRARY' && diag.library) {
        librariesToInstall.add(diag.library);
        actionsApplied.push(`Auto-installed missing library: "${diag.library}"`);

        if (diag.header && !currentSketch.toLowerCase().includes(diag.header.toLowerCase())) {
          currentSketch = `#include <${diag.header}>\n` + currentSketch;
          actionsApplied.push(`Injected missing header: <${diag.header}>`);
        }
      }

      // 2. Repair Undeclared Identifier / Pin
      if (diag.type === 'UNDECLARED_IDENTIFIER' && diag.pin) {
        const pinMatch = diag.pin.match(/\d+/) ? diag.pin.match(/\d+/)![0] : '13';
        if (!currentSketch.includes(`#define ${diag.pin}`)) {
          currentSketch = `#define ${diag.pin} ${pinMatch}\n` + currentSketch;
          actionsApplied.push(`Defined missing hardware constant: #define ${diag.pin} ${pinMatch}`);
        }
      }

      // 3. Syntax / Struct Corruption -> Deterministic Re-synthesis
      if (diag.type === 'SYNTAX_ERROR') {
        const activeBoard = sim.boards[0]?.kind || 'uno';
        const templateCode = FirmwareTemplateEngine.generateFirmware({
          board: activeBoard,
          pinAssignments: PinAssignmentRegistry.getAllAssignments(),
          components: sim.components,
        });
        currentSketch = templateCode;
        actionsApplied.push('Regenerated clean C++ firmware from validated hardware templates');
      }
    }

    // Install all detected libraries into libraries.txt
    if (librariesToInstall.size > 0) {
      AgentToolEngine.installLibraries(Array.from(librariesToInstall));
    }

    // Write repaired sketch content
    if (sketchFile && currentSketch !== sketchFile.content) {
      AgentToolEngine.writeFile(sketchFile.id, currentSketch);
    }

    return {
      repaired: actionsApplied.length > 0,
      actionsApplied,
      diagnostics,
    };
  }
}
