/**
 * VelxioAI Studio — Deterministic User Requirement Extractor
 *
 * Extracts explicit component requirements, forbidden component exclusions,
 * and required hardware behaviors from natural language prompts.
 */

import { ComponentAliasRegistry } from '../hardware/ComponentAliasRegistry';

export interface UserRequirements {
  requiredComponents: string[];
  forbiddenComponents: string[];
  requiredBehaviors: string[];
  rawPrompt: string;
}

export class RequirementExtractor {
  private static readonly COMPONENT_PATTERNS: Array<{ regex: RegExp; tag: string; name: string }> = [
    { regex: /\b(ir|pir|motion|infrared|presence)\s*(sensor|detector)?\b/i, tag: 'wokwi-pir-motion-sensor', name: 'IR / PIR Motion Sensor' },
    { regex: /\b(ultrasonic|sonar|distance|range\s*finder|hc-?sr04)\b/i, tag: 'wokwi-hc-sr04', name: 'Ultrasonic Distance Sensor' },
    { regex: /\b(dht|dht11|dht22|temp(erature)?\s+and\s+humidity|humidity)\b/i, tag: 'wokwi-dht22', name: 'DHT22 Temp & Humidity Sensor' },
    { regex: /\b(ds18b20|waterproof\s+temp(erature)?|one-?wire\s+temp)\b/i, tag: 'wokwi-ds18b20', name: 'DS18B20 Temp Sensor' },
    { regex: /\b(ldr|photoresistor|light\s*sensor|illuminance)\b/i, tag: 'wokwi-photoresistor-sensor', name: 'Photoresistor (LDR)' },
    { regex: /\b(potentiometer|pot|knob|dial|variable\s*resistor)\b/i, tag: 'wokwi-potentiometer', name: 'Potentiometer' },
    { regex: /\b(mpu6050|gyro(scope)?|accelerometer|imu)\b/i, tag: 'wokwi-mpu6050', name: 'MPU6050 6-Axis IMU' },
    { regex: /\b(bmp280|barometer|pressure|altimeter)\b/i, tag: 'wokwi-bmp280', name: 'BMP280 Barometric Pressure' },
    { regex: /\b(lcd|lcd1602|16x2|character\s*lcd|liquidcrystal)\b/i, tag: 'wokwi-lcd1602', name: '16x2 Character LCD' },
    { regex: /\b(oled|ssd1306|graphic\s*display|i2c\s*oled)\b/i, tag: 'wokwi-ssd1306', name: 'SSD1306 OLED Display' },
    { regex: /\b(7-?segment|seven\s*segment|digit\s*display)\b/i, tag: 'wokwi-7segment', name: '7-Segment Display' },
    { regex: /\b(servo|sg90|servo\s*motor|mg90s)\b/i, tag: 'wokwi-servo', name: 'Servo Motor' },
    { regex: /\b(buzzer|piezo|speaker|beeper|alarm\s*sound)\b/i, tag: 'wokwi-buzzer', name: 'Piezo Buzzer' },
    { regex: /\b(relay|relay\s*module|mains\s*switch)\b/i, tag: 'wokwi-relay-module', name: 'Relay Module' },
    { regex: /\b(mq-?2|gas|smoke|methane|lpg|air\s*quality)\s*(sensor|detector|alarm)?\b/i, tag: 'wokwi-mq2', name: 'MQ-2 Gas Sensor' },
    { regex: /\b(keypad|membrane\s*keypad|matrix\s*keypad|pinpad|4x4\s*keypad)\b/i, tag: 'wokwi-membrane-keypad', name: '4x4 Keypad' },
    { regex: /\b(rtc|ds1307|ds3231|real\s*time\s*clock|clock\s*module|digital\s*clock)\b/i, tag: 'wokwi-ds1307', name: 'DS1307 RTC' },
    { regex: /\b(button|push\s*button|tactile\s*switch|momentary|voting|vote)\b/i, tag: 'wokwi-pushbutton', name: 'Pushbutton' },
    { regex: /\b(rgb|rgb\s*led|neopixel|ws2812)\b/i, tag: 'wokwi-rgb-led', name: 'RGB LED' },
    { regex: /\b(led|traffic\s*light|blinking\s*light|indicator|flasher|lamp)\b/i, tag: 'wokwi-led', name: 'LED' },
  ];

  /**
   * Extracts required and forbidden components from a user prompt.
   */
  public static extract(prompt: string): UserRequirements {
    const text = prompt.trim();
    const lower = text.toLowerCase();

    const requiredComponents: Set<string> = new Set();
    const forbiddenComponents: Set<string> = new Set();
    const requiredBehaviors: string[] = [];

    // 1. Detect Explicit Exclusions ("without X", "no X", "do not use X")
    const exclusionRegex = /\b(?:without|no|do\s+not\s+use|don'?t\s+use|excluding|omit)\s+([a-zA-Z0-9_\-\s]+?)(?:,|\.|\band\b|$)/gi;
    let match: RegExpExecArray | null;
    while ((match = exclusionRegex.exec(lower)) !== null) {
      const excludedPhrase = match[1].trim();
      for (const item of this.COMPONENT_PATTERNS) {
        if (item.regex.test(excludedPhrase)) {
          forbiddenComponents.add(item.tag);
        }
      }
    }

    // 2. Detect Explicit Requirements
    for (const item of this.COMPONENT_PATTERNS) {
      if (item.regex.test(lower)) {
        if (!forbiddenComponents.has(item.tag)) {
          requiredComponents.add(item.tag);
        }
      }
    }

    // 3. Fallback: Lookup word tokens in ComponentAliasRegistry
    const tokens = lower.replace(/[^a-z0-9_-]/g, ' ').split(/\s+/);
    for (const tok of tokens) {
      const resolved = ComponentAliasRegistry.resolveAlias(tok);
      if (resolved && !forbiddenComponents.has(resolved)) {
        requiredComponents.add(resolved);
      }
    }

    // 4. Extract Key Behaviors
    if (/count|visitor|tally/i.test(lower)) requiredBehaviors.push('Count visitor increments');
    if (/blink|flash|toggle/i.test(lower)) requiredBehaviors.push('Toggle output states periodically');
    if (/sweep|rotate|angle/i.test(lower)) requiredBehaviors.push('Sweep servo position from 0 to 180 degrees');
    if (/alarm|alert|buzz/i.test(lower)) requiredBehaviors.push('Trigger acoustic and visual alerts');
    if (/temp|temperature|humid/i.test(lower)) requiredBehaviors.push('Read environmental sensor data and display telemetry');

    return {
      requiredComponents: Array.from(requiredComponents),
      forbiddenComponents: Array.from(forbiddenComponents),
      requiredBehaviors,
      rawPrompt: prompt,
    };
  }
}
