/**
 * VelxioAI Studio — Autonomous Project Architecture Engine
 *
 * Decomposes natural language requests into complete, production-grade embedded
 * system architectures: modular subsystems, component selections, pin plans,
 * firmware modules, library dependencies, optimal board selections, and simulation scenarios.
 */

import { SubsystemPlanner, type PlannedSubsystem } from './SubsystemPlanner';
import { BoardRecommendationEngine, type BoardRecommendation } from './BoardRecommendationEngine';
import { LibraryDependencyManager } from '../firmware/LibraryDependencyManager';
import { SimulationScenarioGenerator, type SimulationScenario } from '../testing/SimulationScenarioGenerator';

export interface ProjectArchitecture {
  title: string;
  subsystems: Array<{
    name: string;
    purpose: string;
    components: string[];
  }>;
  firmwareModules: string[];
  libraries: string[];
  recommendedBoard: string;
  boardRationale: string;
  scenarios: SimulationScenario[];
}

export class ProjectArchitectureEngine {
  /**
   * Synthesizes a complete architectural plan from a natural language request.
   */
  public static planProject(prompt: string): ProjectArchitecture {
    // 1. Decompose into functional subsystems
    const subsystems = SubsystemPlanner.planSubsystems(prompt);

    // 2. Aggregate all canonical component tags
    const allComponents: string[] = [];
    subsystems.forEach((s) => allComponents.push(...s.components));

    // 3. Select the optimal board platform
    const boardRec = BoardRecommendationEngine.recommendBoard(prompt, allComponents);

    // 4. Resolve library dependencies
    const { librariesToInstall } = LibraryDependencyManager.resolveLibraries(allComponents);

    // 5. Aggregate firmware modules
    const firmwareModules: string[] = [];
    subsystems.forEach((s) => firmwareModules.push(...s.firmwareResponsibilities));

    // 6. Generate simulation verification scenarios
    const componentSpecs = allComponents.map((c, i) => ({
      id: `${c.replace(/^(wokwi|velxio)-/, '').replace(/-/g, '_')}_${i + 1}`,
      type: c,
    }));
    const scenarios = SimulationScenarioGenerator.generateScenarios(componentSpecs, prompt);

    // Format clean title
    const cleanTitle = prompt.length > 50 ? `${prompt.slice(0, 47)}...` : prompt;

    return {
      title: cleanTitle,
      subsystems: subsystems.map((s) => ({
        name: s.name,
        purpose: s.purpose,
        components: s.components,
      })),
      firmwareModules,
      libraries: librariesToInstall,
      recommendedBoard: boardRec.boardKind,
      boardRationale: boardRec.rationale,
      scenarios,
    };
  }
}
