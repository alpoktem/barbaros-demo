// hooks/useBoatCommands.js
import { useState, useEffect } from 'react';

const useBoatCommands = () => {
  const [boatState, setBoatState] = useState({
    x: 0,
    y: 0,
    heading: 0,
    visualHeading: 0, // This is what the view uses to show the current visual heading
    targetHeading: 0, // This is what the boat is aiming for
    speed: 0,
    engineStatus: 'OFF',
    anchorStatus: 'RAISED',
    rudderAngle: 0,
    targetRudderAngle: 0, // This is what the rudder is aiming for
    windDirection: 45,
    windSpeed: 15,
    depth: 25.5,
    turningSpeed: 0, // Current turning rate
    momentum: 0 // Added for more realistic physics
  });

  const [lastCommand, setLastCommand] = useState('None');
  const [waitingForNumber, setWaitingForNumber] = useState(false);
  const [pendingCommand, setPendingCommand] = useState(null);

  // Update boat position, heading, and rudder angle with realistic physics
  useEffect(() => {
    const interval = setInterval(() => {
      setBoatState(prev => {
        let newState = { ...prev };
        
        // 1. Handle momentum and speed changes
        // Boats have significant momentum, especially larger vessels
        if (prev.engineStatus === 'ON' && prev.speed < prev.momentum) {
          // Gradual acceleration (slower than deceleration)
          newState.speed = Math.min(20, prev.speed + 0.05);
          newState.momentum = Math.min(20, prev.momentum + 0.03);
        } else if (prev.engineStatus === 'OFF' && prev.speed > 0) {
          // Gradual deceleration based on current speed
          // Boats slow down faster from higher speeds due to water resistance
          const decelRate = 0.05 + (prev.speed * 0.01);
          newState.speed = Math.max(0, prev.speed - decelRate);
          newState.momentum = Math.max(0, prev.momentum - (decelRate * 0.7));
        } else if (prev.engineStatus === 'ON') {
          // Maintain momentum slightly above speed for realistic acceleration feel
          newState.momentum = Math.min(20, prev.speed + 0.5);
        }

        // 2. Update rudder angle - gradually move toward target angle
        // Rudder response is slower at higher speeds due to water pressure
        const rudderResponseRate = Math.max(0.5, 1.5 - (prev.speed * 0.05));
        
        if (prev.rudderAngle !== prev.targetRudderAngle) {
          const difference = prev.targetRudderAngle - prev.rudderAngle;
          const rudderStep = Math.min(rudderResponseRate, Math.abs(difference)) * Math.sign(difference);
          newState.rudderAngle = prev.rudderAngle + rudderStep;
          
          // Ensure we don't overshoot
          if ((prev.rudderAngle < prev.targetRudderAngle && newState.rudderAngle > prev.targetRudderAngle) ||
              (prev.rudderAngle > prev.targetRudderAngle && newState.rudderAngle < prev.targetRudderAngle)) {
            newState.rudderAngle = prev.targetRudderAngle;
          }
        }
        
        // 3. Update turning speed based on rudder angle, boat speed, and momentum
        // More realistic turning physics: 
        // - Turning effectiveness drops at very low speeds (need steerage)
        // - Turning is most effective in mid-range speeds
        // - At very high speeds, rudder effect is damped (to prevent unrealistic sharp turns)
        
        // Calculate base turning effectiveness
        let turnEffectiveness;
        if (prev.speed < 1) {
          // Below 1 knot, limited steering
          turnEffectiveness = prev.speed * 0.3;
        } else if (prev.speed <= 10) {
          // 1-10 knots, increasing effectiveness
          turnEffectiveness = 0.3 + ((prev.speed - 1) * 0.07);
        } else {
          // Above 10 knots, decreasing effectiveness (harder to turn at high speed)
          turnEffectiveness = 1.0 - ((prev.speed - 10) * 0.04);
        }
        
        // Ensure effectiveness stays within reasonable bounds
        turnEffectiveness = Math.max(0, Math.min(1, turnEffectiveness));
        
        // Apply physics - turning moment based on rudder angle, speed and effectiveness
        const turnFactor = 0.03; // Base turning factor - smaller for more gradual turns
        newState.turningSpeed = newState.rudderAngle * turnFactor * prev.speed * turnEffectiveness;
        
        // 4. Update heading based on turning speed
        newState.heading = (prev.heading + newState.turningSpeed + 360) % 360;
        
        // 5. Check if we're approaching or have reached target heading and manage rudder appropriately
        const headingDiff = ((newState.heading - prev.targetHeading + 540) % 360) - 180; // Normalized difference [-180, 180]
        const absHeadingDiff = Math.abs(headingDiff);
        
        // Calculate appropriate acceptance window based on speed
        // Higher speeds need wider acceptance windows and earlier rudder centering
        const baseAcceptanceWindow = 1.0;
        const speedFactor = prev.speed * 0.1;
        const acceptanceWindow = baseAcceptanceWindow + speedFactor;
        
        // Calculate how quickly we're approaching the target heading
        // This helps predict overshooting
        const approachRate = Math.abs(newState.turningSpeed);
        const timeToTarget = approachRate > 0.01 ? absHeadingDiff / approachRate : 999;
        
        // Begin centering rudder when we're close to target or will reach it soon
        if (absHeadingDiff < acceptanceWindow || timeToTarget < 5) {
          // Progressively center the rudder as we approach the target
          // Higher speeds need more aggressive centering to prevent overshooting
          const centeringFactor = Math.min(1, 0.1 + speedFactor * 0.05);
          
          // Adjust target rudder angle toward center
          newState.targetRudderAngle = prev.targetRudderAngle * (1 - centeringFactor);
          
          // If very close to target heading, force rudder centering
          if (absHeadingDiff < 0.5) {
            newState.targetRudderAngle = 0;
            
            // Dampen any remaining turning
            if (Math.abs(newState.turningSpeed) < 0.05) {
              newState.turningSpeed = 0;
            }
          }
          
          // If rudder is almost centered, snap it to zero
          if (Math.abs(newState.rudderAngle) < 0.1) {
            newState.rudderAngle = 0;
          }
        }
        
        // 6. Update visual heading (smoother animation)
        const visualHeadingDiff = newState.heading - prev.visualHeading;
        // Normalize the difference to be between -180 and 180 degrees
        const normalizedDiff = ((visualHeadingDiff + 180) % 360) - 180;
        // Faster visual update at higher speeds for more responsive feel
        const visualUpdateRate = 0.1 + (prev.speed * 0.01);
        newState.visualHeading = prev.visualHeading + normalizedDiff * Math.min(visualUpdateRate, 1);
        
        // 7. Only move the boat if engine is on and anchor is raised, or if coasting with momentum
        if ((prev.speed > 0 || prev.momentum > 0) && prev.anchorStatus === 'RAISED') {
          // Use actual speed for movement, not momentum (momentum affects acceleration/deceleration)
          const movementSpeed = prev.speed;
          
          // Convert heading to radians (use actual heading, not visual)
          const headingRad = (newState.heading * Math.PI) / 180;
          
          // Calculate movement based on heading and speed
          const deltaX = Math.sin(headingRad) * movementSpeed * 0.1;
          const deltaY = -Math.cos(headingRad) * movementSpeed * 0.1; // Negative because SVG Y increases downward
          
          newState.x = prev.x + deltaX;
          newState.y = prev.y + deltaY;
        }
        
        return newState;
      });
    }, 50); // Update more frequently for smoother animations (20 times per second)
    
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
          // Port turns are more gradual at higher speeds
          // Large rudder angles at high speeds are unrealistic
          const maxRudderAngle = Math.max(1, 9 - (prev.speed * 0.3));
          const safeValue = Math.min(value, maxRudderAngle);
          setLastCommand(`Turn Port ${value}°`);
          return {
            ...prev,
            targetRudderAngle: -safeValue, // Port side is negative
            targetHeading: (prev.heading - value + 360) % 360 // Target heading is still based on original command value
          };
        }
        case 'STARBOARD': {
          // Starboard turns are more gradual at higher speeds
          const maxRudderAngle = Math.max(1, 9 - (prev.speed * 0.3));
          const safeValue = Math.min(value, maxRudderAngle);
          setLastCommand(`Turn Starboard ${value}°`);
          return {
            ...prev,
            targetRudderAngle: safeValue, // Starboard side is positive
            targetHeading: (prev.heading + value) % 360 // Target heading is still based on original command value
          };
        }
        case 'INCREASE_SPEED': {
          // Enforce maximum of 20 knots, but allow commanding a larger increase
          // The physics system will handle gradual acceleration
          const targetSpeed = Math.min(20, prev.speed + value);
          setLastCommand(`Increase Speed +${value}`);
          return {
            ...prev,
            speed: prev.engineStatus === 'ON' ? targetSpeed : 0,
            momentum: prev.engineStatus === 'ON' ? targetSpeed + 0.5 : 0
          };
        }
        case 'DECREASE_SPEED': {
          // Min speed is 0 knots
          const targetSpeed = Math.max(0, prev.speed - value);
          setLastCommand(`Decrease Speed -${value}`);
          return {
            ...prev,
            speed: targetSpeed,
            momentum: targetSpeed + 0.5
          };
        }
        default:
          return prev;
      }
    });
  };

  // Toggle engine status
  const toggleEngine = () => {
    setBoatState(prev => {
      const newEngineStatus = prev.engineStatus === 'ON' ? 'OFF' : 'ON';
      setLastCommand(`Engine ${newEngineStatus}`);
      
      // If engine is turned off, we don't immediately stop
      // The physics system will handle deceleration
      return {
        ...prev,
        engineStatus: newEngineStatus,
        // If turning engine on, keep current speed (likely 0)
        // If turning engine off, start deceleration but don't instantly stop
      };
    });
  };

  // Toggle anchor status
  const toggleAnchor = () => {
    setBoatState(prev => {
      const newAnchorStatus = prev.anchorStatus === 'RAISED' ? 'DROPPED' : 'RAISED';
      setLastCommand(`Anchor ${newAnchorStatus}`);
      
      // If anchor is dropped, stop the boat immediately
      // This is a simplification - in reality, dropping anchor while moving is dangerous
      return {
        ...prev,
        anchorStatus: newAnchorStatus,
        speed: newAnchorStatus === 'DROPPED' ? 0 : prev.speed,
        momentum: newAnchorStatus === 'DROPPED' ? 0 : prev.momentum
      };
    });
  };

  return { boatState, lastCommand, waitingForNumber };
};

export default useBoatCommands;