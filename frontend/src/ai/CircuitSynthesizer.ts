/**
 * VelxioAI Studio — Deterministic Circuit & Hardware Synthesizer
 *
 * Fallback & autonomous circuit generator that extracts electronic components
 * and standard pinout netlists from natural language or plain LLM text
 * when structured JSON is absent or incomplete.
 */

import type { CircuitProposal } from './types';

interface SynthesizedResult {
  components: Array<{
    id: string;
    type: string;
    left: number;
    top: number;
    attrs?: Record<string, string>;
  }>;
  wires: Array<{
    fromPart: string;
    fromPin: string;
    toPart: string;
    toPin: string;
    color?: string;
  }>;
}

export class CircuitSynthesizer {
  public static synthesizeFromText(text: string, boardKind = 'arduino-uno'): CircuitProposal | null {
    if (!text || text.trim().length < 10) return null;

    const lower = text.toLowerCase();
    const result: SynthesizedResult = { components: [], wires: [] };
    let xOffset = 280;
    let yOffset = 100;

    const addPart = (id: string, type: string, attrs: Record<string, string> = {}) => {
      if (result.components.some((c) => c.id === id)) return;
      result.components.push({
        id,
        type,
        left: xOffset,
        top: yOffset,
        attrs,
      });
      xOffset += 140;
      if (xOffset > 600) {
        xOffset = 280;
        yOffset += 130;
      }
    };

    const addWire = (fromPart: string, fromPin: string, toPart: string, toPin: string, color = '#2563eb') => {
      result.wires.push({ fromPart, fromPin, toPart, toPin, color });
    };

    // 1. LCD 16x2 Display
    if (lower.includes('lcd') || lower.includes('16x2') || lower.includes('liquidcrystal') || lower.includes('display')) {
      addPart('lcd1', 'wokwi-lcd1602');
      addWire('board', '5V', 'lcd1', 'VDD', '#ef4444');
      addWire('board', 'GND', 'lcd1', 'VSS', '#1f2937');
      addWire('board', '12', 'lcd1', 'RS', '#3b82f6');
      addWire('board', '11', 'lcd1', 'E', '#8b5cf6');
      addWire('board', '5', 'lcd1', 'D4', '#10b981');
      addWire('board', '4', 'lcd1', 'D5', '#f59e0b');
      addWire('board', '3', 'lcd1', 'D6', '#ec4899');
      addWire('board', '2', 'lcd1', 'D7', '#06b6d4');
      addWire('board', '5V', 'lcd1', 'A', '#ef4444');
      addWire('board', 'GND', 'lcd1', 'K', '#1f2937');
    }

    // 2. PIR Motion Sensor / Infrared / IR
    if (
      lower.includes('pir') ||
      lower.includes('motion') ||
      lower.includes('infrared') ||
      lower.includes('ir sensor') ||
      lower.includes('visitor')
    ) {
      addPart('pir1', 'wokwi-pir-motion-sensor');
      addWire('board', '5V', 'pir1', 'VCC', '#ef4444');
      addWire('board', 'GND', 'pir1', 'GND', '#1f2937');
      addWire('board', '7', 'pir1', 'OUT', '#10b981');
    }

    // 3. HC-SR04 Ultrasonic Distance Sensor
    if (lower.includes('ultrasonic') || lower.includes('hc-sr04') || lower.includes('distance sensor') || lower.includes('sonar')) {
      addPart('sonar1', 'wokwi-hc-sr04');
      addWire('board', '5V', 'sonar1', 'VCC', '#ef4444');
      addWire('board', 'GND', 'sonar1', 'GND', '#1f2937');
      addWire('board', '9', 'sonar1', 'TRIG', '#3b82f6');
      addWire('board', '10', 'sonar1', 'ECHO', '#10b981');
    }

    // 4. DHT22 / DHT11 Temperature & Humidity Sensor
    if (lower.includes('dht') || lower.includes('temperature') || lower.includes('humidity') || lower.includes('thermometer')) {
      addPart('dht1', 'wokwi-dht22', { temperature: '24', humidity: '50' });
      addWire('board', '5V', 'dht1', 'VCC', '#ef4444');
      addWire('board', 'GND', 'dht1', 'GND', '#1f2937');
      addWire('board', '4', 'dht1', 'SDA', '#3b82f6');
    }

    // 5. LED & Current Limiting Resistor
    if (lower.includes('led') && !lower.includes('oled') && !lower.includes('lcd')) {
      addPart('led1', 'wokwi-led', { color: 'red' });
      addPart('r1', 'wokwi-resistor', { resistance: '220' });
      addWire('board', '13', 'r1', '1', '#ef4444');
      addWire('r1', '2', 'led1', 'A', '#ef4444');
      addWire('board', 'GND', 'led1', 'C', '#1f2937');
    }

    // 6. Servo Motor
    if (lower.includes('servo') || lower.includes('motor')) {
      addPart('servo1', 'wokwi-servo');
      addWire('board', '5V', 'servo1', 'V+', '#ef4444');
      addWire('board', 'GND', 'servo1', 'GND', '#1f2937');
      addWire('board', '9', 'servo1', 'PWM', '#f59e0b');
    }

    // 7. Piezo Buzzer / Alarm
    if (lower.includes('buzzer') || lower.includes('alarm') || lower.includes('beep') || lower.includes('piezo')) {
      addPart('buzzer1', 'wokwi-buzzer');
      addWire('board', '8', 'buzzer1', '1', '#ef4444');
      addWire('board', 'GND', 'buzzer1', '2', '#1f2937');
    }

    // 8. Potentiometer (Analog dial)
    if (lower.includes('potentiometer') || lower.includes('pot') || lower.includes('knob') || lower.includes('analog read')) {
      addPart('pot1', 'wokwi-potentiometer');
      addWire('board', '5V', 'pot1', 'VCC', '#ef4444');
      addWire('board', 'GND', 'pot1', 'GND', '#1f2937');
      addWire('board', 'A0', 'pot1', 'SIG', '#3b82f6');
    }

    // 9. LDR Light / Photoresistor
    if (lower.includes('ldr') || lower.includes('photoresistor') || lower.includes('light sensor') || lower.includes('night light')) {
      addPart('ldr1', 'wokwi-photoresistor-sensor');
      addWire('board', '5V', 'ldr1', 'VCC', '#ef4444');
      addWire('board', 'GND', 'ldr1', 'GND', '#1f2937');
      addWire('board', 'A0', 'ldr1', 'AO', '#3b82f6');
    }

    // 10. SSD1306 I2C OLED
    if (lower.includes('oled') || lower.includes('ssd1306')) {
      addPart('oled1', 'wokwi-ssd1306');
      addWire('board', '5V', 'oled1', 'VCC', '#ef4444');
      addWire('board', 'GND', 'oled1', 'GND', '#1f2937');
      addWire('board', 'A4', 'oled1', 'SDA', '#3b82f6');
      addWire('board', 'A5', 'oled1', 'SCL', '#f59e0b');
    }

    // 11. Pushbutton
    if (lower.includes('button') || lower.includes('pushbutton') || lower.includes('switch')) {
      addPart('btn1', 'wokwi-pushbutton');
      addWire('board', '2', 'btn1', '1.l', '#3b82f6');
      addWire('board', 'GND', 'btn1', '2.r', '#1f2937');
    }

    // 12. Relay Module
    if (lower.includes('relay')) {
      addPart('relay1', 'wokwi-relay-module');
      addWire('board', '5V', 'relay1', 'VCC', '#ef4444');
      addWire('board', 'GND', 'relay1', 'GND', '#1f2937');
      addWire('board', '7', 'relay1', 'IN', '#3b82f6');
    }

    if (result.components.length === 0) return null;

    return {
      id: `circuit-${Date.now()}`,
      title: 'Synthesized Circuit',
      description: `Automatically assembled ${result.components.length} components and ${result.wires.length} wires`,
      componentsToAdd: result.components,
      componentsToRemove: [],
      wiresToAdd: result.wires,
      wiresToRemove: [],
      applied: false,
    };
  }
}
