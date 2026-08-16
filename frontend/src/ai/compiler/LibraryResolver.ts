/**
 * VelxioAI Studio — Deterministic Library Resolver
 *
 * Automatically resolves and maps physical circuit components and firmware includes
 * to exact Arduino / MicroPython library dependencies in libraries.txt.
 * Disambiguates parallel vs I2C display drivers without LLM guesswork.
 */

import { HardwareComponentRegistry } from '../hardware/HardwareComponentRegistry';

export class LibraryResolver {
  private static readonly COMPONENT_LIBRARY_MAP: Record<string, string[]> = {
    'wokwi-dht22': ['DHT sensor library', 'Adafruit Unified Sensor'],
    'wokwi-dht11': ['DHT sensor library', 'Adafruit Unified Sensor'],
    'wokwi-ssd1306': ['Adafruit SSD1306', 'Adafruit GFX Library', 'Wire'],
    'wokwi-servo': ['Servo'],
    'wokwi-neopixel': ['Adafruit NeoPixel'],
    'wokwi-rgb-led': [], // Direct PWM
    'wokwi-ds18b20': ['OneWire', 'DallasTemperature'],
    'wokwi-mpu6050': ['MPU6050', 'Wire'],
    'wokwi-bmp280': ['Adafruit BMP280 Library', 'Adafruit Unified Sensor', 'Wire'],
    'wokwi-ds1307': ['RTClib', 'Wire'],
    'wokwi-ds3231': ['RTClib', 'Wire'],
    'wokwi-pcf8574': ['LiquidCrystal I2C', 'Wire'],
  };

  private static readonly INCLUDE_LIBRARY_MAP: Record<string, string[]> = {
    'dht.h': ['DHT sensor library', 'Adafruit Unified Sensor'],
    'dht_u.h': ['DHT sensor library', 'Adafruit Unified Sensor'],
    'liquidcrystal.h': ['LiquidCrystal'],
    'liquidcrystal_i2c.h': ['LiquidCrystal I2C', 'Wire'],
    'servo.h': ['Servo'],
    'wire.h': ['Wire'],
    'spi.h': ['SPI'],
    'adafruit_ssd1306.h': ['Adafruit SSD1306', 'Adafruit GFX Library'],
    'adafruit_gfx.h': ['Adafruit GFX Library'],
    'adafruit_neopixel.h': ['Adafruit NeoPixel'],
    'mpu6050.h': ['MPU6050', 'Wire'],
    'rtclib.h': ['RTClib', 'Wire'],
    'onewire.h': ['OneWire'],
    'dallastemperature.h': ['DallasTemperature', 'OneWire'],
    'adafruit_bmp280.h': ['Adafruit BMP280 Library', 'Adafruit Unified Sensor', 'Wire'],
  };

  /**
   * Resolves libraries from placed components and wire connections.
   */
  public static resolveFromComponents(
    components: Array<{ id?: string; type: string }>,
    wires?: Array<{ fromPart?: string; toPart?: string; fromPin?: string; toPin?: string }>
  ): string[] {
    const libs = new Set<string>();

    for (const comp of components) {
      const raw = comp.type.replace(/^(wokwi|velxio)-/, '').toLowerCase();
      const profile = HardwareComponentRegistry.getComponent(comp.type) || HardwareComponentRegistry.getComponent(raw);
      const tag = profile ? profile.id : (comp.type.startsWith('wokwi-') ? comp.type : `wokwi-${comp.type}`);

      // Special Disambiguation: LCD1602 (Parallel 4-bit vs I2C)
      if (tag === 'wokwi-lcd1602') {
        const isI2c = wires?.some((w) => {
          const partMatches = !w.toPart && !w.fromPart ? true : (w.toPart === comp.id || w.fromPart === comp.id);
          const pinMatches =
            w.toPin?.toUpperCase() === 'SDA' ||
            w.fromPin?.toUpperCase() === 'SDA' ||
            w.toPin?.toUpperCase() === 'SCL' ||
            w.fromPin?.toUpperCase() === 'SCL';
          return partMatches && pinMatches;
        });

        if (isI2c) {
          libs.add('LiquidCrystal I2C');
          libs.add('Wire');
        } else {
          libs.add('LiquidCrystal');
        }
        continue;
      }

      const mapped = this.COMPONENT_LIBRARY_MAP[tag];
      if (mapped) {
        mapped.forEach((lib) => libs.add(lib));
      }
    }

    return Array.from(libs);
  }

  /**
   * Resolves libraries from #include directives inside firmware code.
   */
  public static resolveFromCode(codeContent: string): string[] {
    const libs = new Set<string>();
    if (!codeContent) return [];

    const includeRegex = /#include\s+[<"]([^>"]+)[>"]/gi;
    let match: RegExpExecArray | null;

    while ((match = includeRegex.exec(codeContent)) !== null) {
      const header = match[1].toLowerCase();
      const mapped = this.INCLUDE_LIBRARY_MAP[header];
      if (mapped) {
        mapped.forEach((lib) => libs.add(lib));
      }
    }

    return Array.from(libs);
  }

  /**
   * Resolves all required libraries from components, wires, and code.
   */
  public static resolveAll(
    components: Array<{ id?: string; type: string }>,
    codeContent?: string,
    wires?: Array<{ fromPart?: string; toPart?: string; fromPin?: string; toPin?: string }>
  ): string[] {
    const fromComps = this.resolveFromComponents(components, wires);
    const fromCode = codeContent ? this.resolveFromCode(codeContent) : [];
    return Array.from(new Set([...fromComps, ...fromCode]));
  }

  /**
   * Generates a clean libraries.txt manifest string.
   */
  public static generateLibrariesTxt(libraries: string[]): string {
    if (!libraries || libraries.length === 0) return '';
    return `# Libraries managed deterministically by VelxioAI Studio\n${libraries.join('\n')}\n`;
  }
}
