/**
 * VelxioAI Studio — Deterministic Compilation Error Classifier
 *
 * Parses raw compiler diagnostic streams (arduino-cli, avr-gcc, espidf, clang)
 * into structured semantic failures with exact file, line, and symbol metadata.
 */

export enum CompilationErrorType {
  MISSING_LIBRARY = 'MISSING_LIBRARY',
  MISSING_INCLUDE = 'MISSING_INCLUDE',
  LIBRARY_NOT_INSTALLED = 'LIBRARY_NOT_INSTALLED',
  COMPONENT_NOT_FOUND = 'COMPONENT_NOT_FOUND',
  COMPONENT_MISMATCH = 'COMPONENT_MISMATCH',
  PIN_CONFLICT = 'PIN_CONFLICT',
  API_MISMATCH = 'API_MISMATCH',
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  TYPE_ERROR = 'TYPE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface CompilationFailure {
  type: CompilationErrorType;
  compilerMessage: string;
  rawLine?: string;
  file?: string;
  lineNumber?: number;
  missingLibrary?: string;
  missingHeader?: string;
  symbol?: string;
  suggestedAction?: string;
}

export class CompilationErrorClassifier {
  private static readonly HEADER_TO_LIBRARY_MAP: Record<string, string> = {
    'dht.h': 'DHT sensor library',
    'dht_u.h': 'DHT sensor library',
    'liquidcrystal.h': 'LiquidCrystal',
    'liquidcrystal_i2c.h': 'LiquidCrystal I2C',
    'servo.h': 'Servo',
    'wire.h': 'Wire',
    'spi.h': 'SPI',
    'adafruit_sensor.h': 'Adafruit Unified Sensor',
    'adafruit_ssd1306.h': 'Adafruit SSD1306',
    'adafruit_gfx.h': 'Adafruit GFX Library',
    'adafruit_neo_pixel.h': 'Adafruit NeoPixel',
    'adafruit_neopixel.h': 'Adafruit NeoPixel',
    'mpu6050.h': 'MPU6050',
    'rtclib.h': 'RTClib',
    'onewire.h': 'OneWire',
    'dallastemperature.h': 'DallasTemperature',
  };

  /**
   * Classifies an array of raw compiler log strings into structured failures.
   */
  public static classifyLogs(logs: string[]): CompilationFailure[] {
    const rawText = logs.join('\n');
    return this.classify(rawText);
  }

  /**
   * Classifies a full raw compiler error output string.
   */
  public static classify(errorOutput: string): CompilationFailure[] {
    const failures: CompilationFailure[] = [];
    if (!errorOutput || errorOutput.trim().length === 0) {
      return failures;
    }

    const lines = errorOutput.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // 1. Check Missing Header / Library (#include failure)
      // e.g. "sketch.ino:2:10: fatal error: LiquidCrystal_I2C.h: No such file or directory"
      const missingIncludeMatch = line.match(
        /(?:fatal error:\s+)?([a-zA-Z0-9_\-\./]+\.h):\s+No such file or directory/i
      );
      if (missingIncludeMatch) {
        const header = missingIncludeMatch[1];
        const normalizedHeader = header.toLowerCase();
        const resolvedLib = this.HEADER_TO_LIBRARY_MAP[normalizedHeader] || header.replace(/\.h$/i, '');
        const lineNumMatch = line.match(/:(\d+):(?:\d+:)?\s+fatal error/i);

        failures.push({
          type: CompilationErrorType.MISSING_LIBRARY,
          compilerMessage: `Missing library header "${header}".`,
          rawLine: line,
          missingHeader: header,
          missingLibrary: resolvedLib,
          lineNumber: lineNumMatch ? parseInt(lineNumMatch[1], 10) : undefined,
          suggestedAction: `Install library "${resolvedLib}" into libraries.txt`,
        });
        continue;
      }

      // 2. Check Undefined Pin / Undeclared Identifier
      // e.g. "error: 'LED_PIN' was not declared in this scope"
      const undeclaredMatch = line.match(/error:\s+'([a-zA-Z0-9_]+)'\s+was not declared in this scope/i);
      if (undeclaredMatch) {
        const symbol = undeclaredMatch[1];
        const isPin = symbol.toUpperCase().includes('PIN') || /^(LED|RELAY|SERVO|BTN|BUTTON|TRIG|ECHO|SENSOR)/i.test(symbol);
        const lineNumMatch = line.match(/:(\d+):(?:\d+:)?\s+error/i);

        failures.push({
          type: isPin ? CompilationErrorType.PIN_CONFLICT : CompilationErrorType.SYNTAX_ERROR,
          compilerMessage: `Symbol '${symbol}' is undeclared.`,
          rawLine: line,
          symbol,
          lineNumber: lineNumMatch ? parseInt(lineNumMatch[1], 10) : undefined,
          suggestedAction: isPin
            ? `Inject #define ${symbol} <pin> from PinAssignmentRegistry`
            : `Declare variable '${symbol}' or include required header`,
        });
        continue;
      }

      // 3. Check Constructor / API Mismatch
      // e.g. "error: no matching function for call to 'LiquidCrystal::LiquidCrystal(...)'"
      const apiMismatchMatch = line.match(/error:\s+no matching function for call to '([^']+)'/i);
      if (apiMismatchMatch) {
        const symbol = apiMismatchMatch[1];
        const lineNumMatch = line.match(/:(\d+):(?:\d+:)?\s+error/i);

        failures.push({
          type: CompilationErrorType.API_MISMATCH,
          compilerMessage: `Constructor / function signature mismatch for '${symbol}'.`,
          rawLine: line,
          symbol,
          lineNumber: lineNumMatch ? parseInt(lineNumMatch[1], 10) : undefined,
          suggestedAction: `Check wiring and match constructor arguments with physical pins`,
        });
        continue;
      }

      // 4. Check Undefined Reference / Linker Failure
      // e.g. "undefined reference to `setup'" or "undefined reference to `vtable for...'"
      const undefinedRefMatch = line.match(/undefined reference to [`']([^']+)[']/i);
      if (undefinedRefMatch) {
        const symbol = undefinedRefMatch[1];
        failures.push({
          type: CompilationErrorType.LIBRARY_NOT_INSTALLED,
          compilerMessage: `Linker cannot resolve reference to '${symbol}'.`,
          rawLine: line,
          symbol,
          suggestedAction: `Ensure required C++ library source or object is linked`,
        });
        continue;
      }

      // 5. Generic Syntax / Type Error with Line Number
      const genericErrorMatch = line.match(/:(\d+):(?:\d+:)?\s+error:\s+(.+)/i);
      if (genericErrorMatch) {
        const lineNum = parseInt(genericErrorMatch[1], 10);
        const msg = genericErrorMatch[2];

        failures.push({
          type: /type|cannot convert/i.test(msg) ? CompilationErrorType.TYPE_ERROR : CompilationErrorType.SYNTAX_ERROR,
          compilerMessage: msg,
          rawLine: line,
          lineNumber: lineNum,
          suggestedAction: `Fix C++ syntax at line ${lineNum}: ${msg}`,
        });
        continue;
      }
    }

    // Fallback if errors were present but unmatched
    if (failures.length === 0 && /error:|fatal:|undefined reference/i.test(errorOutput)) {
      failures.push({
        type: CompilationErrorType.UNKNOWN,
        compilerMessage: errorOutput.slice(0, 300),
        rawLine: errorOutput.split('\n')[0],
        suggestedAction: 'Inspect full compiler diagnostics',
      });
    }

    return failures;
  }
}
