type VisibilityCallback = (isVisible: boolean) => void;

class TabVisibilityService {
  private callbacks: VisibilityCallback[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private isCurrentlyVisible: boolean = !document.hidden;

  constructor() {
    // Initialize visibility detection
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Setup cross-tab communication if supported
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('posture_corrector_channel');
      this.broadcastChannel.onmessage = this.handleBroadcastMessage;
    }
  }

  private handleVisibilityChange = (): void => {
    this.isCurrentlyVisible = !document.hidden;
    
    // Notify all registered callbacks
    this.callbacks.forEach(callback => callback(this.isCurrentlyVisible));
    
    // Notify other tabs if this tab becomes visible
    if (this.isCurrentlyVisible && this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'TAB_VISIBILITY_CHANGE',
        isVisible: true,
        timestamp: Date.now()
      });
    }
  };

  private handleBroadcastMessage = (event: MessageEvent): void => {
    const { type, isVisible } = event.data;
    
    if (type === 'TAB_VISIBILITY_CHANGE' && isVisible) {
      // Another tab became visible, we can pause processing if needed
      console.log('Another tab is now visible');
    }
  };

  public onVisibilityChange(callback: VisibilityCallback): () => void {
    this.callbacks.push(callback);
    
    // Immediately call with current state
    callback(this.isCurrentlyVisible);
    
    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  public isVisible(): boolean {
    return this.isCurrentlyVisible;
  }

  public cleanup(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }
}

// Create singleton instance
const tabVisibilityService = new TabVisibilityService();
export default tabVisibilityService;
