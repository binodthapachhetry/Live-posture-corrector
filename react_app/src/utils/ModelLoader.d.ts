interface ModelLoaderConfig {
    url: string;
    dst: number;
    size_mb: number;
    cbProgress: (progress: number) => void;
    cbReady: () => void;
    cbCancel: (error: string) => void;
}
interface ModelHandle {
    unloadModel: () => void;
}
export declare function loadRemote(config: ModelLoaderConfig): ModelHandle;
export declare function loadPoseModel(): Promise<ModelHandle>;
export {};
