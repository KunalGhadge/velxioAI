/**
 * VelxioAI Studio — Board Recommendation Engine
 *
 * Recommends the optimal microcontroller platform based on project requirements
 * (e.g. WiFi/BLE, GPIO count, PWM timers, ADC channels, clock speed, power budget).
 */

import { BoardCapabilityRegistry } from '../hardware/BoardCapabilityRegistry';
import type { BoardKind } from '../../types/board';

export interface BoardRecommendation {
  boardKind: BoardKind;
  boardName: string;
  rationale: string;
  matchedFeatures: string[];
  specs: {
    gpioCount: number;
    pwmCount: number;
    adcCount: number;
    hasWifi: boolean;
    hasBluetooth: boolean;
    systemVoltage: number;
  };
}

export class BoardRecommendationEngine {
  /**
   * Evaluates prompt intent and required component list to select the optimal board.
   */
  public static recommendBoard(prompt: string, requiredComponents: string[] = []): BoardRecommendation {
    const text = prompt.toLowerCase();
    const matchedFeatures: string[] = [];

    // 1. Connectivity Requirements (WiFi / BLE / IoT / Cloud / MQTT / WebServer)
    const isWifiRequested = text.includes('wifi') || text.includes('iot') || text.includes('cloud') || text.includes('mqtt') || text.includes('web') || text.includes('blynk');
    const isBleRequested = text.includes('bluetooth') || text.includes('ble') || text.includes('wireless') || text.includes('phone');
    const isLowPowerRequested = text.includes('low power') || text.includes('battery') || text.includes('sleep') || text.includes('wearable');
    const isDualCoreRequested = text.includes('multithread') || text.includes('freertos') || text.includes('dual core') || text.includes('core 0');

    if (isWifiRequested) matchedFeatures.push('Integrated 2.4 GHz 802.11 b/g/n Wi-Fi');
    if (isBleRequested) matchedFeatures.push('Bluetooth 4.2 / BLE Support');
    if (isLowPowerRequested) matchedFeatures.push('Deep-Sleep Low Power Optimization');
    if (isDualCoreRequested) matchedFeatures.push('Dual Xtensa LX6 Cores @ 240 MHz');

    // 2. Component scale checks (GPIO / PWM requirements)
    const compCount = requiredComponents.length;
    const isLargeProject = compCount > 8 || text.includes('complex') || text.includes('mega') || text.includes('many sensors');

    // 3. Evaluation Decision Tree
    let chosenBoard: BoardKind = 'arduino-uno';
    let rationale = 'Optimal, robust entry-level 8-bit platform with 14 digital GPIOs, 6 PWM channels, and standard 5V logic compatibility.';

    if (isWifiRequested || isBleRequested || isDualCoreRequested) {
      chosenBoard = 'esp32';
      rationale = 'Selected for high-performance 240MHz dual-core processing, built-in Wi-Fi & Bluetooth, and rich hardware peripherals.';
    } else if (isLowPowerRequested && !isLargeProject) {
      chosenBoard = 'esp32-c3';
      rationale = 'Selected for ultra-low-power RISC-V 32-bit architecture with modern integrated Wi-Fi 4 and Bluetooth 5 (LE).';
    } else if (isLargeProject || text.includes('mega') || compCount > 10) {
      chosenBoard = 'arduino-mega';
      matchedFeatures.push('54 Digital I/O Pins', '15 Hardware PWM Channels', '16 Analog ADC Inputs');
      rationale = 'Selected for extensive pin density (54 GPIOs, 16 ADCs, 15 PWM timers) required by multi-sensor and display arrays.';
    } else if (text.includes('pico') || text.includes('rp2040') || text.includes('pio') || text.includes('dma')) {
      chosenBoard = 'pi-pico';
      matchedFeatures.push('Dual-core ARM Cortex-M0+ @ 133MHz', '8 Programmable I/O (PIO) state machines');
      rationale = 'Selected for fast 133MHz dual ARM Cortex-M0+ cores and flexible Programmable I/O (PIO).';
    } else if (text.includes('nano') || text.includes('compact') || text.includes('mini')) {
      chosenBoard = 'arduino-nano';
      matchedFeatures.push('Compact Breadboard-Friendly Footprint', '8 Analog ADC Channels');
      rationale = 'Selected for breadboard-friendly compact form factor with standard ATmega328P reliability.';
    }

    const profile = BoardCapabilityRegistry.getBoard(chosenBoard);

    return {
      boardKind: chosenBoard,
      boardName: profile.name,
      rationale,
      matchedFeatures,
      specs: {
        gpioCount: profile.digitalPins.length,
        pwmCount: profile.pwmPins.length,
        adcCount: profile.analogPins.length,
        hasWifi: profile.hasWifi,
        hasBluetooth: profile.hasBluetooth,
        systemVoltage: profile.systemVoltage,
      },
    };
  }
}
