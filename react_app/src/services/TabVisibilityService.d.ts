type VisibilityCallback = (isVisible: boolean) => void;
declare class TabVisibilityService {
    private callbacks;
    private broadcastChannel;
    private isCurrentlyVisible;
    constructor();
    private handleVisibilityChange;
    private handleBroadcastMessage;
    onVisibilityChange(callback: VisibilityCallback): () => void;
    isVisible(): boolean;
    cleanup(): void;
}
declare const tabVisibilityService: TabVisibilityService;
export default tabVisibilityService;
