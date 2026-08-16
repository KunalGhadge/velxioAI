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
import { COMPONENT_PIN_DEFINITIONS, BOARD_PIN_DEFINITIONS } from './tools/CircuitValidator';
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
   - **BUILD / EDIT / CODE / SIMULATE REQUESTS** (e.g. "make a visitor counter", "add a buzzer on pin 8", "change blink rate to 500ms", "fix the compiler error", "run simulation"): You MUST formulate the exact structured action in a \`\`\`velxio-action block. The IDE will automatically execute your plan (placing parts, connecting wires, writing sketch.ino, installing libraries, and starting simulation).

2. DETERMINISTIC HARDWARE PINNING:
   - Target Board: "${board.description}" (kind: "${board.kind}", FQBN: "${board.fqbn}").
   - Available Physical Pins on "${board.description}": [${boardPinList.join(', ')}].
   - NEVER invent phantom pins. You MUST strictly use physical pins listed above.
   - Always connect digital sensors to digital pins, analog sensors to analog pins (A0-A5), and PWM devices (servos, buzzers) to hardware PWM pins.
   - LEDs MUST connect through a 220Ω resistor to prevent overcurrent.

3. HARDWARE COMPONENT PIN DICTIONARY (USE EXACT COMPONENT TYPES AND EXACT PIN NAMES):
${pinDictionaryMarkdown}

4. STRUCTURED ACTION CAPABILITIES FORMAT:
   When modifying circuits, writing code, or managing files, output a single JSON block enclosed in \`\`\`velxio-action:
   CRITICAL RULES:
   - Output valid standard JSON with double-quoted strings.
   - For multi-line code in "proposedContent", escape newlines with \\n and quotes with \\". NEVER use Python-style triple quotes (""").

   \`\`\`velxio-action
   {
     "reasoning": "Technical rationale for component choice and pin connections",
     "boardKind": "arduino-uno",
     "steps": [
       { "id": "1", "title": "Place IR Sensor & 16x2 LCD Display", "status": "completed" },
       { "id": "2", "title": "Wire power and signal lines to Arduino Uno", "status": "completed" },
       { "id": "3", "title": "Write visitor counter firmware in sketch.ino", "status": "completed" }
     ],
     "circuit": {
       "title": "Visitor Counter Circuit",
       "description": "IR sensor and 16x2 LCD display",
       "componentsToAdd": [
         { "id": "pir1", "type": "wokwi-pir-motion-sensor" },
         { "id": "lcd1", "type": "wokwi-lcd1602" }
       ]
     },
     "code": {
       "fileName": "sketch.ino",
       "summary": "Counts visitors and renders live tally on LCD and Serial",
       "proposedContent": "// Complete Arduino firmware code here\\n"
     }
   }
   \`\`\`

════════════════════════════════════════════════════════════════
CURRENT WORKSPACE CONTEXT
════════════════════════════════════════════════════════════════
- Active Board: ${board.description} (Kind: "${board.kind}")
- Placed Components: ${snapshot.components.length > 0 ? JSON.stringify(snapshot.components) : 'None (Canvas is empty)'}
- Current Wires: ${snapshot.wires.length > 0 ? JSON.stringify(snapshot.wires) : 'None'}
- Workspace Files: ${snapshot.files.map((f) => f.name).join(', ')}
${activeFile ? `- Active File (${activeFile.name}):\n\`\`\`cpp\n${activeFile.content}\n\`\`\`` : ''}
${snapshot.circuitWarnings && snapshot.circuitWarnings.length > 0 ? `- Circuit Warnings: ${JSON.stringify(snapshot.circuitWarnings)}` : ''}
${snapshot.compileLogs && snapshot.compileLogs.length > 0 ? `- Recent Compiler Logs:\n${snapshot.compileLogs.join('\n')}` : ''}
${serialSnippet ? `- Recent Serial Monitor Output:\n${serialSnippet}` : ''}
`;
  }
}
