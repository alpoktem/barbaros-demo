// components/CompassDisplay.js
import React from 'react';

const CompassDisplay = ({ heading }) => {
  const size = 120; // SVG viewBox size
  const center = size / 2;
  const radius = size * 0.4;
  
  return (
    <div className="dashboard-item">
      <h2>Compass</h2>
      <div className="svg-container">
        <svg width="100%" height="120" viewBox={`0 0 ${size} ${size}`}>
          {/* Compass circle */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#34D399" strokeWidth="2" />
          
          {/* Cardinal points */}
          <text x={center} y={center - radius - 5} textAnchor="middle" fill="#34D399" fontSize="12">N</text>
          <text x={center} y={center + radius + 10} textAnchor="middle" fill="#34D399" fontSize="12">S</text>
          <text x={center + radius + 5} y={center} textAnchor="start" fill="#34D399" fontSize="12">E</text>
          <text x={center - radius - 5} y={center} textAnchor="end" fill="#34D399" fontSize="12">W</text>
          
          {/* Rotated compass group */}
          <g transform={`rotate(${heading}, ${center}, ${center})`}>
            {/* Red north needle */}
            <line 
              x1={center} 
              y1={center} 
              x2={center}
              y2={center - radius * 0.8}
              stroke="#EF4444" 
              strokeWidth="3" 
              strokeLinecap="round" 
            />
            
            {/* White south needle */}
            <line 
              x1={center} 
              y1={center} 
              x2={center}
              y2={center + radius * 0.8}
              stroke="white" 
              strokeWidth="3" 
              strokeLinecap="round" 
            />
          </g>
          
          {/* Center point */}
          <circle cx={center} cy={center} r="3" fill="#34D399" />
          
          {/* Heading display */}
          <text x={center} y={center + 3} textAnchor="middle" fill="#34D399" fontSize="14" fontWeight="bold">
            {heading.toFixed(1)}°
          </text>
        </svg>
      </div>
    </div>
  );
};

export default CompassDisplay;
