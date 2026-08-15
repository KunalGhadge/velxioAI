import React from 'react';
import type { HardwareLearningCardData } from '../../ai/types';
import './HardwareLearningCard.css';

interface Props {
  data: HardwareLearningCardData;
}

export const HardwareLearningCard: React.FC<Props> = ({ data }) => {
  return (
    <div className="velxio-learn-card">
      <div className="velxio-learn-header">
        <span className="velxio-learn-badge">Hardware Insight</span>
        <span className="velxio-learn-title">{data.title}</span>
      </div>
      <div className="velxio-learn-body">
        <p style={{ margin: 0, fontWeight: 500 }}>{data.summary}</p>

        {data.howItWorks && data.howItWorks.length > 0 && (
          <div>
            <strong style={{ color: '#ffffff', fontSize: 11 }}>How it works:</strong>
            <ul className="velxio-learn-points">
              {data.howItWorks.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>
        )}

        {data.tryItLiveExperiment && (
          <div className="velxio-learn-experiment">
            <strong>🧪 Try it live: </strong>
            <span>{data.tryItLiveExperiment}</span>
          </div>
        )}
      </div>
    </div>
  );
};
