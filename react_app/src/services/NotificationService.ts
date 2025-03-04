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
    console.log("Notification called");                                                                                                                                                            
                                                                                                                                                                                                   
    if (!this.notificationEnabled || !this.hasPermission) {                                                                                                                                        
      console.log("Notification or permission not enabled");                                                                                                                                       
      return;                                                                                                                                                                                      
    }                                                                                                                                                                                              
                                                                                                                                                                                                   
    try {                                                                                                                                                                                          
      console.log("Creating notification");                                                                                                                                                        
      const notification = new Notification('POSTURE ALERT - TEST', {                                                                                                                              
        body: message + ' ' + new Date().toLocaleTimeString(),                                                                                                                                     
        icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50"><circle cx="50" cy="50" r="40" stroke="red" stroke-width="4" fill="yellow" /></svg>',                                                                                                                                                                         
        requireInteraction: true, // This makes the notification stay until user interacts with it                                                                                                 
        silent: false                                                                                                                                                                              
      });                                                                                                                                                                                          
                                                                                                                                                                                                   
      console.log("Created notification");                                                                                                                                                         
                                                                                                                                                                                                   
      notification.onshow = () => console.log("Notification shown at", new Date().toLocaleTimeString());                                                                                           
      notification.onclick = () => console.log("Notification clicked");                                                                                                                            
      notification.onclose = () => console.log("Notification closed");                                                                                                                             
      notification.onerror = (e) => console.error("Notification error:", e);                                                                                                                       
                                                                                                                                                                                                   
      // Keep notification longer                                                                                                                                                                  
      setTimeout(() => {                                                                                                                                                                           
        console.log("Closing notification");                                                                                                                                                       
        notification.close();                                                                                                                                                                      
      }, 10000);                                                                                                                                                                                   
    } catch (error) {                                                                                                                                                                              
      console.error('Error showing notification:', error);                                                                                                                                         
    }                                                                                                                                                                                              
  }      
  public async notifyPostureStatus(status: PostureStatus, duration: number): Promise<void> {
    console.log(`Posture status: ${status}, Duration: ${duration}s, Permission: ${Notification.permission}`);

    if (status === PostureStatus.BAD && duration > 5 && Math.floor(duration) % 10 === 0)
      console.log('Attempting to send notification'); 
      this.notifyBadPosture(`You've had poor posture for ${Math.floor(duration)} seconds. Take a break!`);
    }
  
}

// Create singleton instance
const notificationService = new NotificationService();
export default notificationService;
