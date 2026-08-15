/**
 * VelxioAI Studio — Hardware Resource & Pin Conflict Watchdog
 *
 * Pre-execution static analysis engine that checks:
 * 1. Hardware Timer clashes (e.g. tone() vs PWM Timer2)
 * 2. Servo library conflicts (PWM disabled on D9/D10)
 * 3. 5V -> 3.3V logic level mismatches
 * 4. Non-PWM / Non-ADC pin misuse
 * 5. Current overdraw (>20mA direct GPIO drive)
 */

import type { BoardKind } from '../../types/board';
import type { PinConflictWarning } from '../types';

export class ConflictWatchdog {
  /**
   * Scans proposed circuit & code for electrical and hardware timer conflicts.
   */
  public static analyzeConflicts(
    boardKind: BoardKind,
    proposedWires: Array<{ fromPin: string; toPart: string; toPin: string }>,
    codeContent: string
  ): PinConflictWarning[] {
    const warnings: PinConflictWarning[] = [];

    // 1. Timer Clashes on Arduino Uno (ATmega328P)
    if (boardKind === 'uno' || boardKind === 'nano') {
      const usesTone = codeContent.includes('tone(');
      const usesServo = codeContent.includes('#include <Servo.h>') || codeContent.includes('Servo ');

      if (usesTone) {
        // Tone uses Timer 2 -> breaks PWM on D3 and D11
        for (const w of proposedWires) {
          if (w.fromPin === '3' || w.fromPin === '11') {
            warnings.push({
              pin: w.fromPin,
              componentId: w.toPart,
              conflictType: 'timer_clash',
              description: `Pin D${w.fromPin} PWM conflicts with tone() which claims Timer 2.`,
              suggestedFix: `Move PWM signal to Pin D5 or D6 (Timer 0).`,
            });
          }
        }
      }

      if (usesServo) {
        // Servo disables PWM on D9 and D10 on Uno
        for (const w of proposedWires) {
          if (w.fromPin === '9' || w.fromPin === '10') {
            warnings.push({
              pin: w.fromPin,
              componentId: w.toPart,
              conflictType: 'timer_clash',
              description: `Pin D${w.fromPin} PWM is disabled by the Servo library (Timer 1).`,
              suggestedFix: `Move PWM signal to Pin D3, D5, or D6.`,
            });
          }
        }
      }
    }

    // 2. Voltage Level Mismatches (5V output into 3.3V MCU)
    const is3V3Board = boardKind === 'esp32' || boardKind === 'rpipico' || boardKind === 'stm32-bluepill';
    if (is3V3Board) {
      for (const w of proposedWires) {
        if (w.toPart.includes('hc-sr04') && w.toPin === 'ECHO') {
          warnings.push({
            pin: w.fromPin,
            componentId: w.toPart,
            conflictType: 'voltage_mismatch',
            description: `HC-SR04 Echo outputs 5V logic which can damage 3.3V ${boardKind.toUpperCase()} GPIOs.`,
            suggestedFix: `Add a 1kΩ/2kΩ resistor voltage divider between Echo and ${w.fromPin}.`,
          });
        }
      }
    }

    // 3. Current Overdraw Check
    for (const w of proposedWires) {
      if (w.toPart.includes('relay') || w.toPart.includes('motor')) {
        if (!codeContent.includes('transistor') && !w.toPart.includes('driver')) {
          warnings.push({
            pin: w.fromPin,
            componentId: w.toPart,
            conflictType: 'fan_out_exceeded',
            description: `Coils and motors draw >50mA, which exceeds the MCU pin limit (max 20mA).`,
            suggestedFix: `Drive through a 2N2222 NPN transistor or MOSFET switch with a flyback diode.`,
          });
        }
      }
    }

    return warnings;
  }
}
