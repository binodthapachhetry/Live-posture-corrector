import { describe, it, expect, vi, beforeEach } from 'vitest';
import postureDetectionService from '../PostureDetectionService';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

// Mock TensorFlow and pose-detection
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  browser: {
    fromPixels: vi.fn().mockReturnValue({
      dispose: vi.fn()
    })
  },
  env: vi.fn().mockReturnValue({
    set: vi.fn()
  })
}));

vi.mock('@tensorflow-models/pose-detection', () => ({
  createDetector: vi.fn().mockResolvedValue({
    estimatePoses: vi.fn().mockResolvedValue([
      {
        score: 0.9,
        keypoints: [
          { name: 'nose', x: 300, y: 100, score: 0.95 },
          { name: 'left_shoulder', x: 250, y: 200, score: 0.9 },
          { name: 'right_shoulder', x: 350, y: 205, score: 0.9 },
          { name: 'left_ear', x: 270, y: 80, score: 0.85 },
          { name: 'right_ear', x: 330, y: 85, score: 0.85 }
        ]
      }
    ])
  }),
  SupportedModels: {
    MoveNet: 'movenet'
  },
  movenet: {
    modelType: {
      SINGLEPOSE_LIGHTNING: 'lightning'
    }
  }
}));

describe('PostureDetectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load the model successfully', async () => {
    await postureDetectionService.loadModel();
    expect(tf.ready).toHaveBeenCalled();
    expect(poseDetection.createDetector).toHaveBeenCalled();
    expect(postureDetectionService.isModelReady()).toBe(true);
  });

  it('should detect poses from image data', async () => {
    await postureDetectionService.loadModel();
    
    const mockImageData = new ImageData(640, 480);
    const poses = await postureDetectionService.detectPose(mockImageData);
    
    expect(poses).toHaveLength(1);
    expect(poses[0].keypoints).toHaveLength(5);
  });

  it('should analyze posture correctly', async () => {
    await postureDetectionService.loadModel();
    
    const mockPoses = [
      {
        score: 0.9,
        keypoints: [
          { name: 'nose', x: 300, y: 100, score: 0.95 },
          { name: 'left_shoulder', x: 250, y: 200, score: 0.9 },
          { name: 'right_shoulder', x: 350, y: 200, score: 0.9 }, // Perfect alignment
          { name: 'left_ear', x: 250, y: 80, score: 0.85 }, // Good ear position
          { name: 'right_ear', x: 350, y: 80, score: 0.85 } // Good ear position
        ]
      }
    ];
    
    const result = postureDetectionService.analyzePosture(mockPoses);
    
    expect(result.shoulderAlignment).toBe(0); // Perfect alignment
    expect(result.isGoodPosture).toBe(true);
    expect(result.criticalPoints).toHaveLength(5);
  });

  it('should detect bad posture when shoulders are not aligned', async () => {
    await postureDetectionService.loadModel();
    
    const mockPoses = [
      {
        score: 0.9,
        keypoints: [
          { name: 'nose', x: 300, y: 100, score: 0.95 },
          { name: 'left_shoulder', x: 250, y: 180, score: 0.9 },
          { name: 'right_shoulder', x: 350, y: 220, score: 0.9 }, // 40px difference
          { name: 'left_ear', x: 250, y: 80, score: 0.85 },
          { name: 'right_ear', x: 350, y: 80, score: 0.85 }
        ]
      }
    ];
    
    const result = postureDetectionService.analyzePosture(mockPoses);
    
    expect(result.shoulderAlignment).toBe(40);
    expect(result.isGoodPosture).toBe(false);
    expect(result.feedback).toContain("level your shoulders");
  });
});
