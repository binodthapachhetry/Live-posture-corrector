import { PostureStatus } from '../types/posture';

class NotificationService {
  private hasPermission: boolean = false;
  private lastNotificationTime: number = 0;
  private notificationCooldown: number = 10000;
  private notificationEnabled: boolean = true;
  private notificationChannel: BroadcastChannel | null = null;
  private tabId: string = crypto.randomUUID();
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.checkPermission();
    this.setupCrossTabSync();
    this.registerServiceWorker();
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
  
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        this.swRegistration = registration;
        console.log('Service Worker registered successfully', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
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
    
    // Check cooldown
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      console.log('Notification on cooldown, skipping');
      return;
    }
    
    // Update last notification time
    this.lastNotificationTime = now;
    this.broadcastNotification();
    
    // // Always show in-app notification regardless of tab visibility
    // this.showInAppNotification(message);
    
    console.log("Attempting to show system notification...");
    console.log("Notification permission:", Notification.permission);
    console.log("Service worker registration:", this.swRegistration ? "Available" : "Not available");
                                                                                                                                                                                                   
    // Try system notification if we have permission
    if (Notification.permission === 'granted') {
      try {                                                                                                                                                                                          
        console.log("Creating system notification");
        
        // Create a unique notification ID to prevent duplicates
        const notificationId = `posture-${Date.now()}`;
        
        // Play a sound to alert the user (before creating notification)
        try {
          console.log("Playing sound before creating notification.");
          const audio = new Audio('data:audio/wav;base64,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');
          audio.play().catch(e => console.log('Could not play notification sound', e));
        } catch (e) {
          console.log('Could not play notification sound', e);
        }
        
        // // Create the notification with options that maximize visibility
        // const notification = new Notification('Posture Alert', {                                                                                                                              
        //   body: message + ' ' + new Date().toLocaleTimeString(),                                                                                                                                     
        //   icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50"><circle cx="50" cy="50" r="40" stroke="red" stroke-width="4" fill="yellow" /></svg>',                                                                                                                                                                         
        //   requireInteraction: true, // This makes the notification stay until user interacts with it                                                                                                 
        //   tag: notificationId, // Use unique ID to prevent replacing previous notifications
        //   silent: false, // Allow system sound
        //   vibrate: [200, 100, 200], // Vibration pattern for mobile devices
        //   renotify: true, // Make sound/vibration even if using same tag
        //   badge: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50"><circle cx="50" cy="50" r="40" stroke="red" stroke-width="4" fill="yellow" /></svg>'
        // });   
        
        const notification = new Notification('Posture Alert', {                                                                                                                              
          body: message,                                                                                                                                     
          requireInteraction: true,                                                                                                
          });  
        
        console.log("Created system notification");                                                                                                                                                         
                                                                                                                                                                                                     
        notification.onshow = () => console.log("Notification shown at", new Date().toLocaleTimeString());                                                                                           
        notification.onclick = () => {
          console.log("Notification clicked");
          window.focus(); // Focus the window when notification is clicked
          notification.close();
        };                                                                                                                            
        notification.onclose = () => console.log("Notification closed at ", new Date().toLocaleTimeString());                                                                                                                             
        notification.onerror = (e) => console.error("Notification error:", e);                                                                                                                       
                                                                                                                                                                                                     
        // Keep notification longer                                                                                                                                                                  
        setTimeout(() => {                                                                                                                                                                           
          console.log("Closing notification");                                                                                                                                                       
          notification.close();                                                                                                                                                                      
        }, 5000); // Increased to 5 seconds                                                                                                                                                                                   
      } catch (error) {                                                                                                                                                                              
        console.error('Error showing system notification:', error);
      }
    } else {
      console.log('System notification permission not granted:', Notification.permission);
      this.requestPermission();
    }                                                                                                                                                                                              
  }
  
  private showInAppNotification(message: string): void {
    // Create a div for the notification
    const notificationDiv = document.createElement('div');
    notificationDiv.style.position = 'fixed';
    notificationDiv.style.top = '20px';
    notificationDiv.style.right = '20px';
    notificationDiv.style.backgroundColor = '#ff4d4f';
    notificationDiv.style.color = 'white';
    notificationDiv.style.padding = '15px 20px';
    notificationDiv.style.borderRadius = '5px';
    notificationDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notificationDiv.style.zIndex = '9999';
    notificationDiv.style.maxWidth = '300px';
    notificationDiv.style.animation = 'fadeIn 0.3s';
    
    // Add content
    notificationDiv.innerHTML = `
      <div style="display: flex; align-items: center;">
        <div style="font-size: 24px; margin-right: 10px;">⚠️</div>
        <div>
          <div style="font-weight: bold; margin-bottom: 5px;">Posture Alert</div>
          <div>${message}</div>
        </div>
      </div>
      <button style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
    `;
    
    // Add to document
    document.body.appendChild(notificationDiv);
    
    // Add close button functionality
    const closeButton = notificationDiv.querySelector('button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        if (document.body.contains(notificationDiv)) {
          document.body.removeChild(notificationDiv);
        }
      });
    }
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.body.contains(notificationDiv)) {
        document.body.removeChild(notificationDiv);
      }
    }, 10000);
    
    // Add CSS animation
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    
    // Play a sound to alert the user
    try {
      const audio = new Audio('data:audio/wav;base64,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');
      audio.play();
    } catch (e) {
      console.log('Could not play notification sound', e);
    }
  }
  public async notifyPostureStatus(status: PostureStatus, duration: number): Promise<void> {
    console.log(`Posture status: ${status}, Duration: ${duration}s, Permission: ${Notification.permission}`);

    // For testing purposes, we'll show notifications regardless of tab visibility
    const isTabVisible = document.visibilityState === 'visible';
    
    // Notify more frequently at first, then less frequently as time goes on
    if (status === PostureStatus.BAD) {
      if (duration > 5) {
        // First notification after 5 seconds
        if (Math.floor(duration) === 5) {
          console.log('Sending initial notification');
          this.notifyBadPosture(`Poor posture detected! Please sit up straight.`);
        }
        // Then every 10 seconds for the first minute
        else if (duration < 60 && Math.floor(duration) % 10 === 0) {
          console.log('Sending early notification');
          this.notifyBadPosture(`You've had poor posture for ${Math.floor(duration)} seconds. Please correct it!`);
        }
        // Then every 30 seconds after the first minute
        else if (duration >= 60 && Math.floor(duration) % 30 === 0) {
          console.log('Sending periodic notification');
          this.notifyBadPosture(`You've had poor posture for ${Math.floor(duration / 60)} minute${duration >= 120 ? 's' : ''}. Take a break!`);
        }
      }
    }
  }
  
  public async ensurePermissions(): Promise<void> {
    // Register service worker first
    await this.registerServiceWorker();
    
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      console.log('Requesting notification permission on startup');
      try {
        const permission = await Notification.requestPermission();
        this.hasPermission = permission === 'granted';
        
        if (permission === 'granted') {
          // Send a test notification to verify it works
          if (this.swRegistration) {
            // Use service worker if available
            this.swRegistration.showNotification('Posture App Notifications Enabled', {
              body: 'You will now receive alerts when your posture needs correction.',
              icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50"><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="lightgreen" /></svg>'
            });
          } else {
            // Fall back to regular notification
            const notification = new Notification('Posture App Notifications Enabled', {
              body: 'You will now receive alerts when your posture needs correction.',
              icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50"><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="lightgreen" /></svg>'
            });
            
            setTimeout(() => notification.close(), 5000);
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();
export default notificationService;
