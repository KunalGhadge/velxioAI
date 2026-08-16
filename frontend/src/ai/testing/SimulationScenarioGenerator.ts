/**
 * VelxioAI Studio — Autonomous Simulation Scenario Generator
 *
 * Generates structured, deterministic verification scenarios and state
 * assertions for sensors, displays, actuators, and complex mixed embedded systems.
 */

export interface SimulationStep {
  stepIndex: number;
  description: string;
  stimulus: {
    targetComponentId: string;
    action: string;
    value: any;
  };
  expectedOutcome: {
    targetComponentId: string;
    property: string;
    expectedValue: any;
    tolerance?: number;
  }[];
}

export interface SimulationScenario {
  scenarioName: string;
  targetSubsystems: string[];
  initialStateDescription: string;
  steps: SimulationStep[];
}

export class SimulationScenarioGenerator {
  /**
   * Generates verification scenarios based on component IDs and project subsystems.
   */
  public static generateScenarios(
    components: Array<{ id: string; type: string }>,
    title = 'Project Verification'
  ): SimulationScenario[] {
    const scenarios: SimulationScenario[] = [];

    const hasPir = components.find((c) => c.type.includes('pir'));
    const hasSonar = components.find((c) => c.type.includes('hc-sr04'));
    const hasDht = components.find((c) => c.type.includes('dht'));
    const hasLdr = components.find((c) => c.type.includes('photoresistor'));
    const hasPot = components.find((c) => c.type.includes('potentiometer'));
    const hasServo = components.find((c) => c.type.includes('servo'));
    const hasBuzzer = components.find((c) => c.type.includes('buzzer'));
    const hasLed = components.find((c) => c.type.includes('led') && !c.type.includes('rgb'));
    const hasLcd = components.find((c) => c.type.includes('lcd1602'));
    const hasOled = components.find((c) => c.type.includes('ssd1306'));

    // 1. Motion & Intrusion Scenarios (PIR)
    if (hasPir) {
      const steps: SimulationStep[] = [
        {
          stepIndex: 1,
          description: 'Quiescent Baseline (No Motion)',
          stimulus: { targetComponentId: hasPir.id, action: 'setMotion', value: false },
          expectedOutcome: [],
        },
        {
          stepIndex: 2,
          description: 'Active Motion Stimulus Trigger',
          stimulus: { targetComponentId: hasPir.id, action: 'setMotion', value: true },
          expectedOutcome: [],
        },
      ];

      if (hasLed) {
        steps[0].expectedOutcome.push({ targetComponentId: hasLed.id, property: 'value', expectedValue: '0 (OFF)' });
        steps[1].expectedOutcome.push({ targetComponentId: hasLed.id, property: 'value', expectedValue: '1 (ON)' });
      }
      if (hasBuzzer) {
        steps[0].expectedOutcome.push({ targetComponentId: hasBuzzer.id, property: 'sounding', expectedValue: false });
        steps[1].expectedOutcome.push({ targetComponentId: hasBuzzer.id, property: 'sounding', expectedValue: true });
      }

      scenarios.push({
        scenarioName: 'Motion Detection Verification',
        targetSubsystems: ['Motion & Presence Detection', 'Alerts'],
        initialStateDescription: 'System initialized in quiet state, sensor armed.',
        steps,
      });
    }

    // 2. Ultrasonic Obstacle & Distance Sweep
    if (hasSonar) {
      scenarios.push({
        scenarioName: 'Ultrasonic Distance Response Curve',
        targetSubsystems: ['Ultrasonic Ranging'],
        initialStateDescription: 'Sensor initialized in clear space (>200cm).',
        steps: [
          {
            stepIndex: 1,
            description: 'Far Target Range (150 cm)',
            stimulus: { targetComponentId: hasSonar.id, action: 'setDistance', value: 150 },
            expectedOutcome: hasBuzzer ? [{ targetComponentId: hasBuzzer.id, property: 'sounding', expectedValue: false }] : [],
          },
          {
            stepIndex: 2,
            description: 'Close Proximity Trigger (10 cm)',
            stimulus: { targetComponentId: hasSonar.id, action: 'setDistance', value: 10 },
            expectedOutcome: hasBuzzer ? [{ targetComponentId: hasBuzzer.id, property: 'sounding', expectedValue: true }] : [],
          },
        ],
      });
    }

    // 3. Environmental Temperature/Humidity Sweep (DHT22)
    if (hasDht) {
      scenarios.push({
        scenarioName: 'Environmental Climate Telemetry',
        targetSubsystems: ['Environmental Monitoring'],
        initialStateDescription: 'Room ambient baseline (24°C, 45% RH).',
        steps: [
          {
            stepIndex: 1,
            description: 'Ambient Standard State (25.0°C, 50.0% RH)',
            stimulus: { targetComponentId: hasDht.id, action: 'setEnvironment', value: { temperature: 25.0, humidity: 50.0 } },
            expectedOutcome: hasOled || hasLcd ? [{ targetComponentId: (hasOled || hasLcd)!.id, property: 'displayContent', expectedValue: '25.0C' }] : [],
          },
          {
            stepIndex: 2,
            description: 'High Temperature Excursion (42.5°C, 85.0% RH)',
            stimulus: { targetComponentId: hasDht.id, action: 'setEnvironment', value: { temperature: 42.5, humidity: 85.0 } },
            expectedOutcome: hasLed ? [{ targetComponentId: hasLed.id, property: 'value', expectedValue: '1 (ALERT)' }] : [],
          },
        ],
      });
    }

    // 4. Optical Day/Night Transition (LDR)
    if (hasLdr) {
      scenarios.push({
        scenarioName: 'Daylight to Darkness Automatic Transition',
        targetSubsystems: ['Optical Sensing', 'Lighting Control'],
        initialStateDescription: 'Bright Daylight (800 lux).',
        steps: [
          {
            stepIndex: 1,
            description: 'Full Daylight Illumination (900 lux)',
            stimulus: { targetComponentId: hasLdr.id, action: 'setLux', value: 900 },
            expectedOutcome: hasLed ? [{ targetComponentId: hasLed.id, property: 'value', expectedValue: '0 (OFF)' }] : [],
          },
          {
            stepIndex: 2,
            description: 'Nightfall Threshold (15 lux)',
            stimulus: { targetComponentId: hasLdr.id, action: 'setLux', value: 15 },
            expectedOutcome: hasLed ? [{ targetComponentId: hasLed.id, property: 'value', expectedValue: '1 (NIGHT LIGHT ON)' }] : [],
          },
        ],
      });
    }

    // 5. Servo Angle Sweep (Servo + Potentiometer)
    if (hasServo) {
      scenarios.push({
        scenarioName: 'Servo Trajectory Tracking',
        targetSubsystems: ['Precision Servo Actuation'],
        initialStateDescription: 'Servo centered at 90° neutral position.',
        steps: [
          {
            stepIndex: 1,
            description: 'Command Minimum Limit (0°)',
            stimulus: hasPot ? { targetComponentId: hasPot.id, action: 'setPosition', value: 0 } : { targetComponentId: hasServo.id, action: 'setAngle', value: 0 },
            expectedOutcome: [{ targetComponentId: hasServo.id, property: 'angle', expectedValue: 0, tolerance: 2 }],
          },
          {
            stepIndex: 2,
            description: 'Command Maximum Limit (180°)',
            stimulus: hasPot ? { targetComponentId: hasPot.id, action: 'setPosition', value: 1023 } : { targetComponentId: hasServo.id, action: 'setAngle', value: 180 },
            expectedOutcome: [{ targetComponentId: hasServo.id, property: 'angle', expectedValue: 180, tolerance: 2 }],
          },
        ],
      });
    }

    // Default Fallback Scenario
    if (scenarios.length === 0) {
      scenarios.push({
        scenarioName: `${title} Standard Cycle`,
        targetSubsystems: ['Visual Status Indicator'],
        initialStateDescription: 'System powered on in nominal operation state.',
        steps: [
          {
            stepIndex: 1,
            description: 'State Toggle Cycle Active',
            stimulus: { targetComponentId: components[0]?.id || 'board', action: 'tick', value: 1000 },
            expectedOutcome: [],
          },
        ],
      });
    }

    return scenarios;
  }
}
