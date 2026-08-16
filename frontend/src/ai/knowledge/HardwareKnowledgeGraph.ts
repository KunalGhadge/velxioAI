/**
 * VelxioAI Studio — Hardware Knowledge Graph
 *
 * Deterministic authority for component specifications, aliases, required libraries,
 * pin definitions, compatible boards, electrical protocols, and firmware templates.
 * Eliminates all LLM guesswork in component and library selection.
 */

export interface HardwareKnowledgeNode {
  componentId: string;
  name: string;
  aliases: string[];
  category: 'sensor' | 'display' | 'actuator' | 'passive' | 'input' | 'logic' | 'rtc' | 'power';
  requiredLibraries: string[];
  optionalLibraries: string[];
  requiredPins: string[];
  optionalPins: string[];
  compatibleBoards: string[];
  inputPins: string[];
  outputPins: string[];
  supportedProtocols: Array<'analog' | 'gpio_digital' | 'i2c' | 'spi' | 'uart' | '1-wire' | 'pwm' | 'passive'>;
  voltageRequirements: { min: number; max: number; typical: number };
  firmwareTemplate: string;
  incompatibleComponents: string[];
  description: string;
}

export const HARDWARE_KNOWLEDGE_GRAPH: Record<string, HardwareKnowledgeNode> = {
  'wokwi-dht22': {
    componentId: 'wokwi-dht22',
    name: 'DHT22 Temperature & Humidity Sensor',
    aliases: ['dht22', 'dht-22', 'temperature sensor', 'humidity sensor', 'temp sensor', 'am2302', 'hygrometer', 'weather sensor', 'dht11'],
    category: 'sensor',
    requiredLibraries: ['DHT sensor library', 'Adafruit Unified Sensor'],
    optionalLibraries: [],
    requiredPins: ['VCC', 'GND', 'SDA'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'esp32-c3', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND'],
    outputPins: ['SDA'],
    supportedProtocols: ['gpio_digital', '1-wire'],
    voltageRequirements: { min: 3.3, max: 5.0, typical: 5.0 },
    firmwareTemplate: 'dht22.template',
    incompatibleComponents: [],
    description: 'Capacitive humidity and high-precision temperature digital sensor',
  },

  'wokwi-lcd1602': {
    componentId: 'wokwi-lcd1602',
    name: '16x2 Character LCD (Parallel / I2C)',
    aliases: ['lcd', 'lcd1602', '16x2', '1602', 'display', 'screen', 'character display', 'liquidcrystal', 'hd44780'],
    category: 'display',
    requiredLibraries: ['LiquidCrystal'], // Parallel fallback, dynamically upgraded to LiquidCrystal I2C if I2C bus detected
    optionalLibraries: ['LiquidCrystal I2C', 'Wire'],
    requiredPins: ['VSS', 'VDD', 'RS', 'E', 'D4', 'D5', 'D6', 'D7'],
    optionalPins: ['RW', 'V0', 'A', 'K', 'SDA', 'SCL'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VSS', 'VDD', 'RS', 'E', 'D4', 'D5', 'D6', 'D7', 'SDA', 'SCL'],
    outputPins: [],
    supportedProtocols: ['gpio_digital', 'i2c'],
    voltageRequirements: { min: 4.5, max: 5.5, typical: 5.0 },
    firmwareTemplate: 'lcd.template',
    incompatibleComponents: [],
    description: '16 column by 2 row alphanumeric character liquid crystal display',
  },

  'wokwi-hc-sr04': {
    componentId: 'wokwi-hc-sr04',
    name: 'HC-SR04 Ultrasonic Distance Sensor',
    aliases: ['ultrasonic', 'sonar', 'hc-sr04', 'hcsr04', 'distance sensor', 'range finder', 'proximity sensor', 'parking sensor', 'obstacle sensor'],
    category: 'sensor',
    requiredLibraries: [],
    optionalLibraries: ['NewPing'],
    requiredPins: ['VCC', 'GND', 'TRIG', 'ECHO'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND', 'TRIG'],
    outputPins: ['ECHO'],
    supportedProtocols: ['gpio_digital'],
    voltageRequirements: { min: 4.5, max: 5.5, typical: 5.0 },
    firmwareTemplate: 'hcsr04.template',
    incompatibleComponents: [],
    description: 'Non-contact ultrasonic range measurement module (2cm - 400cm)',
  },

  'wokwi-servo': {
    componentId: 'wokwi-servo',
    name: 'SG90 Micro Servo Motor',
    aliases: ['servo', 'servo motor', 'sg90', 'mg90s', 'motor', 'actuator', 'arm', 'gate', 'steering'],
    category: 'actuator',
    requiredLibraries: ['Servo'],
    optionalLibraries: ['ESP32Servo'],
    requiredPins: ['V+', 'GND', 'PWM'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['V+', 'GND', 'PWM'],
    outputPins: [],
    supportedProtocols: ['pwm'],
    voltageRequirements: { min: 4.8, max: 6.0, typical: 5.0 },
    firmwareTemplate: 'servo.template',
    incompatibleComponents: [],
    description: 'Positional servo actuator with 0 to 180 degree rotation control',
  },

  'wokwi-pir-motion-sensor': {
    componentId: 'wokwi-pir-motion-sensor',
    name: 'PIR / IR Motion & Presence Sensor',
    aliases: ['pir', 'ir sensor', 'ir', 'motion sensor', 'presence sensor', 'infrared sensor', 'motion detector', 'visitor sensor', 'intrusion sensor', 'people counter'],
    category: 'sensor',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['VCC', 'GND', 'OUT'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND'],
    outputPins: ['OUT'],
    supportedProtocols: ['gpio_digital'],
    voltageRequirements: { min: 3.3, max: 5.0, typical: 5.0 },
    firmwareTemplate: 'pir.template',
    incompatibleComponents: [],
    description: 'Passive infrared human motion and presence detection sensor',
  },

  'wokwi-mq2': {
    componentId: 'wokwi-mq2',
    name: 'MQ-2 Flammable Gas & Smoke Sensor',
    aliases: ['mq2', 'mq-2', 'gas sensor', 'smoke sensor', 'gas detector', 'methane sensor', 'lpg sensor', 'smoke detector', 'air quality sensor', 'gas leak detector'],
    category: 'sensor',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['VCC', 'GND', 'A0'],
    optionalPins: ['D0'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND'],
    outputPins: ['A0', 'D0'],
    supportedProtocols: ['analog', 'gpio_digital'],
    voltageRequirements: { min: 4.8, max: 5.2, typical: 5.0 },
    firmwareTemplate: 'mq2.template',
    incompatibleComponents: [],
    description: 'Semiconductor gas sensor for smoke, LPG, methane, alcohol, and hydrogen',
  },

  'wokwi-buzzer': {
    componentId: 'wokwi-buzzer',
    name: 'Piezo Electric Buzzer',
    aliases: ['buzzer', 'piezo', 'piezo buzzer', 'speaker', 'alarm', 'beeper', 'audio alert', 'siren', 'tone generator'],
    category: 'actuator',
    requiredLibraries: [],
    optionalLibraries: ['TonePlayer'],
    requiredPins: ['1', '2'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['1', '2'],
    outputPins: [],
    supportedProtocols: ['pwm', 'gpio_digital'],
    voltageRequirements: { min: 3.3, max: 12.0, typical: 5.0 },
    firmwareTemplate: 'buzzer.template',
    incompatibleComponents: [],
    description: 'Audible frequency piezoelectric sounder for alarms and tone generation',
  },

  'wokwi-relay-module': {
    componentId: 'wokwi-relay-module',
    name: '5V Single Channel Relay Module',
    aliases: ['relay', 'relay module', 'switch', 'ac switch', 'solenoid switch', 'high voltage switch', 'mains switch'],
    category: 'actuator',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['VCC', 'GND', 'IN'],
    optionalPins: ['NO', 'COM', 'NC'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND', 'IN'],
    outputPins: [],
    supportedProtocols: ['gpio_digital'],
    voltageRequirements: { min: 4.5, max: 5.5, typical: 5.0 },
    firmwareTemplate: 'relay.template',
    incompatibleComponents: [],
    description: 'Electromechanical isolated relay switch for high current or AC loads',
  },

  'wokwi-potentiometer': {
    componentId: 'wokwi-potentiometer',
    name: 'Rotary Potentiometer (10kΩ)',
    aliases: ['potentiometer', 'pot', 'knob', 'dial', 'variable resistor', 'analog input', 'volume knob'],
    category: 'input',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['1', '2', '3'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['1', '3'],
    outputPins: ['2'],
    supportedProtocols: ['analog'],
    voltageRequirements: { min: 0.0, max: 5.0, typical: 5.0 },
    firmwareTemplate: 'potentiometer.template',
    incompatibleComponents: [],
    description: 'Rotary potentiometer providing variable voltage analog output (0 to VCC)',
  },

  'wokwi-photoresistor-sensor': {
    componentId: 'wokwi-photoresistor-sensor',
    name: 'LDR Light Sensor (Photoresistor)',
    aliases: ['ldr', 'photoresistor', 'light sensor', 'ambient light', 'lux sensor', 'photocell', 'daylight sensor', 'solar sensor'],
    category: 'sensor',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['VCC', 'GND', 'AO'],
    optionalPins: ['DO'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND'],
    outputPins: ['AO', 'DO'],
    supportedProtocols: ['analog', 'gpio_digital'],
    voltageRequirements: { min: 3.3, max: 5.0, typical: 5.0 },
    firmwareTemplate: 'ldr.template',
    incompatibleComponents: [],
    description: 'Cadmium-sulfide photoresistor module for ambient illuminance sensing',
  },

  'wokwi-mpu6050': {
    componentId: 'wokwi-mpu6050',
    name: 'MPU6050 6-Axis Gyroscope & Accelerometer',
    aliases: ['mpu6050', 'mpu-6050', 'gyro', 'gyroscope', 'accelerometer', 'imu', 'motion tracker', 'incline sensor', 'orientation sensor', 'tilt sensor'],
    category: 'sensor',
    requiredLibraries: ['MPU6050', 'Wire'],
    optionalLibraries: ['Adafruit MPU6050', 'Adafruit Unified Sensor'],
    requiredPins: ['VCC', 'GND', 'SCL', 'SDA'],
    optionalPins: ['INT', 'AD0', 'XCL', 'XDA'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND', 'SCL', 'SDA'],
    outputPins: ['INT'],
    supportedProtocols: ['i2c'],
    voltageRequirements: { min: 3.3, max: 5.0, typical: 3.3 },
    firmwareTemplate: 'mpu6050.template',
    incompatibleComponents: [],
    description: '6-Degrees of Freedom I2C motion tracking device combining 3-axis gyro and 3-axis accelerometer',
  },

  'wokwi-bmp280': {
    componentId: 'wokwi-bmp280',
    name: 'BMP280 Barometric Pressure & Altitude Sensor',
    aliases: ['bmp280', 'bmp-280', 'barometer', 'pressure sensor', 'altimeter', 'altitude sensor', 'weather barometer'],
    category: 'sensor',
    requiredLibraries: ['Adafruit BMP280 Library', 'Adafruit Unified Sensor', 'Wire'],
    optionalLibraries: [],
    requiredPins: ['VCC', 'GND', 'SCL', 'SDA'],
    optionalPins: ['CSB', 'SDO'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND', 'SCL', 'SDA'],
    outputPins: [],
    supportedProtocols: ['i2c', 'spi'],
    voltageRequirements: { min: 1.8, max: 3.6, typical: 3.3 },
    firmwareTemplate: 'bmp280.template',
    incompatibleComponents: [],
    description: 'Precision barometric pressure, temperature, and barometric altitude sensor',
  },

  'wokwi-ssd1306': {
    componentId: 'wokwi-ssd1306',
    name: '0.96" 128x64 I2C OLED Display',
    aliases: ['oled', 'ssd1306', 'oled display', 'graphic display', 'i2c display', '128x64 oled', 'screen graphic'],
    category: 'display',
    requiredLibraries: ['Adafruit SSD1306', 'Adafruit GFX Library', 'Wire'],
    optionalLibraries: ['U8g2'],
    requiredPins: ['VCC', 'GND', 'SCL', 'SDA'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND', 'SCL', 'SDA'],
    outputPins: [],
    supportedProtocols: ['i2c'],
    voltageRequirements: { min: 3.3, max: 5.0, typical: 3.3 },
    firmwareTemplate: 'ssd1306.template',
    incompatibleComponents: [],
    description: '128x64 dot matrix graphical monochrome OLED display over I2C',
  },

  'wokwi-ds1307': {
    componentId: 'wokwi-ds1307',
    name: 'DS1307 Real Time Clock (RTC)',
    aliases: ['rtc', 'ds1307', 'clock', 'real time clock', 'ds3231', 'timer clock', 'calendar', 'digital clock rtc'],
    category: 'rtc',
    requiredLibraries: ['RTClib', 'Wire'],
    optionalLibraries: [],
    requiredPins: ['VCC', 'GND', 'SDA', 'SCL'],
    optionalPins: ['SQW'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND', 'SDA', 'SCL'],
    outputPins: ['SQW'],
    supportedProtocols: ['i2c'],
    voltageRequirements: { min: 4.5, max: 5.5, typical: 5.0 },
    firmwareTemplate: 'ds1307.template',
    incompatibleComponents: [],
    description: 'Real-time clock calendar with full binary-coded decimal time tracking',
  },

  'wokwi-ds18b20': {
    componentId: 'wokwi-ds18b20',
    name: 'DS18B20 1-Wire Waterproof Temperature Sensor',
    aliases: ['ds18b20', 'waterproof temp', 'waterproof temperature', '1-wire temp', 'probe temp', 'dallas temp'],
    category: 'sensor',
    requiredLibraries: ['OneWire', 'DallasTemperature'],
    optionalLibraries: [],
    requiredPins: ['VCC', 'GND', 'DQ'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['VCC', 'GND'],
    outputPins: ['DQ'],
    supportedProtocols: ['1-wire'],
    voltageRequirements: { min: 3.0, max: 5.5, typical: 5.0 },
    firmwareTemplate: 'ds18b20.template',
    incompatibleComponents: [],
    description: 'Programmable resolution 1-wire digital temperature probe (-55C to +125C)',
  },

  'wokwi-membrane-keypad': {
    componentId: 'wokwi-membrane-keypad',
    name: '4x4 Matrix Membrane Keypad',
    aliases: ['keypad', 'membrane keypad', 'matrix keypad', '4x4 keypad', 'pinpad', 'password keypad', 'door lock keypad', 'numeric keypad'],
    category: 'input',
    requiredLibraries: ['Keypad'],
    optionalLibraries: [],
    requiredPins: ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['R1', 'R2', 'R3', 'R4'],
    outputPins: ['C1', 'C2', 'C3', 'C4'],
    supportedProtocols: ['gpio_digital'],
    voltageRequirements: { min: 3.3, max: 5.0, typical: 5.0 },
    firmwareTemplate: 'keypad.template',
    incompatibleComponents: [],
    description: '16-button 4x4 matrix momentary tactile keypad for numeric input and PIN entry',
  },

  'wokwi-led': {
    componentId: 'wokwi-led',
    name: '5mm LED (Red/Green/Yellow/Blue)',
    aliases: ['led', 'light', 'indicator', 'blink led', 'traffic led', 'pilot light', 'warning led', 'blinking light'],
    category: 'actuator',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['A', 'C'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['A', 'C'],
    outputPins: [],
    supportedProtocols: ['gpio_digital', 'pwm'],
    voltageRequirements: { min: 1.8, max: 3.3, typical: 2.0 },
    firmwareTemplate: 'led.template',
    incompatibleComponents: [],
    description: 'Standard 5mm light emitting diode (requires 220-330 ohm series current limiting resistor)',
  },

  'wokwi-rgb-led': {
    componentId: 'wokwi-rgb-led',
    name: 'Common Cathode RGB LED',
    aliases: ['rgb led', 'rgb', 'color led', 'tricolor led', 'multicolor light'],
    category: 'actuator',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['R', 'G', 'B', 'COM'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['R', 'G', 'B', 'COM'],
    outputPins: [],
    supportedProtocols: ['pwm', 'gpio_digital'],
    voltageRequirements: { min: 2.0, max: 3.4, typical: 3.0 },
    firmwareTemplate: 'rgbled.template',
    incompatibleComponents: [],
    description: 'Multi-channel RGB LED supporting full 24-bit color spectrum via PWM modulation',
  },

  'wokwi-pushbutton': {
    componentId: 'wokwi-pushbutton',
    name: 'Tactile Momentary Pushbutton',
    aliases: ['pushbutton', 'button', 'tactile button', 'switch', 'momentary switch', 'trigger button', 'vote button', 'reset button'],
    category: 'input',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['1.l', '2.l'],
    optionalPins: ['1.r', '2.r'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['1.l'],
    outputPins: ['2.l'],
    supportedProtocols: ['gpio_digital'],
    voltageRequirements: { min: 0.0, max: 5.0, typical: 5.0 },
    firmwareTemplate: 'button.template',
    incompatibleComponents: [],
    description: 'SPST tactile momentary pushbutton switch with internal pull-up compatibility',
  },

  'wokwi-7segment': {
    componentId: 'wokwi-7segment',
    name: '1-Digit 7-Segment Display',
    aliases: ['7-segment', '7segment', 'seven segment', 'digit display', 'numeric display', 'counter display', 'seg display'],
    category: 'display',
    requiredLibraries: [],
    optionalLibraries: ['SevSeg'],
    requiredPins: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'COM'],
    optionalPins: ['DP'],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'COM'],
    outputPins: [],
    supportedProtocols: ['gpio_digital'],
    voltageRequirements: { min: 1.8, max: 3.3, typical: 2.0 },
    firmwareTemplate: 'sevensegment.template',
    incompatibleComponents: [],
    description: 'Single-digit 7-segment LED numeric display with common cathode/anode pinout',
  },

  'wokwi-resistor': {
    componentId: 'wokwi-resistor',
    name: 'Current Limiting / Pull-up Resistor',
    aliases: ['resistor', 'pull-up', 'pull-down', 'current limiter', '220 ohm', '10k ohm', '330 ohm'],
    category: 'passive',
    requiredLibraries: [],
    optionalLibraries: [],
    requiredPins: ['1', '2'],
    optionalPins: [],
    compatibleBoards: ['uno', 'nano', 'mega', 'esp32', 'pi-pico', 'rp2040'],
    inputPins: ['1'],
    outputPins: ['2'],
    supportedProtocols: ['passive'],
    voltageRequirements: { min: 0.0, max: 50.0, typical: 5.0 },
    firmwareTemplate: '',
    incompatibleComponents: [],
    description: 'Passive resistor component for LED current limiting and I2C/GPIO bus pull-up',
  },
};

export class HardwareKnowledgeGraph {
  /**
   * Retrieves a knowledge node by exact ID or alias match.
   */
  public static getNode(idOrAlias: string): HardwareKnowledgeNode | null {
    if (!idOrAlias) return null;
    const clean = idOrAlias.toLowerCase().trim();

    // Direct key match
    if (HARDWARE_KNOWLEDGE_GRAPH[clean]) {
      return HARDWARE_KNOWLEDGE_GRAPH[clean];
    }
    const withWokwi = clean.startsWith('wokwi-') ? clean : `wokwi-${clean}`;
    if (HARDWARE_KNOWLEDGE_GRAPH[withWokwi]) {
      return HARDWARE_KNOWLEDGE_GRAPH[withWokwi];
    }

    // Alias search
    for (const node of Object.values(HARDWARE_KNOWLEDGE_GRAPH)) {
      if (node.componentId === clean || node.componentId === withWokwi) return node;
      if (node.aliases.some((a) => a.toLowerCase() === clean || clean.includes(a.toLowerCase()))) {
        return node;
      }
    }

    return null;
  }

  /**
   * Disambiguates whether LCD is parallel (LiquidCrystal) or I2C (LiquidCrystal I2C + Wire).
   */
  public static detectLcdProtocol(wires: Array<{ fromPin?: string; toPin?: string }>): 'i2c' | 'parallel' {
    const isI2c = wires.some(
      (w) =>
        w.fromPin === 'SDA' ||
        w.toPin === 'SDA' ||
        w.fromPin === 'SCL' ||
        w.toPin === 'SCL' ||
        w.fromPin === 'A4' ||
        w.toPin === 'A4' ||
        w.fromPin === 'A5' ||
        w.toPin === 'A5'
    );
    return isI2c ? 'i2c' : 'parallel';
  }

  /**
   * Resolves required libraries deterministically for a list of components and wires.
   */
  public static resolveLibraries(
    components: Array<{ type: string }>,
    wires: Array<{ fromPin?: string; toPin?: string }> = []
  ): string[] {
    const libs = new Set<string>();

    for (const comp of components) {
      const node = this.getNode(comp.type);
      if (!node) continue;

      if (node.componentId === 'wokwi-lcd1602') {
        const protocol = this.detectLcdProtocol(wires);
        if (protocol === 'i2c') {
          libs.add('LiquidCrystal I2C');
          libs.add('Wire');
        } else {
          libs.add('LiquidCrystal');
        }
      } else {
        node.requiredLibraries.forEach((lib) => libs.add(lib));
      }
    }

    return Array.from(libs);
  }
}
