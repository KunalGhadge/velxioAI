/**
 * VelxioAI Studio — Board Capability Registry
 *
 * Authoritative hardware profile registry providing exact digital, analog,
 * PWM, I2C, SPI, UART, power, and ground pinout definitions for all supported boards.
 */

import type { BoardKind } from '../../types/board';

export interface BoardBusPins {
  i2c: {
    sda: string;
    scl: string;
    alternate?: Array<{ sda: string; scl: string }>;
  };
  spi: {
    mosi: string;
    miso: string;
    sck: string;
    csDefault?: string;
  };
  uart: {
    tx: string;
    rx: string;
  };
}

export interface BoardPowerRails {
  voltage3V3: string[];
  voltage5V: string[];
  ground: string[];
  vin?: string[];
}

export interface BoardCapabilityProfile {
  kind: BoardKind;
  name: string;
  architecture: 'avr' | 'rp2040' | 'xtensa-lx6' | 'xtensa-lx7' | 'riscv-rv32' | 'cortex-m3' | 'cortex-a53';
  systemVoltage: 3.3 | 5.0;
  digitalPins: string[];
  analogPins: string[];
  pwmPins: string[];
  busPins: BoardBusPins;
  powerRails: BoardPowerRails;
  maxGpioCurrentMa: number;
}

export const BOARD_PROFILES: Record<string, BoardCapabilityProfile> = {
  'arduino-uno': {
    kind: 'arduino-uno',
    name: 'Arduino Uno R3',
    architecture: 'avr',
    systemVoltage: 5.0,
    digitalPins: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
    analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
    pwmPins: ['3', '5', '6', '9', '10', '11'],
    busPins: {
      i2c: { sda: 'A4', scl: 'A5', alternate: [{ sda: 'SDA', scl: 'SCL' }] },
      spi: { mosi: '11', miso: '12', sck: '13', csDefault: '10' },
      uart: { tx: '1', rx: '0' },
    },
    powerRails: {
      voltage5V: ['5V'],
      voltage3V3: ['3V3'],
      ground: ['GND.1', 'GND.2', 'GND.3', 'GND'],
      vin: ['VIN'],
    },
    maxGpioCurrentMa: 20,
  },
  'arduino-nano': {
    kind: 'arduino-nano',
    name: 'Arduino Nano',
    architecture: 'avr',
    systemVoltage: 5.0,
    digitalPins: ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13'],
    analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
    pwmPins: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'],
    busPins: {
      i2c: { sda: 'A4', scl: 'A5' },
      spi: { mosi: 'D11', miso: 'D12', sck: 'D13', csDefault: 'D10' },
      uart: { tx: 'TX', rx: 'RX' },
    },
    powerRails: {
      voltage5V: ['5V'],
      voltage3V3: ['3V3'],
      ground: ['GND', 'GND.1', 'GND.2'],
      vin: ['VIN'],
    },
    maxGpioCurrentMa: 20,
  },
  'arduino-mega': {
    kind: 'arduino-mega',
    name: 'Arduino Mega 2560',
    architecture: 'avr',
    systemVoltage: 5.0,
    digitalPins: Array.from({ length: 54 }, (_, i) => `${i}`),
    analogPins: Array.from({ length: 16 }, (_, i) => `A${i}`),
    pwmPins: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '44', '45', '46'],
    busPins: {
      i2c: { sda: '20', scl: '21', alternate: [{ sda: 'SDA', scl: 'SCL' }] },
      spi: { mosi: '51', miso: '50', sck: '52', csDefault: '53' },
      uart: { tx: '1', rx: '0' },
    },
    powerRails: {
      voltage5V: ['5V', '5V.1', '5V.2'],
      voltage3V3: ['3V3'],
      ground: ['GND', 'GND.1', 'GND.2', 'GND.3', 'GND.4', 'GND.5'],
      vin: ['VIN'],
    },
    maxGpioCurrentMa: 20,
  },
  'esp32': {
    kind: 'esp32',
    name: 'ESP32 DevKit V1',
    architecture: 'xtensa-lx6',
    systemVoltage: 3.3,
    digitalPins: ['0', '2', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33'],
    analogPins: ['32', '33', '34', '35', '36', '39', '0', '2', '4', '12', '13', '14', '15', '25', '26', '27'],
    pwmPins: ['0', '2', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33'],
    busPins: {
      i2c: { sda: '21', scl: '22' },
      spi: { mosi: '23', miso: '19', sck: '18', csDefault: '5' },
      uart: { tx: '1', rx: '3' },
    },
    powerRails: {
      voltage3V3: ['3V3', '3.3V'],
      voltage5V: ['VIN', '5V'],
      ground: ['GND', 'GND.1', 'GND.2'],
    },
    maxGpioCurrentMa: 12,
  },
  'esp32-c3': {
    kind: 'esp32-c3',
    name: 'ESP32-C3 SuperMini',
    architecture: 'riscv-rv32',
    systemVoltage: 3.3,
    digitalPins: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '20', '21'],
    analogPins: ['0', '1', '2', '3', '4', '5'],
    pwmPins: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    busPins: {
      i2c: { sda: '8', scl: '9' },
      spi: { mosi: '6', miso: '5', sck: '4', csDefault: '7' },
      uart: { tx: '21', rx: '20' },
    },
    powerRails: {
      voltage3V3: ['3V3'],
      voltage5V: ['5V', 'VIN'],
      ground: ['GND', 'GND.1'],
    },
    maxGpioCurrentMa: 12,
  },
  'raspberry-pi-pico': {
    kind: 'raspberry-pi-pico',
    name: 'Raspberry Pi Pico (RP2040)',
    architecture: 'rp2040',
    systemVoltage: 3.3,
    digitalPins: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9', 'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP16', 'GP17', 'GP18', 'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28'],
    analogPins: ['GP26', 'GP27', 'GP28'],
    pwmPins: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9', 'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP16', 'GP17', 'GP18', 'GP19', 'GP20', 'GP21', 'GP22', 'GP26', 'GP27', 'GP28'],
    busPins: {
      i2c: { sda: 'GP4', scl: 'GP5', alternate: [{ sda: 'GP0', scl: 'GP1' }, { sda: 'GP8', scl: 'GP9' }] },
      spi: { mosi: 'GP19', miso: 'GP16', sck: 'GP18', csDefault: 'GP17' },
      uart: { tx: 'GP0', rx: 'GP1' },
    },
    powerRails: {
      voltage3V3: ['3V3'],
      voltage5V: ['VBUS', 'VSYS'],
      ground: ['GND', 'GND.1', 'GND.2', 'GND.3', 'GND.4', 'GND.5', 'GND.6', 'GND.7', 'GND.8'],
    },
    maxGpioCurrentMa: 12,
  },
};

export class BoardCapabilityRegistry {
  public static getBoard(kind: BoardKind | string = 'arduino-uno'): BoardCapabilityProfile {
    const key = (kind || 'arduino-uno').toLowerCase();
    return BOARD_PROFILES[key] || BOARD_PROFILES['arduino-uno'];
  }

  public static hasPwm(kind: BoardKind | string, pin: string): boolean {
    const board = this.getBoard(kind);
    return board.pwmPins.map((p) => p.toUpperCase()).includes(pin.toUpperCase());
  }

  public static hasAdc(kind: BoardKind | string, pin: string): boolean {
    const board = this.getBoard(kind);
    return board.analogPins.map((p) => p.toUpperCase()).includes(pin.toUpperCase());
  }

  public static getI2CPins(kind: BoardKind | string): { sda: string; scl: string } {
    return this.getBoard(kind).busPins.i2c;
  }

  public static getSpiPins(kind: BoardKind | string): { mosi: string; miso: string; sck: string; csDefault?: string } {
    return this.getBoard(kind).busPins.spi;
  }

  public static getGndPins(kind: BoardKind | string): string[] {
    return this.getBoard(kind).powerRails.ground;
  }

  public static getPowerPin(kind: BoardKind | string, voltage: 3.3 | 5.0 = 5.0): string {
    const board = this.getBoard(kind);
    if (voltage === 3.3 && board.powerRails.voltage3V3.length > 0) {
      return board.powerRails.voltage3V3[0];
    }
    return board.powerRails.voltage5V[0] || board.powerRails.voltage3V3[0] || '5V';
  }

  public static getAllBoards(): BoardCapabilityProfile[] {
    return Object.values(BOARD_PROFILES);
  }
}
