/**
 * VelxioAI Studio — Hardware & Code Context Collector
 *
 * Captures the complete real-time state of the IDE (board specs,
 * placed components, wire netlists, open files, compiler diagnostics,
 * SPICE electrical voltages, and serial outputs) to ground the LLM
 * in deterministic physical reality.
 */

import { useSimulatorStore } from '../store/useSimulatorStore';
import { useEditorStore } from '../store/useEditorStore';
import { useCompileLogsStore } from '../store/useCompileLogsStore';
import { useElectricalStore } from '../store/useElectricalStore';
import { BOARD_KIND_LABELS, BOARD_KIND_FQBN } from '../types/board';
import { ConflictWatchdog } from './tools/conflictWatchdog';
import { CircuitValidator, COMPONENT_PIN_DEFINITIONS, BOARD_PIN_DEFINITIONS } from './tools/CircuitValidator';
import { PinAssignmentRegistry } from './hardware/PinAssignmentRegistry';
import type { HardwareContextSnapshot, AISettings } from './types';

export class AIContextCollector {
  /**
   * Captures a complete snapshot of the current workspace state.
   */
  public static captureSnapshot(): HardwareContextSnapshot {
    const simState = useSimulatorStore.getState();
    const editorState = useEditorStore.getState();
    const compileState = useCompileLogsStore.getState();
    const electricalState = useElectricalStore.getState();

    // 1. Board Metadata
    const activeBoardInstance = simState.boards.find((b) => b.id === simState.activeBoardId) || simState.boards[0];
    const boardKind = activeBoardInstance?.boardKind || 'arduino-uno';
    const boardDescription = BOARD_KIND_LABELS[boardKind] || 'Arduino Uno';
    const boardFqbn = BOARD_KIND_FQBN[boardKind] || 'arduino:avr:uno';

    // 2. Placed Components
    const components = (simState.components || []).map((c) => ({
      id: c.id,
      type: c.metadataId || (c as any).type,
      name: (c as any).name || c.metadataId || (c as any).type,
      x: Math.round((c as any).x || (c as any).left || 0),
      y: Math.round((c as any).y || (c as any).top || 0),
      properties: { ...((c as any).properties || (c as any).attrs || {}) },
    }));

    // 3. Wires Netlist
    const wires = (simState.wires || []).map((w) => ({
      id: w.id,
      from: `${w.start.componentId}:${w.start.pinName}`,
      to: `${w.end.componentId}:${w.end.pinName}`,
      color: w.color || '#2563eb',
    }));

    // 4. Editor Files
    const files = (editorState.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      content: f.content,
      isActive: f.id === editorState.activeFileId,
    }));

    // 5. Compile Logs
    const compileLogs = (compileState.logs || []).map((l) =>
      typeof l === 'string' ? l : `[${l.type.toUpperCase()}] ${l.message}`
    );

    // 6. Serial Output
    const serialOutput = activeBoardInstance?.serialOutput ? activeBoardInstance.serialOutput.slice(-500) : '';

    // 7. Circuit Safety & Conflict Warnings
    let circuitWarnings: string[] = [];
    try {
      const activeCode = editorState.files.find((f) => f.id === editorState.activeFileId)?.content || '';
      const conflicts = ConflictWatchdog.analyze(activeCode, simState.wires || [], boardKind);
      circuitWarnings = conflicts.map((c) => `[${c.severity.toUpperCase()}] ${c.title}: ${c.description}`);

      // Run live CircuitValidator
      const validationReport = CircuitValidator.validate(
        {
          boardKind: boardKind as any,
          componentsToAdd: components as any,
          wiresToAdd: (simState.wires || []).map((w) => ({
            fromPart: w.start.componentId,
            fromPin: w.start.pinName,
            toPart: w.end.componentId,
            toPin: w.end.pinName,
          })),
        },
        boardKind as any
      );

      if (!validationReport.valid) {
        validationReport.errors.forEach((err) => circuitWarnings.push(`[VALIDATION ERROR] ${err}`));
      }
    } catch {
      circuitWarnings = [];
    }

    // 8. SPICE Node Voltages
    const spiceNodeVoltages: Record<string, number> = {};
    if (electricalState.nodeVoltages && typeof electricalState.nodeVoltages === 'object') {
      try {
        Object.entries(electricalState.nodeVoltages).forEach(([k, v]) => {
          if (typeof v === 'number' && !isNaN(v)) {
            spiceNodeVoltages[k] = Math.round(v * 100) / 100;
          }
        });
      } catch {}
    }

    // 9. Authoritative Pin Assignments
    const pinAssignments = PinAssignmentRegistry.getInstance().getAllAssignments();

    // 10. Simulation Status
    const isSimulationRunning = (simState as any).simulationRunning ?? (simState as any).isRunning ?? false;
    const isSimulationPaused = (simState as any).simulationPaused ?? (simState as any).isPaused ?? false;

    return {
      activeBoard: {
        kind: boardKind,
        fqbn: boardFqbn,
        description: boardDescription,
      },
      components,
      wires,
      files,
      compileLogs: compileLogs.slice(-20),
      circuitWarnings,
      spiceNodeVoltages,
      serialOutput,
      pinAssignments,
      isSimulationRunning,
      isSimulationPaused,
    } as any;
  }

  /**
   * Generates the authoritative system prompt instructing the model
   * with exact pinouts, available parts, and structured action syntax.
   */
  public static buildSystemPrompt(snapshot: HardwareContextSnapshot, settings: AISettings): string {
    const board = snapshot.activeBoard;
    const activeFile = snapshot.files.find((f: any) => f.isActive) || snapshot.files[0];
    const serialSnippet = (snapshot as any).serialOutput || '';
    const pinAssignments = (snapshot as any).pinAssignments || [];
    const isSimulationRunning = (snapshot as any).isSimulationRunning;
    const isSimulationPaused = (snapshot as any).isSimulationPaused;

    const boardKey = (board.kind || 'arduino-uno').toLowerCase();
    const boardPinList = BOARD_PIN_DEFINITIONS[boardKey] || BOARD_PIN_DEFINITIONS['arduino-uno'];
    const pinDictionaryMarkdown = Object.entries(COMPONENT_PIN_DEFINITIONS)
      .map(([type, pins]) => `   - "${type}": Pins [${pins.join(', ')}]`)
      .join('\n');

    return `You are VelxioAI, the lead embedded systems engineer and autonomous Studio Agent in the VelxioAI Embedded IDE.

════════════════════════════════════════════════════════════════
🎯 CORE OPERATING PRINCIPLES
════════════════════════════════════════════════════════════════
1. INTENT RECOGNITION (CHAT vs. ACTION):
   - **GREETINGS & CASUAL CHAT** (e.g. "hi", "hello", "who are you", "what can you do"): Reply in brief, friendly markdown. DO NOT output an action block, do not touch files, do not touch the circuit.
   - **THEORETICAL & CONCEPTUAL QUESTIONS** (e.g. "explain I2C vs SPI", "what does pinMode do?"): Provide a concise, clear technical explanation in markdown. Only attach a "learningCard" if the user explicitly asked to learn/explain a concept or if explain mode is active.
   - **DEBUG & DIAGNOSTIC INQUIRIES** (e.g. "Why wasn't the LED blinking?", "Why is the sensor reading 0?", "What is wrong with my circuit?"): Inspect the CURRENT WORKSPACE CONTEXT below (placed parts, wires, firmware, and pin assignments). Provide an accurate in-simulator diagnosis. DO NOT emit an action block unless the user explicitly commands a fix or build.
   - **BUILD / EDIT / CODE / SIMULATE REQUESTS** (e.g. "make a visitor counter", "add a buzzer on pin 8", "change blink rate to 500ms", "fix the compiler error", "run simulation"): You MUST formulate the exact structured action in a \`\`\`velxio-action block.

2. 🔬 DIGITAL SIMULATOR & DIAGNOSTIC DIRECTIVE:
   THIS IS A 100% PURE DIGITAL HARDWARE EMULATOR / SIMULATOR.
   NEVER SUGGEST REAL-WORLD PHYSICAL DEFECTS:
   - DO NOT suggest broken/burned-out LEDs, damaged ICs, or dead sensors.
   - DO NOT suggest loose jumper wires, bad breadboard rails, or poor contact.
   - DO NOT suggest USB power supply issues or faulty cables.
   - DO NOT suggest physical button debounce degradation.

   YOU MUST DIAGNOSE DIGITAL HARDWARE & FIRMWARE CAUSES ONLY:
   1. FIRMWARE PIN MISMATCH: Does the pin #define in sketch.ino match the physical wire on the MCU board?
   2. PIN MODE: Is pinMode(PIN, OUTPUT) called for actuators/LEDs or pinMode(PIN, INPUT/INPUT_PULLUP) for sensors?
   3. WIRING & NETS: Check Circuit Warnings, unpowered sensors, missing GND returns, or floating pins.
   4. TIMING & LOGIC: Check delay() timing, blocking while loops, inverted active-low/active-high logic.
   5. SIMULATOR STATE: Check if simulation is running (${isSimulationRunning ? 'ACTIVE' : 'STOPPED'}) or paused (${isSimulationPaused ? 'PAUSED' : 'NOT PAUSED'}).

3. DETERMINISTIC HARDWARE PINNING:
   - Target Board: "${board.description}" (kind: "${board.kind}", FQBN: "${board.fqbn}").
   - Available Physical Pins on "${board.description}": [${boardPinList.join(', ')}].
   - NEVER invent phantom pins. You MUST strictly use physical pins listed above.
   - Always connect digital sensors to digital pins, analog sensors to analog pins (A0-A5), and PWM devices (servos, buzzers) to hardware PWM pins.
   - LEDs MUST connect through a 220Ω resistor to prevent overcurrent.

4. HARDWARE COMPONENT PIN DICTIONARY (USE EXACT COMPONENT TYPES AND EXACT PIN NAMES):
${pinDictionaryMarkdown}

5. STRUCTURED ACTION CAPABILITIES FORMAT (FOR BUILD REQUESTS ONLY):
   When modifying circuits, writing code, or managing files, output a single JSON block enclosed in \`\`\`velxio-action:
   \`\`\`velxio-action
   {
     "reasoning": "Technical rationale for component choice and pin connections",
     "boardKind": "arduino-uno",
     "steps": [
       { "id": "1", "title": "Place components", "status": "completed" }
     ],
     "circuit": {
       "title": "Circuit Modification",
       "description": "Short summary",
       "componentsToAdd": []
     },
     "code": {
       "fileName": "sketch.ino",
       "summary": "Firmware update summary",
       "proposedContent": "// Complete Arduino firmware code here\\n"
     }
   }
   \`\`\`

════════════════════════════════════════════════════════════════
CURRENT WORKSPACE CONTEXT
════════════════════════════════════════════════════════════════
- Active Board: ${board.description} (Kind: "${board.kind}")
- Simulation Status: ${isSimulationRunning ? '🟢 RUNNING' : '⚪ STOPPED'} (Paused: ${isSimulationPaused ? 'YES' : 'NO'})
- Placed Components: ${snapshot.components.length > 0 ? JSON.stringify(snapshot.components) : 'None (Canvas is empty)'}
- Current Wires: ${snapshot.wires.length > 0 ? JSON.stringify(snapshot.wires) : 'None'}
- Authoritative Pin Assignments: ${pinAssignments.length > 0 ? JSON.stringify(pinAssignments) : 'None'}
- Workspace Files: ${snapshot.files.map((f) => f.name).join(', ')}
${activeFile ? `- Active File (${activeFile.name}):\n\`\`\`cpp\n${activeFile.content}\n\`\`\`` : ''}
${snapshot.circuitWarnings && snapshot.circuitWarnings.length > 0 ? `- Circuit Warnings & Errors:\n${snapshot.circuitWarnings.join('\n')}` : ''}
${snapshot.compileLogs && snapshot.compileLogs.length > 0 ? `- Recent Compiler Logs:\n${snapshot.compileLogs.join('\n')}` : ''}
${serialSnippet ? `- Recent Serial Monitor Output:\n${serialSnippet}` : ''}
`;
  }
}
