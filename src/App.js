// App.js
import React from 'react';
import BoatScene from './components/BoatScene';
import CompassDisplay from './components/CompassDisplay';
import StatusDisplay from './components/StatusDisplay';
import EnvironmentDisplay from './components/EnvironmentDisplay';
import RudderDisplay from './components/RudderDisplay';
import CommandDisplay from './components/CommandDisplay';
import ControlsDisplay from './components/ControlsDisplay';
import BarbarosStatus from './components/BarbarosStatus';
import useBoatCommands from './hooks/useBoatCommands';
import useVoiceCommands from './hooks/useVoiceCommands';

// Using our centralized styles
import './styles.css';

function App() {
  // Get boat state and controls from useBoatCommands
  const { 
    boatState, 
    setBoatState,
    lastCommand, 
    waitingForNumber, 
    setLastCommand 
  } = useBoatCommands();
  
  // Set up voice commands with direct access to boat state
  const { 
    voiceStatus, 
    isConnected 
  } = useVoiceCommands(boatState, setBoatState, setLastCommand);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Boat Navigation System</h1>
      </header>
      
      <div className="main-content">
        {/* Left side - Visualization area */}
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
            {/* Barbaros Voice Status Panel */}
            <BarbarosStatus voiceStatus={voiceStatus} />
          </div>
        </div>
      </div>
      
      {/* Bottom Command Panel */}
      <div className="command-panel">
        <CommandDisplay 
          lastCommand={lastCommand} 
          waitingForNumber={waitingForNumber} 
        />
        <ControlsDisplay 
          showVoiceControls={isConnected}
        />
      </div>
    </div>
  );
}

export default App;