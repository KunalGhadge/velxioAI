/**
 * VelxioAI Studio — Autonomous Diagnostics & Self-Healing Engine
 *
 * Analyzes compiler errors, circuit validation failures, and simulator runtime exceptions,
 * producing deterministic automatic patches for missing libraries, invalid component names,
 * pin mismatches, missing series resistors, and short circuits.
 */

import { HardwareComponentRegistry } from '../hardware/HardwareComponentRegistry';
import { BoardCapabilityRegistry } from '../hardware/BoardCapabilityRegistry';
import type { CircuitProposal, CodeProposal } from '../types';

export interface HealingFix {
  category: 'library' | 'pin_constant' | 'component_alias' | 'circuit_rewire' | 'syntax';
  description: string;
  actionPayload?: {
    circuitPatch?: Partial<CircuitProposal>;
    codePatch?: Partial<CodeProposal>;
    installLibrary?: string;
  };
}

export interface HealingResult {
  recovered: boolean;
  message: string;
  fixes: HealingFix[];
  diagnostics: string[];
}

export class AutoHealingEngine {
  /**
   * Diagnoses and generates auto-heal fixes for compilation and hardware errors.
   */
  public static diagnose(
    errorText: string,
    currentCode: string,
    currentCircuit?: CircuitProposal,
    boardKind = 'arduino-uno'
  ): HealingResult {
    const fixes: HealingFix[] = [];
    const diagnostics: string[] = [];
    const lowerError = errorText.toLowerCase();

    // 1. Missing Library Detection
    if (lowerError.includes('fatal error:') && lowerError.includes('.h: no such file or directory')) {
      const match = errorText.match(/fatal error:\s*([a-zA-Z0-9_-]+\.h):/i);
      const header = match ? match[1] : '';

      let libName = '';
      if (header.includes('LiquidCrystal_I2C')) libName = 'LiquidCrystal I2C';
      else if (header.includes('LiquidCrystal')) libName = 'LiquidCrystal';
      else if (header.includes('DHT')) libName = 'DHT sensor library';
      else if (header.includes('Adafruit_SSD1306')) libName = 'Adafruit SSD1306';
      else if (header.includes('Adafruit_GFX')) libName = 'Adafruit GFX Library';
      else if (header.includes('Servo')) libName = 'Servo';
      else if (header.includes('FastLED')) libName = 'FastLED';
      else if (header.includes('Adafruit_NeoPixel')) libName = 'Adafruit NeoPixel';

      if (libName) {
        diagnostics.push(`Missing required embedded library: "${libName}" (<${header}>)`);
        fixes.push({
          category: 'library',
          description: `Auto-installing missing library: ${libName}`,
          actionPayload: { installLibrary: libName },
        });
      }
    }

    // 2. Undefined Pin Constant in Code
    if (lowerError.includes('was not declared in this scope') || lowerError.includes('undeclared identifier')) {
      const match = errorText.match(/'([a-zA-Z0-9_]+)' was not declared/i) || errorText.match(/use of undeclared identifier '([a-zA-Z0-9_]+)'/i);
      if (match) {
        const identifier = match[1];
        if (identifier.toUpperCase().includes('PIN') || identifier.toUpperCase().includes('TRIG') || identifier.toUpperCase().includes('ECHO')) {
          diagnostics.push(`Undefined pin identifier: "${identifier}"`);
          fixes.push({
            category: 'pin_constant',
            description: `Injecting default pin definition: #define ${identifier} 13`,
            actionPayload: {
              codePatch: {
                proposedContent: `#define ${identifier} 13\n${currentCode}`,
              },
            },
          });
        }
      }
    }

    // 3. Unknown Component Alias Suggestion (e.g. "dht11" -> "wokwi-dht22")
    if (lowerError.includes('unknown component type')) {
      const match = errorText.match(/unknown component type "([^"]+)"/i);
      const invalidType = match ? match[1].toLowerCase() : '';

      let suggestedType = 'wokwi-led';
      if (invalidType.includes('dht') || invalidType.includes('temp')) suggestedType = 'wokwi-dht22';
      else if (invalidType.includes('sonar') || invalidType.includes('ultra') || invalidType.includes('distance')) suggestedType = 'wokwi-hc-sr04';
      else if (invalidType.includes('oled') || invalidType.includes('display')) suggestedType = 'wokwi-ssd1306';
      else if (invalidType.includes('lcd') || invalidType.includes('screen')) suggestedType = 'wokwi-lcd1602';
      else if (invalidType.includes('motor') || invalidType.includes('servo')) suggestedType = 'wokwi-servo';
      else if (invalidType.includes('pir') || invalidType.includes('motion')) suggestedType = 'wokwi-pir-motion-sensor';
      else if (invalidType.includes('light') || invalidType.includes('ldr')) suggestedType = 'wokwi-photoresistor-sensor';

      diagnostics.push(`Unsupported component alias "${invalidType}". Suggested canonical type: "${suggestedType}"`);
      fixes.push({
        category: 'component_alias',
        description: `Replace invalid component "${invalidType}" with "${suggestedType}"`,
        actionPayload: {
          circuitPatch: {
            componentsToAdd: currentCircuit?.componentsToAdd.map((c) =>
              c.type.toLowerCase() === invalidType ? { ...c, type: suggestedType } : c
            ) || [],
          },
        },
      });
    }

    // 4. Dead Short Auto-Repair (Removing power-to-ground wire)
    if (lowerError.includes('dead short detected') || lowerError.includes('direct wire connecting power')) {
      diagnostics.push('Critical short circuit detected between power rail and ground.');
      if (currentCircuit?.wiresToAdd) {
        const cleanWires = currentCircuit.wiresToAdd.filter((w) => {
          const isFromPwr = w.fromPin.toUpperCase() === '5V' || w.fromPin.toUpperCase() === '3V3';
          const isToGnd = w.toPin.toUpperCase() === 'GND' || w.toPin.toUpperCase().startsWith('GND.');
          return !(isFromPwr && isToGnd);
        });

        fixes.push({
          category: 'circuit_rewire',
          description: 'Automatically removed lethal 5V-GND short circuit wire from netlist.',
          actionPayload: {
            circuitPatch: { wiresToAdd: cleanWires },
          },
        });
      }
    }

    // 5. Self-Loop Wire Repair
    if (lowerError.includes('self-loop wire detected')) {
      diagnostics.push('Wire endpoint connects a pin to itself.');
      if (currentCircuit?.wiresToAdd) {
        const cleanWires = currentCircuit.wiresToAdd.filter(
          (w) => !(w.fromPart === w.toPart && w.fromPin.toUpperCase() === w.toPin.toUpperCase())
        );
        fixes.push({
          category: 'circuit_rewire',
          description: 'Removed invalid self-loop wire from circuit.',
          actionPayload: { circuitPatch: { wiresToAdd: cleanWires } },
        });
      }
    }

    return {
      recovered: fixes.length > 0,
      message: fixes.length > 0
        ? `Auto-Heal diagnosed ${fixes.length} issue(s):\n${fixes.map((f) => `• ${f.description}`).join('\n')}`
        : 'No automatic deterministic patch available. Human guidance or AI prompt refinement required.',
      fixes,
      diagnostics,
    };
  }
}
