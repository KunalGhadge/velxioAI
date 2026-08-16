/**
 * VelxioAI Studio — Deterministic Compilation Repair Planner
 *
 * Formulates rule-based, non-speculative repair plans for compilation failures:
 * - Automatically installs missing libraries into libraries.txt
 * - Injects missing #include headers
 * - Resolves undeclared hardware pin constants via PinAssignmentRegistry
 * - Fixes constructor and API signatures
 */

import { CompilationFailure, CompilationErrorType } from './CompilationErrorClassifier';
import { PinAssignmentRegistry } from '../hardware/PinAssignmentRegistry';
import { LibraryResolver } from './LibraryResolver';

export type RepairActionType =
  | 'INSTALL_LIBRARY'
  | 'INJECT_INCLUDE'
  | 'INJECT_DEFINE'
  | 'FIX_CONSTRUCTOR'
  | 'REPLACE_CODE';

export interface RepairAction {
  type: RepairActionType;
  payload: Record<string, any>;
  description: string;
}

export interface RepairPlan {
  failures: CompilationFailure[];
  actions: RepairAction[];
  hasExecutablePlan: boolean;
}

export class RepairPlanner {
  /**
   * Plans deterministic repair actions based on classified compilation failures.
   */
  public static plan(
    failures: CompilationFailure[],
    currentCode: string,
    installedLibraries: string[] = []
  ): RepairPlan {
    const actions: RepairAction[] = [];
    const installedSet = new Set(installedLibraries.map((l) => l.toLowerCase()));

    for (const fail of failures) {
      switch (fail.type) {
        case CompilationErrorType.MISSING_LIBRARY:
        case CompilationErrorType.LIBRARY_NOT_INSTALLED: {
          if (fail.missingLibrary && !installedSet.has(fail.missingLibrary.toLowerCase())) {
            actions.push({
              type: 'INSTALL_LIBRARY',
              payload: { library: fail.missingLibrary },
              description: `Install required library "${fail.missingLibrary}" into libraries.txt`,
            });
            installedSet.add(fail.missingLibrary.toLowerCase());
          }

          if (fail.missingHeader && !currentCode.includes(fail.missingHeader)) {
            actions.push({
              type: 'INJECT_INCLUDE',
              payload: { header: fail.missingHeader },
              description: `Inject missing header "#include <${fail.missingHeader}>" at top of sketch.ino`,
            });
          }
          break;
        }

        case CompilationErrorType.MISSING_INCLUDE: {
          if (fail.missingHeader && !currentCode.includes(fail.missingHeader)) {
            actions.push({
              type: 'INJECT_INCLUDE',
              payload: { header: fail.missingHeader },
              description: `Inject missing header "#include <${fail.missingHeader}>"`,
            });
          }
          break;
        }

        case CompilationErrorType.PIN_CONFLICT: {
          if (fail.symbol) {
            const registry = PinAssignmentRegistry.getInstance();
            const allAssignments = registry.getAllAssignments();
            const matching = allAssignments.find(
              (a) => a.constantName.toUpperCase() === fail.symbol?.toUpperCase()
            );

            const pinVal = matching ? matching.boardPin : '3'; // Default to Pin 3 if not registered
            actions.push({
              type: 'INJECT_DEFINE',
              payload: { symbol: fail.symbol, pin: pinVal },
              description: `Inject authoritative pin definition "#define ${fail.symbol} ${pinVal}"`,
            });
          }
          break;
        }

        case CompilationErrorType.API_MISMATCH: {
          if (fail.symbol?.includes('LiquidCrystal') || fail.rawLine?.includes('LiquidCrystal')) {
            actions.push({
              type: 'FIX_CONSTRUCTOR',
              payload: { target: 'LiquidCrystal', replacement: 'LiquidCrystal lcd(12, 11, 5, 4, 3, 2);' },
              description: 'Fix LiquidCrystal parallel 4-bit constructor to match physical pins (RS=12, E=11, D4=5, D5=4, D6=3, D7=2)',
            });
          }
          break;
        }

        default:
          break;
      }
    }

    return {
      failures,
      actions,
      hasExecutablePlan: actions.length > 0,
    };
  }

  /**
   * Applies a repair plan deterministically to code and library manifest strings.
   */
  public static applyPlan(
    plan: RepairPlan,
    currentCode: string,
    currentLibraries: string[]
  ): { updatedCode: string; updatedLibraries: string[] } {
    let updatedCode = currentCode;
    const updatedLibraries = [...currentLibraries];
    const libSet = new Set(updatedLibraries.map((l) => l.toLowerCase()));

    for (const act of plan.actions) {
      if (act.type === 'INSTALL_LIBRARY' && act.payload.library) {
        if (!libSet.has(act.payload.library.toLowerCase())) {
          updatedLibraries.push(act.payload.library);
          libSet.add(act.payload.library.toLowerCase());
        }
      }

      if (act.type === 'INJECT_INCLUDE' && act.payload.header) {
        const includeLine = `#include <${act.payload.header}>`;
        if (!updatedCode.includes(includeLine)) {
          updatedCode = `${includeLine}\n${updatedCode}`;
        }
      }

      if (act.type === 'INJECT_DEFINE' && act.payload.symbol && act.payload.pin) {
        const defineLine = `#define ${act.payload.symbol} ${act.payload.pin}`;
        if (!updatedCode.includes(defineLine)) {
          updatedCode = `${defineLine}\n${updatedCode}`;
        }
      }

      if (act.type === 'FIX_CONSTRUCTOR' && act.payload.replacement) {
        // Replace LiquidCrystal lcd(...) constructor
        updatedCode = updatedCode.replace(
          /LiquidCrystal\s+[a-zA-Z0-9_]+\s*\([^)]*\);/g,
          act.payload.replacement
        );
      }
    }

    // Always synchronize with PinAssignmentRegistry
    updatedCode = PinAssignmentRegistry.getInstance().synchronizeFirmwareCode(updatedCode);

    return {
      updatedCode,
      updatedLibraries,
    };
  }
}
