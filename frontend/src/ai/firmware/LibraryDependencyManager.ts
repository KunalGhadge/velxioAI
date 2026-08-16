/**
 * VelxioAI Studio — Library Dependency Manager
 *
 * Automatically detects component and code requirements, manages C/C++ `#include`
 * directives, prevents duplicate inclusions, and provides exact library metadata
 * for backend and Wokwi web compilers.
 */

export interface LibrarySpec {
  header: string;
  libraryName: string;
  version?: string;
  dependencies?: string[];
}

export const KNOWN_LIBRARIES: Record<string, LibrarySpec> = {
  'wokwi-ssd1306': {
    header: 'Adafruit_SSD1306.h',
    libraryName: 'Adafruit SSD1306',
    dependencies: ['Adafruit GFX Library', 'Wire.h'],
  },
  'wokwi-dht22': {
    header: 'DHT.h',
    libraryName: 'DHT sensor library',
    dependencies: ['Adafruit Unified Sensor'],
  },
  'wokwi-servo': {
    header: 'Servo.h',
    libraryName: 'Servo',
  },
  'wokwi-lcd1602': {
    header: 'LiquidCrystal.h',
    libraryName: 'LiquidCrystal',
  },
  'wokwi-pcf8574': {
    header: 'LiquidCrystal_I2C.h',
    libraryName: 'LiquidCrystal I2C',
    dependencies: ['Wire.h'],
  },
  'wokwi-neopixel': {
    header: 'Adafruit_NeoPixel.h',
    libraryName: 'Adafruit NeoPixel',
  },
  'wokwi-mpu6050': {
    header: 'MPU6050.h',
    libraryName: 'MPU6050',
    dependencies: ['Wire.h', 'I2Cdev'],
  },
  'wokwi-bmp280': {
    header: 'Adafruit_BMP280.h',
    libraryName: 'Adafruit BMP280 Library',
    dependencies: ['Wire.h', 'Adafruit Sensor'],
  },
  'wokwi-ds1307': {
    header: 'RTClib.h',
    libraryName: 'RTClib',
    dependencies: ['Wire.h'],
  },
};

export class LibraryDependencyManager {
  /**
   * Resolves all required libraries from a list of components and existing code.
   */
  public static resolveLibraries(
    componentTypes: string[],
    currentCode = ''
  ): { librariesToInstall: string[]; headersToInclude: string[] } {
    const librariesToInstall = new Set<string>();
    const headersToInclude = new Set<string>();

    for (const comp of componentTypes) {
      const cleanType = comp.startsWith('wokwi-') ? comp : `wokwi-${comp}`;
      const spec = KNOWN_LIBRARIES[cleanType];
      if (spec) {
        librariesToInstall.add(spec.libraryName);
        headersToInclude.add(spec.header);
        if (spec.dependencies) {
          spec.dependencies.forEach((dep) => {
            if (dep.endsWith('.h')) {
              headersToInclude.add(dep);
            } else {
              librariesToInstall.add(dep);
            }
          });
        }
      }
    }

    // Code text inspection
    if (currentCode.includes('Wire.h') || currentCode.includes('Wire.begin')) {
      headersToInclude.add('Wire.h');
    }
    if (currentCode.includes('SPI.h') || currentCode.includes('SPI.begin')) {
      headersToInclude.add('SPI.h');
    }

    return {
      librariesToInstall: Array.from(librariesToInstall),
      headersToInclude: Array.from(headersToInclude),
    };
  }

  /**
   * Prepends missing `#include <...>` statements to the top of a C/C++ sketch without duplicates.
   */
  public static injectHeaders(code: string, headers: string[]): string {
    if (!headers || headers.length === 0) return code;

    let modifiedCode = code;
    const missingHeaders: string[] = [];

    for (const header of headers) {
      const cleanHeader = header.replace(/[<>"]/g, '');
      const regex = new RegExp(`#include\\s*[<"]${cleanHeader}[>"]`);
      if (!regex.test(modifiedCode)) {
        missingHeaders.push(`#include <${cleanHeader}>`);
      }
    }

    if (missingHeaders.length === 0) {
      return modifiedCode;
    }

    const headerBlock = missingHeaders.join('\n');
    return `${headerBlock}\n\n${modifiedCode.trimStart()}`;
  }
}
