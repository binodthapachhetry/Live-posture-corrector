import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { PostureAnalysisResult } from '../types/posture';

class PostureDetectionService {
  private model: poseDetection.PoseDetector | null = null;
  private modelLoading: boolean = false;
  private modelReady: boolean = false;
  
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

  analyzePosture(poses: poseDetection.Pose[]): PostureAnalysisResult {
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
    
    // Determine if posture is good
    const isShoulderAligned = shoulderAlignment < 15; // threshold in pixels
    const isNotSlouchedForward = slouchLevel < 20; // threshold in degrees
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
