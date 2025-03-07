import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { PostureAnalysisResult, PostureSettings, CalibrationData } from '../types/posture';

class PostureDetectionService {
  private model: poseDetection.PoseDetector | null = null;
  private modelLoading: boolean = false;
  private modelReady: boolean = false;
  
  // Default posture settings
  private postureSettings: PostureSettings = {
    shoulderAlignmentThreshold: 15, // pixels
    slouchAngleThreshold: 20, // degrees
    minPoseConfidence: 0.25
  };
  
  // Calibration data
  private calibrationData: CalibrationData | null = null;
  private calibrationTimestamp: number = 0;
  private readonly CALIBRATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  // Configuration for MoveNet model (best balance of accuracy and performance)
  private readonly modelConfig: poseDetection.MoveNetModelConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
    minPoseScore: 0.25
  };

  constructor() {
    // Initialize TensorFlow.js
    tf.env().set('WEBGL_CPU_FORWARD', false);
    tf.env().set('WEBGL_PACK', true);
    
    // Load any saved calibration data
    this.loadCalibrationData();
  }

  async loadModel(): Promise<void> {
    if (this.modelLoading || this.modelReady) return;
    
    try {
      this.modelLoading = true;
      
      // Load TensorFlow.js if not already loaded
      await tf.ready();
      
      // Create detector using MoveNet (best balance of speed and accuracy)
      this.model = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        this.modelConfig
      );
      
      this.modelReady = true;
      console.log('Posture detection model loaded successfully');
    } catch (error) {
      console.error('Failed to load posture detection model:', error);
      throw error;
    } finally {
      this.modelLoading = false;
    }
  }

  async detectPose(imageData: ImageData): Promise<poseDetection.Pose[]> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }
    
    // Convert ImageData to tensor
    const imageTensor = tf.browser.fromPixels(imageData);
    
    // Run detection
    const poses = await this.model.estimatePoses(imageTensor);
    
    // Clean up tensor to prevent memory leaks
    imageTensor.dispose();
    
    return poses;
  }

  analyzePosture(poses: poseDetection.Pose[], settings?: Partial<PostureSettings>): PostureAnalysisResult {
    // Apply any custom settings passed in
    let currentSettings = {
      ...this.postureSettings,
      ...(settings || {})
    };
    
    // Apply calibration-based settings if available
    if (this.calibrationData) {
      currentSettings = this.generateSettingsFromCalibration(currentSettings);
    }
    if (!poses.length) {
      return {
        slouchLevel: 0,
        shoulderAlignment: 0,
        criticalPoints: [],
        isGoodPosture: false,
        feedback: "No person detected"
      };
    }

    const pose = poses[0];
    const keypoints = pose.keypoints;
    
    // Extract key body points
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftEar = keypoints.find(kp => kp.name === 'left_ear');
    const rightEar = keypoints.find(kp => kp.name === 'right_ear');
    const nose = keypoints.find(kp => kp.name === 'nose');
    
    // Default values if keypoints not found
    if (!leftShoulder || !rightShoulder || !leftEar || !rightEar || !nose) {
      return {
        slouchLevel: 0,
        shoulderAlignment: 0,
        criticalPoints: [],
        isGoodPosture: false,
        feedback: "Cannot detect key body points"
      };
    }

    // Calculate shoulder alignment (horizontal level)
    const shoulderAlignment = Math.abs(leftShoulder.y - rightShoulder.y);
    
    // Calculate slouch level based on ear-shoulder relationship
    // In good posture, ears should be aligned with shoulders
    const leftSlouchAngle = calculateAngle(
      leftEar.x, leftEar.y,
      leftShoulder.x, leftShoulder.y,
      leftShoulder.x + 10, leftShoulder.y // horizontal reference
    );
    
    const rightSlouchAngle = calculateAngle(
      rightEar.x, rightEar.y,
      rightShoulder.x, rightShoulder.y,
      rightShoulder.x + 10, rightShoulder.y // horizontal reference
    );
    
    // Average the two angles
    const slouchLevel = (leftSlouchAngle + rightSlouchAngle) / 2;
    
    // Determine if posture is good using configurable thresholds
    const isShoulderAligned = shoulderAlignment < currentSettings.shoulderAlignmentThreshold;
    const isNotSlouchedForward = slouchLevel < currentSettings.slouchAngleThreshold;
    const isGoodPosture = isShoulderAligned && isNotSlouchedForward;
    
    // Generate feedback
    let feedback = "Your posture looks good!";
    if (!isShoulderAligned) {
      feedback = "Try to level your shoulders";
    }
    if (!isNotSlouchedForward) {
      feedback = "You're slouching forward. Sit up straight!";
    }
    if (!isShoulderAligned && !isNotSlouchedForward) {
      feedback = "Fix your posture: level shoulders and sit up straight";
    }
    
    // Return critical points for visualization
    const criticalPoints = [
      [leftShoulder.x, leftShoulder.y],
      [rightShoulder.x, rightShoulder.y],
      [leftEar.x, leftEar.y],
      [rightEar.x, rightEar.y],
      [nose.x, nose.y]
    ];
    
    return {
      slouchLevel,
      shoulderAlignment,
      criticalPoints,
      isGoodPosture,
      feedback
    };
  }
  
  isModelReady(): boolean {
    return this.modelReady;
  }
  
  // Method to update posture settings
  updateSettings(settings: Partial<PostureSettings>): void {
    this.postureSettings = {
      ...this.postureSettings,
      ...settings
    };
  }
  
  // Method to get current settings
  getSettings(): PostureSettings {
    return { ...this.postureSettings };
  }
  
  // Calibration methods
  
  /**
   * Checks if calibration is needed based on various triggers
   */
  isCalibrationNeeded(): boolean {
    // No calibration data exists
    if (!this.calibrationData) {
      return true;
    }
    
    // Calibration data is too old
    const now = Date.now();
    if (now - this.calibrationTimestamp > this.CALIBRATION_EXPIRY_MS) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Performs calibration using the current pose
   */
  async calibrate(imageData: ImageData): Promise<boolean> {
    try {
      const poses = await this.detectPose(imageData);
      
      if (!poses || poses.length === 0 || !poses[0].keypoints) {
        throw new Error('No valid pose detected for calibration');
      }
      
      this.saveCalibrationData(poses[0]);
      return true;
    } catch (error) {
      console.error('Calibration failed:', error);
      return false;
    }
  }
  
  /**
   * Saves reference pose as calibration data
   */
  private saveCalibrationData(pose: poseDetection.Pose): void {
    if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
      throw new Error('Invalid pose data for calibration');
    }
    
    // Extract key body points
    const keypoints = pose.keypoints;
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftEar = keypoints.find(kp => kp.name === 'left_ear');
    const rightEar = keypoints.find(kp => kp.name === 'right_ear');
    const nose = keypoints.find(kp => kp.name === 'nose');
    
    if (!leftShoulder || !rightShoulder || !leftEar || !rightEar || !nose) {
      throw new Error('Missing key body points for calibration');
    }
    
    // Calculate reference values
    const shoulderAlignment = Math.abs(leftShoulder.y - rightShoulder.y);
    
    // Calculate ear-shoulder angles for slouch detection
    const leftSlouchAngle = calculateAngle(
      leftEar.x, leftEar.y,
      leftShoulder.x, leftShoulder.y,
      leftShoulder.x + 10, leftShoulder.y
    );
    
    const rightSlouchAngle = calculateAngle(
      rightEar.x, rightEar.y,
      rightShoulder.x, rightShoulder.y,
      rightShoulder.x + 10, rightShoulder.y
    );
    
    // Store calibration data
    this.calibrationData = {
      referenceShoulderAlignment: shoulderAlignment,
      referenceLeftSlouchAngle: leftSlouchAngle,
      referenceRightSlouchAngle: rightSlouchAngle,
      referenceKeypoints: {
        leftShoulder: { x: leftShoulder.x, y: leftShoulder.y },
        rightShoulder: { x: rightShoulder.x, y: rightShoulder.y },
        leftEar: { x: leftEar.x, y: leftEar.y },
        rightEar: { x: rightEar.x, y: rightEar.y },
        nose: { x: nose.x, y: nose.y }
      }
    };
    
    this.calibrationTimestamp = Date.now();
    
    // Save to localStorage
    localStorage.setItem('postureCalibrationData', JSON.stringify(this.calibrationData));
    localStorage.setItem('postureCalibrationTimestamp', this.calibrationTimestamp.toString());
    
    console.log('Calibration data saved successfully', this.calibrationData);
  }
  
  /**
   * Loads calibration data from localStorage
   */
  private loadCalibrationData(): void {
    try {
      const savedData = localStorage.getItem('postureCalibrationData');
      const savedTimestamp = localStorage.getItem('postureCalibrationTimestamp');
      
      if (savedData && savedTimestamp) {
        this.calibrationData = JSON.parse(savedData);
        this.calibrationTimestamp = parseInt(savedTimestamp, 10);
      }
    } catch (error) {
      console.error('Error loading calibration data:', error);
      this.clearCalibrationData();
    }
  }
  
  /**
   * Forces recalibration by clearing existing data
   */
  clearCalibrationData(): void {
    this.calibrationData = null;
    this.calibrationTimestamp = 0;
    localStorage.removeItem('postureCalibrationData');
    localStorage.removeItem('postureCalibrationTimestamp');
  }
  
  /**
   * Generates recommended posture settings based on calibration
   */
  private generateSettingsFromCalibration(baseSettings: PostureSettings): PostureSettings {
    if (!this.calibrationData) {
      return baseSettings;
    }
    
    // Calculate personalized thresholds based on calibration
    // Add some tolerance to the calibrated values
    const shoulderAlignmentThreshold = Math.max(
      this.calibrationData.referenceShoulderAlignment * 1.5,
      baseSettings.shoulderAlignmentThreshold * 0.7
    );
    
    const avgSlouchAngle = (
      this.calibrationData.referenceLeftSlouchAngle + 
      this.calibrationData.referenceRightSlouchAngle
    ) / 2;
    
    const slouchAngleThreshold = Math.max(
      avgSlouchAngle * 1.3,
      baseSettings.slouchAngleThreshold * 0.7
    );
    
    return {
      ...baseSettings,
      shoulderAlignmentThreshold,
      slouchAngleThreshold
    };
  }
}

// Helper function to calculate angle between three points
function calculateAngle(
  x1: number, y1: number, 
  x2: number, y2: number, 
  x3: number, y3: number
): number {
  const angleRadians = Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y1 - y2, x1 - x2);
  let angleDegrees = angleRadians * 180 / Math.PI;
  
  // Normalize angle
  if (angleDegrees < 0) {
    angleDegrees += 360;
  }
  
  return angleDegrees;
}

// Create singleton instance
const postureDetectionService = new PostureDetectionService();
export default postureDetectionService;
