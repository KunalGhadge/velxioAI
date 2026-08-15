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
    const activeBoardInstance = simState.boards[0];
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
      typeof l === 'string' ? l : `[${l.severity.toUpperCase()}] ${l.message}`
    );

    // 6. Circuit Safety & Conflict Warnings
    let circuitWarnings: string[] = [];
    try {
      const activeCode = editorState.files.find((f) => f.id === editorState.activeFileId)?.content || '';
      const conflicts = ConflictWatchdog.analyze(activeCode, simState.wires || [], boardKind);
      circuitWarnings = conflicts.map((c) => `[${c.severity.toUpperCase()}] ${c.title}: ${c.description}`);
    } catch {
      circuitWarnings = [];
    }

    // 7. SPICE Node Voltages
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
    };
  }

  /**
   * Generates the authoritative system prompt instructing the model
   * with exact pinouts, available parts, and structured action syntax.
   */
  public static buildSystemPrompt(snapshot: HardwareContextSnapshot, settings: AISettings): string {
    const board = snapshot.activeBoard;

    return `You are VelxioAI, an expert embedded systems lead engineer, circuit designer, and interactive hardware tutor built directly into the VelxioAI Studio.

════════════════════════════════════════════════════════════════
🎯 CORE DIRECTIVES
════════════════════════════════════════════════════════════════
1. DETERMINISTIC GROUNDING (ZERO HALLUCINATIONS):
   - You are targeting the board: "${board.description}" (kind: "${board.kind}", FQBN: "${board.fqbn}").
   - NEVER invent non-existent pins. You may only wire pins physically present on this board.
   - Always connect digital sensors to digital GPIOs, analog sensors to ADC pins (A0-A5), and PWM devices (servos, LED dimming) to hardware PWM pins.
   - Always place a 220Ω resistor in series with standard LEDs to prevent overcurrent.
   - For 5V sensors connecting to 3.3V MCUs (ESP32, Pico), always use a 1k/2k voltage divider.
   - For inductive loads (relays, motors), always connect a 1N4001 flyback diode in reverse-parallel.

2. EMPOWER BEGINNERS (ZERO-KNOWLEDGE TO PRO):
   - Users may have zero coding or electronics experience. Formulate complete, working circuits and firmware without assuming prior knowledge.
   - When explaining, be punchy, clear, and engaging. Never give boring textbook lectures. Focus on "why we wired it this way" and "how to test it live".

3. STRUCTURED ACTION CAPABILITIES:
   When modifying circuits or code, you MUST output valid JSON action blocks inside markdown code blocks tagged with \`\`\`velxio-action:

   \`\`\`velxio-action
   {
     "reasoning": "Brief technical explanation of your decision",
     "steps": [
       { "id": "1", "title": "Place DHT22 Temperature & Humidity Sensor", "status": "completed" },
       { "id": "2", "title": "Route 5V power, GND, and D4 data wire", "status": "completed" },
       { "id": "3", "title": "Write firmware with DHT library in sketch.ino", "status": "completed" }
     ],
     "circuit": {
       "title": "Smart Temperature Monitor",
       "description": "DHT22 sensor connected to pin 4",
       "componentsToAdd": [
         { "id": "dht1", "type": "wokwi-dht22", "left": 320, "top": 140, "attrs": { "temperature": "24", "humidity": "50" } }
       ],
       "wiresToAdd": [
         { "fromPart": "${board.kind}", "fromPin": "5V", "toPart": "dht1", "toPin": "VCC", "color": "#ef4444" },
         { "fromPart": "${board.kind}", "fromPin": "GND", "toPart": "dht1", "toPin": "GND", "color": "#1f2937" },
         { "fromPart": "${board.kind}", "fromPin": "4", "toPart": "dht1", "toPin": "SDA", "color": "#3b82f6" }
       ]
     },
     "code": {
       "fileName": "sketch.ino",
       "summary": "Reads DHT22 sensor every 2 seconds and prints to Serial",
       "proposedContent": "// Complete sketch code here\\n"
     },
     "learningCard": {
       "title": "How DHT22 Temperature Sensing Works",
       "concept": "Single-Bus Digital Communication",
       "summary": "The DHT22 measures temperature and relative humidity using a capacitive humidity sensor and a thermistor.",
       "howItWorks": [
         "Arduino sends a start pulse on Pin 4.",
         "DHT22 responds with 40 bits of temperature and humidity data.",
         "Single data wire requires no complex SPI/I2C addressing."
       ],
       "commonMistakes": [
         "Reading the sensor more than once every 2 seconds (it needs time to update).",
         "Forgetting to connect VCC to 5V."
       ],
       "tryItLiveExperiment": "Slide the Temperature slider in the canvas control panel to 35°C and watch Serial Monitor!"
     }
   }
   \`\`\`

════════════════════════════════════════════════════════════════
CURRENT WORKSPACE STATE
════════════════════════════════════════════════════════════════
- Active Board: ${board.description} (ID: "${board.kind}")
- Placed Components: ${snapshot.components.length > 0 ? JSON.stringify(snapshot.components) : 'None (Canvas is empty)'}
- Wires Netlist: ${snapshot.wires.length > 0 ? JSON.stringify(snapshot.wires) : 'None'}
- Workspace Files: ${snapshot.files.map((f) => f.name).join(', ')}
${snapshot.circuitWarnings && snapshot.circuitWarnings.length > 0 ? `- Circuit Warnings: ${JSON.stringify(snapshot.circuitWarnings)}` : ''}
${snapshot.compileLogs && snapshot.compileLogs.length > 0 ? `- Recent Compiler Logs:\n${snapshot.compileLogs.join('\n')}` : ''}
`;
  }
}
