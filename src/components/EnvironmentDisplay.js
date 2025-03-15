// components/EnvironmentDisplay.js
import React from 'react';

const EnvironmentDisplay = ({ windDirection, windSpeed, depth }) => {
  return (
    <div className="dashboard-item">
      <h2>Environment</h2>
      <div className="dashboard-grid">
        <div className="label">Wind Dir:</div>
        <div className="value">{windDirection}°</div>
        
        <div className="label">Wind Speed:</div>
        <div className="value">{windSpeed} knots</div>
        
        <div className="label">Depth:</div>
        <div className="value">{depth} m</div>
      </div>
    </div>
  );
};

export default EnvironmentDisplay;