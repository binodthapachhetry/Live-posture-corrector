import React from 'react';
interface CalibrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCalibrationComplete: () => void;
    settings?: PostureSettings;
}
declare const CalibrationModal: React.FC<CalibrationModalProps>;
export default CalibrationModal;
