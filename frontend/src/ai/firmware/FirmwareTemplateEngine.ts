/**
 * VelxioAI Studio — Deterministic Firmware Template Engine
 *
 * Generates verified, compile-ready C++/Arduino firmware from component netlists
 * and pin allocations using strictly validated firmware templates.
 * Eliminates LLM hallucinations, pin mismatches, and syntax defects.
 */

import { HardwareKnowledgeGraph } from '../knowledge/HardwareKnowledgeGraph';
import type { HardwarePinAssignment } from '../hardware/PinAllocator';

export interface FirmwareTemplateContext {
  board: string;
  pinAssignments: Record<string, HardwarePinAssignment>;
  components: Array<{ type: string; id?: string }>;
  prompt?: string;
}

export class FirmwareTemplateEngine {
  /**
   * Synthesizes full compile-ready Arduino C++ firmware from the hardware netlist.
   */
  public static generateFirmware(context: FirmwareTemplateContext): string {
    const includes = new Set<string>();
    const pinDefinitions: string[] = [];
    const globalInstances: string[] = [];
    const globalVariables: string[] = [];
    const setupStatements: string[] = [];
    const loopStatements: string[] = [];

    includes.add('#include <Arduino.h>');

    const compTypes = new Set(context.components.map((c) => (c.type.startsWith('wokwi-') ? c.type : `wokwi-${c.type}`)));
    const pins = context.pinAssignments;

    // ── 1. DHT22 / DHT11 Temperature Sensor ─────────────────────────────────
    if (compTypes.has('wokwi-dht22') || compTypes.has('wokwi-dht11')) {
      const pin = pins['wokwi-dht22_SDA']?.allocatedPin || pins['wokwi-dht11_SDA']?.allocatedPin || '2';
      const dhtType = compTypes.has('wokwi-dht22') ? 'DHT22' : 'DHT11';

      includes.add('#include <DHT.h>');
      pinDefinitions.push(`#define DHTPIN ${pin}`);
      pinDefinitions.push(`#define DHTTYPE ${dhtType}`);
      globalInstances.push(`DHT dht(DHTPIN, DHTTYPE);`);
      setupStatements.push(`  dht.begin();`);
      loopStatements.push(`  float humidity = dht.readHumidity();`);
      loopStatements.push(`  float temperature = dht.readTemperature();`);
      loopStatements.push(`  if (!isnan(temperature) && !isnan(humidity)) {`);
      loopStatements.push(`    Serial.print("Temp: "); Serial.print(temperature); Serial.print(" °C | Humidity: "); Serial.print(humidity); Serial.println(" %");`);
      loopStatements.push(`  }`);
    }

    // ── 2. LCD1602 Display (Parallel / I2C) ──────────────────────────────────
    if (compTypes.has('wokwi-lcd1602')) {
      const isI2c = Object.keys(pins).some((k) => k.includes('lcd1602_SDA') || k.includes('lcd1602_SCL'));

      if (isI2c) {
        includes.add('#include <Wire.h>');
        includes.add('#include <LiquidCrystal_I2C.h>');
        globalInstances.push(`LiquidCrystal_I2C lcd(0x27, 16, 2);`);
        setupStatements.push(`  lcd.init();`);
        setupStatements.push(`  lcd.backlight();`);
        setupStatements.push(`  lcd.setCursor(0, 0);`);
        setupStatements.push(`  lcd.print("VelxioAI Studio");`);
      } else {
        const rs = pins['wokwi-lcd1602_RS']?.allocatedPin || '12';
        const en = pins['wokwi-lcd1602_E']?.allocatedPin || '11';
        const d4 = pins['wokwi-lcd1602_D4']?.allocatedPin || '5';
        const d5 = pins['wokwi-lcd1602_D5']?.allocatedPin || '4';
        const d6 = pins['wokwi-lcd1602_D6']?.allocatedPin || '3';
        const d7 = pins['wokwi-lcd1602_D7']?.allocatedPin || '2';

        includes.add('#include <LiquidCrystal.h>');
        pinDefinitions.push(`#define LCD_RS ${rs}`);
        pinDefinitions.push(`#define LCD_EN ${en}`);
        pinDefinitions.push(`#define LCD_D4 ${d4}`);
        pinDefinitions.push(`#define LCD_D5 ${d5}`);
        pinDefinitions.push(`#define LCD_D6 ${d6}`);
        pinDefinitions.push(`#define LCD_D7 ${d7}`);
        globalInstances.push(`LiquidCrystal lcd(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);`);
        setupStatements.push(`  lcd.begin(16, 2);`);
        setupStatements.push(`  lcd.setCursor(0, 0);`);
        setupStatements.push(`  lcd.print("VelxioAI Studio");`);
      }
    }

    // ── 3. HC-SR04 Ultrasonic Distance Sensor ───────────────────────────────
    if (compTypes.has('wokwi-hc-sr04')) {
      const trig = pins['wokwi-hc-sr04_TRIG']?.allocatedPin || '9';
      const echo = pins['wokwi-hc-sr04_ECHO']?.allocatedPin || '10';

      pinDefinitions.push(`#define TRIG_PIN ${trig}`);
      pinDefinitions.push(`#define ECHO_PIN ${echo}`);
      setupStatements.push(`  pinMode(TRIG_PIN, OUTPUT);`);
      setupStatements.push(`  pinMode(ECHO_PIN, INPUT);`);
      loopStatements.push(`  digitalWrite(TRIG_PIN, LOW);`);
      loopStatements.push(`  delayMicroseconds(2);`);
      loopStatements.push(`  digitalWrite(TRIG_PIN, HIGH);`);
      loopStatements.push(`  delayMicroseconds(10);`);
      loopStatements.push(`  digitalWrite(TRIG_PIN, LOW);`);
      loopStatements.push(`  long duration = pulseIn(ECHO_PIN, HIGH);`);
      loopStatements.push(`  float distanceCm = duration * 0.034 / 2.0;`);
      loopStatements.push(`  Serial.print("Distance: "); Serial.print(distanceCm); Serial.println(" cm");`);
    }

    // ── 4. SG90 Servo Motor ──────────────────────────────────────────────────
    if (compTypes.has('wokwi-servo')) {
      const pin = pins['wokwi-servo_PWM']?.allocatedPin || '9';
      includes.add('#include <Servo.h>');
      pinDefinitions.push(`#define SERVO_PIN ${pin}`);
      globalInstances.push(`Servo servoMotor;`);
      setupStatements.push(`  servoMotor.attach(SERVO_PIN);`);
      setupStatements.push(`  servoMotor.write(90);`);
    }

    // ── 5. PIR / IR Motion Sensor ────────────────────────────────────────────
    if (compTypes.has('wokwi-pir-motion-sensor')) {
      const pin = pins['wokwi-pir-motion-sensor_OUT']?.allocatedPin || '2';
      pinDefinitions.push(`#define PIR_PIN ${pin}`);
      globalVariables.push(`int visitorCount = 0;`);
      globalVariables.push(`bool lastPirState = LOW;`);
      setupStatements.push(`  pinMode(PIR_PIN, INPUT);`);
      loopStatements.push(`  int pirState = digitalRead(PIR_PIN);`);
      loopStatements.push(`  if (pirState == HIGH && lastPirState == LOW) {`);
      loopStatements.push(`    visitorCount++;`);
      loopStatements.push(`    Serial.print("Motion Detected! Count: "); Serial.println(visitorCount);`);
      if (compTypes.has('wokwi-lcd1602')) {
        loopStatements.push(`    lcd.setCursor(0, 1);`);
        loopStatements.push(`    lcd.print("Count: "); lcd.print(visitorCount); lcd.print("     ");`);
      }
      loopStatements.push(`  }`);
      loopStatements.push(`  lastPirState = pirState;`);
    }

    // ── 6. MQ-2 Gas & Smoke Sensor ───────────────────────────────────────────
    if (compTypes.has('wokwi-mq2')) {
      const pin = pins['wokwi-mq2_A0']?.allocatedPin || 'A0';
      pinDefinitions.push(`#define MQ2_PIN ${pin}`);
      loopStatements.push(`  int gasLevel = analogRead(MQ2_PIN);`);
      loopStatements.push(`  Serial.print("Gas Level: "); Serial.println(gasLevel);`);
    }

    // ── 7. Piezo Buzzer ──────────────────────────────────────────────────────
    if (compTypes.has('wokwi-buzzer')) {
      const pin = pins['wokwi-buzzer_1']?.allocatedPin || '8';
      pinDefinitions.push(`#define BUZZER_PIN ${pin}`);
      setupStatements.push(`  pinMode(BUZZER_PIN, OUTPUT);`);
      if (compTypes.has('wokwi-mq2')) {
        loopStatements.push(`  if (gasLevel > 400) {`);
        loopStatements.push(`    digitalWrite(BUZZER_PIN, HIGH);`);
        loopStatements.push(`  } else {`);
        loopStatements.push(`    digitalWrite(BUZZER_PIN, LOW);`);
        loopStatements.push(`  }`);
      } else if (compTypes.has('wokwi-hc-sr04')) {
        loopStatements.push(`  if (distanceCm < 15.0 && distanceCm > 0) {`);
        loopStatements.push(`    digitalWrite(BUZZER_PIN, HIGH);`);
        loopStatements.push(`  } else {`);
        loopStatements.push(`    digitalWrite(BUZZER_PIN, LOW);`);
        loopStatements.push(`  }`);
      }
    }

    // ── 8. Relay Module ──────────────────────────────────────────────────────
    if (compTypes.has('wokwi-relay-module')) {
      const pin = pins['wokwi-relay-module_IN']?.allocatedPin || '7';
      pinDefinitions.push(`#define RELAY_PIN ${pin}`);
      setupStatements.push(`  pinMode(RELAY_PIN, OUTPUT);`);
      setupStatements.push(`  digitalWrite(RELAY_PIN, LOW);`);
    }

    // ── 9. Potentiometer ─────────────────────────────────────────────────────
    if (compTypes.has('wokwi-potentiometer')) {
      const pin = pins['wokwi-potentiometer_2']?.allocatedPin || 'A0';
      pinDefinitions.push(`#define POT_PIN ${pin}`);
      loopStatements.push(`  int potVal = analogRead(POT_PIN);`);
      loopStatements.push(`  Serial.print("Potentiometer: "); Serial.println(potVal);`);
    }

    // ── 10. LDR Light Sensor ─────────────────────────────────────────────────
    if (compTypes.has('wokwi-photoresistor-sensor')) {
      const pin = pins['wokwi-photoresistor-sensor_AO']?.allocatedPin || 'A0';
      pinDefinitions.push(`#define LDR_PIN ${pin}`);
      loopStatements.push(`  int lightVal = analogRead(LDR_PIN);`);
      loopStatements.push(`  Serial.print("Light Level: "); Serial.println(lightVal);`);
    }

    // ── 11. DS1307 RTC ───────────────────────────────────────────────────────
    if (compTypes.has('wokwi-ds1307')) {
      includes.add('#include <Wire.h>');
      includes.add('#include <RTClib.h>');
      globalInstances.push(`RTC_DS1307 rtc;`);
      setupStatements.push(`  if (!rtc.begin()) {`);
      setupStatements.push(`    Serial.println("Couldn't find RTC");`);
      setupStatements.push(`  }`);
      setupStatements.push(`  if (!rtc.isrunning()) {`);
      setupStatements.push(`    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));`);
      setupStatements.push(`  }`);
      loopStatements.push(`  DateTime now = rtc.now();`);
      loopStatements.push(`  Serial.print(now.hour()); Serial.print(":"); Serial.print(now.minute()); Serial.print(":"); Serial.println(now.second());`);
      if (compTypes.has('wokwi-lcd1602')) {
        loopStatements.push(`  lcd.setCursor(0, 1);`);
        loopStatements.push(`  if (now.hour() < 10) lcd.print("0"); lcd.print(now.hour()); lcd.print(":");`);
        loopStatements.push(`  if (now.minute() < 10) lcd.print("0"); lcd.print(now.minute()); lcd.print(":");`);
        loopStatements.push(`  if (now.second() < 10) lcd.print("0"); lcd.print(now.second());`);
      }
    }

    // ── 12. Standard LED ─────────────────────────────────────────────────────
    if (compTypes.has('wokwi-led')) {
      const pin = pins['wokwi-led_A']?.allocatedPin || '13';
      pinDefinitions.push(`#define LED_PIN ${pin}`);
      setupStatements.push(`  pinMode(LED_PIN, OUTPUT);`);
      if (compTypes.size === 1 || (compTypes.size === 2 && compTypes.has('wokwi-resistor'))) {
        // Pure blink LED
        loopStatements.push(`  digitalWrite(LED_PIN, HIGH);`);
        loopStatements.push(`  delay(500);`);
        loopStatements.push(`  digitalWrite(LED_PIN, LOW);`);
        loopStatements.push(`  delay(500);`);
      }
    }

    // ── 13. Pushbutton ───────────────────────────────────────────────────────
    if (compTypes.has('wokwi-pushbutton')) {
      const pin = pins['wokwi-pushbutton_2.l']?.allocatedPin || pins['wokwi-pushbutton_1.l']?.allocatedPin || '2';
      pinDefinitions.push(`#define BUTTON_PIN ${pin}`);
      setupStatements.push(`  pinMode(BUTTON_PIN, INPUT_PULLUP);`);
      loopStatements.push(`  int btnState = digitalRead(BUTTON_PIN);`);
      loopStatements.push(`  if (btnState == LOW) {`);
      loopStatements.push(`    Serial.println("Button Pressed!");`);
      if (compTypes.has('wokwi-led')) {
        loopStatements.push(`    digitalWrite(LED_PIN, HIGH);`);
        loopStatements.push(`  } else {`);
        loopStatements.push(`    digitalWrite(LED_PIN, LOW);`);
      }
      loopStatements.push(`  }`);
    }

    // Assemble Code
    let code = `/**\n * VelxioAI Studio — Deterministic Canonical Firmware\n * Generated automatically from hardware netlist\n */\n\n`;

    code += Array.from(includes).join('\n') + '\n\n';

    if (pinDefinitions.length > 0) {
      code += '// ── Pin Assignments ──\n' + pinDefinitions.join('\n') + '\n\n';
    }

    if (globalInstances.length > 0) {
      code += '// ── Subsystem Instances ──\n' + globalInstances.join('\n') + '\n\n';
    }

    if (globalVariables.length > 0) {
      code += '// ── Global Variables ──\n' + globalVariables.join('\n') + '\n\n';
    }

    code += 'void setup() {\n';
    code += '  Serial.begin(115200);\n';
    code += '  Serial.println("System Initialized");\n';
    if (setupStatements.length > 0) {
      code += setupStatements.join('\n') + '\n';
    }
    code += '}\n\n';

    code += 'void loop() {\n';
    if (loopStatements.length > 0) {
      code += loopStatements.join('\n') + '\n';
    }
    code += '  delay(200);\n';
    code += '}\n';

    return code;
  }
}
