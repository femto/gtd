# GTD Tool

A Getting Things Done (GTD) task management application built with React, TypeScript, and Tailwind CSS.

## Features

- Modern React 18 with TypeScript
- Tailwind CSS for styling
- Headless UI components
- ESLint + Prettier for code quality
- Vitest + React Testing Library for testing
- Husky + lint-staged for Git hooks
- PWA support (coming soon)

## Development

### Prerequisites

- Node.js 18+
- npm

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── types/         # TypeScript type definitions
├── test/          # Test setup and utilities
└── App.tsx        # Main application component
```

## Technology Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS, Headless UI
- **Build Tool**: Vite
- **Code Quality**: ESLint, Prettier, Husky
- **Testing**: Vitest, React Testing Library
