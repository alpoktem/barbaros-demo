// components/BarbarosStatus.js
import React from 'react';

const BarbarosStatus = ({ voiceStatus }) => {
  // Define status colors and text
  const statusInfo = {
    inactive: { color: '#9ca3af', text: 'inactive', blink: false },    // Gray
    connected: { color: '#4ade80', text: 'connected', blink: false },  // Green
    listening: { color: '#facc15', text: 'listening', blink: false },  // Yellow
    thinking: { color: '#facc15', text: 'thinking', blink: true },     // Yellow blinking
    executing: { color: '#ef4444', text: 'executing', blink: true }    // Red blinking
  };

  // Get the current status info
  const currentStatus = statusInfo[voiceStatus] || statusInfo.inactive;

  // Determine if the status light should be active
  const isStatusActive = voiceStatus !== 'inactive';

  return (
    <div className="dashboard-item no-title status-panel">
      <div className="barbaros-status">
        <div 
          className={`status-light ${isStatusActive ? 'active' : ''} ${currentStatus.blink ? 'blink' : ''}`}
          style={{ 
            backgroundColor: isStatusActive ? currentStatus.color : 'transparent',
            borderColor: currentStatus.color
          }}
        ></div>
        <div className="status-text" style={{ color: currentStatus.color }}>
          Barbaros {currentStatus.text}
        </div>
      </div>
    </div>
  );
};

export default BarbarosStatus;