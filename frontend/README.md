# Reddit Time Warp Frontend

A beautiful React application that allows users to browse Reddit submissions from any point in time. Built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- 🕰️ **Time Travel**: Browse Reddit submissions from any historical moment
- 🎯 **Compact Interface**: Minimal design - subreddit input, time picker, and warp button
- 📱 **Responsive Design**: Works perfectly on both mobile and desktop
- 🎨 **Reddit-like UI**: Familiar interface inspired by Reddit's design
- ⚡ **Fast Loading**: Optimized with Vite for quick development and builds
- 🔍 **Smart Sorting**: Sort submissions by top, new, or old

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx      # Main header with logo and title
│   ├── SubredditSelector.tsx  # Subreddit selection interface
│   ├── TimeSelector.tsx      # Date/time picker with presets
│   ├── SortSelector.tsx      # Sorting options
│   ├── SubmissionCard.tsx     # Individual submission display
│   └── SubmissionList.tsx     # List of submissions with loading states
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── api.ts          # API client for backend communication
│   └── dateUtils.ts    # Date formatting utilities
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles and Tailwind imports
```

## API Integration

The frontend communicates with the backend API through the `/api` proxy configured in `vite.config.ts`. The API client in `src/utils/api.ts` handles:

- Fetching submissions for a specific subreddit and timestamp
- Fetching hot submissions
- Error handling and response parsing

## Styling

The application uses Tailwind CSS with a custom Reddit-inspired color palette:

- **Reddit Orange**: Primary brand color (#FF4500)
- **Dark**: Dark backgrounds (#1A1A1B)
- **Gray**: Neutral colors (#DAE0E6)
- **Light**: Light backgrounds (#F6F7F8)
- **Blue**: Accent colors (#0079D3)

## Development

The project uses:
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+