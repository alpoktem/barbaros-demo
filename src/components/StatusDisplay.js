// components/StatusDisplay.js
import React from 'react';

const StatusDisplay = ({ speed, engineStatus, anchorStatus }) => {
  return (
    <div className="dashboard-item">
      <h2>Status</h2>
      <div className="dashboard-grid">
        <div className="label">Speed:</div>
        <div className="value">{speed.toFixed(1)} knots</div>
        
        <div className="label">Engine:</div>
        <div className={`value ${engineStatus === 'ON' ? 'engine-on' : 'engine-off'}`}>
          {engineStatus}
        </div>
        
        <div className="label">Anchor:</div>
        <div className="value">{anchorStatus}</div>
      </div>
    </div>
  );
};

export default StatusDisplay;