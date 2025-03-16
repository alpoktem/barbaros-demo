// hooks/useBoatCommands.js
import { useState, useEffect } from 'react';
import { initialBoatState, updatePhysics, boatCommands } from './boatPhysics';

const useBoatCommands = () => {
  const [boatState, setBoatState] = useState(initialBoatState);
  const [lastCommand, setLastCommand] = useState('None');
  const [waitingForNumber, setWaitingForNumber] = useState(false);
  const [pendingCommand, setPendingCommand] = useState(null);

  // Update boat physics on animation frame
  useEffect(() => {
    const interval = setInterval(() => {
      setBoatState(prev => updatePhysics(prev));
    }, 50); // 20 times per second for smooth animation
    
    return () => clearInterval(interval);
  }, []);

  // Handle keyboard commands
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (waitingForNumber) {
        if (e.key >= '1' && e.key <= '9') {
          const value = parseInt(e.key);
          executeCommand(pendingCommand, value);
          setWaitingForNumber(false);
          setPendingCommand(null);
        }
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
          setLastCommand('Turn Port');
          setPendingCommand('PORT');
          setWaitingForNumber(true);
          break;
        case 'ArrowRight':
          setLastCommand('Turn Starboard');
          setPendingCommand('STARBOARD');
          setWaitingForNumber(true);
          break;
        case 'ArrowUp':
          setLastCommand('Increase Speed');
          setPendingCommand('INCREASE_SPEED');
          setWaitingForNumber(true);
          break;
        case 'ArrowDown':
          setLastCommand('Decrease Speed');
          setPendingCommand('DECREASE_SPEED');
          setWaitingForNumber(true);
          break;
        case 's':
        case 'S':
          toggleEngine();
          break;
        case 'a':
        case 'A':
          toggleAnchor();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [waitingForNumber, pendingCommand]);

  // Execute command with a numeric value
  const executeCommand = (command, value) => {
    setBoatState(prev => {
      switch (command) {
        case 'PORT': {
          setLastCommand(`Turn Port ${value}°`);
          return boatCommands.turnPort(prev, value);
        }
        case 'STARBOARD': {
          setLastCommand(`Turn Starboard ${value}°`);
          return boatCommands.turnStarboard(prev, value);
        }
        case 'INCREASE_SPEED': {
          setLastCommand(`Increase Speed +${value}`);
          return boatCommands.increaseSpeed(prev, value);
        }
        case 'DECREASE_SPEED': {
          setLastCommand(`Decrease Speed -${value}`);
          return boatCommands.decreaseSpeed(prev, value);
        }
        default:
          return prev;
      }
    });
  };

  // Toggle engine status
  const toggleEngine = () => {
    setBoatState(prev => {
      const newState = boatCommands.toggleEngine(prev);
      setLastCommand(`Engine ${newState.engineStatus}`);
      return newState;
    });
  };

  // Toggle anchor status
  const toggleAnchor = () => {
    setBoatState(prev => {
      const newState = boatCommands.toggleAnchor(prev);
      setLastCommand(`Anchor ${newState.anchorStatus}`);
      return newState;
    });
  };

  return { 
    boatState, 
    setBoatState,
    lastCommand, 
    waitingForNumber, 
    executeCommand,
    setLastCommand,
    toggleEngine,
    toggleAnchor
  };
};

export default useBoatCommands;