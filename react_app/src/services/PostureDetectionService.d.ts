import * as poseDetection from '@tensorflow-models/pose-detection';
import { PostureAnalysisResult, PostureSettings } from '../types/posture';
declare class PostureDetectionService {
    private model;
    private modelLoading;
    private modelReady;
    private postureSettings;
    private calibrationData;
    private calibrationTimestamp;
    private readonly CALIBRATION_EXPIRY_MS;
    private readonly modelConfig;
    constructor();
    loadModel(): Promise<void>;
    detectPose(imageData: ImageData): Promise<poseDetection.Pose[]>;
    analyzePosture(poses: poseDetection.Pose[], settings?: Partial<PostureSettings>): PostureAnalysisResult;
    isModelReady(): boolean;
    updateSettings(settings: Partial<PostureSettings>): void;
    getSettings(): PostureSettings;
    /**
     * Checks if calibration is needed based on various triggers
     */
    isCalibrationNeeded(): boolean;
    /**
     * Performs calibration using the current pose
     */
    calibrate(imageData: ImageData): Promise<boolean>;
    /**
     * Validates if a pose is suitable for calibration
     */
    private validatePoseForCalibration;
    /**
     * Saves reference pose as calibration data
     */
    private saveCalibrationData;
    /**
     * Loads calibration data from localStorage
     */
    private loadCalibrationData;
    /**
     * Forces recalibration by clearing existing data
     */
    clearCalibrationData(): void;
    /**
     * Generates recommended posture settings based on calibration
     */
    private generateSettingsFromCalibration;
}
declare const postureDetectionService: PostureDetectionService;
export default postureDetectionService;
