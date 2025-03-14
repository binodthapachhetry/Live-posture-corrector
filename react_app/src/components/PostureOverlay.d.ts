import React from 'react';
import { PostureAnalysisResult } from '../types/posture';
interface PostureOverlayProps {
    analysisResult: PostureAnalysisResult | null;
    videoWidth: number;
    videoHeight: number;
    isActive: boolean;
}
declare const PostureOverlay: React.FC<PostureOverlayProps>;
export default PostureOverlay;
