# Posture Corrector Web Application

A privacy-focused web application that helps users maintain good posture by analyzing webcam feed in real-time, entirely client-side.

## Features

- **Real-time posture analysis** using TensorFlow.js and MoveNet pose detection
- **Privacy-preserving** - all processing happens locally in the browser
- **Visual feedback** with overlay showing posture status and body points
- **Tab visibility detection** to pause processing when tab is inactive
- **Cross-tab notifications** to prevent multiple instances running simultaneously
- **Performance optimization** with adaptive frame rate and resolution
- **Responsive design** that works on desktop and mobile devices

## Technical Architecture

### Core Technologies

- **React** - UI framework
- **TypeScript** - Type safety and developer experience
- **TensorFlow.js** - Machine learning in the browser
- **MoveNet** - Lightweight pose detection model
- **Web APIs** - Page Visibility API, Notifications API, BroadcastChannel API

### Key Components

1. **PostureDetectionService** - Handles model loading and pose analysis
2. **TabVisibilityService** - Manages tab visibility state and cross-tab communication
3. **NotificationService** - Provides user notifications for bad posture
4. **CameraFeed** - Main component for webcam handling and frame processing
5. **PostureOverlay** - Visual feedback component showing posture status

## Privacy

This application is designed with privacy as a top priority:

- All video processing happens locally in your browser
- No video data is ever sent to any server
- No data is stored between sessions
- Works offline after initial load

## Performance Considerations

The application is optimized for different hardware capabilities:

- Adaptive frame rate based on device performance
- Resolution monitoring and warnings
- Processing paused when tab is inactive
- WebGL acceleration when available

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Testing

The application includes unit tests for core functionality using Vitest.

## Browser Compatibility

- Chrome 83+
- Firefox 76+
- Safari 14+
- Edge 83+

## License

MIT
