import React from 'react';
import { FaUndo, FaRedo } from 'react-icons/fa';
import '../styles/HistoryControls.css';

interface HistoryControlsProps {
  onUndo: () => void;
  onRedo: () => void;
}

const HistoryControls: React.FC<HistoryControlsProps> = ({ onUndo, onRedo }) => {
  return (
    <div className="history-controls">
      <button className="history-button" onClick={onUndo} title="撤销 (Ctrl+Z)">
        <FaUndo />
      </button>
      <button className="history-button" onClick={onRedo} title="重做 (Ctrl+Shift+Z / Ctrl+Y)">
        <FaRedo />
      </button>
    </div>
  );
};

export default HistoryControls;
