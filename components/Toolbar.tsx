import React from 'react';
import { CODES } from '../constants';

interface ToolbarProps {
  onApplyCode: (code: string) => void;
  readOnly?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onApplyCode, readOnly = false }) => {
  return (
    <div className={`sticky top-0 z-20 bg-white shadow-md border-b border-gray-200 p-2 overflow-x-auto flex gap-2 no-scrollbar ${readOnly ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
      {/* Eraser / Delete Button */}
      <button
        onClick={() => !readOnly && onApplyCode('')}
        disabled={readOnly}
        className="flex-shrink-0 min-w-[3rem] h-10 px-3 rounded shadow-sm border-2 border-dashed border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-600 text-gray-500 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-1 group"
        title="Borrar selección (Tecla: Supr/Backspace)"
      >
        <span className="material-icons-round text-lg group-hover:scale-110 transition-transform">backspace</span>
        <span className="text-[10px] font-normal hidden sm:inline">BORRAR</span>
      </button>

      <div className="w-px bg-gray-300 mx-1 h-8 self-center"></div>

      {CODES.map(code => (
        <button
          key={code.code}
          onClick={() => !readOnly && onApplyCode(code.code)}
          disabled={readOnly}
          className="flex-shrink-0 min-w-[3rem] h-10 px-3 rounded shadow-sm border border-gray-300 font-bold text-sm transition-transform active:scale-95 flex items-center justify-center gap-1"
          style={{ backgroundColor: code.bgColor, color: code.textColor }}
          title={`${code.name} (Tecla: ${code.key.toUpperCase()})`}
        >
          <span>{code.code}</span>
          <span className="text-[10px] opacity-70 font-normal hidden sm:inline">{code.key.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
};

export default Toolbar;