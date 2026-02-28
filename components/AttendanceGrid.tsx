import React, { useRef, useState, useEffect } from 'react';
import { Employee, SelectionState } from '../types';
import { CODES, SC_CODE } from '../constants';
import { Holiday } from '../services/storageService';

interface AttendanceGridProps {
  year: number;
  month: number;
  employees: Employee[];
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
  onCellClick: (empId: string, day: number, ctrlKey: boolean, shiftKey: boolean) => void;
  onCellDoubleClick: (empId: string, day: number) => void;
  onEditEmployee: (id: string) => void;
  readOnly?: boolean;
  holidays?: Holiday[];
}

const AttendanceGrid: React.FC<AttendanceGridProps> = ({ 
  year, 
  month, 
  employees, 
  selection, 
  setSelection, 
  onCellClick,
  onCellDoubleClick,
  onEditEmployee,
  readOnly = false,
  holidays = []
}) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  const isMouseDown = useRef(false);

  const getCellStatus = (emp: Employee, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentDate = new Date(dateStr);
    const alta = new Date(emp.fechaAlta);
    currentDate.setHours(0, 0, 0, 0);
    alta.setHours(0, 0, 0, 0);
    
    if (currentDate < alta) return 'SC';
    if (emp.fechaBaja) {
      const baja = new Date(emp.fechaBaja);
      baja.setHours(0, 0, 0, 0);
      if (currentDate > baja) return 'SC';
    }
    return emp.asistencia[String(day)] || '';
  };

  const isTrialDay = (emp: Employee, day: number) => {
    if (!emp.periodoPrueba.activo || !emp.periodoPrueba.fechaFin) return false;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr <= emp.periodoPrueba.fechaFin && dateStr >= emp.fechaAlta;
  };

  const getDayOfWeek = (day: number) => new Date(year, month - 1, day).getDay();

  const getCodeStyle = (codeStr: string) => {
    if (codeStr === 'SC') return { bg: SC_CODE.bgColor, text: SC_CODE.textColor };
    const found = CODES.find(c => c.code === codeStr);
    return found ? { bg: found.bgColor, text: found.textColor } : { bg: 'white', text: 'black' };
  };

  const handleMouseDown = (empId: string, day: number, e: React.MouseEvent) => {
    if (readOnly) return;
    const emp = employees.find(em => em.id === empId);
    if (!emp || getCellStatus(emp, day) === 'SC') return;
    isMouseDown.current = true;
    onCellClick(empId, day, e.ctrlKey, e.shiftKey);
  };

  const handleMouseEnter = (empId: string, day: number) => {
    if (isMouseDown.current && !readOnly) {
      onCellClick(empId, day, false, true);
    }
  };

  const calculateRatio = (day: number) => {
    let total = 0;
    employees.forEach(emp => {
      const status = getCellStatus(emp, day);
      if (status === 'SC') return;
      const code = CODES.find(c => c.code === status);
      if (code) total += code.ratio;
    });
    return total % 1 === 0 ? total : total.toFixed(1);
  };

  const countCode = (emp: Employee, targetCode: string) => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (getCellStatus(emp, d) === targetCode) count++;
    }
    return count;
  };

  const sumHE = (emp: Employee) => {
    return Object.values(emp.horasExtras || {}).reduce((acc, val) => acc + (val || 0), 0);
  };

  const getHolidayForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => h.date === dateStr);
  };

  useEffect(() => {
    const up = () => { isMouseDown.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  return (
    <div className={`flex flex-col h-full bg-white select-none ${readOnly ? 'opacity-90' : ''}`}>
      <div className="flex-1 overflow-auto relative">
        <table className="border-collapse w-full min-w-max">
          <thead className="sticky top-0 z-40 bg-gray-100 shadow-sm">
            <tr>
              <th className="sticky left-0 z-50 bg-gray-50 p-2 border border-gray-300 w-[200px] min-w-[200px] text-left text-sm font-bold text-gray-700">Empleado</th>
              {days.map(d => {
                const dow = getDayOfWeek(d);
                const isWeekend = dow === 0 || dow === 6;
                const holiday = getHolidayForDay(d);
                return (
                  <th key={d} className={`border border-gray-300 w-[42px] min-w-[42px] text-center relative ${dow === 6 ? 'bg-blue-50' : dow === 0 ? 'bg-blue-100' : 'bg-white'}`} title={holiday ? holiday.name : ''}>
                    <div className="text-xs font-bold text-gray-800">{d}</div>
                    <div className={`text-[10px] font-medium ${isWeekend ? 'text-blue-800' : 'text-gray-500'}`}>{weekDays[dow]}</div>
                    {holiday && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-bl-sm" title={holiday.name}></div>
                    )}
                  </th>
                );
              })}
              <th className="sticky right-[135px] z-50 bg-gray-100 border border-gray-300 w-[45px] text-center text-xs font-bold border-l-2 border-l-gray-300">LT</th>
              <th className="sticky right-[90px] z-50 bg-gray-100 border border-gray-300 w-[45px] text-center text-xs font-bold">L</th>
              <th className="sticky right-[45px] z-50 bg-gray-100 border border-gray-300 w-[45px] text-center text-xs font-bold">V</th>
              <th className="sticky right-0 z-50 bg-orange-100 border border-gray-300 w-[45px] text-center text-xs font-bold text-orange-800">HE</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50 h-[35px]">
                <td className="sticky left-0 z-30 bg-white p-2 border border-gray-300 w-[200px] text-sm font-medium text-gray-800 truncate border-r-2 border-r-gray-300 cursor-pointer hover:bg-gray-100"
                    onClick={() => onEditEmployee(emp.id)}>
                  <div className="flex items-center gap-2">
                    {emp.periodoPrueba.activo && <span title="Periodo de Prueba">⏱️</span>}
                    <span className="truncate">{emp.nombre}</span>
                  </div>
                </td>
                {days.map(d => {
                  const status = getCellStatus(emp, d);
                  const isSC = status === 'SC';
                  const style = getCodeStyle(status);
                  const isSelected = selection.selectedCells.has(`${emp.id}_${d}`);
                  const he = emp.horasExtras?.[String(d)] || 0;

                  return (
                    <td
                      key={d}
                      onMouseDown={(e) => handleMouseDown(emp.id, d, e)}
                      onMouseEnter={() => handleMouseEnter(emp.id, d)}
                      onDoubleClick={() => !isSC && onCellDoubleClick(emp.id, d)}
                      className={`border border-gray-200 text-center text-xs font-bold transition-all duration-75 relative ${isSC ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${!isSC && isTrialDay(emp, d) ? 'border-b-4 border-b-orange-400' : ''}`}
                      style={{ backgroundColor: style.bg, color: style.text, boxShadow: isSelected ? 'inset 0 0 0 3px #2563EB' : 'none', zIndex: isSelected ? 20 : 'auto' }}
                    >
                      {!isSC && status}
                      {!isSC && he > 0 && <span className="he-badge">{he}</span>}
                    </td>
                  );
                })}
                <td className="sticky right-[135px] z-30 bg-gray-50 border border-gray-300 text-center text-xs font-bold border-l-2 border-l-gray-300">{countCode(emp, 'LT')}</td>
                <td className="sticky right-[90px] z-30 bg-gray-50 border border-gray-300 text-center text-xs font-bold">{countCode(emp, 'L')}</td>
                <td className="sticky right-[45px] z-30 bg-gray-50 border border-gray-300 text-center text-xs font-bold">{countCode(emp, 'V')}</td>
                <td className="sticky right-0 z-30 bg-orange-50 border border-gray-300 text-center text-xs font-bold text-orange-900">{sumHE(emp)}</td>
              </tr>
            ))}
            <tr className="sticky bottom-0 z-40 bg-gray-800 text-white font-bold h-[35px]">
              <td className="sticky left-0 z-50 bg-gray-800 border border-gray-700 text-right pr-4 text-sm">RATIO</td>
              {days.map(d => <td key={d} className="border border-gray-700 text-center text-xs">{calculateRatio(d)}</td>)}
              <td colSpan={4} className="bg-gray-800 border-l-2 border-l-gray-600"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceGrid;