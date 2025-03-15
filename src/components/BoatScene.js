// components/BoatScene.js
import React from 'react';

const BoatScene = ({ boatState }) => {
  const viewBoxSize = 500;
  const gridSize = 40;
  const boatSize = 20;
  
  // Use the visual heading for the grid and boat rendering
  const visualHeading = boatState.visualHeading !== undefined ? 
    boatState.visualHeading : boatState.heading;

  // Calculate offset for grid lines based on boat position
  const offsetX = (boatState.x * 5) % gridSize;
  const offsetY = (boatState.y * 5) % gridSize;
  
  // Generate grid lines
  const gridLines = [];
  
  // Increase grid density - generate more lines beyond viewport
  const extraLines = 10; // Extra lines beyond viewport
  const viewPortExtension = gridSize * extraLines;
  
  // Draw horizontal grid lines
  for (let i = -viewPortExtension; i <= viewBoxSize + viewPortExtension; i += gridSize) {
    gridLines.push(
      <line 
        key={`h-${i}`}
        x1={-viewPortExtension} 
        y1={i - offsetY} 
        x2={viewBoxSize + viewPortExtension} 
        y2={i - offsetY} 
        stroke="#4d88ff" 
        strokeWidth="1" 
        opacity="0.5"
      />
    );
  }
  
  // Draw vertical grid lines
  for (let i = -viewPortExtension; i <= viewBoxSize + viewPortExtension; i += gridSize) {
    gridLines.push(
      <line 
        key={`v-${i}`}
        x1={i - offsetX} 
        y1={-viewPortExtension} 
        x2={i - offsetX} 
        y2={viewBoxSize + viewPortExtension} 
        stroke="#4d88ff" 
        strokeWidth="1" 
        opacity="0.5"
      />
    );
  }
  
  // Calculate wake points if boat is moving
  const showWake = boatState.speed > 0 && boatState.engineStatus === 'ON';
  const wakeLength = boatState.speed * 2;
  
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} preserveAspectRatio="xMidYMid slice">
      {/* Grid that creates infinite scrolling effect - rotates with the visual heading */}
      <g transform={`rotate(${-visualHeading}, ${viewBoxSize/2}, ${viewBoxSize/2})`}>
        {gridLines}
      </g>
      
      {/* Boat always stays in the center */}
      <polygon 
        points={`${viewBoxSize/2},${viewBoxSize/2 - boatSize} ${viewBoxSize/2 - boatSize/2},${viewBoxSize/2 + boatSize/2} ${viewBoxSize/2 + boatSize/2},${viewBoxSize/2 + boatSize/2}`}
        fill="#DAA520"
      />
      
      {/* Wake effect */}
      {showWake && (
        <path
          d={`M ${viewBoxSize/2} ${viewBoxSize/2 + boatSize/2} 
              Q ${viewBoxSize/2 - 10} ${viewBoxSize/2 + boatSize/2 + wakeLength/2}, 
                ${viewBoxSize/2} ${viewBoxSize/2 + boatSize/2 + wakeLength}
              Q ${viewBoxSize/2 + 10} ${viewBoxSize/2 + boatSize/2 + wakeLength/2},
                ${viewBoxSize/2} ${viewBoxSize/2 + boatSize/2}`}
          fill="rgba(173, 216, 230, 0.3)"
        />
      )}
      
      {/* Debug info */}
      <text x="10" y="20" fill="white" fontSize="12">
        Pos: ({boatState.x.toFixed(1)}, {boatState.y.toFixed(1)}) | Heading: {boatState.heading.toFixed(1)}°
      </text>
    </svg>
  );
};

export default BoatScene;