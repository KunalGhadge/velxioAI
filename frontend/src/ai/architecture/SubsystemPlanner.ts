/**
 * VelxioAI Studio — Subsystem Planner
 *
 * Decomposes natural language embedded project requirements into functional
 * hardware subsystems (e.g. Environmental Sensing, Display & UI, Actuation,
 * Power & Relay, Telemetry, Audio/Visual Alerts).
 */

import { ComponentAliasRegistry } from '../hardware/ComponentAliasRegistry';

export interface PlannedSubsystem {
  name: string;
  purpose: string;
  components: string[]; // Canonical component tags
  firmwareResponsibilities: string[];
}

export class SubsystemPlanner {
  /**
   * Analyzes a project prompt and maps it into modular hardware subsystems.
   */
  public static planSubsystems(prompt: string): PlannedSubsystem[] {
    const text = prompt.toLowerCase();
    const subsystems: PlannedSubsystem[] = [];

    // 1. Environmental Sensing Subsystem
    if (
      text.includes('temp') ||
      text.includes('humidity') ||
      text.includes('weather') ||
      text.includes('dht') ||
      text.includes('climate') ||
      text.includes('greenhouse') ||
      text.includes('environment')
    ) {
      subsystems.push({
        name: 'Environmental Monitoring',
        purpose: 'Acquires ambient temperature, relative humidity, and atmospheric data',
        components: [ComponentAliasRegistry.resolve('dht22')],
        firmwareResponsibilities: ['Read DHT22 sensor periodically', 'Format data in Celsius and %RH'],
      });
    }

    // 2. Proximity & Motion Detection Subsystem
    if (
      text.includes('motion') ||
      text.includes('pir') ||
      text.includes('presence') ||
      text.includes('visitor') ||
      text.includes('intruder') ||
      text.includes('security')
    ) {
      subsystems.push({
        name: 'Motion & Presence Detection',
        purpose: 'Detects human movement and presence via passive infrared sensing',
        components: [ComponentAliasRegistry.resolve('pir')],
        firmwareResponsibilities: ['Poll or trigger interrupt on PIR motion pin', 'Debounce trigger events'],
      });
    }

    // 3. Distance & Ranging Subsystem
    if (
      text.includes('distance') ||
      text.includes('sonar') ||
      text.includes('ultrasonic') ||
      text.includes('range') ||
      text.includes('proximity') ||
      text.includes('obstacle') ||
      text.includes('radar')
    ) {
      subsystems.push({
        name: 'Ultrasonic Ranging',
        purpose: 'Measures spatial distance via ultrasonic pulse time-of-flight',
        components: [ComponentAliasRegistry.resolve('ultrasonic')],
        firmwareResponsibilities: ['Generate 10us trigger pulse on TRIG', 'Measure pulse width in us on ECHO'],
      });
    }

    // 4. Ambient Light & Optical Sensing
    if (
      text.includes('light') ||
      text.includes('ldr') ||
      text.includes('lux') ||
      text.includes('dark') ||
      text.includes('night') ||
      text.includes('street light') ||
      text.includes('solar')
    ) {
      subsystems.push({
        name: 'Optical & Ambient Light Sensing',
        purpose: 'Measures ambient illuminance using an analog photoresistor (LDR)',
        components: [ComponentAliasRegistry.resolve('photoresistor')],
        firmwareResponsibilities: ['Read analog voltage on ADC pin', 'Calculate day/night threshold'],
      });
    }

    // 5. Visual Display & UI Subsystem
    if (
      text.includes('oled') ||
      text.includes('ssd1306') ||
      text.includes('dashboard') ||
      text.includes('gui') ||
      text.includes('graph')
    ) {
      subsystems.push({
        name: 'OLED Visual Display & UI',
        purpose: 'Renders telemetry and status screens on a 128x64 monochrome I2C OLED',
        components: [ComponentAliasRegistry.resolve('oled')],
        firmwareResponsibilities: ['Initialize I2C bus at 0x3C', 'Render text and graphical status widgets'],
      });
    } else if (
      text.includes('lcd') ||
      text.includes('lcd1602') ||
      text.includes('screen') ||
      text.includes('display') ||
      text.includes('counter') ||
      text.includes('menu')
    ) {
      subsystems.push({
        name: 'Character Display & Telemetry',
        purpose: 'Displays numeric readouts and text prompts on a 16x2 character LCD',
        components: [ComponentAliasRegistry.resolve('lcd')],
        firmwareResponsibilities: ['Initialize LiquidCrystal parallel interface', 'Format and print character rows'],
      });
    }

    // 6. Actuation & Motion Control
    if (
      text.includes('servo') ||
      text.includes('motor') ||
      text.includes('arm') ||
      text.includes('pan') ||
      text.includes('tilt') ||
      text.includes('gate') ||
      text.includes('barrier') ||
      text.includes('lock')
    ) {
      subsystems.push({
        name: 'Precision Servo Actuation',
        purpose: 'Drives positional angles (0°–180°) using hardware PWM pulse timing',
        components: [ComponentAliasRegistry.resolve('servo')],
        firmwareResponsibilities: ['Attach Servo library to PWM pin', 'Sweep or command target angle in degrees'],
      });
    }

    // 7. Audio & Alarm Subsystem
    if (
      text.includes('buzz') ||
      text.includes('alarm') ||
      text.includes('sound') ||
      text.includes('tone') ||
      text.includes('beep') ||
      text.includes('siren') ||
      text.includes('alert')
    ) {
      subsystems.push({
        name: 'Acoustic Alert & Annunciation',
        purpose: 'Produces audible alarm frequencies and status tones via a piezo buzzer',
        components: [ComponentAliasRegistry.resolve('buzzer')],
        firmwareResponsibilities: ['Generate tone() square waves with variable frequency and duration'],
      });
    }

    // 8. Visual Lighting & Status Indicator
    if (
      text.includes('rgb') ||
      text.includes('neopixel') ||
      text.includes('ws2812') ||
      text.includes('color') ||
      text.includes('mood')
    ) {
      subsystems.push({
        name: 'Color RGB Visual Feedback',
        purpose: 'Displays rich multi-color status alerts and dynamic lighting animations',
        components: [text.includes('neopixel') || text.includes('ws2812') ? 'wokwi-neopixel' : 'wokwi-rgb-led'],
        firmwareResponsibilities: ['Drive 3-channel PWM or addressable SPI timing data stream'],
      });
    } else if (
      text.includes('traffic') ||
      text.includes('traffic light')
    ) {
      subsystems.push({
        name: 'Traffic Signal Lighting',
        purpose: 'Displays Red, Yellow, and Green traffic progression signals',
        components: ['wokwi-led', 'wokwi-led', 'wokwi-led'],
        firmwareResponsibilities: ['Sequence state machine timing for Red, Yellow, Green LEDs'],
      });
    } else if (
      text.includes('led') ||
      text.includes('blink') ||
      text.includes('indicator') ||
      subsystems.length === 0
    ) {
      subsystems.push({
        name: 'Visual Status Indicator',
        purpose: 'Provides visual state signaling using an LED with current-limiting series resistor',
        components: [ComponentAliasRegistry.resolve('led')],
        firmwareResponsibilities: ['Toggle GPIO digital pin state HIGH/LOW with millisecond timing'],
      });
    }

    // 9. Analog Manual User Controls
    if (
      text.includes('pot') ||
      text.includes('potentiometer') ||
      text.includes('knob') ||
      text.includes('dial') ||
      text.includes('slider') ||
      text.includes('speed control')
    ) {
      subsystems.push({
        name: 'Analog User Input',
        purpose: 'Reads continuous analog rotary position from a 10k potentiometer',
        components: [ComponentAliasRegistry.resolve('potentiometer')],
        firmwareResponsibilities: ['Sample 10-bit ADC channel (0-1023) and map values to control targets'],
      });
    }

    return subsystems;
  }
}
