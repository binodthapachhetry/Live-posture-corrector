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
  enableNotifications: boolean;
  notificationInterval: number; // in milliseconds
}

export enum PostureStatus {
  GOOD = 'good',
  BAD = 'bad',
  UNKNOWN = 'unknown'
}
