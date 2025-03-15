// components/RudderDisplay.js
import React from 'react';

const RudderDisplay = ({ rudderAngle }) => {
  const size = 120; // SVG viewBox size
  const center = size / 2;
  const radius = size * 0.4;
  
  return (
    <div className="dashboard-item">
      <h2>Rudder</h2>
      <div className="svg-container">
        <svg width="100%" height="120" viewBox={`0 0 ${size} ${size}`}>
          {/* Rudder wheel circle */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#34D399" strokeWidth="2" />
          
          {/* Inner circle */}
          <circle cx={center} cy={center} r={radius * 0.7} fill="none" stroke="#34D399" strokeWidth="1" opacity="0.5" />
          
          {/* Center line */}
          <line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="#34D399" strokeWidth="1" opacity="0.3" />
          
          {/* Rudder indicator */}
          <g transform={`rotate(${rudderAngle}, ${center}, ${center})`}>
            <line 
              x1={center} 
              y1={center} 
              x2={center}
              y2={center - radius * 0.9}
              stroke="#34D399" 
              strokeWidth="3" 
              strokeLinecap="round" 
            />
          </g>
          
          {/* Center point */}
          <circle cx={center} cy={center} r="3" fill="#34D399" />
          
          {/* Angle display */}
          <text x={center} y={center + 3} textAnchor="middle" fill="#34D399" fontSize="14" fontWeight="bold">
            {rudderAngle.toFixed(0)}°
          </text>
          
          {/* Port and starboard indicators */}
          <text x={center - radius - 5} y={center} textAnchor="end" fill="#34D399" fontSize="10">P</text>
          <text x={center + radius + 5} y={center} textAnchor="start" fill="#34D399" fontSize="10">S</text>
        </svg>
      </div>
    </div>
  );
};

export default RudderDisplay;