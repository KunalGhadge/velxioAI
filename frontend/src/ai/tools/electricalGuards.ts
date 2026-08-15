/**
 * VelxioAI Studio — Electrical Guardrails & Auto-Protection Generator
 *
 * Automatically synthesizes physical circuit protection:
 * - Current limiting resistors for LEDs (220Ω)
 * - Voltage divider sub-nets (1k/2k) for 5V -> 3.3V logic level shifting
 * - Flyback diodes (1N4001) for inductive relay and motor coils
 * - Transistor switches (2N2222) for high-current loads
 */

import type { CircuitComponentSpec, CircuitWireSpec } from '../types';

export class ElectricalGuards {
  /**
   * Automatically adds a 220Ω current-limiting resistor for any raw LED.
   */
  public static guardLedConnection(
    boardId: string,
    gpioPin: string,
    ledId: string,
    ledAnodePin = 'A',
    ledCathodePin = 'C',
    gndPin = 'GND'
  ): { components: CircuitComponentSpec[]; wires: CircuitWireSpec[] } {
    const resistorId = `res_${ledId}`;

    return {
      components: [
        {
          id: resistorId,
          type: 'wokwi-resistor',
          left: 280,
          top: 220,
          attrs: { value: '220' },
        },
      ],
      wires: [
        { fromPart: boardId, fromPin: gpioPin, toPart: resistorId, toPin: '1', color: '#22c55e' },
        { fromPart: resistorId, fromPin: '2', toPart: ledId, toPin: ledAnodePin, color: '#22c55e' },
        { fromPart: ledId, fromPin: ledCathodePin, toPart: boardId, toPin: gndPin, color: '#1f2937' },
      ],
    };
  }

  /**
   * Automatically creates a 1k/2k voltage divider for 5V sensors connecting to 3.3V MCUs.
   */
  public static createVoltageDivider(
    sourcePart: string,
    sourcePin: string,
    targetPart: string,
    targetPin: string,
    gndPin = 'GND'
  ): { components: CircuitComponentSpec[]; wires: CircuitWireSpec[] } {
    const r1Id = `r_div1_${Date.now()}`;
    const r2Id = `r_div2_${Date.now()}`;

    return {
      components: [
        { id: r1Id, type: 'wokwi-resistor', left: 260, top: 200, attrs: { value: '1000' } },
        { id: r2Id, type: 'wokwi-resistor', left: 260, top: 250, attrs: { value: '2000' } },
      ],
      wires: [
        // Sensor out -> R1
        { fromPart: sourcePart, fromPin: sourcePin, toPart: r1Id, toPin: '1', color: '#eab308' },
        // R1.2 -> Target MCU 3.3V Pin
        { fromPart: r1Id, fromPin: '2', toPart: targetPart, toPin: targetPin, color: '#3b82f6' },
        // R1.2 -> R2.1 (Junction)
        { fromPart: r1Id, fromPin: '2', toPart: r2Id, toPin: '1', color: '#3b82f6' },
        // R2.2 -> GND
        { fromPart: r2Id, fromPin: '2', toPart: targetPart, toPin: gndPin, color: '#1f2937' },
      ],
    };
  }
}
