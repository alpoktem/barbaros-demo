# Barbaros - Boat Navigation Simulator

An almost realistic boat navigation system simulator with interactive controls and a dynamic visualization.

![Barbaros Demo Screenshot](img/screenshot.png)

## Features

- Real-time boat navigation with realistic marine physics
- Interactive keyboard controls for steering and speed management
- Visual dashboard with compass, rudder angle, and environmental information
- Command history that tracks your previous actions
- Realistic turning mechanics based on speed and rudder angle
- Visual wake effects that respond to the boat's movement

## Controls

- **←** + **[1-9]**: Turn port exactly 1-9°
- **→** + **[1-9]**: Turn starboard exactly 1-9°
- **↑** + **[1-9]**: Increase speed by 1-9 knots
- **↓** + **[1-9]**: Decrease speed by 1-9 knots
- **S**: Start/stop engine
- **A**: Drop/raise anchor

## Technology

Built with React and modern JavaScript, using:
- React Hooks for state management
- SVG for fluid animations and visualizations
- CSS for responsive layout and styling

## Development

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/alpoktem/barbaros-demo.git
cd barbaros-demo

# Install dependencies
npm install

# Start the development server
npm start
```

### Building for Production

```bash
npm run build
```

## Project Structure

- `src/components/`: UI components for the dashboard and visualization
- `src/hooks/`: Custom React hooks, including the boat physics engine
- `src/styles.css`: Global styles and theming

## Marine Physics Simulation

The simulator implements realistic marine physics including:
- Momentum and inertia effects
- Speed-dependent turning dynamics
- Realistic rudder behavior
- Environmental factors like wind direction and water depth
