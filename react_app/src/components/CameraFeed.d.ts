import './CameraFeed.css';
interface CameraFeedProps {
    onCalibrationNeeded?: () => void;
    isCalibrated: boolean;
}
declare const CameraFeed: ({ onCalibrationNeeded, isCalibrated }: CameraFeedProps) => import("react/jsx-runtime").JSX.Element;
export default CameraFeed;
