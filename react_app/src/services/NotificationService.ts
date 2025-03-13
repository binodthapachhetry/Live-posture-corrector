import { PostureStatus } from '../types/posture';

class NotificationService {
  private hasPermission: boolean = false;
  private lastNotificationTime: number = 0;
  private notificationCooldown: number = 60000;
  private notificationEnabled: boolean = true;
  private notificationChannel: BroadcastChannel | null = null;
  private tabId: string = crypto.randomUUID();

  constructor() {
    this.checkPermission();
    this.setupCrossTabSync();
  }

  private setupCrossTabSync() {
    if ('BroadcastChannel' in window) {
      this.notificationChannel = new BroadcastChannel('posture-notifications');
      this.notificationChannel.onmessage = (event) => {
        if (event.data.tabId !== this.tabId && event.data.type === 'notification') {
          this.lastNotificationTime = event.data.timestamp;
        }
      };
    }
  }

  private broadcastNotification() {
    if (this.notificationChannel) {
      this.notificationChannel.postMessage({
        type: 'notification',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    }
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

  public checkNotificationStatus(): void {
    console.log('Notification Status Check:');
    console.log('- Permission:', Notification.permission);
    console.log('- App Enabled:', this.notificationEnabled);
    console.log('- Has Permission:', this.hasPermission);
    console.log('- Last Notification:', new Date(this.lastNotificationTime).toLocaleTimeString());
    console.log('- Cooldown:', this.notificationCooldown / 1000, 'seconds');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('- Browser Support: NOT SUPPORTED');
    } else {
      console.log('- Browser Support: Supported');
    }
    
    // Check system-level permissions if possible
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then(status => {
          console.log('- System Permission:', status.state);
        })
        .catch(err => {
          console.log('- System Permission: Unable to check', err);
        });
    }
  }

  public notifyBadPosture(message: string = 'Your posture needs correction!'): void {                                                                                                              
    console.log("Notification called");                                                                                                                                                            
                                                                                                                                                                                                   
    if (!this.notificationEnabled) {                                                                                                                                                        
      console.log("Notifications are disabled in app settings");                                                                                                                                       
      return;                                                                                                                                                                                      
    }                                                                                                                                                                                              
    
    // Check if we have permission
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted:', Notification.permission);
      this.requestPermission();
      return;
    }
    
    // Check cooldown
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      console.log('Notification on cooldown, skipping');
      return;
    }
    
    // Update last notification time
    this.lastNotificationTime = now;
    this.broadcastNotification();
                                                                                                                                                                                                   
    try {                                                                                                                                                                                          
      console.log("Creating notification");                                                                                                                                                        
      const notification = new Notification('Posture Alert', {                                                                                                                              
        body: message + ' ' + new Date().toLocaleTimeString(),                                                                                                                                     
        icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50"><circle cx="50" cy="50" r="40" stroke="red" stroke-width="4" fill="yellow" /></svg>',                                                                                                                                                                         
        requireInteraction: true, // This makes the notification stay until user interacts with it                                                                                                 
        tag: 'posture-notification', // Tag to replace existing notifications
        silent: false,                                                                                                                                                                             
        vibrate: [200, 100, 200] // Vibration pattern for mobile devices
      });                                                                                                                                                                                          
                                                                                                                                                                                                   
      console.log("Created notification");                                                                                                                                                         
                                                                                                                                                                                                   
      notification.onshow = () => console.log("Notification shown at", new Date().toLocaleTimeString());                                                                                           
      notification.onclick = () => {
        console.log("Notification clicked");
        window.focus(); // Focus the window when notification is clicked
        notification.close();
      };                                                                                                                            
      notification.onclose = () => console.log("Notification closed");                                                                                                                             
      notification.onerror = (e) => console.error("Notification error:", e);                                                                                                                       
                                                                                                                                                                                                   
      // Keep notification longer                                                                                                                                                                  
      setTimeout(() => {                                                                                                                                                                           
        console.log("Closing notification");                                                                                                                                                       
        notification.close();                                                                                                                                                                      
      }, 30000); // Increased to 30 seconds                                                                                                                                                                                   
    } catch (error) {                                                                                                                                                                              
      console.error('Error showing notification:', error);                                                                                                                                         
    }                                                                                                                                                                                              
  }      
  public async notifyPostureStatus(status: PostureStatus, duration: number): Promise<void> {
    console.log(`Posture status: ${status}, Duration: ${duration}s, Permission: ${Notification.permission}`);

    if (status === PostureStatus.BAD && duration > 5 && Math.floor(duration) % 10 === 0) {
      console.log('Attempting to send notification'); 
      this.notifyBadPosture(`You've had poor posture for ${Math.floor(duration)} seconds. Take a break!`);
    }
  
}

// Create singleton instance
const notificationService = new NotificationService();
export default notificationService;
