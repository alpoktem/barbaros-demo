// hooks/useVoiceCommands.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { boatCommands } from './boatPhysics';

const useVoiceCommands = (boatState, setBoatState, setLastCommand) => {
  // Voice status state - inactive by default until we connect
  const [voiceStatus, setVoiceStatus] = useState('inactive');
  const wsRef = useRef(null);
  
  // Function to directly modify boat state based on voice commands
  // Important: We don't need boatState in the dependency array since we're using the functional
  // updater pattern with setBoatState (which always gets the latest state)
  const executeVoiceCommand = useCallback((command) => {
    if (!command || command.command === 'unknown') return;
    
    console.log('Executing voice command:', command);
    
    // Set status to executing
    setVoiceStatus('executing');
    
    // Execute specific commands directly using the shared boat commands logic
    switch (command.command) {
      case 'turn_port': {
        const value = command.value || 1;
        setLastCommand(`Turn Port ${value}°`);
        setBoatState(prev => boatCommands.turnPort(prev, value));
        break;
      }
        
      case 'turn_starboard': {
        const value = command.value || 1;
        setLastCommand(`Turn Starboard ${value}°`);
        setBoatState(prev => boatCommands.turnStarboard(prev, value));
        break;
      }
        
      case 'speed_up': {
        const value = command.value || 1;
        setLastCommand(`Increase Speed +${value}`);
        setBoatState(prev => boatCommands.increaseSpeed(prev, value));
        break;
      }
        
      case 'slow_down': {
        const value = command.value || 1;
        setLastCommand(`Decrease Speed -${value}`);
        setBoatState(prev => boatCommands.decreaseSpeed(prev, value));
        break;
      }
        
      case 'start_engine':
        setLastCommand('Engine ON');
        setBoatState(prev => {
          // Only toggle if needed
          if (prev.engineStatus === 'OFF') {
            console.log('Starting engine');
            return boatCommands.toggleEngine(prev);
          }
          return prev;
        });
        break;
        
      case 'stop_engine':
        setLastCommand('Engine OFF');
        setBoatState(prev => {
          // Only toggle if needed
          if (prev.engineStatus === 'ON') {
            console.log('Stopping engine');
            return boatCommands.toggleEngine(prev);
          }
          return prev;
        });
        break;
        
      case 'drop_anchor':
        setLastCommand('Anchor DROPPED');
        setBoatState(prev => {
          // Only toggle if needed
          if (prev.anchorStatus === 'RAISED') {
            return boatCommands.toggleAnchor(prev);
          }
          return prev;
        });
        break;
        
      case 'raise_anchor':
        setLastCommand('Anchor RAISED');
        setBoatState(prev => {
          // Only toggle if needed
          if (prev.anchorStatus === 'DROPPED') {
            return boatCommands.toggleAnchor(prev);
          }
          return prev;
        });
        break;
        
      default:
        console.log('Unknown command:', command);
    }
    
    // Return to connected status after command execution
    setTimeout(() => {
      setVoiceStatus('connected');
    }, 3000);
  }, [setBoatState, setLastCommand, setVoiceStatus]); // Note: boatState is NOT in the dependency array
  
  // Connect to the voice server via WebSocket
  useEffect(() => {
    let reconnectTimeout = null;
    
    // Handler for simulated voice commands (for testing)
    const handleSimulatedCommands = (event) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'wake_word':
          setVoiceStatus('listening');
          break;
          
        case 'processing':
        case 'transcription':
        case 'recognizing_intent':
          setVoiceStatus('thinking');
          break;
          
        case 'command':
          executeVoiceCommand(data);
          break;
          
        default:
          console.log('Received unknown simulated message type:', type);
      }
    };
    
    // Add event listener for simulated commands
    document.addEventListener('barbaros-voice-command', handleSimulatedCommands);
    
    const connectWebSocket = () => {
      // Clear any existing timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      try {
        // Create WebSocket connection
        const ws = new WebSocket('ws://localhost:9000/boat');
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('Connected to voice server');
          // We'll set the status when we receive the listening_status message
          // This way it's driven by the server state
        };
        
        ws.onclose = () => {
          console.log('Disconnected from voice server, trying to reconnect...');
          setVoiceStatus('inactive');
          wsRef.current = null;
          
          // Try to reconnect every 5 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setVoiceStatus('inactive');
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);
            
            switch (message.type) {
              case 'wake_word':
                console.log('Wake word detected, setting status to listening');
                setVoiceStatus('listening');
                break;
              
              case 'listening_status':
                // Update based on the listening status from the voice server
                if (message.data === true) {
                  console.log('Listening is active, setting status to connected');
                  setVoiceStatus('connected');
                } else {
                  console.log('Listening is inactive, setting status to inactive');
                  setVoiceStatus('inactive');
                }
                break;
                
              case 'processing':
                console.log('Started speech processing, setting status to thinking');
                setVoiceStatus('thinking');
                break;
                
              case 'transcription':
                console.log('Transcription received, keeping status as thinking');
                // Keep the thinking status since we're now going to process the intent
                break;
                
              case 'recognizing_intent':
                console.log('Recognizing intent, keeping status as thinking');
                // Keep the thinking status during intent recognition
                break;
                
              case 'command':
                console.log('Command received, executing:', message.data);
                executeVoiceCommand(message.data);
                break;
                
              default:
                console.log('Received unknown message type:', message);
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        setVoiceStatus('inactive');
        
        // Try to reconnect
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };
    
    // Initial connection
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('barbaros-voice-command', handleSimulatedCommands);
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [executeVoiceCommand]); // Should depend on executeVoiceCommand
  
  return { 
    voiceStatus,
    isConnected: voiceStatus !== 'inactive'
  };
};

export default useVoiceCommands;