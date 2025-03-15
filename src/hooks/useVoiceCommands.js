// hooks/useVoiceCommands.js
import { useState, useEffect, useCallback, useRef } from 'react';

const useVoiceCommands = (boatState, setBoatState, setLastCommand) => {
  // Voice status state - inactive by default until we connect
  const [voiceStatus, setVoiceStatus] = useState('inactive');
  const wsRef = useRef(null);
  
  // Function to directly modify boat state based on voice commands
  const executeVoiceCommand = useCallback((command) => {
    if (!command || command.command === 'unknown') return;
    
    console.log('Executing voice command:', command);
    
    // Set status to executing
    setVoiceStatus('executing');
    
    // Execute specific commands directly
    switch (command.command) {
      case 'turn_port': {
        const value = command.value || 1;
        setLastCommand(`Turn Port ${value}°`);
        
        setBoatState(prev => {
          // Port turns are more gradual at higher speeds
          const maxRudderAngle = Math.max(1, 9 - (prev.speed * 0.3));
          const safeValue = Math.min(value, maxRudderAngle);
          
          return {
            ...prev,
            targetRudderAngle: -safeValue, // Port side is negative
            targetHeading: (prev.heading - value + 360) % 360
          };
        });
        break;
      }
        
      case 'turn_starboard': {
        const value = command.value || 1;
        setLastCommand(`Turn Starboard ${value}°`);
        
        setBoatState(prev => {
          // Starboard turns are more gradual at higher speeds
          const maxRudderAngle = Math.max(1, 9 - (prev.speed * 0.3));
          const safeValue = Math.min(value, maxRudderAngle);
          
          return {
            ...prev,
            targetRudderAngle: safeValue, // Starboard side is positive
            targetHeading: (prev.heading + value) % 360
          };
        });
        break;
      }
        
      case 'speed_up': {
        const value = command.value || 1;
        setLastCommand(`Increase Speed +${value}`);
        
        setBoatState(prev => {
          const targetSpeed = Math.min(20, prev.speed + value);
          
          return {
            ...prev,
            speed: prev.engineStatus === 'ON' ? targetSpeed : 0,
            momentum: prev.engineStatus === 'ON' ? targetSpeed + 0.5 : 0
          };
        });
        break;
      }
        
      case 'slow_down': {
        const value = command.value || 1;
        setLastCommand(`Decrease Speed -${value}`);
        
        setBoatState(prev => {
          const targetSpeed = Math.max(0, prev.speed - value);
          
          return {
            ...prev,
            speed: targetSpeed,
            momentum: targetSpeed + 0.5
          };
        });
        break;
      }
        
      case 'start_engine':
        setLastCommand('Engine ON');
        
        setBoatState(prev => {
          // Only toggle if needed
          if (prev.engineStatus === 'OFF') {
            console.log('Starting engine');
            return { ...prev, engineStatus: 'ON' };
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
            return { ...prev, engineStatus: 'OFF' };
          }
          return prev;
        });
        break;
        
      case 'drop_anchor':
        setLastCommand('Anchor DROPPED');
        
        setBoatState(prev => {
          // Only toggle if needed
          if (prev.anchorStatus === 'RAISED') {
            return {
              ...prev,
              anchorStatus: 'DROPPED',
              speed: 0,
              momentum: 0
            };
          }
          return prev;
        });
        break;
        
      case 'raise_anchor':
        setLastCommand('Anchor RAISED');
        
        setBoatState(prev => {
          // Only toggle if needed
          if (prev.anchorStatus === 'DROPPED') {
            return { ...prev, anchorStatus: 'RAISED' };
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
  }, [setBoatState, setLastCommand]);
  
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
  }, [executeVoiceCommand]);
  
  return { 
    voiceStatus,
    isConnected: voiceStatus !== 'inactive'
  };
};

export default useVoiceCommands;