/**
 * VelxioAI Studio — Pre-Flight Deterministic Circuit Validator
 *
 * Validates AI-generated CircuitProposals BEFORE applying them to the canvas.
 * Prevents invalid pins, unknown components, self-loops, VCC-GND shorts,
 * and electrical regressions.
 */

import { ComponentRegistry } from '../../services/ComponentRegistry';
import { BoardCapabilityRegistry } from '../hardware/BoardCapabilityRegistry';
import { HardwareComponentRegistry } from '../hardware/HardwareComponentRegistry';
import type { CircuitProposal } from '../types';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  componentId?: string;
}

export interface CircuitValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[];
}

export const COMPONENT_PIN_DEFINITIONS: Record<string, string[]> = {
  'wokwi-hc-sr04': ['VCC', 'TRIG', 'ECHO', 'GND'],
  'wokwi-dht22': ['VCC', 'SDA', 'NC', 'GND'],
  'wokwi-pir-motion-sensor': ['VCC', 'OUT', 'GND'],
  'wokwi-photoresistor-sensor': ['VCC', 'GND', 'AO', 'DO'],
  'wokwi-potentiometer': ['GND', 'SIG', 'VCC'],
  'wokwi-ds18b20': ['GND', 'DQ', 'VDD'],
  'wokwi-mpu6050': ['VCC', 'GND', 'SCL', 'SDA', 'XDA', 'XCL', 'AD0', 'INT'],
  'wokwi-bmp280': ['VCC', 'GND', 'SCL', 'SDA', 'CSB', 'SDO'],
  'wokwi-lcd1602': ['VSS', 'VDD', 'V0', 'RS', 'RW', 'E', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'A', 'K'],
  'wokwi-ssd1306': ['VCC', 'GND', 'SCL', 'SDA'],
  'wokwi-7segment': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP', 'COM.1', 'COM.2', 'DIG1', 'DIG2', 'DIG3', 'DIG4'],
  'wokwi-ili9341': ['VCC', 'GND', 'CS', 'RESET', 'DC', 'MOSI', 'SCK', 'LED', 'MISO'],
  'wokwi-led': ['A', 'C'],
  'wokwi-rgb-led': ['R', 'COM', 'G', 'B', 'ANODE', 'CATHODE'],
  'wokwi-servo': ['GND', 'V+', 'PWM'],
  'wokwi-buzzer': ['1', '2'],
  'wokwi-relay-module': ['VCC', 'GND', 'IN', 'NO', 'COM', 'NC'],
  'wokwi-neopixel': ['VDD', 'DIN', 'GND', 'DOUT'],
  'wokwi-pushbutton': ['1.l', '1.r', '2.l', '2.r', '1', '2'],
  'wokwi-slide-switch': ['1', '2', '3', 'COM'],
  'wokwi-membrane-keypad': ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'],
  'wokwi-pcf8574': ['VCC', 'GND', 'SCL', 'SDA', 'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'INT', 'A0', 'A1', 'A2'],
  'wokwi-ds1307': ['VCC', 'GND', 'SCL', 'SDA', 'SQW', '5V', 'BAT'],
  'wokwi-resistor': ['1', '2'],
};

export const BOARD_PIN_DEFINITIONS: Record<string, string[]> = {
  'arduino-uno': [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
    'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
    '5V', '3V3', '3.3V', 'GND', 'GND.1', 'GND.2', 'GND.3', 'VIN', 'RESET', 'AREF', 'IOREF',
  ],
  'arduino-nano': [
    'TX', 'RX', 'RST', 'GND', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13',
    '3V3', 'REF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'VIN', 'RESET',
  ],
  'arduino-mega': [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
    '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27',
    '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41',
    '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53',
    'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15',
    '5V', '3V3', 'GND', 'GND.1', 'GND.2', 'GND.3', 'GND.4', 'GND.5', 'VIN', 'RESET',
  ],
  'esp32': [
    '0', '2', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33', '34', '35', '36', '39',
    'D0', 'D2', 'D4', 'D5', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D21', 'D22', 'D23', 'D25', 'D26', 'D27', 'D32', 'D33', 'D34', 'D35', 'D36', 'D39',
    '3V3', 'GND', 'GND.1', 'GND.2', 'VIN', 'EN', 'VP', 'VN',
  ],
  'esp32-c3': [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '20', '21',
    'GPIO0', 'GPIO1', 'GPIO2', 'GPIO3', 'GPIO4', 'GPIO5', 'GPIO6', 'GPIO7', 'GPIO8', 'GPIO9', 'GPIO10', 'GPIO20', 'GPIO21',
    '3V3', 'GND', 'GND.1', 'VIN', '5V',
  ],
  'raspberry-pi-pico': [
    'GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9', 'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15',
    'GP16', 'GP17', 'GP18', 'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '26', '27', '28',
    '3V3', '3V3_EN', 'GND', 'GND.1', 'GND.2', 'GND.3', 'GND.4', 'GND.5', 'GND.6', 'GND.7', 'GND.8', 'VSYS', 'VBUS', 'RUN', 'ADC_VREF',
  ],
};

export class CircuitValidator {
  /**
   * Validates a complete circuit proposal before applying it to the canvas.
   */
  public static validate(proposal: CircuitProposal, targetBoardKind = 'arduino-uno'): CircuitValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const issues: ValidationIssue[] = [];

    const registry = ComponentRegistry.getInstance();
    const boardKey = (proposal.boardKind || targetBoardKind).toLowerCase();
    const boardPins = BOARD_PIN_DEFINITIONS[boardKey] || BOARD_PIN_DEFINITIONS['arduino-uno'];

    // Map of component ID -> verified component type tag
    const partTypeMap: Record<string, string> = {
      board: 'board',
      arduino: 'board',
      uno: 'board',
      'arduino-uno': 'board',
      mcu: 'board',
    };

    // 1. Validate Components to Add
    if (proposal.componentsToAdd && Array.isArray(proposal.componentsToAdd)) {
      for (const comp of proposal.componentsToAdd) {
        if (!comp.type || typeof comp.type !== 'string' || comp.type.trim().length === 0) {
          const msg = `Component ${comp.id || 'unknown'} has missing or empty type.`;
          errors.push(msg);
          issues.push({ severity: 'error', code: 'MISSING_TYPE', message: msg, componentId: comp.id });
          continue;
        }

        const normalizedType = comp.type.startsWith('wokwi-') || comp.type.startsWith('velxio-')
          ? comp.type
          : `wokwi-${comp.type}`;

        const rawType = comp.type.replace(/^(wokwi|velxio)-/, '').toLowerCase();
        const meta = registry.getById(rawType) || registry.getById(comp.type);

        if (!meta && !COMPONENT_PIN_DEFINITIONS[normalizedType]) {
          const msg = `Unknown component type "${comp.type}". This component is not registered in the hardware library.`;
          errors.push(msg);
          issues.push({ severity: 'error', code: 'UNKNOWN_COMPONENT', message: msg, componentId: comp.id });
          continue;
        }

        const resolvedTag = meta ? meta.tagName : normalizedType;
        const compId = comp.id || `${rawType}_${Date.now()}`;
        partTypeMap[compId] = resolvedTag;
        partTypeMap[comp.id || ''] = resolvedTag;
      }
    }

    // 2. Validate Wires
    if (proposal.wiresToAdd && Array.isArray(proposal.wiresToAdd)) {
      const seenNets = new Set<string>();

      for (const wire of proposal.wiresToAdd) {
        const fromPart = wire.fromPart || 'board';
        const toPart = wire.toPart;
        const fromPin = (wire.fromPin || '').trim();
        const toPin = (wire.toPin || '').trim();

        // 2a. Self-loop wire check
        if (fromPart === toPart && fromPin.toUpperCase() === toPin.toUpperCase()) {
          const msg = `Self-loop wire detected on ${fromPart}:${fromPin}. Wire connects a pin to itself.`;
          errors.push(msg);
          issues.push({ severity: 'error', code: 'SELF_LOOP_WIRE', message: msg });
          continue;
        }

        // 2b. Endpoint part existence
        const fromType = partTypeMap[fromPart];
        const toType = partTypeMap[toPart];

        if (!fromType && fromPart !== 'board') {
          const msg = `Wire origin references non-existent component "${fromPart}".`;
          errors.push(msg);
          issues.push({ severity: 'error', code: 'UNKNOWN_ENDPOINT', message: msg });
        }

        if (!toType && toPart !== 'board') {
          const msg = `Wire destination references non-existent component "${toPart}".`;
          errors.push(msg);
          issues.push({ severity: 'error', code: 'UNKNOWN_ENDPOINT', message: msg });
        }

        // 2c. Pin existence on origin
        if (fromType === 'board') {
          if (!boardPins.map((p) => p.toUpperCase()).includes(fromPin.toUpperCase())) {
            const msg = `Invalid board pin "${fromPin}" on ${boardKey}. Available pins: ${boardPins.slice(0, 15).join(', ')}...`;
            errors.push(msg);
            issues.push({ severity: 'error', code: 'INVALID_PIN', message: msg });
          }
        } else if (fromType && COMPONENT_PIN_DEFINITIONS[fromType]) {
          const validPins = COMPONENT_PIN_DEFINITIONS[fromType].map((p) => p.toUpperCase());
          if (!validPins.includes(fromPin.toUpperCase())) {
            const msg = `Invalid pin "${fromPin}" on component ${fromPart} (${fromType}). Valid pins: [${COMPONENT_PIN_DEFINITIONS[fromType].join(', ')}]`;
            errors.push(msg);
            issues.push({ severity: 'error', code: 'INVALID_PIN', message: msg, componentId: fromPart });
          }
        }

        // 2d. Pin existence on destination
        if (toType === 'board') {
          if (!boardPins.map((p) => p.toUpperCase()).includes(toPin.toUpperCase())) {
            const msg = `Invalid board pin "${toPin}" on ${boardKey}.`;
            errors.push(msg);
            issues.push({ severity: 'error', code: 'INVALID_PIN', message: msg });
          }
        } else if (toType && COMPONENT_PIN_DEFINITIONS[toType]) {
          const validPins = COMPONENT_PIN_DEFINITIONS[toType].map((p) => p.toUpperCase());
          if (!validPins.includes(toPin.toUpperCase())) {
            const msg = `Invalid pin "${toPin}" on component ${toPart} (${toType}). Valid pins: [${COMPONENT_PIN_DEFINITIONS[toType].join(', ')}]`;
            errors.push(msg);
            issues.push({ severity: 'error', code: 'INVALID_PIN', message: msg, componentId: toPart });
          }
        }

        // 2e. Short circuit check (Direct 5V/VCC to GND wire)
        const isFromPower = fromPin.toUpperCase() === '5V' || fromPin.toUpperCase() === '3V3' || fromPin.toUpperCase() === 'VCC';
        const isToGnd = toPin.toUpperCase() === 'GND' || toPin.toUpperCase().startsWith('GND.');
        const isFromGnd = fromPin.toUpperCase() === 'GND' || fromPin.toUpperCase().startsWith('GND.');
        const isToPower = toPin.toUpperCase() === '5V' || toPin.toUpperCase() === '3V3' || toPin.toUpperCase() === 'VCC';

        if ((isFromPower && isToGnd) || (isFromGnd && isToPower)) {
          if (fromType === 'board' && toType === 'board') {
            const msg = `DEAD SHORT DETECTED: Direct wire connecting Power (${fromPin}) directly to Ground (${toPin}).`;
            errors.push(msg);
            issues.push({ severity: 'error', code: 'POWER_SHORT', message: msg });
          }
        }

        // 2f. Duplicate net tracking
        const netA = `${fromPart}:${fromPin.toUpperCase()}-${toPart}:${toPin.toUpperCase()}`;
        const netB = `${toPart}:${toPin.toUpperCase()}-${fromPart}:${fromPin.toUpperCase()}`;
        if (seenNets.has(netA) || seenNets.has(netB)) {
          warnings.push(`Duplicate wire between ${fromPart}:${fromPin} and ${toPart}:${toPin}.`);
        }
        seenNets.add(netA);
      }
    }

    // 3. Detect Duplicate I2C Addresses on the I2C Bus
    if (proposal.componentsToAdd && Array.isArray(proposal.componentsToAdd)) {
      const seenI2CAddresses = new Map<number, string>();

      for (const comp of proposal.componentsToAdd) {
        if (!comp.type) continue;
        const compId = comp.id || comp.type;
        const profile = HardwareComponentRegistry.getComponent(comp.type);

        let i2cAddr: number | undefined;
        if (comp.attrs?.i2cAddress !== undefined) {
          const raw = comp.attrs.i2cAddress;
          i2cAddr = typeof raw === 'string' ? parseInt(raw, 16) || parseInt(raw, 10) : Number(raw);
        } else if (comp.attrs?.address !== undefined) {
          const raw = comp.attrs.address;
          i2cAddr = typeof raw === 'string' ? parseInt(raw, 16) || parseInt(raw, 10) : Number(raw);
        } else if (profile && profile.busType === 'i2c' && profile.i2cDefaultAddress !== undefined) {
          i2cAddr = profile.i2cDefaultAddress;
        }

        if (i2cAddr !== undefined && !isNaN(i2cAddr)) {
          const hex = `0x${i2cAddr.toString(16).toUpperCase()}`;
          if (seenI2CAddresses.has(i2cAddr)) {
            const conflictId = seenI2CAddresses.get(i2cAddr);
            const msg = `Duplicate I2C address ${hex} detected between components "${conflictId}" and "${compId}". I2C address collision will corrupt bus communication.`;
            errors.push(msg);
            issues.push({
              severity: 'error',
              code: 'DUPLICATE_I2C_ADDRESS',
              message: msg,
              componentId: compId,
            });
          } else {
            seenI2CAddresses.set(i2cAddr, compId);
          }
        }
      }
    }

    // 4. Electrical Connectivity, Power Verification & Orphan Component Rules
    if (
      proposal.componentsToAdd &&
      Array.isArray(proposal.componentsToAdd) &&
      proposal.componentsToAdd.length > 0
    ) {
      // Map of componentId -> Set of uppercase connected pin names
      const wiredPinsByComponent = new Map<string, Set<string>>();
      const wires = proposal.wiresToAdd && Array.isArray(proposal.wiresToAdd) ? proposal.wiresToAdd : [];

      for (const wire of wires) {
        const fromPart = wire.fromPart || 'board';
        const toPart = wire.toPart;
        const fromPin = (wire.fromPin || '').toUpperCase();
        const toPin = (wire.toPin || '').toUpperCase();

        if (!wiredPinsByComponent.has(fromPart)) wiredPinsByComponent.set(fromPart, new Set());
        wiredPinsByComponent.get(fromPart)!.add(fromPin);

        if (!wiredPinsByComponent.has(toPart)) wiredPinsByComponent.set(toPart, new Set());
        wiredPinsByComponent.get(toPart)!.add(toPin);
      }

      for (const comp of proposal.componentsToAdd) {
        if (!comp.type) continue;
        const compId = comp.id || comp.type;
        const profile = HardwareComponentRegistry.getComponent(comp.type);
        const connectedPins = wiredPinsByComponent.get(compId) || new Set<string>();

        if (!profile) continue;

        // 4a. Check for Orphan Components with 0 Total Connections
        if (connectedPins.size === 0) {
          const msg = `ORPHAN COMPONENT: Component "${compId}" (${profile.name}) has zero wire connections.`;
          errors.push(msg);
          issues.push({
            severity: 'error',
            code: 'ORPHAN_COMPONENT',
            message: msg,
            componentId: compId,
          });
          continue;
        }

        // 4b. Check Unpowered Sensors / Active ICs
        if (profile.powerPins.vcc) {
          const vccPin = profile.powerPins.vcc.toUpperCase();
          if (!connectedPins.has(vccPin)) {
            const msg = `UNPOWERED SENSOR: Component "${compId}" (${profile.name}) is missing a power connection on pin "${profile.powerPins.vcc}".`;
            errors.push(msg);
            issues.push({
              severity: 'error',
              code: 'UNPOWERED_SENSOR',
              message: msg,
              componentId: compId,
            });
          }
        }

        if (profile.powerPins.gnd) {
          const gndPin = profile.powerPins.gnd.toUpperCase();
          if (!connectedPins.has(gndPin)) {
            const msg = `UNPOWERED SENSOR / NO GROUND: Component "${compId}" (${profile.name}) is missing a ground return path on pin "${profile.powerPins.gnd}".`;
            errors.push(msg);
            issues.push({
              severity: 'error',
              code: 'UNPOWERED_SENSOR',
              message: msg,
              componentId: compId,
            });
          }
        }

        // 4b. Check Unconnected Analog & Digital Signal Lines
        const hasDualOutputs = profile.id === 'wokwi-photoresistor-sensor' || profile.id === 'wokwi-sound-sensor';
        if (hasDualOutputs) {
          const hasAO = connectedPins.has('AO');
          const hasDO = connectedPins.has('DO');
          if (!hasAO && !hasDO) {
            const msg = `UNCONNECTED SENSOR OUTPUT: Sensor component "${compId}" (${profile.name}) has no signal output connected (neither AO nor DO).`;
            errors.push(msg);
            issues.push({
              severity: 'error',
              code: 'UNCONNECTED_ANALOG_INPUT',
              message: msg,
              componentId: compId,
            });
          }
          continue;
        }

        for (const pin of profile.pins) {
          const pinNameUpper = pin.name.toUpperCase();
          if (pin.signalType === 'analog_in' || pin.signalType === 'analog_out') {
            if (!connectedPins.has(pinNameUpper)) {
              const msg = `UNCONNECTED ANALOG INPUT: Analog signal pin "${pin.name}" on component "${compId}" (${profile.name}) is floating and unconnected.`;
              errors.push(msg);
              issues.push({
                severity: 'error',
                code: 'UNCONNECTED_ANALOG_INPUT',
                message: msg,
                componentId: compId,
              });
            }
          }

          // 4c. Check Unconnected Digital Inputs, Outputs & Bus Lines
          if (
            pin.signalType === 'digital_in' ||
            pin.signalType === 'digital_out' ||
            pin.signalType === 'pwm_in' ||
            pin.signalType === 'i2c_sda' ||
            pin.signalType === 'i2c_scl'
          ) {
            // For LCD parallel data pins in 4-bit mode (D0-D3 are optional)
            if (profile.id === 'wokwi-lcd1602' && ['D0', 'D1', 'D2', 'D3'].includes(pinNameUpper)) {
              continue;
            }
            // For NeoPixel DOUT cascade pin (optional)
            if (profile.id === 'wokwi-neopixel' && pinNameUpper === 'DOUT') {
              continue;
            }
            if (!connectedPins.has(pinNameUpper)) {
              const msg = `UNCONNECTED DIGITAL PIN: Required digital/bus signal pin "${pin.name}" on component "${compId}" (${profile.name}) is floating and unconnected.`;
              errors.push(msg);
              issues.push({
                severity: 'error',
                code: 'UNCONNECTED_DIGITAL_INPUT',
                message: msg,
                componentId: compId,
              });
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      issues,
    };
  }
}
