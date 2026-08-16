/**
 * VelxioAI Studio — Deterministic Circuit Layout & Aesthetic Placement Engine
 *
 * Computes collision-free, aligned grid coordinates for boards and peripheral
 * components (sensors, displays, actuators, passives) so placed circuits
 * always look clean, organized, and professional without manual dragging.
 */

import type { CircuitComponentSpec, CircuitWireSpec } from './types';

export interface LayoutSlot {
  x: number;
  y: number;
}

export class CircuitLayoutEngine {
  // MCU Board placement origin
  public static readonly BOARD_ORIGIN: LayoutSlot = { x: 60, y: 100 };

  // Peripheral grid parameters (placed to the right of the board)
  public static readonly GRID_START_X = 380;
  public static readonly GRID_START_Y = 80;
  public static readonly COLUMN_SPACING = 190;
  public static readonly ROW_SPACING = 150;
  public static readonly MAX_ROWS_PER_COL = 3;

  /**
   * Assigns clean, non-overlapping grid positions to a list of components.
   * If a component already has custom intentional coordinates (far from default),
   * it preserves them; otherwise it arranges them in neat rows/columns.
   */
  public static layoutComponents(
    components: CircuitComponentSpec[],
    existingComponentsCount: number = 0
  ): CircuitComponentSpec[] {
    return components.map((comp, index) => {
      const globalIndex = existingComponentsCount + index;
      const col = Math.floor(globalIndex / this.MAX_ROWS_PER_COL);
      const row = globalIndex % this.MAX_ROWS_PER_COL;

      const calculatedX = this.GRID_START_X + col * this.COLUMN_SPACING;
      const calculatedY = this.GRID_START_Y + row * this.ROW_SPACING;

      // Use calculated clean slot if coordinates are near origin/default or colliding
      const isDefaultOrColliding =
        !comp.left ||
        !comp.top ||
        (comp.left >= 50 && comp.left <= 250 && comp.top >= 80 && comp.top <= 280);

      return {
        ...comp,
        left: isDefaultOrColliding ? calculatedX : comp.left,
        top: isDefaultOrColliding ? calculatedY : comp.top,
      };
    });
  }

  /**
   * Returns standard electrical wiring color based on pin function.
   * Red = 5V/VCC, Black = GND, Blue = SDA/TX/PWM, Yellow = SCL/RX, Green = GPIO.
   */
  public static getWireColor(fromPin: string, toPin: string, fallbackColor = '#3b82f6'): string {
    const p1 = (fromPin || '').toUpperCase();
    const p2 = (toPin || '').toUpperCase();

    // Power / VCC / 5V / 3V3
    if (p1.includes('5V') || p2.includes('5V') || p1.includes('VCC') || p2.includes('VCC') || p1.includes('VDD') || p2.includes('VDD')) {
      return '#ef4444'; // Red
    }
    if (p1.includes('3V') || p2.includes('3V') || p1.includes('3.3') || p2.includes('3.3')) {
      return '#f97316'; // Orange (3.3V)
    }

    // Ground / GND
    if (p1.includes('GND') || p2.includes('GND') || p1.includes('VSS') || p2.includes('VSS') || p1 === 'K' || p2 === 'K') {
      return '#1f2937'; // Black/Dark Slate
    }

    // I2C SDA / SCL
    if (p1.includes('SDA') || p2.includes('SDA')) return '#3b82f6'; // Blue
    if (p1.includes('SCL') || p2.includes('SCL')) return '#eab308'; // Yellow

    // SPI MOSI / MISO / SCK / CS
    if (p1.includes('MOSI') || p2.includes('MOSI')) return '#06b6d4'; // Cyan
    if (p1.includes('MISO') || p2.includes('MISO')) return '#14b8a6'; // Teal
    if (p1.includes('SCK') || p2.includes('SCK') || p1.includes('CLK') || p2.includes('CLK')) return '#f59e0b'; // Amber
    if (p1.includes('CS') || p2.includes('CS') || p1.includes('SS') || p2.includes('SS')) return '#a855f7'; // Purple

    // Analog Pins (A0-A5)
    if (/^A[0-7]$/.test(p1) || /^A[0-7]$/.test(p2)) {
      return '#8b5cf6'; // Violet
    }

    // Digital & PWM
    return fallbackColor || '#10b981'; // Green
  }

  /**
   * Normalizes wire specifications with standardized colors.
   */
  public static normalizeWires(wires: CircuitWireSpec[]): CircuitWireSpec[] {
    return wires.map((w) => ({
      ...w,
      color: w.color || this.getWireColor(w.fromPin, w.toPin),
    }));
  }
}
