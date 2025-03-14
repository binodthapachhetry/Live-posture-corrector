import { PostureStatus } from '../types/posture';
declare class NotificationService {
    private hasPermission;
    private lastNotificationTime;
    private notificationCooldown;
    private notificationEnabled;
    private notificationChannel;
    private tabId;
    private swRegistration;
    constructor();
    private setupCrossTabSync;
    private registerServiceWorker;
    private broadcastNotification;
    private checkPermission;
    requestPermission(): Promise<boolean>;
    setEnabled(enabled: boolean): void;
    setCooldown(milliseconds: number): void;
    checkNotificationStatus(): void;
    notifyBadPosture(message?: string): void;
    notifyPostureStatus(status: PostureStatus, duration: number): Promise<void>;
    ensurePermissions(): Promise<void>;
}
declare const notificationService: NotificationService;
export default notificationService;
