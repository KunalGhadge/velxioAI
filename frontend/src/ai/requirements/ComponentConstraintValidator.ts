/**
 * VelxioAI Studio — Component Constraint Validator
 *
 * Enforces requirement fidelity before circuit synthesis and proposal application.
 * Verifies that all required hardware components are included and that no
 * forbidden components are hallucinated or inserted.
 */

import { RequirementExtractor, type UserRequirements } from './RequirementExtractor';
import { HardwareComponentRegistry } from '../hardware/HardwareComponentRegistry';

export interface ConstraintValidationResult {
  valid: boolean;
  missingRequired: string[];
  forbiddenFound: string[];
  errors: string[];
  errorCode?: 'BUILD_FAILED_REQUIRED_COMPONENT_MISSING' | 'BUILD_FAILED_FORBIDDEN_COMPONENT_INSERTED';
}

export class ComponentConstraintValidator {
  /**
   * Validates a proposed list of components against user requirements.
   */
  public static validate(
    proposedComponents: Array<{ id?: string; type: string }>,
    requirementsOrPrompt: UserRequirements | string
  ): ConstraintValidationResult {
    const requirements: UserRequirements =
      typeof requirementsOrPrompt === 'string'
        ? RequirementExtractor.extract(requirementsOrPrompt)
        : requirementsOrPrompt;

    const proposedTypes = new Set(
      proposedComponents.map((c) => {
        const raw = c.type.replace(/^(wokwi|velxio)-/, '').toLowerCase();
        const profile = HardwareComponentRegistry.getComponent(c.type) || HardwareComponentRegistry.getComponent(raw);
        return profile ? profile.id : (c.type.startsWith('wokwi-') ? c.type : `wokwi-${c.type}`);
      })
    );

    const missingRequired: string[] = [];
    const forbiddenFound: string[] = [];
    const errors: string[] = [];

    // 1. Check Missing Required Components
    for (const req of requirements.requiredComponents) {
      if (!proposedTypes.has(req)) {
        const profile = HardwareComponentRegistry.getComponent(req);
        const name = profile ? profile.name : req;
        missingRequired.push(req);
        errors.push(`Required component "${name}" (${req}) was not included in the synthesized circuit.`);
      }
    }

    // 2. Check Forbidden Components
    for (const forb of requirements.forbiddenComponents) {
      if (proposedTypes.has(forb)) {
        const profile = HardwareComponentRegistry.getComponent(forb);
        const name = profile ? profile.name : forb;
        forbiddenFound.push(forb);
        errors.push(`Forbidden component "${name}" (${forb}) was mistakenly inserted into the circuit.`);
      }
    }

    if (missingRequired.length > 0) {
      return {
        valid: false,
        missingRequired,
        forbiddenFound,
        errors,
        errorCode: 'BUILD_FAILED_REQUIRED_COMPONENT_MISSING',
      };
    }

    if (forbiddenFound.length > 0) {
      return {
        valid: false,
        missingRequired,
        forbiddenFound,
        errors,
        errorCode: 'BUILD_FAILED_FORBIDDEN_COMPONENT_INSERTED',
      };
    }

    return {
      valid: true,
      missingRequired: [],
      forbiddenFound: [],
      errors: [],
    };
  }
}
