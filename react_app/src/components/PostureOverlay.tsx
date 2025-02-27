import React, { useEffect, useRef } from 'react';
import { PostureAnalysisResult, PostureStatus } from '../types/posture';

interface PostureOverlayProps {
  analysisResult: PostureAnalysisResult | null;
  videoWidth: number;
  videoHeight: number;
  isActive: boolean;
}

const PostureOverlay: React.FC<PostureOverlayProps> = ({ 
  analysisResult, 
  videoWidth, 
  videoHeight,
  isActive
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !analysisResult || !isActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw critical points and connections
    if (analysisResult.criticalPoints.length > 0) {
      drawPostureVisualization(ctx, analysisResult, videoWidth, videoHeight);
    }
    
    // Draw feedback text
    drawFeedbackText(ctx, analysisResult, videoWidth, videoHeight);
    
  }, [analysisResult, videoWidth, videoHeight, isActive]);
  
  if (!isActive) return null;
  
  return (
    <canvas 
      ref={canvasRef}
      className="posture-overlay"
      width={videoWidth}
      height={videoHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

// Helper function to draw posture visualization
function drawPostureVisualization(
  ctx: CanvasRenderingContext2D,
  result: PostureAnalysisResult,
  width: number,
  height: number
): void {
  const { criticalPoints, isGoodPosture } = result;
  
  // Set styles based on posture quality
  ctx.strokeStyle = isGoodPosture ? '#4CAF50' : '#F44336';
  ctx.fillStyle = isGoodPosture ? '#4CAF50' : '#F44336';
  ctx.lineWidth = 2;
  
  // Draw points
  criticalPoints.forEach(point => {
    const [x, y] = point;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });
  
  // Draw connections if we have enough points
  if (criticalPoints.length >= 5) {
    // Connect shoulders
    ctx.beginPath();
    ctx.moveTo(criticalPoints[0][0], criticalPoints[0][1]); // left shoulder
    ctx.lineTo(criticalPoints[1][0], criticalPoints[1][1]); // right shoulder
    ctx.stroke();
    
    // Connect ears to shoulders
    ctx.beginPath();
    ctx.moveTo(criticalPoints[2][0], criticalPoints[2][1]); // left ear
    ctx.lineTo(criticalPoints[0][0], criticalPoints[0][1]); // left shoulder
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(criticalPoints[3][0], criticalPoints[3][1]); // right ear
    ctx.lineTo(criticalPoints[1][0], criticalPoints[1][1]); // right shoulder
    ctx.stroke();
    
    // Draw vertical reference lines for posture
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#AAAAAA';
    
    // Vertical line from left shoulder
    ctx.beginPath();
    ctx.moveTo(criticalPoints[0][0], 0);
    ctx.lineTo(criticalPoints[0][0], height);
    ctx.stroke();
    
    // Vertical line from right shoulder
    ctx.beginPath();
    ctx.moveTo(criticalPoints[1][0], 0);
    ctx.lineTo(criticalPoints[1][0], height);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }
}

// Helper function to draw feedback text
function drawFeedbackText(
  ctx: CanvasRenderingContext2D,
  result: PostureAnalysisResult,
  width: number,
  height: number
): void {
  const { feedback, isGoodPosture } = result;
  
  // Set text styles
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Create background for text
  const textWidth = ctx.measureText(feedback).width;
  const padding = 10;
  const rectWidth = textWidth + padding * 2;
  const rectHeight = 30;
  const rectX = width / 2 - rectWidth / 2;
  const rectY = 10;
  
  // Draw background
  ctx.fillStyle = isGoodPosture ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
  ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
  
  // Draw text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(feedback, width / 2, rectY + padding);
}

export default PostureOverlay;
