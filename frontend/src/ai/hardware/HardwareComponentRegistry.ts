/**
 * VelxioAI Studio — Hardware Component Profile Registry
 *
 * Provides comprehensive pin configurations, electrical specifications,
 * power connections, and required automatic support components (e.g. 220Ω resistors for LEDs).
 */

import { ComponentRegistry } from '../../services/ComponentRegistry';

export type ComponentCategory =
  | 'sensors'
  | 'displays'
  | 'actuators'
  | 'passives'
  | 'inputs'
  | 'logic'
  | 'communication';

export type BusType = 'i2c' | 'spi' | 'uart' | 'gpio' | 'analog' | 'pwm' | 'passive';

export interface HardwarePinSpec {
  name: string;
  signalType: 'power_vcc' | 'power_gnd' | 'digital_in' | 'digital_out' | 'digital_bidir' | 'analog_in' | 'analog_out' | 'pwm_in' | 'i2c_sda' | 'i2c_scl' | 'spi_mosi' | 'spi_miso' | 'spi_sck' | 'spi_cs' | 'passive_terminal' | 'nc';
  description?: string;
}

export interface SupportComponentRequirement {
  type: 'wokwi-resistor';
  placement: 'in_series' | 'pullup' | 'pulldown';
  targetPin: string;
  defaultValue: string;
  purpose: string;
}

export interface HardwareComponentProfile {
  id: string;
  tagName: string;
  name: string;
  category: ComponentCategory;
  busType: BusType;
  i2cDefaultAddress?: number;
  recommendedVoltage: 3.3 | 5.0 | 'any';
  pins: HardwarePinSpec[];
  powerPins: {
    vcc?: string;
    gnd?: string;
  };
  requiredSupportCircuitry?: SupportComponentRequirement[];
}

export const HARDWARE_COMPONENT_PROFILES: Record<string, HardwareComponentProfile> = {
  'wokwi-led': {
    id: 'wokwi-led',
    tagName: 'wokwi-led',
    name: 'LED',
    category: 'actuators',
    busType: 'gpio',
    recommendedVoltage: 5.0,
    pins: [
      { name: 'A', signalType: 'digital_in', description: 'Anode (+)' },
      { name: 'C', signalType: 'power_gnd', description: 'Cathode (-)' },
    ],
    powerPins: { gnd: 'C' },
    requiredSupportCircuitry: [
      {
        type: 'wokwi-resistor',
        placement: 'in_series',
        targetPin: 'A',
        defaultValue: '220',
        purpose: 'Current limiting resistor to prevent LED burnout',
      },
    ],
  },
  'wokwi-resistor': {
    id: 'wokwi-resistor',
    tagName: 'wokwi-resistor',
    name: 'Resistor',
    category: 'passives',
    busType: 'passive',
    recommendedVoltage: 'any',
    pins: [
      { name: '1', signalType: 'passive_terminal', description: 'Terminal 1' },
      { name: '2', signalType: 'passive_terminal', description: 'Terminal 2' },
    ],
    powerPins: {},
  },
  'wokwi-hc-sr04': {
    id: 'wokwi-hc-sr04',
    tagName: 'wokwi-hc-sr04',
    name: 'Ultrasonic Distance Sensor (HC-SR04)',
    category: 'sensors',
    busType: 'gpio',
    recommendedVoltage: 5.0,
    pins: [
      { name: 'VCC', signalType: 'power_vcc', description: 'Power (+5V)' },
      { name: 'TRIG', signalType: 'digital_in', description: 'Trigger Pulse Input' },
      { name: 'ECHO', signalType: 'digital_out', description: 'Echo Pulse Output' },
      { name: 'GND', signalType: 'power_gnd', description: 'Ground' },
    ],
    powerPins: { vcc: 'VCC', gnd: 'GND' },
  },
  'wokwi-dht22': {
    id: 'wokwi-dht22',
    tagName: 'wokwi-dht22',
    name: 'DHT22 Temperature & Humidity Sensor',
    category: 'sensors',
    busType: 'gpio',
    recommendedVoltage: 5.0,
    pins: [
      { name: 'VCC', signalType: 'power_vcc', description: 'Power (+3.3V to 5V)' },
      { name: 'SDA', signalType: 'digital_bidir', description: 'Single-bus Serial Data' },
      { name: 'NC', signalType: 'nc', description: 'No Connection' },
      { name: 'GND', signalType: 'power_gnd', description: 'Ground' },
    ],
    powerPins: { vcc: 'VCC', gnd: 'GND' },
  },
  'wokwi-pir-motion-sensor': {
    id: 'wokwi-pir-motion-sensor',
    tagName: 'wokwi-pir-motion-sensor',
    name: 'PIR Motion Sensor',
    category: 'sensors',
    busType: 'gpio',
    recommendedVoltage: 5.0,
    pins: [
      { name: 'VCC', signalType: 'power_vcc', description: 'Power (+5V)' },
      { name: 'OUT', signalType: 'digital_out', description: 'Digital Motion Trigger' },
      { name: 'GND', signalType: 'power_gnd', description: 'Ground' },
    ],
    powerPins: { vcc: 'VCC', gnd: 'GND' },
  },
  'wokwi-servo': {
    id: 'wokwi-servo',
    tagName: 'wokwi-servo',
    name: 'Servo Motor',
    category: 'actuators',
    busType: 'pwm',
    recommendedVoltage: 5.0,
    pins: [
      { name: 'GND', signalType: 'power_gnd', description: 'Ground (Brown/Black)' },
      { name: 'V+', signalType: 'power_vcc', description: 'Power +5V (Red)' },
      { name: 'PWM', signalType: 'pwm_in', description: 'PWM Signal (Orange/Yellow)' },
    ],
    powerPins: { vcc: 'V+', gnd: 'GND' },
  },
  'wokwi-buzzer': {
    id: 'wokwi-buzzer',
    tagName: 'wokwi-buzzer',
    name: 'Piezo Buzzer',
    category: 'actuators',
    busType: 'pwm',
    recommendedVoltage: 5.0,
    pins: [
      { name: '1', signalType: 'pwm_in', description: 'Positive Signal (+)' },
      { name: '2', signalType: 'power_gnd', description: 'Ground (-)' },
    ],
    powerPins: { gnd: '2' },
  },
  'wokwi-photoresistor-sensor': {
    id: 'wokwi-photoresistor-sensor',
    tagName: 'wokwi-photoresistor-sensor',
    name: 'Light Sensor (LDR Photoresistor)',
    category: 'sensors',
    busType: 'analog',
    recommendedVoltage: 5.0,
    pins: [
      { name: 'VCC', signalType: 'power_vcc', description: 'Power (+5V)' },
      { name: 'GND', signalType: 'power_gnd', description: 'Ground' },
      { name: 'AO', signalType: 'analog_out', description: 'Analog Voltage Output' },
      { name: 'DO', signalType: 'digital_out', description: 'Digital Threshold Output' },
    ],
    powerPins: { vcc: 'VCC', gnd: 'GND' },
  },
  'wokwi-potentiometer': {
    id: 'wokwi-potentiometer',
    tagName: 'wokwi-potentiometer',
    name: 'Rotary Potentiometer',
    category: 'inputs',
    busType: 'analog',
    recommendedVoltage: 5.0,
    pins: [
      { name: 'GND', signalType: 'power_gnd', description: 'Ground' },
      { name: 'SIG', signalType: 'analog_out', description: 'Analog Wiper Signal' },
      { name: 'VCC', signalType: 'power_vcc', description: 'Reference Voltage' },
    ],
    powerPins: { vcc: 'VCC', gnd: 'GND' },
  },
  'wokwi-pushbutton': {
    id: 'wokwi-pushbutton',
    tagName: 'wokwi-pushbutton',
    name: 'Pushbutton Switch',
    category: 'inputs',
    busType: 'gpio',
    recommendedVoltage: 'any',
    pins: [
      { name: '1.l', signalType: 'digital_in', description: 'Terminal 1 Left' },
      { name: '2.r', signalType: 'power_gnd', description: 'Terminal 2 Right' },
    ],
    powerPins: { gnd: '2.r' },
  },
  'wokwi-ssd1306': {
    id: 'wokwi-ssd1306',
    tagName: 'wokwi-ssd1306',
    name: 'I2C 128x64 OLED Display (SSD1306)',
    category: 'displays',
    busType: 'i2c',
    i2cDefaultAddress: 0x3c,
    recommendedVoltage: 3.3,
    pins: [
      { name: 'VCC', signalType: 'power_vcc', description: 'Power (+3.3V or 5V)' },
      { name: 'GND', signalType: 'power_gnd', description: 'Ground' },
      { name: 'SCL', signalType: 'i2c_scl', description: 'I2C Serial Clock' },
      { name: 'SDA', signalType: 'i2c_sda', description: 'I2C Serial Data' },
    ],
    powerPins: { vcc: 'VCC', gnd: 'GND' },
  },
  'wokwi-lcd1602': {
    id: 'wokwi-lcd1602',
    tagName: 'wokwi-lcd1602',
    name: '16x2 Character LCD (HD44780)',
    category: 'displays',
    busType: 'gpio',
    recommendedVoltage: 5.0,
    pins: [
      { name: 'VSS', signalType: 'power_gnd', description: 'Ground' },
      { name: 'VDD', signalType: 'power_vcc', description: 'Power (+5V)' },
      { name: 'V0', signalType: 'analog_in', description: 'Contrast Adjust' },
      { name: 'RS', signalType: 'digital_in', description: 'Register Select' },
      { name: 'RW', signalType: 'power_gnd', description: 'Read/Write (GND for write)' },
      { name: 'E', signalType: 'digital_in', description: 'Enable Strobe' },
      { name: 'D4', signalType: 'digital_in', description: 'Data Bit 4' },
      { name: 'D5', signalType: 'digital_in', description: 'Data Bit 5' },
      { name: 'D6', signalType: 'digital_in', description: 'Data Bit 6' },
      { name: 'D7', signalType: 'digital_in', description: 'Data Bit 7' },
      { name: 'A', signalType: 'power_vcc', description: 'Backlight Anode (+5V)' },
      { name: 'K', signalType: 'power_gnd', description: 'Backlight Cathode (GND)' },
    ],
    powerPins: { vcc: 'VDD', gnd: 'VSS' },
  },
};

import { ComponentAliasRegistry } from './ComponentAliasRegistry';

export class HardwareComponentRegistry {
  public static getComponent(type: string): HardwareComponentProfile | null {
    if (!type) return null;
    const resolvedTag = ComponentAliasRegistry.resolve(type);
    if (HARDWARE_COMPONENT_PROFILES[resolvedTag]) {
      return HARDWARE_COMPONENT_PROFILES[resolvedTag];
    }
    const normalized = type.startsWith('wokwi-') || type.startsWith('velxio-') ? type : `wokwi-${type}`;
    if (HARDWARE_COMPONENT_PROFILES[normalized]) {
      return HARDWARE_COMPONENT_PROFILES[normalized];
    }
    const raw = type.replace(/^(wokwi|velxio)-/, '').toLowerCase();
    const match = Object.values(HARDWARE_COMPONENT_PROFILES).find(
      (p) => p.id.replace(/^(wokwi|velxio)-/, '').toLowerCase() === raw
    );
    if (match) return match;

    // Adapt from ComponentRegistry metadata if available
    const meta = ComponentRegistry.getInstance().getById(raw) || ComponentRegistry.getInstance().getById(type);
    if (meta) {
      return {
        id: meta.tagName || normalized,
        tagName: meta.tagName || normalized,
        name: meta.name || raw,
        category: (meta.category as ComponentCategory) || 'sensors',
        busType: 'gpio',
        recommendedVoltage: 5.0,
        pins: [],
        powerPins: { vcc: 'VCC', gnd: 'GND' },
      };
    }
    return null;
  }

  public static getPinNames(type: string): string[] {
    const comp = this.getComponent(type);
    return comp ? comp.pins.map((p) => p.name) : [];
  }

  public static getPowerPins(type: string): { vcc?: string; gnd?: string } {
    const comp = this.getComponent(type);
    return comp?.powerPins || {};
  }

  public static getRequiredSupportParts(type: string): SupportComponentRequirement[] {
    const comp = this.getComponent(type);
    return comp?.requiredSupportCircuitry || [];
  }

  public static isI2C(type: string): boolean {
    const comp = this.getComponent(type);
    return comp?.busType === 'i2c';
  }

  public static getAllProfiles(): HardwareComponentProfile[] {
    return Object.values(HARDWARE_COMPONENT_PROFILES);
  }
}
