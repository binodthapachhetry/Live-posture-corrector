import { useState, useRef, useCallback, useEffect } from 'react';                                                                                      
import Webcam from 'react-webcam'; 
import './CameraFeed.css';                                                                                                                    
                                                                                                                                                        
 type VideoConstraints = {                                                                                                                              
   facingMode: string;                                                                                                                                  
   width: number;                                                                                                                                       
   height: number;                                                                                                                                      
 };                                                                                                                                                     
                                                                                                                                                        
 const CameraFeed = () => {                                                                                                                             
   const [isWebcamOn, setIsWebcamOn] = useState<boolean>(false);                                                                                        
   const [actualResolution, setActualResolution] = useState<{width: number, height: number}>({width: 0, height: 0});
   const [fps, setFps] = useState<number>(0);
   const [aspectWarning, setAspectWarning] = useState<boolean>(false);
   const webcamRef = useRef<Webcam>(null);                                                                                                              
   const canvasRef = useRef<HTMLCanvasElement>(null);                                                                                                   
   const animationFrameRef = useRef<number>(0);   
   const [error, setError] = useState<string | null>(null);                                                                                                       
                                                                                                                                                        
   const [videoConstraints] = useState<MediaTrackConstraints>({                                                                                         
     facingMode: 'user',                                                                                                                                
     width: 640,                                                                                                                                        
     height: 480                                                                                                                                        
   });                                                                                                                                                  
                                                                                                                                                        
   const toggleWebcam = useCallback(() => {                                                                                                             
     setIsWebcamOn(prev => !prev);                                                                                                                      
   }, []);                                                                                                                                              
                                                                                                                                                        
   // Frame processing with proper typing                                                                                                               
   const checkAspectRatio = (w: number, h: number) => {
     const targetAspect = 640/480; // 4:3
     const actualAspect = w/h;
     setAspectWarning(Math.abs(actualAspect - targetAspect) > 0.05);
   };

   useEffect(() => {                                                                                                                                    
     let frameCount = 0;
     const fpsInterval = setInterval(() => {
       setFps(frameCount);
       frameCount = 0;
     }, 1000);

     const processFrame = () => {                                                                                                                       
       frameCount++;
       const video = webcamRef.current?.video;                                                                                                          
       const canvas = canvasRef.current;                                                                                                                
                                                                                                                                                        
       if (video && canvas) {                                                                                                                           
         const ctx = canvas.getContext('2d');                                                                                                           
         if (!ctx) return;                                                                                                                              
                                                                                                                                                        
         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);                                                                                       
         const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);                                                                         
         analyzePosture(imageData);

         if (video.videoWidth !== actualResolution.width || video.videoHeight !== actualResolution.height) {
           setActualResolution({width: video.videoWidth, height: video.videoHeight});
           checkAspectRatio(video.videoWidth, video.videoHeight);
         }
       }                                                                                                                                                
       animationFrameRef.current = requestAnimationFrame(processFrame);                                                                                 
     };                                                                                                                                                 
                                                                                                                                                        
     if (isWebcamOn) {                                                                                                                                  
       processFrame();                                                                                                                                  
     }                                                                                                                                                  
                                                                                                                                                        
     return () => {
       clearInterval(fpsInterval);
       cancelAnimationFrame(animationFrameRef.current);
     };                                                                      
   }, [isWebcamOn]);                                                                                                                                    
                                                                                                                                                        
   return (

     <div className="camera-feed">

      {isWebcamOn && (                                                                                                                                 
       <Webcam                                                                                                                                        
         ref={webcamRef}                                                                                                                              
         audio={false}                                                                                                                                
         videoConstraints={videoConstraints}                                                                                                          
         className="webcam-preview"                                                                                                                   
         onUserMediaError={(err) => console.error('Webcam error:', err)}                                                                              
       />                                                                                                                                             
     )}                                                                                                                                               
     <button onClick={toggleWebcam} className="webcam-toggle">                                                                                        
       {isWebcamOn ? 'Stop Webcam' : 'Start Webcam'}                                                                                                  
     </button> 

       <canvas ref={canvasRef} width={640} height={480} hidden />
       <div className="camera-metrics">
         <div className="metric">
           📏 Resolution: {actualResolution.width}x{actualResolution.height}
           {aspectWarning && <span className="metric-warning"> (Aspect mismatch!)</span>}
         </div>
         <div className="metric">
           🎞️ FPS: {fps}
           {fps > 0 && fps < 24 && <span className="metric-warning"> (Low frame rate)</span>}
         </div>
         <div className="metric">
           ⚙️ Target: 640x480 @ 30FPS
         </div>
       </div>
       {/* Rest of component remains same but with TypeScript types */} 

     </div>                                                                                                                                             
   );                                                                                                                                                   
 };

 /* Add CSS styles */
 const styles = `
   .camera-metrics {
     margin: 12px 0;
     padding: 8px;
     background: #f8f9fa;
     border-radius: 4px;
   }

   .metric {
     font-family: monospace;
     font-size: 14px;
     margin: 4px 0;
   }

   .metric-warning {
     color: #dc3545;
     font-weight: bold;
     margin-left: 8px;
   }
 `;

 const styleSheet = document.createElement("style");
 styleSheet.innerText = styles;
 document.head.appendChild(styleSheet);
                                                                                                                                                        
 interface PostureAnalysisResult {                                                                                                                      
   slouchLevel: number;                                                                                                                                 
   shoulderAlignment: number;                                                                                                                           
   criticalPoints: Array<[number, number]>;                                                                                                             
 }                                                                                                                                                      
                                                                                                                                                        
 // Example typed analysis function                                                                                                                     
 const analyzePosture = (frame: ImageData): PostureAnalysisResult => {                                                                                  
   // Implementation would use your pose estimation model                                                                                               
   return {                                                                                                                                             
     slouchLevel: 0,                                                                                                                                    
     shoulderAlignment: 0,                                                                                                                              
     criticalPoints: []                                                                                                                                 
   };                                                                                                                                                   
 };                                                                                                                                                     
