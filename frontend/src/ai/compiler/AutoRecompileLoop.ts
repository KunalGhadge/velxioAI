/**
 * VelxioAI Studio — Autonomous Self-Healing Recompile Loop
 *
 * Implements a bounded auto-repair loop (max 3 attempts) that deterministically
 * classifies compiler failures, applies non-speculative repairs (library installs,
 * header injections, pin definitions), and recompiles until success or exhaustion.
 */

import { CompilationErrorClassifier, type CompilationFailure } from './CompilationErrorClassifier';
import { RepairPlanner } from './RepairPlanner';
import { AgentToolEngine } from '../AgentToolEngine';
import { useEditorStore } from '../../store/useEditorStore';
import { useCompileLogsStore } from '../../store/useCompileLogsStore';
import { useSimulatorStore } from '../../store/useSimulatorStore';

export interface AutoRecompileResult {
  success: boolean;
  attempts: number;
  initialErrors: CompilationFailure[];
  finalErrors: CompilationFailure[];
  repairHistory: string[];
  message: string;
}

export class AutoRecompileLoop {
  public static readonly MAX_REPAIR_ATTEMPTS = 3;

  /**
   * Executes the bounded auto-recompile and repair loop.
   */
  public static async execute(maxAttempts: number = AutoRecompileLoop.MAX_REPAIR_ATTEMPTS): Promise<AutoRecompileResult> {
    const repairHistory: string[] = [];
    let initialErrors: CompilationFailure[] = [];
    let latestErrors: CompilationFailure[] = [];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[AutoRecompileLoop] Attempt ${attempt} / ${maxAttempts}: Triggering compilation...`);

      // 1. Trigger Compilation via AgentToolEngine
      await AgentToolEngine.compileProject();

      // Give compiler runner 800ms to collect diagnostics
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 2. Read Compile Logs
      const compileLogs = useCompileLogsStore.getState().logs || [];
      const logStrings = compileLogs.map((l) =>
        typeof l === 'string' ? l : `[${l.type.toUpperCase()}] ${l.message}`
      );

      const hasFatalErrors = logStrings.some((l) =>
        /\[ERROR\]|fatal error:|error:/i.test(l)
      );

      // 3. Classify Errors
      latestErrors = CompilationErrorClassifier.classifyLogs(logStrings);
      if (attempt === 1) {
        initialErrors = [...latestErrors];
      }

      // Check if compilation was clean
      if (!hasFatalErrors && latestErrors.length === 0) {
        console.log(`[AutoRecompileLoop] Compilation successful on attempt ${attempt}!`);
        return {
          success: true,
          attempts: attempt,
          initialErrors,
          finalErrors: [],
          repairHistory,
          message: `Compilation succeeded after ${attempt} attempt(s).`,
        };
      }

      console.warn(`[AutoRecompileLoop] Attempt ${attempt} encountered ${latestErrors.length} failure(s):`, latestErrors);

      // 4. Formulate Deterministic Repair Plan
      const editorState = useEditorStore.getState();
      const activeFile = editorState.files.find((f) => f.id === editorState.activeFileId) || editorState.files[0];
      const codeContent = activeFile ? activeFile.content : '';

      const libFile = editorState.files.find((f) => f.name === 'libraries.txt');
      const installedLibs = libFile ? libFile.content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : [];

      const plan = RepairPlanner.plan(latestErrors, codeContent, installedLibs);

      if (!plan.hasExecutablePlan) {
        console.warn('[AutoRecompileLoop] No automated repair action available for classified failures.');
        break;
      }

      // 5. Apply Repair Actions Deterministically
      const { updatedCode, updatedLibraries } = RepairPlanner.applyPlan(plan, codeContent, installedLibs);

      if (activeFile && updatedCode !== codeContent) {
        AgentToolEngine.writeFile(activeFile.name, updatedCode);
        repairHistory.push(`Attempt ${attempt}: Updated "${activeFile.name}" with synchronized headers and pin mappings.`);
      }

      if (updatedLibraries.length > installedLibs.length) {
        AgentToolEngine.installLibraries(updatedLibraries);
        repairHistory.push(`Attempt ${attempt}: Installed libraries [${updatedLibraries.join(', ')}] into libraries.txt.`);
      }

      // Small delay before recompiling
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return {
      success: false,
      attempts: maxAttempts,
      initialErrors,
      finalErrors: latestErrors,
      repairHistory,
      message: `Auto-repair exhausted ${maxAttempts} attempts without clean compilation.`,
    };
  }
}
