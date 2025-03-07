import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import './CameraFeed.css';
import postureDetectionService from '../services/PostureDetectionService';
import tabVisibilityService from '../services/TabVisibilityService';
import notificationService from '../services/NotificationService';
import PostureOverlay from './PostureOverlay';
import { PostureAnalysisResult, PostureStatus } from '../types/posture';

interface CameraFeedProps {
  onCalibrationNeeded?: () => void;
}

const CameraFeed = ({ onCalibrationNeeded }: CameraFeedProps) => {
  const [isWebcamOn, setIsWebcamOn] = useState<boolean>(false);
  const [actualResolution, setActualResolution] = useState<{width: number, height: number}>({width: 0, height: 0});
  const [fps, setFps] = useState<number>(0);
  const [aspectWarning, setAspectWarning] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<PostureAnalysisResult | null>(null);
  const [postureStatus, setPostureStatus] = useState<PostureStatus>(PostureStatus.UNKNOWN);
  const [badPostureDuration, setBadPostureDuration] = useState<number>(0);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const badPostureStartTimeRef = useRef<number | null>(null);

  const [videoConstraints] = useState<MediaTrackConstraints>({
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 }
  });

  // Load the posture detection model when component mounts
  useEffect(() => {
    const loadModel = async () => {
      try {
        setModelLoading(true);
        await postureDetectionService.loadModel();
        setModelReady(true);
        
        // Check if calibration is needed when model is ready
        if (postureDetectionService.isCalibrationNeeded() && onCalibrationNeeded) {
          onCalibrationNeeded();
        }
      } catch (err) {
        console.error('Failed to load posture detection model:', err);
        setError('Failed to load posture detection model. Please refresh the page.');
      } finally {
        setModelLoading(false);
      }
    };

    loadModel();
    
    // Request notification permission
    notificationService.requestPermission();
    
    // Setup tab visibility tracking
    const unsubscribe = tabVisibilityService.onVisibilityChange((isVisible) => {
      setIsTabVisible(isVisible);
      
      // If tab becomes visible again and webcam is on, restart processing
      if (isVisible && isWebcamOn) {
        processFrame();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [onCalibrationNeeded]);

  // Toggle webcam on/off
  const toggleWebcam = useCallback(async () => {
    try {
      if (!isWebcamOn) {
        // Reset error state when starting
        setError(null);
        
        // Verify webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints
        });
        
        // Check if we got the requested resolution
        const settings = stream.getVideoTracks()[0].getSettings();
        if (settings.width && settings.height) {
          setActualResolution({
            width: settings.width,
            height: settings.height
          });
        }
        
        // Clean up stream when done
        stream.getTracks().forEach(track => track.stop());
      }
      
      setIsWebcamOn(prev => !prev);
    } catch (err) {
      setError(err.message);
      setIsWebcamOn(false);
    }
  }, [isWebcamOn, videoConstraints]);

  // Check aspect ratio of camera feed
  const checkAspectRatio = (w: number, h: number) => {
    const targetAspect = 640/480; // 4:3
    const actualAspect = w/h;
    setAspectWarning(Math.abs(actualAspect - targetAspect) > 0.05);
  };

  // Track bad posture duration
  useEffect(() => {
    let interval: number | undefined;
    
    if (postureStatus === PostureStatus.BAD) {
      if (badPostureStartTimeRef.current === null) {
        badPostureStartTimeRef.current = Date.now();
      }
      
      interval = window.setInterval(() => {
        if (badPostureStartTimeRef.current) {
          const duration = (Date.now() - badPostureStartTimeRef.current) / 1000;
          setBadPostureDuration(duration);
          
          // Notify about bad posture every minute
          if (duration > 30 && Math.floor(duration) % 60 === 0) {
            notificationService.notifyPostureStatus(PostureStatus.BAD, duration);
          }
        }
      }, 1000);
    } else {
      badPostureStartTimeRef.current = null;
      setBadPostureDuration(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [postureStatus]);

  // Main frame processing function
  const processFrame = useCallback(async () => {
    // Skip processing if tab is not visible
    if (!isTabVisible) return;
    
    const now = performance.now();
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;
    
    if (video && canvas && modelReady) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Calculate FPS
      if (lastFrameTimeRef.current) {
        const delta = now - lastFrameTimeRef.current;
        const instantFps = 1000 / delta;
        setFps(prev => Math.round((prev * 0.9) + (instantFps * 0.1))); // Smooth FPS
      }
      lastFrameTimeRef.current = now;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      try {
        // Detect poses
        const poses = await postureDetectionService.detectPose(imageData);
        
        // Analyze posture
        const result = postureDetectionService.analyzePosture(poses);
        setAnalysisResult(result);
        
        // Update posture status
        setPostureStatus(result.isGoodPosture ? PostureStatus.GOOD : PostureStatus.BAD);
        
        // Update resolution if changed
        if (video.videoWidth !== actualResolution.width || video.videoHeight !== actualResolution.height) {
          setActualResolution({width: video.videoWidth, height: video.videoHeight});
          checkAspectRatio(video.videoWidth, video.videoHeight);
        }
      } catch (err) {
        console.error('Error processing frame:', err);
      }
    }
    
    // Continue processing frames
    if (isWebcamOn) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [isWebcamOn, modelReady, isTabVisible, actualResolution.width, actualResolution.height]);

  // Start/stop frame processing when webcam state changes
  useEffect(() => {
    if (isWebcamOn) {
      processFrame();
    } else {
      cancelAnimationFrame(animationFrameRef.current);
      setPostureStatus(PostureStatus.UNKNOWN);
      setBadPostureDuration(0);
      badPostureStartTimeRef.current = null;
    }
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isWebcamOn, processFrame]);

  return (
    <div className="camera-feed">
      <div className="camera-container">
        {isWebcamOn && (
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={videoConstraints}
            className="webcam-preview"
            onUserMediaError={(err) => setError(err.message)}
            onUserMedia={() => setError(null)}
          />
        )}
        
        {isWebcamOn && analysisResult && (
          <PostureOverlay
            analysisResult={analysisResult}
            videoWidth={actualResolution.width || 640}
            videoHeight={actualResolution.height || 480}
            isActive={isWebcamOn && modelReady}
          />
        )}
      </div>
      
      <div className="controls">
        <button 
          onClick={toggleWebcam} 
          className={`webcam-toggle ${isWebcamOn ? 'active' : ''}`}
          disabled={modelLoading}
        >
          {isWebcamOn ? 'Stop Webcam' : 'Start Webcam'}
        </button>
        
        {modelLoading && (
          <div className="loading-indicator">
            Loading posture detection model...
          </div>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          🚨 Camera Error: {error}
          <div style={{ marginTop: 8, fontSize: '0.9em' }}>
            Please check:
            <ul style={{ textAlign: 'left', margin: '4px 0' }}>
              <li>Browser permissions</li>
              <li>Connected cameras</li>
              <li>Other apps using camera</li>
            </ul>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} width={640} height={480} hidden />
      
      <div className="camera-metrics">
        <div className="metric">
          📏 Resolution: {actualResolution.width}x{actualResolution.height}
          {aspectWarning && <span className="metric-warning"> (Aspect mismatch!)</span>}
        </div>
        <div className="metric">
          🎞️ FPS: {fps}
          {fps > 0 && fps < 24 && <span className="metric-warning"> (Low frame rate)</span>}
        </div>
        <div className="metric">
          ⚙️ Target: 640x480 @ 30FPS
        </div>
        {postureStatus !== PostureStatus.UNKNOWN && (
          <div className="metric">
            🧍 Posture: 
            <span className={`posture-status ${postureStatus}`}>
              {postureStatus === PostureStatus.GOOD ? 'Good' : 'Needs Correction'}
            </span>
            {postureStatus === PostureStatus.BAD && badPostureDuration > 5 && (
              <span className="metric-warning"> ({Math.floor(badPostureDuration)}s)</span>
            )}
          </div>
        )}
      </div>
      
      {!isTabVisible && isWebcamOn && (
        <div className="tab-inactive-notice">
          Processing paused while tab is inactive
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
