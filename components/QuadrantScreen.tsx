import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppData, Employee, SelectionState } from '../types';
import { CODES, MONTHS } from '../constants';
import AttendanceGrid from './AttendanceGrid';
import Toolbar from './Toolbar';
import EmployeeModal from './EmployeeModal';
import ManualModal from './ManualModal';
import ExtraHoursModal from './ExtraHoursModal';
import { saveToStorage, syncEmployeeAcrossMonths, deleteEmployeeAcrossMonths, loadPreviousMonthData, getHolidays, Holiday } from '../services/storageService';
import { generateExcelReport, generatePDFReport, sharePDFReport } from '../services/reportService';

interface QuadrantScreenProps {
  data: AppData;
  onBack: () => void;
  onUpdateData: (newData: AppData) => void;
  onChangeMonth: (year: number, month: number) => void;
}

const QuadrantScreen: React.FC<QuadrantScreenProps> = ({ data, onBack, onUpdateData, onChangeMonth }) => {
  // Initialize with props, but update when props change (CRITICAL FIX)
  const [employees, setEmployees] = useState<Employee[]>(data.empleados);
  const [selection, setSelection] = useState<SelectionState>({ start: null, current: null, selectedCells: new Set() });
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [heModal, setHeModal] = useState<{ open: boolean; empId: string; day: number; val: number }>({ open: false, empId: '', day: 0, val: 0 });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Sync state with props when month changes
  useEffect(() => {
    setEmployees(data.empleados);
    setSelection({ start: null, current: null, selectedCells: new Set() });
    loadHolidays();
  }, [data]);

  const loadHolidays = async () => {
    const list = await getHolidays(data.metadata.año);
    setHolidays(list);
  };

  const isMonthLocked = useMemo(() => {
    if (data.metadata.isLocked !== undefined) {
      return data.metadata.isLocked;
    }
    const { año, mes } = data.metadata;
    const lastDayOfMonth = new Date(año, mes, 0); 
    const lockDate = new Date(lastDayOfMonth);
    lockDate.setDate(lockDate.getDate() + 7);
    lockDate.setHours(23, 59, 59, 999);
    return new Date() > lockDate;
  }, [data.metadata]);

  // Auto-save effect
  useEffect(() => {
    // Avoid saving if employees matches data.empleados exactly (prevents loop on initial load)
    if (JSON.stringify(employees) === JSON.stringify(data.empleados)) return;

    const newData = { ...data, empleados: employees };
    setSaveStatus('saving');
    
    const timeout = setTimeout(async () => {
        await saveToStorage(newData);
        setSaveStatus('saved');
        onUpdateData(newData); // Update parent state to keep sync
        setTimeout(() => setSaveStatus(null), 2000);
    }, 800);
    
    return () => clearTimeout(timeout);
  }, [employees]); // Dependency on employees

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyCode = (code: string) => {
    if (isMonthLocked) return;
    if (selection.selectedCells.size === 0) return;
    
    setEmployees(prev => prev.map(emp => {
      const newAsistencia = { ...emp.asistencia };
      let modified = false;
      for (let d = 1; d <= 31; d++) {
        if (selection.selectedCells.has(`${emp.id}_${d}`)) {
           if (code === '') {
             // If clearing, delete the key to keep object clean
             if (newAsistencia[String(d)]) {
               delete newAsistencia[String(d)];
               modified = true;
             }
           } else {
             newAsistencia[String(d)] = code;
             modified = true;
           }
        }
      }
      return modified ? { ...emp, asistencia: newAsistencia } : emp;
    }));
  };

  const handleKeydown = useCallback((e: KeyboardEvent) => {
    if (showEmpModal || showManual || heModal.open || (e.target as HTMLElement).tagName === 'INPUT') return;
    if (isMonthLocked) return;
    
    // Handle Delete / Backspace for clearing cells
    if (e.key === 'Delete' || e.key === 'Backspace') {
      handleApplyCode('');
      e.preventDefault();
      return;
    }

    const found = CODES.find(c => c.key === e.key.toLowerCase());
    if (found) { handleApplyCode(found.code); e.preventDefault(); }
  }, [selection, showEmpModal, showManual, isMonthLocked, heModal.open]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  const handleCellClick = (empId: string, day: number, ctrlKey: boolean, shiftKey: boolean) => {
    if (isMonthLocked) return;
    setSelection(prev => {
      const newSet = new Set(ctrlKey ? prev.selectedCells : (shiftKey ? prev.selectedCells : []));
      if (shiftKey && prev.start) {
        const startEmpIdx = employees.findIndex(e => e.id === prev.start!.empId);
        const endEmpIdx = employees.findIndex(e => e.id === empId);
        const minEmp = Math.min(startEmpIdx, endEmpIdx), maxEmp = Math.max(startEmpIdx, endEmpIdx);
        const minDay = Math.min(prev.start!.day, day), maxDay = Math.max(prev.start!.day, day);
        for (let i = minEmp; i <= maxEmp; i++) for (let d = minDay; d <= maxDay; d++) newSet.add(`${employees[i].id}_${d}`);
      } else {
        const key = `${empId}_${day}`;
        if (ctrlKey && newSet.has(key)) newSet.delete(key); else newSet.add(key);
      }
      return { start: shiftKey ? prev.start : { empId, day }, current: { empId, day }, selectedCells: newSet };
    });
  };

  const handleCellDoubleClick = (empId: string, day: number) => {
    if (isMonthLocked) return;
    const emp = employees.find(e => e.id === empId);
    if (emp) setHeModal({ open: true, empId, day, val: emp.horasExtras?.[String(day)] || 0 });
  };

  const handleSaveHE = (hours: number) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === heModal.empId) {
        const newHE = { ...e.horasExtras, [String(heModal.day)]: hours };
        return { ...e, horasExtras: newHE };
      }
      return e;
    }));
    setHeModal({ ...heModal, open: false });
  };

  const handleSaveEmployee = async (emp: Employee) => {
    setEmployees(prev => prev.find(e => e.id === emp.id) ? prev.map(e => e.id === emp.id ? emp : e) : [...prev, emp]);
    await syncEmployeeAcrossMonths(data.metadata.hotel, data.metadata.departamento, emp, data.metadata.año, data.metadata.mes);
  };

  const handleDeleteEmployee = async (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    await deleteEmployeeAcrossMonths(data.metadata.hotel, data.metadata.departamento, id);
  };

  const handleCopyPreviousMonth = async () => {
    if (isMonthLocked) return;
    if (!confirm('¿Estás seguro de que quieres copiar los datos del mes anterior? Esto sobrescribirá los datos actuales.')) return;
    
    const prevData = await loadPreviousMonthData(data.metadata.hotel, data.metadata.departamento, data.metadata.año, data.metadata.mes);
    if (!prevData) {
      alert('No se encontraron datos del mes anterior.');
      return;
    }

    setEmployees(prev => prev.map(emp => {
      const prevEmp = prevData.empleados.find(e => e.id === emp.id);
      if (prevEmp) {
        return {
          ...emp,
          asistencia: { ...prevEmp.asistencia },
          horasExtras: { ...prevEmp.horasExtras }
        };
      }
      return emp;
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow z-[60] px-4 py-2 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-600 hover:text-blue-600 font-bold flex items-center gap-1">
            <span>←</span> Volver
          </button>
          
          <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button 
              onClick={() => onChangeMonth(data.metadata.año, data.metadata.mes - 1)}
              className="px-3 py-1 hover:bg-white hover:shadow rounded text-gray-600 font-bold"
              title="Mes Anterior"
            >
              &lt;
            </button>
            <div className="text-sm px-4 text-center min-w-[180px]">
              <div className="font-bold text-gray-800 leading-tight">{data.metadata.hotel}</div>
              <div className="text-xs text-gray-500">
                <span className="text-blue-600 font-medium">{data.metadata.departamento}</span>
                <span className="mx-2">|</span>
                <span className="uppercase font-bold">{MONTHS[data.metadata.mes - 1]} {data.metadata.año}</span>
              </div>
            </div>
            <button 
               onClick={() => onChangeMonth(data.metadata.año, data.metadata.mes + 1)}
               className="px-3 py-1 hover:bg-white hover:shadow rounded text-gray-600 font-bold"
               title="Mes Siguiente"
            >
              &gt;
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative" ref={downloadMenuRef}>
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium hover:bg-green-200 transition-colors">📥 Informe ▼</button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg py-1 z-[70] border ring-1 ring-black ring-opacity-5">
                <button onClick={() => { generatePDFReport(data, employees); setShowDownloadMenu(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">📄 PDF (Imprimir)</button>
                <button onClick={() => { generateExcelReport(data, employees); setShowDownloadMenu(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">📊 Excel (Editable)</button>
                <div className="border-t my-1"></div>
                <button onClick={() => { sharePDFReport(data, employees); setShowDownloadMenu(false); }} className="block px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 w-full text-left font-medium">📧 Enviar por Correo</button>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleCopyPreviousMonth} 
            disabled={isMonthLocked} 
            className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 transition-colors ${isMonthLocked ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
            title="Copiar datos del mes anterior"
          >
            <span>📋</span> Copiar Mes Ant.
          </button>

          <button 
            onClick={() => { setEditingEmpId(null); setShowEmpModal(true); }} 
            disabled={isMonthLocked} 
            className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 transition-colors ${isMonthLocked ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            <span>👤</span> Empleados
          </button>
          
          <button onClick={() => setShowManual(true)} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded text-sm font-medium hover:bg-yellow-100 transition-colors">❓</button>
        </div>
      </header>
      
      {isMonthLocked && <div className="bg-red-600 text-white text-center py-1 text-xs font-bold uppercase tracking-wider">🔒 Este mes está cerrado - Solo lectura</div>}
      
      <Toolbar onApplyCode={handleApplyCode} readOnly={isMonthLocked} />
      
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-auto relative">
          <AttendanceGrid 
            year={data.metadata.año} month={data.metadata.mes} employees={employees}
            selection={selection} setSelection={setSelection} onCellClick={handleCellClick}
            onCellDoubleClick={handleCellDoubleClick} onEditEmployee={(id) => { if(!isMonthLocked){ setEditingEmpId(id); setShowEmpModal(true); } }}
            readOnly={isMonthLocked}
            holidays={holidays}
          />
        </div>
        
        {/* Legend Moved to Bottom */}
        {showLegend && (
          <div className="bg-white p-2 border-t grid grid-cols-4 md:grid-cols-7 gap-2 text-[10px] z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            {CODES.map(c => (
              <div key={c.code} className="flex items-center gap-1">
                <span className="w-4 h-4 flex items-center justify-center font-bold rounded-none shadow-sm text-[10px] border border-black/10" style={{ backgroundColor: c.bgColor, color: c.textColor }}>{c.code}</span>
                <span className="truncate text-gray-600">{c.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
               <span className="w-4 h-4 bg-orange-600 text-white flex items-center justify-center rounded-none font-bold text-[10px] border border-black/10">HE</span>
               <span className="text-gray-600">Horas Extras</span>
            </div>
          </div>
        )}

        {saveStatus && (
          <div className={`absolute bottom-16 right-6 px-4 py-2 rounded-lg text-sm font-medium shadow-xl z-50 flex items-center gap-2 transition-all duration-300 ${saveStatus === 'saving' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
             {saveStatus === 'saving' ? (
               <>
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                Guardando...
               </>
             ) : (
               <>
                <span>✓</span> Guardado
               </>
             )}
          </div>
        )}
      </div>
      
      <EmployeeModal isOpen={showEmpModal} onClose={() => setShowEmpModal(false)} employees={employees} editId={editingEmpId} onSave={handleSaveEmployee} onDelete={handleDeleteEmployee} onReorder={setEmployees} currentYear={data.metadata.año} currentMonth={data.metadata.mes} />
      <ExtraHoursModal isOpen={heModal.open} onClose={() => setHeModal({ ...heModal, open: false })} onSave={handleSaveHE} currentHours={heModal.val} empName={employees.find(e => e.id === heModal.empId)?.nombre || ''} day={heModal.day} />
      <ManualModal isOpen={showManual} onClose={() => setShowManual(false)} />
    </div>
  );
};

export default QuadrantScreen;