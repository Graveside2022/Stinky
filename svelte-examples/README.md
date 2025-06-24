# Stinkster Svelte Frontend

Modernized Svelte-based frontend for the Stinkster SDR/GPS/TAK platform.

## Quick Start

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Lint code

## Features

- Real-time spectrum analysis
- Kismet operations dashboard
- WigleToTAK interface
- WebSocket integration
- Responsive design
- Dark/light themes

## Architecture

### Component Structure
```
src/
├── lib/
│   ├── components/     # Reusable UI components
│   ├── stores/        # Svelte stores for state
│   └── services/      # API and WebSocket services
├── routes/            # Application routes
└── App.svelte         # Root component
```

### Key Technologies
- Svelte 4 with Vite
- Socket.IO for real-time data
- Plotly.js for visualizations
- Cesium for 3D mapping
- TypeScript support