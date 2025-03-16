// hooks/boatPhysics.js
// Centralized physics and command logic for boat simulation

// Initial boat state
export const initialBoatState = {
  x: 0,
  y: 0,
  heading: 0,
  visualHeading: 0,
  targetHeading: 0,
  speed: 0,
  engineStatus: 'OFF',
  anchorStatus: 'RAISED',
  rudderAngle: 0,
  targetRudderAngle: 0,
  windDirection: 45,
  windSpeed: 15,
  depth: 25.5,
  turningSpeed: 0,
  momentum: 0,
  targetSpeed: 0
};

// Common commands for both keyboard and voice control systems
export const boatCommands = {
  // Turn port (left) by given degrees
  turnPort: (state, degrees) => {
    const maxRudderAngle = Math.max(1, 9 - (state.speed * 0.3));
    const safeValue = Math.min(degrees, maxRudderAngle);
    
    return {
      ...state,
      targetRudderAngle: -safeValue, // Port side is negative
      targetHeading: (state.heading - degrees + 360) % 360 // Target heading based on original degrees value
    };
  },
  
  // Turn starboard (right) by given degrees
  turnStarboard: (state, degrees) => {
    const maxRudderAngle = Math.max(1, 9 - (state.speed * 0.3));
    const safeValue = Math.min(degrees, maxRudderAngle);
    
    return {
      ...state,
      targetRudderAngle: safeValue, // Starboard side is positive
      targetHeading: (state.heading + degrees) % 360 // Target heading based on original degrees value
    };
  },
  
  // Increase speed by given knots
  increaseSpeed: (state, knots) => {
    const newTargetSpeed = Math.min(20, state.targetSpeed + knots);
    
    return {
      ...state,
      targetSpeed: state.engineStatus === 'ON' ? newTargetSpeed : 0
    };
  },
  
  // Decrease speed by given knots
  decreaseSpeed: (state, knots) => {
    const newTargetSpeed = Math.max(0, state.targetSpeed - knots);
    
    return {
      ...state,
      targetSpeed: newTargetSpeed
    };
  },
  
  // Toggle engine status
  toggleEngine: (state) => {
    const newEngineStatus = state.engineStatus === 'ON' ? 'OFF' : 'ON';
    
    return {
      ...state,
      engineStatus: newEngineStatus
    };
  },
  
  // Toggle anchor status
  toggleAnchor: (state) => {
    const newAnchorStatus = state.anchorStatus === 'RAISED' ? 'DROPPED' : 'RAISED';
    
    return {
      ...state,
      anchorStatus: newAnchorStatus,
      speed: newAnchorStatus === 'DROPPED' ? 0 : state.speed,
      momentum: newAnchorStatus === 'DROPPED' ? 0 : state.momentum
    };
  }
};

// Physics update function - called on each animation frame
export const updatePhysics = (state) => {
  let newState = { ...state };
  
  // Handle momentum and speed changes
  if (state.engineStatus === 'ON' && state.anchorStatus === 'RAISED') {
    // If engine is on and anchor is raised, gradually approach target speed
    if (state.speed < state.targetSpeed) {
      // Acceleration (slower than deceleration)
      const accelerationRate = 0.05;
      newState.speed = Math.min(state.targetSpeed, state.speed + accelerationRate);
      newState.momentum = newState.speed;
    } else if (state.speed > state.targetSpeed) {
      // Deceleration
      const decelerationRate = 0.08;
      newState.speed = Math.max(state.targetSpeed, state.speed - decelerationRate);
      newState.momentum = newState.speed;
    }
  } else if (state.engineStatus === 'OFF' || state.anchorStatus === 'DROPPED') {
    // If engine is off or anchor is dropped, gradually slow down to zero
    if (state.speed > 0) {
      // Deceleration rate increases with speed for realistic water resistance
      const decelRate = 0.05 + (state.speed * 0.01);
      newState.speed = Math.max(0, state.speed - decelRate);
      newState.momentum = newState.speed;
    }
  }

  // Update rudder angle - gradually move toward target angle
  // Rudder response is slower at higher speeds due to water pressure
  const rudderResponseRate = Math.max(0.5, 1.5 - (state.speed * 0.05));
  
  if (state.rudderAngle !== state.targetRudderAngle) {
    const difference = state.targetRudderAngle - state.rudderAngle;
    const rudderStep = Math.min(rudderResponseRate, Math.abs(difference)) * Math.sign(difference);
    newState.rudderAngle = state.rudderAngle + rudderStep;
    
    // Ensure we don't overshoot
    if ((state.rudderAngle < state.targetRudderAngle && newState.rudderAngle > state.targetRudderAngle) ||
        (state.rudderAngle > state.targetRudderAngle && newState.rudderAngle < state.targetRudderAngle)) {
      newState.rudderAngle = state.targetRudderAngle;
    }
  }
  
  // Update turning speed based on rudder angle, boat speed, and momentum
  // Calculate base turning effectiveness
  let turnEffectiveness;
  if (state.speed < 1) {
    // Below 1 knot, limited steering
    turnEffectiveness = state.speed * 0.3;
  } else if (state.speed <= 10) {
    // 1-10 knots, increasing effectiveness
    turnEffectiveness = 0.3 + ((state.speed - 1) * 0.07);
  } else {
    // Above 10 knots, decreasing effectiveness (harder to turn at high speed)
    turnEffectiveness = 1.0 - ((state.speed - 10) * 0.04);
  }
  
  // Ensure effectiveness stays within reasonable bounds
  turnEffectiveness = Math.max(0, Math.min(1, turnEffectiveness));
  
  // Apply physics - turning moment based on rudder angle, speed and effectiveness
  const turnFactor = 0.03; // Base turning factor - smaller for more gradual turns
  newState.turningSpeed = newState.rudderAngle * turnFactor * state.speed * turnEffectiveness;
  
  // Update heading based on turning speed
  newState.heading = (state.heading + newState.turningSpeed + 360) % 360;
  
  // Check if we're approaching or have reached target heading and manage rudder
  const headingDiff = ((newState.heading - state.targetHeading + 540) % 360) - 180; // Normalized difference [-180, 180]
  const absHeadingDiff = Math.abs(headingDiff);
  
  // Calculate appropriate acceptance window based on speed
  const baseAcceptanceWindow = 1.0;
  const speedFactor = state.speed * 0.1;
  const acceptanceWindow = baseAcceptanceWindow + speedFactor;
  
  // Calculate how quickly we're approaching the target heading
  const approachRate = Math.abs(newState.turningSpeed);
  const timeToTarget = approachRate > 0.01 ? absHeadingDiff / approachRate : 999;
  
  // Begin centering rudder when we're close to target or will reach it soon
  if (absHeadingDiff < acceptanceWindow || timeToTarget < 5) {
    // Progressively center the rudder as we approach the target
    const centeringFactor = Math.min(1, 0.1 + speedFactor * 0.05);
    
    // Adjust target rudder angle toward center
    newState.targetRudderAngle = state.targetRudderAngle * (1 - centeringFactor);
    
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
  
  // Update visual heading (smoother animation)
  const visualHeadingDiff = newState.heading - state.visualHeading;
  // Normalize the difference to be between -180 and 180 degrees
  const normalizedDiff = ((visualHeadingDiff + 180) % 360) - 180;
  // Faster visual update at higher speeds for more responsive feel
  const visualUpdateRate = 0.1 + (state.speed * 0.01);
  newState.visualHeading = state.visualHeading + normalizedDiff * Math.min(visualUpdateRate, 1);
  
  // Move the boat if engine is on and anchor is raised with speed > 0
  if ((state.speed > 0) && state.anchorStatus === 'RAISED') {
    // Use actual speed for movement
    const movementSpeed = state.speed;
    
    // Convert heading to radians (use actual heading, not visual)
    const headingRad = (newState.heading * Math.PI) / 180;
    
    // Calculate movement based on heading and speed
    const deltaX = Math.sin(headingRad) * movementSpeed * 0.1;
    const deltaY = -Math.cos(headingRad) * movementSpeed * 0.1; // Negative because SVG Y increases downward
    
    newState.x = state.x + deltaX;
    newState.y = state.y + deltaY;
  }
  
  return newState;
};