// App.js
import React from 'react';
import BoatScene from './components/BoatScene';
import CompassDisplay from './components/CompassDisplay';
import StatusDisplay from './components/StatusDisplay';
import EnvironmentDisplay from './components/EnvironmentDisplay';
import RudderDisplay from './components/RudderDisplay';
import CommandDisplay from './components/CommandDisplay';
import ControlsDisplay from './components/ControlsDisplay';
import useBoatCommands from './hooks/useBoatCommands';

// Using our centralized styles
import './styles.css';

function App() {
  const { boatState, lastCommand, waitingForNumber } = useBoatCommands();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Boat Navigation System</h1>
      </header>
      
      <div className="main-content">
        {/* Left side - Visualization area (now 3:1 ratio instead of 3:1) */}
        <div className="visualization-panel">
          <BoatScene boatState={boatState} />
        </div>
        
        {/* Right side - Dashboard panels */}
        <div className="dashboard-panel">
          <div className="dashboard-scrollable">
            <CompassDisplay heading={boatState.heading} />
            <StatusDisplay 
              speed={boatState.speed} 
              engineStatus={boatState.engineStatus} 
              anchorStatus={boatState.anchorStatus} 
            />
            <EnvironmentDisplay 
              windDirection={boatState.windDirection} 
              windSpeed={boatState.windSpeed} 
              depth={boatState.depth} 
            />
            <RudderDisplay rudderAngle={boatState.rudderAngle} />
          </div>
        </div>
      </div>
      
      {/* Bottom Command Panel - now integrated with the layout */}
      <div className="command-panel">
        <CommandDisplay lastCommand={lastCommand} waitingForNumber={waitingForNumber} />
        <ControlsDisplay />
      </div>
    </div>
  );
}

export default App;