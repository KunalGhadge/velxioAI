/**
 * VelxioAI Studio — Compiler Diagnostic Engine
 *
 * Converts raw compiler outputs into structured, actionable diagnostic objects.
 * Accurately maps missing headers, undeclared identifiers, and type errors to
 * exact libraries, headers, pins, and hardware components.
 */

import { HardwareKnowledgeGraph } from '../knowledge/HardwareKnowledgeGraph';

export type DiagnosticErrorType =
  | 'MISSING_LIBRARY'
  | 'HEADER_NOT_FOUND'
  | 'UNDECLARED_IDENTIFIER'
  | 'PIN_MISMATCH'
  | 'SYNTAX_ERROR';

export interface CompilerDiagnostic {
  type: DiagnosticErrorType;
  library?: string;
  header?: string;
  pin?: string;
  component?: string;
  originalError: string;
  suggestedAction: string;
}

export class CompilerDiagnosticEngine {
  private static readonly HEADER_TO_LIBRARY_MAP: Record<string, { library: string; component: string }> = {
    'dht.h': { library: 'DHT sensor library', component: 'wokwi-dht22' },
    'dht_u.h': { library: 'Adafruit Unified Sensor', component: 'wokwi-dht22' },
    'liquidcrystal.h': { library: 'LiquidCrystal', component: 'wokwi-lcd1602' },
    'liquidcrystal_i2c.h': { library: 'LiquidCrystal I2C', component: 'wokwi-lcd1602' },
    'wire.h': { library: 'Wire', component: 'wokwi-lcd1602' },
    'servo.h': { library: 'Servo', component: 'wokwi-servo' },
    'rtclib.h': { library: 'RTClib', component: 'wokwi-ds1307' },
    'adafruit_ssd1306.h': { library: 'Adafruit SSD1306', component: 'wokwi-ssd1306' },
    'adafruit_gfx.h': { library: 'Adafruit GFX Library', component: 'wokwi-ssd1306' },
    'onewire.h': { library: 'OneWire', component: 'wokwi-ds18b20' },
    'dallastemperature.h': { library: 'DallasTemperature', component: 'wokwi-ds18b20' },
    'adafruit_bmp280.h': { library: 'Adafruit BMP280 Library', component: 'wokwi-bmp280' },
    'mpu6050.h': { library: 'MPU6050', component: 'wokwi-mpu6050' },
    'keypad.h': { library: 'Keypad', component: 'wokwi-membrane-keypad' },
  };

  /**
   * Parses raw compiler stderr and returns structured diagnostics.
   */
  public static diagnose(rawStderr: string): CompilerDiagnostic[] {
    const diagnostics: CompilerDiagnostic[] = [];
    if (!rawStderr) return diagnostics;

    const lines = rawStderr.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 1. Missing Header: fatal error: Foo.h: No such file or directory
      const headerMatch = trimmed.match(/fatal error:\s*([a-zA-Z0-9_\-./\\]+\.h):\s*No such file/i);
      if (headerMatch) {
        const headerFile = headerMatch[1].replace(/.*[/\\]/, '');
        const mapped = this.HEADER_TO_LIBRARY_MAP[headerFile.toLowerCase()];
        diagnostics.push({
          type: 'MISSING_LIBRARY',
          header: headerFile,
          library: mapped ? mapped.library : headerFile.replace(/\.h$/i, ''),
          component: mapped?.component,
          originalError: trimmed,
          suggestedAction: `Install library "${mapped ? mapped.library : headerFile}" into libraries.txt`,
        });
        continue;
      }

      // 2. Undeclared Identifier / Pin: 'PIN_NAME' was not declared in this scope
      const undeclaredMatch = trimmed.match(/error:\s*['’]([a-zA-Z0-9_]+)['’]\s*was not declared/i);
      if (undeclaredMatch) {
        const identifier = undeclaredMatch[1];
        diagnostics.push({
          type: 'UNDECLARED_IDENTIFIER',
          pin: identifier,
          originalError: trimmed,
          suggestedAction: `Define constant or pin "#define ${identifier} <pin>"`,
        });
        continue;
      }

      // 3. Type does not name a type (Missing library class)
      const typeMatch = trimmed.match(/error:\s*['’]([a-zA-Z0-9_]+)['’]\s*does not name a type/i);
      if (typeMatch) {
        const typeName = typeMatch[1];
        const lowerType = typeName.toLowerCase();
        let libName = typeName;
        let compTag: string | undefined;

        if (lowerType.includes('dht')) {
          libName = 'DHT sensor library';
          compTag = 'wokwi-dht22';
        } else if (lowerType.includes('liquidcrystal')) {
          libName = 'LiquidCrystal';
          compTag = 'wokwi-lcd1602';
        } else if (lowerType.includes('servo')) {
          libName = 'Servo';
          compTag = 'wokwi-servo';
        } else if (lowerType.includes('rtc')) {
          libName = 'RTClib';
          compTag = 'wokwi-ds1307';
        }

        diagnostics.push({
          type: 'MISSING_LIBRARY',
          library: libName,
          component: compTag,
          originalError: trimmed,
          suggestedAction: `Include header and install "${libName}"`,
        });
        continue;
      }

      // 4. General Syntax Error
      if (trimmed.includes('error:')) {
        diagnostics.push({
          type: 'SYNTAX_ERROR',
          originalError: trimmed,
          suggestedAction: 'Regenerate code using deterministic firmware templates',
        });
      }
    }

    return diagnostics;
  }
}
