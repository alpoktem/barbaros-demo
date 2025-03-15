// components/ControlsDisplay.js
import React from 'react';

const ControlsDisplay = () => {
  return (
    <div className="command-section">
      <h2 className="control-title">Controls</h2>
      <div>
        <div className="control-item">← + [1-9]: <span className="control-action">Turn port <strong>exactly</strong> 1-9°</span></div>
        <div className="control-item">→ + [1-9]: <span className="control-action">Turn starboard <strong>exactly</strong> 1-9°</span></div>
        <div className="control-item">↑ + [1-9]: <span className="control-action">Increase speed</span></div>
        <div className="control-item">↓ + [1-9]: <span className="control-action">Decrease speed</span></div>
        <div className="control-item">S: <span className="control-action">Start/stop engine</span></div>
        <div className="control-item">A: <span className="control-action">Drop/raise anchor</span></div>
      </div>
    </div>
  );
};

export default ControlsDisplay;