# Live Posture Corrector

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

## Getting Started

```bash
# Navigate to the React app directory
cd react_app

# Install dependencies
npm install

# Start development server
npm run dev
```

## Browser Compatibility

- Chrome 83+
- Firefox 76+
- Safari 14+
- Edge 83+

## Notification Setup                                                                                                                                                                            
                                                                                                                                                                                                  
 ### macOS and Chrome Browser                                                                                                                                                                     
                                                                                                                                                                                                  
 For the posture notifications to work properly on macOS with Chrome:                                                                                                                             
                                                                                                                                                                                                  
 1. Open **System Preferences** (or **System Settings** on newer macOS versions)                                                                                                                  
 2. Select **Notifications & Focus** (or just **Notifications** on older versions)                                                                                                                
 3. Scroll down and find **Google Chrome Helper (Alerts)** in the list                                                                                                                            
 4. Click on it and ensure:                                                                                                                                                                       
    - **Allow Notifications** is turned ON                                                                                                                                                        
    - **Alert** style is selected (not Banner)                                                                                                                                                    
    - **Play sound for notifications** is enabled for audio alerts                                                                                                                                
                                                                                                                                                                                                  
 Without these settings, you may not see the posture correction notifications when they're triggered.  

## License

MIT
