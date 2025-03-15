// components/CommandDisplay.js
import React, { useState, useEffect } from 'react';

const CommandDisplay = ({ lastCommand, waitingForNumber }) => {
  const [commandHistory, setCommandHistory] = useState([]);
  const maxHistoryLength = 5; // Store last 5 commands

  // Update history when a new command is issued
  useEffect(() => {
    if (lastCommand && lastCommand !== 'None') {
      setCommandHistory(prevHistory => {
        // Don't add the same command twice in a row
        if (prevHistory.length > 0 && prevHistory[0] === lastCommand) {
          return prevHistory;
        }
        // Add new command to the beginning of the array
        const newHistory = [lastCommand, ...prevHistory];
        // Limit to maxHistoryLength
        return newHistory.slice(0, maxHistoryLength);
      });
    }
  }, [lastCommand]);

  return (
    <div className="command-section">
      <h2>Command Input</h2>
      <div className="command-current">
        <div>
          Last command: <span className="text-accent">{lastCommand}</span>
          {waitingForNumber && (
            <span className="waiting-input"> — Waiting for number input (1-9)...</span>
          )}
        </div>
      </div>
      
      {commandHistory.length > 1 && (
        <div className="command-history">
          <div className="history-title">Command History:</div>
          <div className="history-list">
            {commandHistory.slice(1).map((cmd, index) => (
              <div 
                key={index} 
                className="history-item"
                style={{ 
                  opacity: 1 - (index * 0.2), // Fade from 0.8 to 0.2
                  fontSize: `${0.95 - (index * 0.05)}rem` // Subtle size decrease
                }}
              >
                {cmd}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandDisplay;