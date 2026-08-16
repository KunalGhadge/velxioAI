/**
 * VelxioAI Studio — Central AI Subsystem SDK
 *
 * Exposes the complete AI-native Embedded Studio architecture:
 * - Architecture Planning & Subsystem Decomposition
 * - Deterministic Hardware Pin Allocation & Component Registry
 * - Board Platform Recommendations & Capability Profiles
 * - Firmware #define & Library Header Synchronization
 * - Autonomous Pre-Flight Circuit Validation & Auto-Healing
 * - Simulation Scenario Generation & Automated State Assertions
 */

// Architecture Planning
export * from './architecture/ProjectArchitectureEngine';
export * from './architecture/SubsystemPlanner';
export * from './architecture/BoardRecommendationEngine';

// Hardware Planning & Allocators
export * from './hardware/BoardCapabilityRegistry';
export * from './hardware/HardwareComponentRegistry';
export * from './hardware/PinAllocator';
export * from './hardware/PinAssignmentRegistry';
export * from './hardware/ComponentAliasRegistry';

// Firmware Synchronization & Dependencies
export * from './firmware/LibraryDependencyManager';

// Validation & Auto-Healing
export * from './tools/CircuitValidator';
export * from './healing/AutoHealingEngine';

// Simulation Testing
export * from './testing/SimulationScenarioGenerator';
export * from './testing/ScenarioRunner';

// Execution Engines & Store
export * from './AgentToolEngine';
export * from './AIContextCollector';
export * from './LLMClient';
export * from './useAIStore';
export * from './types';
