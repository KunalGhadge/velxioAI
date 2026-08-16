import React, { useEffect, useState } from 'react';
import { AIEventBus, type AIEvent } from '../../ai/events/AIEventBus';
import './AIProgressTracker.css';

export interface ProgressStage {
  id: string;
  label: string;
  category: 'circuit' | 'code' | 'system';
  status: 'pending' | 'active' | 'completed' | 'failed';
}

const INITIAL_CIRCUIT_STAGES: ProgressStage[] = [
  { id: 'c1', label: 'Planning hardware subsystems...', category: 'circuit', status: 'pending' },
  { id: 'c2', label: 'Selecting components...', category: 'circuit', status: 'pending' },
  { id: 'c3', label: 'Allocating microcontroller pins...', category: 'circuit', status: 'pending' },
  { id: 'c4', label: 'Creating wire netlist...', category: 'circuit', status: 'pending' },
  { id: 'c5', label: 'Validating electrical rules...', category: 'circuit', status: 'pending' },
];

const INITIAL_CODE_STAGES: ProgressStage[] = [
  { id: 'k1', label: 'Thinking & analyzing requirements...', category: 'code', status: 'pending' },
  { id: 'k2', label: 'Generating firmware code...', category: 'code', status: 'pending' },
  { id: 'k3', label: 'Synchronizing hardware pin constants...', category: 'code', status: 'pending' },
  { id: 'k4', label: 'Resolving library dependencies...', category: 'code', status: 'pending' },
  { id: 'k5', label: 'Writing sketch.ino & libraries.txt...', category: 'code', status: 'pending' },
];

export const AIProgressTracker: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [circuitStages, setCircuitStages] = useState<ProgressStage[]>(INITIAL_CIRCUIT_STAGES);
  const [codeStages, setCodeStages] = useState<ProgressStage[]>(INITIAL_CODE_STAGES);
  const [currentStepName, setCurrentStepName] = useState<string>('Synthesizing project...');

  useEffect(() => {
    const bus = AIEventBus.getInstance();

    const unsubscribe = bus.subscribeAll((event: AIEvent) => {
      switch (event.type) {
        case 'AI_BUILD_STARTED':
          setIsActive(true);
          setCurrentStepName('Initializing build...');
          setCircuitStages(INITIAL_CIRCUIT_STAGES.map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'pending' })));
          setCodeStages(INITIAL_CODE_STAGES.map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'pending' })));
          break;

        case 'CIRCUIT_GENERATION_STARTED':
          setCurrentStepName('Synthesizing hardware circuit...');
          setCircuitStages((prev) =>
            prev.map((s, i) => ({ ...s, status: i === 0 ? 'completed' : i === 1 ? 'active' : 'pending' }))
          );
          break;

        case 'COMPONENT_ADDED':
          setCircuitStages((prev) =>
            prev.map((s, i) => (i <= 1 ? { ...s, status: 'completed' } : i === 2 ? { ...s, status: 'active' } : s))
          );
          break;

        case 'WIRE_ADDED':
          setCircuitStages((prev) =>
            prev.map((s, i) => (i <= 2 ? { ...s, status: 'completed' } : i === 3 ? { ...s, status: 'active' } : s))
          );
          break;

        case 'CIRCUIT_GENERATION_COMPLETED':
          setCircuitStages((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
          break;

        case 'CODE_GENERATION_STARTED':
          setCurrentStepName('Generating & synchronizing firmware...');
          setCodeStages((prev) =>
            prev.map((s, i) => ({ ...s, status: i === 0 ? 'completed' : i === 1 ? 'active' : 'pending' }))
          );
          break;

        case 'LIBRARY_INSTALLED':
          setCodeStages((prev) =>
            prev.map((s, i) => (i <= 3 ? { ...s, status: 'completed' } : i === 4 ? { ...s, status: 'active' } : s))
          );
          break;

        case 'CODE_GENERATION_COMPLETED':
          setCodeStages((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
          break;

        case 'COMPILATION_STARTED':
          setCurrentStepName('Compiling firmware...');
          break;

        case 'SIMULATION_STARTED':
          setCurrentStepName('Starting simulation engine...');
          break;

        case 'RUNTIME_VERIFIED':
        case 'AI_BUILD_COMPLETED':
          setIsActive(false);
          break;

        case 'AI_BUILD_FAILED':
          setIsActive(false);
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isActive) return null;

  return (
    <div className="velxio-progress-tracker">
      <div className="velxio-progress-header">
        <div className="velxio-progress-spinner" />
        <span className="velxio-progress-headline">{currentStepName}</span>
      </div>

      <div className="velxio-progress-columns">
        {/* Circuit Progress Column */}
        <div className="velxio-progress-column">
          <div className="velxio-progress-col-title">🔌 Circuit Synthesis</div>
          {circuitStages.map((stage) => (
            <div key={stage.id} className={`velxio-stage-item ${stage.status}`}>
              <span className="velxio-stage-dot" />
              <span className="velxio-stage-label">{stage.label}</span>
            </div>
          ))}
        </div>

        {/* Code Progress Column */}
        <div className="velxio-progress-column">
          <div className="velxio-progress-col-title">💻 Firmware & Libraries</div>
          {codeStages.map((stage) => (
            <div key={stage.id} className={`velxio-stage-item ${stage.status}`}>
              <span className="velxio-stage-dot" />
              <span className="velxio-stage-label">{stage.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
