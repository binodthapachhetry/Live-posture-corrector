import { PostureStatus } from '../types/posture';

class NotificationService {
  private hasPermission: boolean = false;
  private lastNotificationTime: number = 0;
  private notificationCooldown: number = 60000; // 1 minute cooldown between notifications
  private notificationEnabled: boolean = true;

  constructor() {
    this.checkPermission();
  }

  private async checkPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.notificationEnabled = enabled;
  }

  public setCooldown(milliseconds: number): void {
    this.notificationCooldown = milliseconds;
  }

  public notifyBadPosture(message: string = 'Your posture needs correction!'): void {
    if (!this.notificationEnabled || !this.hasPermission) {
      return;
    }

    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return; // Still in cooldown period
    }

    this.lastNotificationTime = now;

    try {
      const notification = new Notification('Posture Alert', {
        body: message,
        icon: '/posture-icon.png', // You'll need to add this icon
        silent: false
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  public async notifyPostureStatus(status: PostureStatus, duration: number): Promise<void> {
    if (status === PostureStatus.BAD && duration > 30) { // Only notify if bad posture for > 30 seconds
      this.notifyBadPosture(`You've had poor posture for ${Math.floor(duration)} seconds. Take a break!`);
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();
export default notificationService;
