export interface PostureAnalysisResult {
    slouchLevel: number;
    shoulderAlignment: number;
    criticalPoints: Array<[number, number]>;
    isGoodPosture: boolean;
    feedback: string;
}
export interface PostureSettings {
    shoulderAlignmentThreshold: number;
    slouchThreshold: number;
    detectionConfidence: number;
    enableNotifications?: boolean;
    notificationInterval?: number;
}
export interface CalibrationData {
    referenceShoulderAlignment: number;
    referenceLeftSlouchAngle: number;
    referenceRightSlouchAngle: number;
    referenceKeypoints: {
        leftShoulder: {
            x: number;
            y: number;
        };
        rightShoulder: {
            x: number;
            y: number;
        };
        leftEar: {
            x: number;
            y: number;
        };
        rightEar: {
            x: number;
            y: number;
        };
        nose: {
            x: number;
            y: number;
        };
    };
}
export declare enum PostureStatus {
    GOOD = "good",
    BAD = "bad",
    UNKNOWN = "unknown"
}
