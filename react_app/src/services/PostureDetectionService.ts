import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { PostureAnalysisResult, PostureSettings, CalibrationData } from '../types/posture';

/**
 * NOTE: The current implementation uses geometric thresholds on angles/distances.
 * 
 * For state-of-the-art posture quality assessment, consider replacing this with:
 * 
 * 1. Spatio-Temporal Graph Convolutional Networks (ST-GCN, 2s-AGCN, CTR-GCN)
 *    - Model skeleton as a graph (joints=nodes, bones=edges), run graph convolutions over space and time.
 *    - Captures subtle, multi-joint dependencies and temporal drift.
 *    - Train a binary/tri-class model (GOOD / BAD-SLUMP / BAD-LEAN) on 1–3s pose sequences.
 *    - See: Shi et al., CVPR 2019; 2s-AGCN; CTR-GCN (CVPR 2021).
 * 
 * 2. Transformer-based Skeleton Encoders (PoseFormer, TokenPose, TFC-GCN)
 *    - Flatten per-frame joint coordinates into token embeddings, apply self-attention across joints/frames.
 *    - Models long-term posture degradation and global dependencies.
 *    - Lightweight versions (e.g., Performer) can run in-browser.
 *    - See: Zheng et al., ICCV 2021 (PoseFormer); Li et al., CVPR 2022 (TokenPose).
 * 
 * 3. Self-Supervised Contrastive Learning (e.g. SkeleHRNet, Info-GCN)
 *    - Pre-train on skeleton sequence augmentations, fine-tune on small labelled “good vs bad” set.
 *    - Robust to camera angles, lighting, and body shape diversity.
 * 
 * 4. Anomaly Detection with Sequence Autoencoders/VAEs
 *    - Train on GOOD posture only; high reconstruction error = BAD posture.
 *    - Yields a continuous “posture quality score”.
 * 
 * 5. Probabilistic Graphical Models with Temporal Bayesian Filters
 *    - Model hidden “posture state” as a Markov chain, update with noisy keypoint observations.
 *    - Smooths out detector jitter, reduces false positives.
 *    - Can be implemented in real time in JS (e.g., Kalman/Bayesian filters).
 * 
 * 6. 3-D Pose + Learned Biomechanical Metrics (VideoPose3D, METRO)
 *    - Lift 2-D keypoints to 3-D, compute ergonomic angles (pelvis tilt, lumbar curvature).
 *    - Distinguishes forward-lean vs camera distortion; enables richer feedback.
 * 
 * 7. Multimodal Fusion with Vision Transformers (ViT)
 *    - Fuse RGB patches + pose tokens; model attends to both raw pixels and skeleton cues.
 *    - Recovers from missing joints/occlusion.
 * 
 * 8. RL-Driven Personalised Thresholding
 *    - Treat feedback as RL “intervention”; agent learns per-user slouch thresholds & cooldowns.
 *    - Adapts to individual ergonomics and notification tolerance.
 * 
 * Implementation notes:
 * - Data: A small, diverse webcam dataset labelled for posture quality is ideal; or use self-supervision + anomaly detection.
 * - Runtime: ST-GCN & light Transformers can run at >30 FPS in-browser; 3-D mesh models may need WASM/WebGPU or server offload.
 * - UX: Advanced models output confidence scores—pair with probabilistic filtering to avoid notification spam.
 * 
 * By moving to a data-driven, sequence-aware method, you’ll replace brittle geometric thresholds with a learned representation that better handles body diversity, camera tilt, and slow posture drift, while still fitting browser-only deployment.
 */

class PostureDetectionService {
  private model: poseDetection.PoseDetector | null = null;
  private modelLoading: boolean = false;
  private modelReady: boolean = false;
  
  // Default posture settings
  private postureSettings: PostureSettings = {
    shoulderAlignmentThreshold: 15, // pixels
    slouchThreshold: 20, // degrees
    detectionConfidence: 0.6,
    enableNotifications: true,
    notificationInterval: 60000 // 1 minute
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

  /**
   * Detects pose from an upper-body image region.
   * Only upper-body keypoints (shoulders, ears, nose) are required.
   * MoveNet will return all 17 keypoints, but only the upper-body ones are used.
   */
  async detectPose(imageData: ImageData): Promise<poseDetection.Pose[]> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }
    
    // Convert ImageData to tensor
    const imageTensor = tf.browser.fromPixels(imageData);
    
    // Run detection (MoveNet is robust to upper-body crops)
    const poses = await this.model.estimatePoses(imageTensor);
    
    // Clean up tensor to prevent memory leaks
    imageTensor.dispose();
    
    // No filtering needed: analyzePosture will use only upper-body keypoints
    return poses;
  }

  analyzePosture(poses: poseDetection.Pose[], settings?: Partial<PostureSettings>): PostureAnalysisResult {
    // --- CURRENT: geometric thresholding on angles/distances ---
    // See above for state-of-the-art alternatives.
    // -----------------------------------------------------------
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
    
    // Calculate vertical position of nose relative to shoulders
    // This is a more reliable indicator of forward slouching
    const shoulderMidpointY = (leftShoulder.y + rightShoulder.y) / 2;
    const noseToShoulderY = nose.y - shoulderMidpointY;
    
    // In calibration, we store the reference nose-to-shoulder position
    const referenceNoseToShoulderY = this.calibrationData ? 
      (this.calibrationData.referenceKeypoints.nose.y - 
       (this.calibrationData.referenceKeypoints.leftShoulder.y + 
        this.calibrationData.referenceKeypoints.rightShoulder.y) / 2) : 0;
    
    // Calculate how much the nose has moved down relative to shoulders
    // Positive values mean the nose is lower than in calibration (slouching forward)
    const noseVerticalDeviation = this.calibrationData ? 
      (noseToShoulderY - referenceNoseToShoulderY) : 0;
    
    // Combine the traditional angle-based slouch detection with the vertical position
    // Average the two angles
    const slouchAngle = (leftSlouchAngle + rightSlouchAngle) / 2;
    
    // Combine both measures for a more robust slouch detection
    // Weight the vertical deviation more heavily as it's more reliable
    const slouchLevel = slouchAngle * 0.7 + (noseVerticalDeviation > 0 ? noseVerticalDeviation * 0.3 : 0);
    
    // Determine if posture is good using configurable thresholds
    const isShoulderAligned = shoulderAlignment < currentSettings.shoulderAlignmentThreshold;
    const isNotSlouchedForward = slouchLevel < currentSettings.slouchThreshold;
    const isGoodPosture = isShoulderAligned && isNotSlouchedForward;
    
    // Generate detailed feedback
    let feedback = "Your posture looks good!";
    
    if (!isShoulderAligned && !isNotSlouchedForward) {
      // Both issues
      feedback = "Fix your posture: level your shoulders and sit up straight";
    } else if (!isShoulderAligned) {
      // Only shoulder alignment issue
      // Since we're using unmirrored video, left shoulder is actually on the left side of the screen
      // So we can directly use the y-coordinates to determine which shoulder is higher
      const higherSide = leftShoulder.y < rightShoulder.y ? "left" : "right";

      feedback = `Your ${higherSide} shoulder is higher. Try to level your shoulders`;
    } else if (!isNotSlouchedForward) {
      // Only slouching issue
      const severity = slouchLevel > currentSettings.slouchThreshold * 1.5 
        ? "significantly" 
        : "slightly";
      feedback = `You're ${severity} slouching forward. Sit up straight!`;
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
      
      // Validate the pose is suitable for calibration
      const isValidPose = this.validatePoseForCalibration(poses[0]);
      if (!isValidPose.valid) {
        throw new Error(`Calibration failed: ${isValidPose.reason}`);
      }
      
      this.saveCalibrationData(poses[0]);
      return true;
    } catch (error) {
      console.error('Calibration failed:', error);
      return false;
    }
  }
  
  /**
   * Validates if a pose is suitable for calibration
   */
  private validatePoseForCalibration(pose: poseDetection.Pose): {valid: boolean, reason?: string} {
    if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
      return { valid: false, reason: 'Invalid pose data' };
    }
    
    // Extract key body points
    const keypoints = pose.keypoints;
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftEar = keypoints.find(kp => kp.name === 'left_ear');
    const rightEar = keypoints.find(kp => kp.name === 'right_ear');
    const nose = keypoints.find(kp => kp.name === 'nose');
    
    // Check if all required keypoints are detected with sufficient confidence
    const requiredKeypoints = [leftShoulder, rightShoulder, leftEar, rightEar, nose];
    const minConfidence = 0.4; // Reduced from 0.5 to allow for more flexibility
    
    for (const keypoint of requiredKeypoints) {
      if (!keypoint) {
        return { valid: false, reason: 'Missing required body points' };
      }
      
      if (keypoint.score && keypoint.score < minConfidence) {
        return { 
          valid: false, 
          reason: `Low confidence detection (${Math.round(keypoint.score * 100)}%). Please ensure good lighting and positioning.` 
        };
      }
    }
    
    // Check if shoulders are reasonably level for calibration
    if (leftShoulder && rightShoulder) {
      const shoulderAlignment = Math.abs(leftShoulder.y - rightShoulder.y);
      if (shoulderAlignment > 30) { // Arbitrary threshold for calibration
        return { 
          valid: false, 
          reason: 'Shoulders are not level enough for calibration. Please sit straight.' 
        };
      }
    }
    
    // Check if head is reasonably centered and upright
    if (leftEar && rightEar && nose) {
      const headTilt = Math.abs(leftEar.y - rightEar.y);
      if (headTilt > 20) { // Arbitrary threshold for calibration
        return { 
          valid: false, 
          reason: 'Head is tilted. Please keep your head level for calibration.' 
        };
      }
      
      // Check if nose is between ears (horizontally)
      if (nose.x < Math.min(leftEar.x, rightEar.x) || nose.x > Math.max(leftEar.x, rightEar.x)) {
        return { 
          valid: false, 
          reason: 'Please face the camera directly for calibration.' 
        };
      }
    }
    
    return { valid: true };
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
    
    // Calculate personalized thresholds based on calibration with adaptive tolerance
    
    // For shoulder alignment: use adaptive tolerance based on the reference value
    // Smaller reference values get proportionally larger tolerance
    const shoulderBaseMultiplier = 1.5; // Base multiplier
    const shoulderAdaptiveFactor = 
      10 / (this.calibrationData.referenceShoulderAlignment + 5); // Adaptive factor
    
    const shoulderAlignmentThreshold = Math.max(
      this.calibrationData.referenceShoulderAlignment * 
        (shoulderBaseMultiplier + shoulderAdaptiveFactor),
      baseSettings.shoulderAlignmentThreshold * 0.7
    );
    
    // For slouch angle: calculate average of left and right angles
    const avgSlouchAngle = (
      this.calibrationData.referenceLeftSlouchAngle + 
      this.calibrationData.referenceRightSlouchAngle
    ) / 2;
    
    // Make slouch detection more sensitive by using a smaller multiplier
    const slouchBaseMultiplier = 1.2; // Reduced from 1.3
    const slouchAdaptiveFactor = 
      10 / (avgSlouchAngle + 10); // Adaptive factor (reduced from 15)
    
    const slouchThreshold = Math.max(
      avgSlouchAngle * (slouchBaseMultiplier + slouchAdaptiveFactor),
      baseSettings.slouchThreshold * 0.7
    );
    
    // console.log('Generated personalized thresholds:', {
    //   original: {
    //     shoulderAlignment: this.calibrationData.referenceShoulderAlignment,
    //     slouchAngle: avgSlouchAngle
    //   },
    //   thresholds: {
    //     shoulderAlignment: shoulderAlignmentThreshold,
    //     slouchAngle: slouchAngleThreshold
    //   },
    //   multipliers: {
    //     shoulder: shoulderBaseMultiplier + shoulderAdaptiveFactor,
    //     slouch: slouchBaseMultiplier + slouchAdaptiveFactor
    //   }
    // });
    
    return {
      ...baseSettings,
      shoulderAlignmentThreshold,
      slouchThreshold
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
