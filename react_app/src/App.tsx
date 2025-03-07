import { useState, useEffect } from 'react';
import './App.css';
import CameraFeed from './components/CameraFeed';
import CalibrationModal from './components/CalibrationModal';
import notificationService from './services/NotificationService';
import postureDetectionService from './services/PostureDetectionService';
import { PostureSettings } from './types/posture';

function App() {
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCalibration, setShowCalibration] = useState<boolean>(false);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [settings, setSettings] = useState<PostureSettings>({
    shoulderAlignmentThreshold: 15,
    slouchThreshold: 20,
    detectionConfidence: 0.6,
    enableNotifications: true,
    notificationInterval: 60000 // 1 minute
  });

  // Check if calibration is needed on startup
  useEffect(() => {
    const checkCalibration = async () => {
      // Wait for model to be ready before checking calibration
      if (!postureDetectionService.isModelReady()) {
        try {
          await postureDetectionService.loadModel();
        } catch (error) {
          console.error('Failed to load model:', error);
        }
      }
      
      const needsCalibration = postureDetectionService.isCalibrationNeeded();
      setIsCalibrated(!needsCalibration);
      
      if (needsCalibration) {
        setShowCalibration(true);
      }
    };
    
    checkCalibration();
  }, []);

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  const handleSettingChange = (key: keyof PostureSettings, value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Update notification settings if changed
    if (key === 'enableNotifications') {
      notificationService.setEnabled(value as boolean);
    } else if (key === 'notificationInterval') {
      notificationService.setCooldown(value as number);
    }
  };

  const handleRecalibrate = () => {
    postureDetectionService.clearCalibrationData();
    setIsCalibrated(false);
    setShowCalibration(true);
  };

  const handleCalibrationComplete = () => {
    setShowCalibration(false);
    setIsCalibrated(true);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Posture Analysis App</h1>
        {isCalibrated && (
          <button 
            className="settings-toggle"
            onClick={toggleSettings}
          >
            {showSettings ? 'Hide Settings' : 'Settings'}
          </button>
        )}
      </header>

      {isCalibrated && showSettings && (
        <div className="settings-panel">
          <h2>Settings</h2>
          
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
              />
              Enable Notifications
            </label>
          </div>
          
          <div className="setting-group">
            <label>Notification Interval (seconds)</label>
            <input
              type="range"
              min="30"
              max="300"
              step="30"
              value={settings.notificationInterval / 1000}
              onChange={(e) => handleSettingChange('notificationInterval', parseInt(e.target.value) * 1000)}
            />
            <span>{settings.notificationInterval / 1000}s</span>
          </div>
          
          <div className="setting-group">
            <label>Slouch Threshold (degrees)</label>
            <input
              type="range"
              min="10"
              max="30"
              value={settings.slouchThreshold}
              onChange={(e) => handleSettingChange('slouchThreshold', parseInt(e.target.value))}
            />
            <span>{settings.slouchThreshold}°</span>
          </div>
          
          <div className="setting-group">
            <label>Detection Confidence</label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={settings.detectionConfidence}
              onChange={(e) => handleSettingChange('detectionConfidence', parseFloat(e.target.value))}
            />
            <span>{(settings.detectionConfidence * 100).toFixed(0)}%</span>
          </div>
          
          <div className="setting-group">
            <button
              onClick={() => {
                console.log('Recalibrate button clicked');
                
                // Clear calibration data
                postureDetectionService.clearCalibrationData();
                
                // Update UI state
                setIsCalibrated(false);
                setShowSettings(false);
                setShowCalibration(true);
                
                // Pass a signal to CameraFeed to stop the webcam
                if (typeof window !== 'undefined') {
                  // Create a custom event to signal the camera to stop
                  const event = new CustomEvent('stopWebcam');
                  window.dispatchEvent(event);
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px',
                position: 'relative',
                zIndex: 10,
                pointerEvents: 'auto'
              }}
            >
              Recalibrate Posture
            </button>
          </div>
          
          <div className="setting-info">
            <p>
              <strong>Privacy Note:</strong> All processing happens locally on your device.
              No video data is sent to any server.
            </p>
          </div>
        </div>
      )}

      <CameraFeed 
        onCalibrationNeeded={() => setShowCalibration(true)} 
        isCalibrated={isCalibrated}
      />

      <CalibrationModal 
        isOpen={showCalibration}
        onClose={() => {
          console.log('Closing calibration modal');
          setShowCalibration(false);
        }}
        onCalibrationComplete={handleCalibrationComplete}
        settings={settings}
      />

      {isCalibrated && (
        <button                                                                                                                                                                                          
          onClick={() => notificationService.notifyBadPosture('Test notification')}                                                                                                                      
          style={{                                                                                                                                                                                       
            padding: '10px 20px',                                                                                                                                                                        
            margin: '20px 0',                                                                                                                                                                            
            backgroundColor: '#4285f4',                                                                                                                                                                  
            color: 'white',                                                                                                                                                                              
            border: 'none',                                                                                                                                                                              
            borderRadius: '4px',                                                                                                                                                                         
            cursor: 'pointer',
            position: 'relative',
            zIndex: 5,
            pointerEvents: 'auto'                                                                                                                                                                            
          }}                                                                                                                                                                                             
        >                                                                                                                                                                                                
          Test Notification                                                                                                                                                                              
        </button>
      )}
      
      <footer className="app-footer">
        <p>
          This app processes all data locally in your browser.
          Your privacy is protected as no video is sent to any server.
        </p>
      </footer>
    </div>
  );
}

export default App;
