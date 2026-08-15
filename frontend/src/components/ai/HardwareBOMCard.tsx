import React from 'react';
import type { HardwareBOMData } from '../../ai/types';
import './HardwareBOMCard.css';

interface Props {
  data: HardwareBOMData;
}

export const HardwareBOMCard: React.FC<Props> = ({ data }) => {
  return (
    <div className="velxio-bom-card">
      <div className="velxio-bom-header">
        <div className="velxio-bom-title">
          <span>📦</span>
          <span>{data.title || 'Bill of Materials (BOM)'}</span>
        </div>
      </div>
      <div className="velxio-bom-body">
        {data.items && data.items.length > 0 && (
          <table className="velxio-bom-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Qty</th>
                <th>Wiring / Role</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{item.partName}</strong>
                    {item.value && <small> ({item.value})</small>}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{item.pinWiring}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data.breadboardSteps && data.breadboardSteps.length > 0 && (
          <div>
            <strong style={{ color: '#ffffff', fontSize: 11 }}>Physical Assembly Steps:</strong>
            <ol className="velxio-bom-steps" style={{ marginTop: 4 }}>
              {data.breadboardSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
