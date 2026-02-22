import React, { useState, useEffect } from 'react';

interface ExtraHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hours: number) => void;
  currentHours: number;
  empName: string;
  day: number;
}

const ExtraHoursModal: React.FC<ExtraHoursModalProps> = ({ isOpen, onClose, onSave, currentHours, empName, day }) => {
  const [value, setValue] = useState<string>(String(currentHours));

  useEffect(() => {
    if (isOpen) setValue(String(currentHours));
  }, [isOpen, currentHours]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
        <div className="p-4 bg-orange-600 text-white flex justify-between items-center">
          <h3 className="font-bold">⏱️ Horas Extras (Día {day})</h3>
          <button onClick={onClose} className="text-white hover:text-orange-200 text-xl">&times;</button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">Añadir horas extras para <strong>{empName}</strong>.</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              autoFocus
              className="w-full p-3 border-2 border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-center text-2xl font-bold"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSave(parseFloat(value) || 0)}
            />
            <span className="text-lg font-medium text-gray-500">Horas</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
             {[0, 1, 2, 4].map(h => (
               <button 
                key={h}
                onClick={() => setValue(String(h))}
                className={`p-2 rounded border text-xs font-bold transition-colors ${value === String(h) ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 hover:bg-orange-100 border-gray-200'}`}
               >
                 {h === 0 ? 'Borrar' : `+${h}h`}
               </button>
             ))}
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={() => onSave(parseFloat(value) || 0)} className="flex-1 py-2 bg-orange-600 text-white font-bold rounded shadow hover:bg-orange-700">Guardar</button>
        </div>
      </div>
    </div>
  );
};

export default ExtraHoursModal;