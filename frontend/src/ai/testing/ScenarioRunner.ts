/**
 * VelxioAI Studio — Autonomous Simulation Scenario Runner
 *
 * Executes structured verification scenarios against live simulator components,
 * injecting digital/analog stimuli and validating expected state transitions.
 */

import { useSimulatorStore } from '../../store/useSimulatorStore';
import type { SimulationScenario, SimulationStep } from './SimulationScenarioGenerator';

export interface ScenarioStepResult {
  stepIndex: number;
  description: string;
  passed: boolean;
  actualValues: Record<string, any>;
  error?: string;
}

export interface ScenarioRunReport {
  scenarioName: string;
  allPassed: boolean;
  stepResults: ScenarioStepResult[];
  summary: string;
}

export class ScenarioRunner {
  /**
   * Executes a list of simulation scenarios against the current simulator store.
   */
  public static async runScenario(scenario: SimulationScenario): Promise<ScenarioRunReport> {
    const sim = useSimulatorStore.getState();
    const stepResults: ScenarioStepResult[] = [];
    let allPassed = true;

    for (const step of scenario.steps) {
      const actualValues: Record<string, any> = {};
      let stepPassed = true;
      let stepError: string | undefined;

      try {
        // 1. Apply Stimulus to Target Component
        if (step.stimulus.targetComponentId && step.stimulus.targetComponentId !== 'board') {
          const comp = sim.components.find((c) => c.id === step.stimulus.targetComponentId);
          if (comp) {
            sim.updateComponent(comp.id, {
              properties: {
                ...comp.properties,
                [step.stimulus.action]: step.stimulus.value,
              },
            });
          }
        }

        // 2. Validate Expected Outcomes
        for (const outcome of step.expectedOutcome) {
          const comp = sim.components.find((c) => c.id === outcome.targetComponentId);
          if (!comp) {
            stepPassed = false;
            stepError = `Target component "${outcome.targetComponentId}" not found on canvas.`;
            break;
          }

          const propValue = comp.properties[outcome.property];
          actualValues[`${outcome.targetComponentId}.${outcome.property}`] = propValue;

          if (outcome.tolerance !== undefined && typeof propValue === 'number' && typeof outcome.expectedValue === 'number') {
            if (Math.abs(propValue - outcome.expectedValue) > outcome.tolerance) {
              stepPassed = false;
              stepError = `Property ${outcome.property} value ${propValue} exceeded tolerance (expected ${outcome.expectedValue} ± ${outcome.tolerance})`;
            }
          }
        }
      } catch (err: any) {
        stepPassed = false;
        stepError = err.message;
      }

      if (!stepPassed) allPassed = false;

      stepResults.push({
        stepIndex: step.stepIndex,
        description: step.description,
        passed: stepPassed,
        actualValues,
        error: stepError,
      });
    }

    return {
      scenarioName: scenario.scenarioName,
      allPassed,
      stepResults,
      summary: allPassed
        ? `Scenario "${scenario.scenarioName}" passed all ${step.stepIndex || stepResults.length} verification steps.`
        : `Scenario "${scenario.scenarioName}" encountered failures during execution.`,
    };
  }
}
