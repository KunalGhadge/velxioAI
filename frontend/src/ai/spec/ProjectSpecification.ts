/**
 * VelxioAI Studio — Canonical Project Specification (Single Source of Truth)
 *
 * Enforces that hardware components, pin allocations, wire netlists, libraries,
 * and firmware header/constructor signatures are derived strictly from the
 * deterministic hardware engine, eliminating LLM hallucinations and desynchronization.
 */

import { RequirementExtractor, UserRequirements } from '../requirements/RequirementExtractor';
import { ComponentConstraintValidator } from '../requirements/ComponentConstraintValidator';
import { SubsystemPlanner, PlannedSubsystem } from '../architecture/SubsystemPlanner';
import { BoardRecommendationEngine } from '../architecture/BoardRecommendationEngine';
import { PinAllocator, HardwarePinAssignment } from '../hardware/PinAllocator';
import { PinAssignmentRegistry } from '../hardware/PinAssignmentRegistry';
import { LibraryResolver } from '../compiler/LibraryResolver';
import { CircuitValidator } from '../tools/CircuitValidator';
import { CircuitProposal, CodeProposal } from '../types';

export interface ProjectSpecification {
  id: string;
  title: string;
  board: string;
  requirements: UserRequirements;
  requiredComponents: string[];
  forbiddenComponents: string[];
  componentsToAdd: Array<{ id: string; type: string; name?: string; x?: number; y?: number }>;
  allocatedPins: HardwarePinAssignment[];
  generatedLibraries: string[];
  generatedNetlist: Array<{ fromPart: string; toPart: string; fromPin: string; toPin: string; color?: string }>;
  generatedFirmware: string;
  subsystems: PlannedSubsystem[];
  validationPassed: boolean;
}

export class ProjectSpecificationEngine {
  /**
   * Synthesizes a complete, canonical ProjectSpecification from a natural language prompt.
   * This is the Single Source of Truth for hardware, wiring, libraries, and firmware.
   */
  public static synthesizeSpecification(prompt: string, existingCode?: string): ProjectSpecification {
    const specId = `spec-${Date.now()}`;

    // 1. Deterministic Requirements Extraction
    const requirements = RequirementExtractor.extract(prompt);

    // 2. Subsystem Planning & Board Recommendation
    const subsystems = SubsystemPlanner.planSubsystems(prompt);
    const recommendedBoard = BoardRecommendationEngine.recommendBoard(prompt, subsystems).boardKind;

    // 3. Deterministic Component Synthesis (Ensuring all required components are present)
    const componentsMap = new Map<string, { id: string; type: string; name?: string }>();

    // Add components from planned subsystems
    subsystems.forEach((sub, sIdx) => {
      sub.components.forEach((cTag, cIdx) => {
        const id = `${cTag.replace(/^(wokwi|velxio)-/, '').replace(/-/g, '_')}_${sIdx + 1}_${cIdx + 1}`;
        componentsMap.set(id, { id, type: cTag, name: sub.name });
      });
    });

    // Ensure all required components from RequirementExtractor are present
    requirements.requiredComponents.forEach((reqTag, idx) => {
      const alreadyPresent = Array.from(componentsMap.values()).some((c) => c.type === reqTag);
      if (!alreadyPresent) {
        const id = `${reqTag.replace(/^(wokwi|velxio)-/, '').replace(/-/g, '_')}_req_${idx + 1}`;
        componentsMap.set(id, { id, type: reqTag, name: `Required ${reqTag}` });
      }
    });

    // Filter out any forbidden components
    requirements.forbiddenComponents.forEach((forbTag) => {
      for (const [id, comp] of componentsMap.entries()) {
        if (comp.type === forbTag) {
          componentsMap.delete(id);
        }
      }
    });

    // Fallback: If no components planned, default to an LED indicator
    if (componentsMap.size === 0) {
      componentsMap.set('led_1_1', { id: 'led_1_1', type: 'wokwi-led', name: 'Status Indicator' });
    }

    const componentsToAdd = Array.from(componentsMap.values());

    // 4. Deterministic Hardware Pin Allocation & Netlist Synthesis
    const allocator = new PinAllocator(recommendedBoard as any);
    const hardwarePlan = allocator.buildCompletePlan(recommendedBoard, componentsToAdd, prompt);

    // 5. Deterministic Library Dependency Resolution
    const generatedLibraries = LibraryResolver.resolveAll(
      hardwarePlan.componentsToAdd,
      existingCode,
      hardwarePlan.wiresToAdd
    );

    // 6. Pre-Flight Circuit Validation
    const circuitProposal: CircuitProposal = {
      id: `circuit-${Date.now()}`,
      title: `${prompt.slice(0, 40)}...`,
      boardKind: recommendedBoard as any,
      componentsToAdd: hardwarePlan.componentsToAdd as any,
      wiresToAdd: hardwarePlan.wiresToAdd as any,
    };

    const circuitValidation = CircuitValidator.validate(circuitProposal, recommendedBoard as any);

    // 7. Deterministic Firmware Skeleton & Pin/Library Synchronization
    const generatedFirmware = this.generateCanonicalFirmware(
      prompt,
      recommendedBoard,
      hardwarePlan.componentsToAdd,
      hardwarePlan.wiresToAdd,
      generatedLibraries,
      existingCode
    );

    return {
      id: specId,
      title: prompt,
      board: recommendedBoard,
      requirements,
      requiredComponents: requirements.requiredComponents,
      forbiddenComponents: requirements.forbiddenComponents,
      componentsToAdd: hardwarePlan.componentsToAdd,
      allocatedPins: PinAssignmentRegistry.getInstance().getAllAssignments() as any,
      generatedLibraries,
      generatedNetlist: hardwarePlan.wiresToAdd,
      generatedFirmware,
      subsystems,
      validationPassed: circuitValidation.valid,
    };
  }

  /**
   * Generates or reconciles firmware code so that headers, constructor signatures,
   * and pin assignments are 100% synchronized with the physical hardware netlist.
   */
  public static generateCanonicalFirmware(
    prompt: string,
    board: string,
    components: Array<{ id: string; type: string }>,
    wires: Array<{ fromPart: string; toPart: string; fromPin: string; toPin: string }>,
    libraries: string[],
    existingCode?: string
  ): string {
    const pinRegistry = PinAssignmentRegistry.getInstance();
    const compTypes = new Set(components.map((c) => c.type));

    // Determine Required C++ Headers
    const headers: string[] = [];
    if (compTypes.has('wokwi-dht22') || compTypes.has('wokwi-dht11')) {
      headers.push('#include <DHT.h>');
    }
    if (compTypes.has('wokwi-servo')) {
      headers.push('#include <Servo.h>');
    }
    if (compTypes.has('wokwi-ssd1306')) {
      headers.push('#include <Wire.h>', '#include <Adafruit_GFX.h>', '#include <Adafruit_SSD1306.h>');
    }
    if (compTypes.has('wokwi-neopixel')) {
      headers.push('#include <Adafruit_NeoPixel.h>');
    }
    if (compTypes.has('wokwi-lcd1602')) {
      const isI2c = wires.some(
        (w) =>
          (w.toPin?.toUpperCase() === 'SDA' || w.fromPin?.toUpperCase() === 'SDA') ||
          (w.toPin?.toUpperCase() === 'SCL' || w.fromPin?.toUpperCase() === 'SCL')
      );
      if (isI2c) {
        headers.push('#include <Wire.h>', '#include <LiquidCrystal_I2C.h>');
      } else {
        headers.push('#include <LiquidCrystal.h>');
      }
    }

    // If existing code is provided, synchronize it
    if (existingCode && existingCode.trim().length > 30) {
      let synchronized = existingCode;

      // 1. Ensure all mandatory headers are present
      for (const h of headers) {
        if (!synchronized.includes(h)) {
          synchronized = `${h}\n${synchronized}`;
        }
      }

      // 2. Fix LiquidCrystal constructor if parallel LCD is used
      if (compTypes.has('wokwi-lcd1602') && !headers.includes('#include <LiquidCrystal_I2C.h>')) {
        // Replace I2C includes/constructors with standard parallel LiquidCrystal
        synchronized = synchronized.replace(/#include\s+<LiquidCrystal_I2C\.h>/g, '#include <LiquidCrystal.h>');
        synchronized = synchronized.replace(
          /LiquidCrystal_I2C\s+[a-zA-Z0-9_]+\s*\([^)]*\);/g,
          'LiquidCrystal lcd(12, 11, 5, 4, 3, 2);'
        );
      }

      // 3. Inject authoritative #define pin mappings
      synchronized = pinRegistry.synchronizeFirmwareCode(synchronized);
      return synchronized;
    }

    // Otherwise, generate a clean, complete firmware template
    const headerBlock = headers.length > 0 ? `${headers.join('\n')}\n\n` : '';

    // Generate Global Declarations
    const globals: string[] = [];
    const setups: string[] = [];
    const loops: string[] = [];

    // Hardware-specific instantiation blocks
    if (compTypes.has('wokwi-lcd1602')) {
      const isI2c = headers.includes('#include <LiquidCrystal_I2C.h>');
      if (isI2c) {
        globals.push('LiquidCrystal_I2C lcd(0x27, 16, 2);');
        setups.push('  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("VelxioAI Ready");');
      } else {
        globals.push('LiquidCrystal lcd(12, 11, 5, 4, 3, 2);');
        setups.push('  lcd.begin(16, 2);\n  lcd.setCursor(0, 0);\n  lcd.print("VelxioAI Ready");');
      }
    }

    if (compTypes.has('wokwi-dht22')) {
      globals.push('#define DHTPIN 4\n#define DHTTYPE DHT22\nDHT dht(DHTPIN, DHTTYPE);');
      setups.push('  dht.begin();');
      loops.push('  float temp = dht.readTemperature();\n  float hum = dht.readHumidity();');
    }

    if (compTypes.has('wokwi-servo')) {
      globals.push('Servo myServo;\n#define SERVO_PIN 9');
      setups.push('  myServo.attach(SERVO_PIN);');
      loops.push('  myServo.write(90);\n  delay(500);\n  myServo.write(180);\n  delay(500);');
    }

    if (compTypes.has('wokwi-pir-motion-sensor')) {
      globals.push('#define PIR_PIN 2\nint visitorCount = 0;\nbool lastPirState = LOW;');
      setups.push('  pinMode(PIR_PIN, INPUT);');
      loops.push(
        '  int pirState = digitalRead(PIR_PIN);\n' +
        '  if (pirState == HIGH && lastPirState == LOW) {\n' +
        '    visitorCount++;\n' +
        '    Serial.print("Visitor Detected! Count: ");\n' +
        '    Serial.println(visitorCount);\n' +
        (compTypes.has('wokwi-lcd1602')
          ? '    lcd.setCursor(0, 1);\n    lcd.print("Count: ");\n    lcd.print(visitorCount);\n'
          : '') +
        '    delay(200);\n' +
        '  }\n' +
        '  lastPirState = pirState;'
      );
    }

    if (compTypes.has('wokwi-hc-sr04')) {
      globals.push('#define TRIG_PIN 3\n#define ECHO_PIN 2');
      setups.push('  pinMode(TRIG_PIN, OUTPUT);\n  pinMode(ECHO_PIN, INPUT);');
      loops.push(
        '  digitalWrite(TRIG_PIN, LOW);\n' +
        '  delayMicroseconds(2);\n' +
        '  digitalWrite(TRIG_PIN, HIGH);\n' +
        '  delayMicroseconds(10);\n' +
        '  digitalWrite(TRIG_PIN, LOW);\n' +
        '  long duration = pulseIn(ECHO_PIN, HIGH);\n' +
        '  int distance = duration * 0.034 / 2;\n' +
        '  Serial.print("Distance: ");\n' +
        '  Serial.print(distance);\n' +
        '  Serial.println(" cm");'
      );
    }

    if (compTypes.has('wokwi-buzzer')) {
      globals.push('#define BUZZER_PIN 8');
      setups.push('  pinMode(BUZZER_PIN, OUTPUT);');
    }

    if (compTypes.has('wokwi-led')) {
      globals.push('#define LED_PIN 13');
      setups.push('  pinMode(LED_PIN, OUTPUT);');
      if (loops.length === 0) {
        loops.push('  digitalWrite(LED_PIN, HIGH);\n  delay(500);\n  digitalWrite(LED_PIN, LOW);\n  delay(500);');
      }
    }

    let code = `${headerBlock}`;
    if (globals.length > 0) {
      code += `${globals.join('\n\n')}\n\n`;
    }

    code += `void setup() {\n  Serial.begin(115200);\n${setups.join('\n')}\n}\n\n`;
    code += `void loop() {\n${loops.length > 0 ? loops.join('\n\n') : '  delay(100);'}\n  delay(50);\n}\n`;

    return pinRegistry.synchronizeFirmwareCode(code);
  }
}
