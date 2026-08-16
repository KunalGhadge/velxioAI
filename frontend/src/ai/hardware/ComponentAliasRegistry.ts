/**
 * VelxioAI Studio — Component Alias Registry
 *
 * Maps colloquial user terminology, abbreviations, and sensor aliases to
 * canonical Wokwi/Velxio hardware component identifiers.
 */

export const COMPONENT_ALIASES: Record<string, string> = {
  // LEDs & Lighting
  led: 'wokwi-led',
  light: 'wokwi-led',
  diode: 'wokwi-led',
  rgb: 'wokwi-rgb-led',
  'rgb-led': 'wokwi-rgb-led',
  rgbled: 'wokwi-rgb-led',
  neopixel: 'wokwi-neopixel',
  ws2812: 'wokwi-neopixel',
  ws2812b: 'wokwi-neopixel',

  // Sensors
  pir: 'wokwi-pir-motion-sensor',
  motion: 'wokwi-pir-motion-sensor',
  'motion-sensor': 'wokwi-pir-motion-sensor',
  'ir-sensor': 'wokwi-pir-motion-sensor',
  ir: 'wokwi-pir-motion-sensor',
  ultrasonic: 'wokwi-hc-sr04',
  sonar: 'wokwi-hc-sr04',
  distance: 'wokwi-hc-sr04',
  hcsr04: 'wokwi-hc-sr04',
  'hc-sr04': 'wokwi-hc-sr04',
  temperature: 'wokwi-dht22',
  temp: 'wokwi-dht22',
  humidity: 'wokwi-dht22',
  dht: 'wokwi-dht22',
  dht11: 'wokwi-dht22',
  dht22: 'wokwi-dht22',
  ds18b20: 'wokwi-ds18b20',
  photoresistor: 'wokwi-photoresistor-sensor',
  ldr: 'wokwi-photoresistor-sensor',
  light_sensor: 'wokwi-photoresistor-sensor',
  potentiometer: 'wokwi-potentiometer',
  pot: 'wokwi-potentiometer',
  mpu6050: 'wokwi-mpu6050',
  gyro: 'wokwi-mpu6050',
  accelerometer: 'wokwi-mpu6050',
  bmp280: 'wokwi-bmp280',
  barometer: 'wokwi-bmp280',
  pressure: 'wokwi-bmp280',

  // Displays
  oled: 'wokwi-ssd1306',
  ssd1306: 'wokwi-ssd1306',
  'i2c-oled': 'wokwi-ssd1306',
  lcd: 'wokwi-lcd1602',
  lcd1602: 'wokwi-lcd1602',
  '16x2': 'wokwi-lcd1602',
  screen: 'wokwi-lcd1602',
  display: 'wokwi-ssd1306',
  '7segment': 'wokwi-7segment',
  sevenseg: 'wokwi-7segment',
  '7-segment': 'wokwi-7segment',
  ili9341: 'wokwi-ili9341',
  tft: 'wokwi-ili9341',

  // Actuators & Outputs
  servo: 'wokwi-servo',
  'servo-motor': 'wokwi-servo',
  servomotor: 'wokwi-servo',
  buzzer: 'wokwi-buzzer',
  piezo: 'wokwi-buzzer',
  speaker: 'wokwi-buzzer',
  sound: 'wokwi-buzzer',
  relay: 'wokwi-relay-module',
  'relay-module': 'wokwi-relay-module',

  // Inputs & Switches
  button: 'wokwi-pushbutton',
  pushbutton: 'wokwi-pushbutton',
  switch: 'wokwi-slide-switch',
  'slide-switch': 'wokwi-slide-switch',
  keypad: 'wokwi-membrane-keypad',
  '4x4-keypad': 'wokwi-membrane-keypad',

  // Passives
  resistor: 'wokwi-resistor',
  r: 'wokwi-resistor',
};

export class ComponentAliasRegistry {
  /**
   * Resolves a colloquial or raw component term to its canonical component ID.
   * e.g. "ultrasonic" -> "wokwi-hc-sr04", "temp" -> "wokwi-dht22", "wokwi-led" -> "wokwi-led"
   */
  public static resolve(term: string): string {
    if (!term || typeof term !== 'string') return 'wokwi-led';
    const clean = term.trim().toLowerCase();

    // Direct match in alias map
    if (COMPONENT_ALIASES[clean]) {
      return COMPONENT_ALIASES[clean];
    }

    // Strip prefixes and re-check
    const stripped = clean.replace(/^(wokwi|velxio)-/, '').replace(/_/g, '-');
    if (COMPONENT_ALIASES[stripped]) {
      return COMPONENT_ALIASES[stripped];
    }

    // Fuzzy contains match
    for (const [alias, canonical] of Object.entries(COMPONENT_ALIASES)) {
      if (clean.includes(alias) || alias.includes(clean)) {
        return canonical;
      }
    }

    // If it already looks like a valid custom element tag, return as is
    if (term.startsWith('wokwi-') || term.startsWith('velxio-')) {
      return term;
    }

    return `wokwi-${term}`;
  }

  public static resolveAlias(term: string): string | null {
    if (!this.has(term)) return null;
    return this.resolve(term);
  }

  /**
   * Checks if an alias or canonical component is recognized.
   */
  public static has(term: string): boolean {
    if (!term) return false;
    const clean = term.trim().toLowerCase();
    const stripped = clean.replace(/^(wokwi|velxio)-/, '').replace(/_/g, '-');
    return Boolean(COMPONENT_ALIASES[clean] || COMPONENT_ALIASES[stripped]);
  }

  /**
   * Returns all supported alias mappings.
   */
  public static getAliases(): Record<string, string> {
    return { ...COMPONENT_ALIASES };
  }
}
