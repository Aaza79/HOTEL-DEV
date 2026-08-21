import React, { useState, useEffect } from 'react';
import { Employee, SalaryLevelRate } from '../types';
import { SALARY_LEVELS, DEFAULT_SALARY_TABLE, MONTHS } from '../constants';
import { getHolidays, getEmployeeYearlyAttendance, Holiday, getSalaryTable } from '../services/storageService';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Employee) => void;
  onDelete: (id: string) => void;
  onReorder: (employees: Employee[]) => void;
  employees: Employee[];
  editId: string | null;
  currentYear: number;
  currentMonth?: number;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave, onDelete, onReorder, employees, editId, currentYear, currentMonth }) => {
  const [salaryTable, setSalaryTable] = useState<SalaryLevelRate[]>(DEFAULT_SALARY_TABLE);
  const [formData, setFormData] = useState<Partial<Employee>>({
    nombre: '',
    fechaAlta: '',
    fechaBaja: null,
    periodoPrueba: { activo: false, dias: 60, fechaFin: null },
    nivelSalarial: 'NIVEL 2',
    otrasRetribuciones: 0,
    adelanto: 0,
    asistencia: {},
    horasExtras: {}
  });

  const [activeTab, setActiveTab] = useState<'list' | 'form' | 'summary'>('list');
  const [summaryData, setSummaryData] = useState<{
    empName: string;
    festivosTrabajados: string[];
    festivosDisfrutados: string[];
    totalFestivos: number;
    nivelSalarial?: string;
    otrasRetribuciones?: number;
    adelantoInfo?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSalary();
      if (editId) {
        const emp = employees.find(e => e.id === editId);
        if (emp) {
          const copy = JSON.parse(JSON.stringify(emp));
          setFormData(copy);
          setActiveTab('form');
        }
      } else {
        setActiveTab('list');
        resetForm();
      }
    }
  }, [isOpen, editId, employees]);

  const loadSalary = async () => {
    try {
      const list = await getSalaryTable();
      if (list && list.length > 0) {
        setSalaryTable(list);
      }
    } catch (e) {
      console.error('Error loading salary table in employee modal:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      fechaAlta: new Date().toISOString().split('T')[0],
      fechaBaja: null,
      periodoPrueba: { activo: false, dias: 60, fechaFin: null },
      nivelSalarial: 'NIVEL 2',
      otrasRetribuciones: 0,
      adelanto: 0,
      asistencia: {},
      horasExtras: {}
    });
  };

  const handleCreateNew = () => {
    resetForm();
    setActiveTab('form');
  };

  const handleEdit = (emp: Employee) => {
    const copy = JSON.parse(JSON.stringify(emp));
    setFormData(copy);
    setActiveTab('form');
  };

  const handleViewSummary = async (emp: Employee) => {
    const holidays = await getHolidays(currentYear);
    const attendance = await getEmployeeYearlyAttendance(emp.id, currentYear);
    
    const festivosTrabajados: string[] = [];
    const festivosDisfrutados: string[] = [];
    
    attendance.forEach(att => {
      if (att.code === 'F') {
        const dateStr = `${currentYear}-${String(att.mes).padStart(2, '0')}-${String(att.dia).padStart(2, '0')}`;
        festivosDisfrutados.push(dateStr);
      }
    });

    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);
    
    const alta = new Date(emp.fechaAlta);
    alta.setHours(0,0,0,0);
    const baja = emp.fechaBaja ? new Date(emp.fechaBaja) : endOfYear;
    baja.setHours(0,0,0,0);

    const actualStart = alta > startOfYear ? alta : startOfYear;
    const actualEnd = baja < endOfYear ? baja : endOfYear;

    let daysWorked = 0;
    if (actualEnd >= actualStart) {
      const diffTime = Math.abs(actualEnd.getTime() - actualStart.getTime());
      daysWorked = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    
    const daysInYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0 ? 366 : 365;
    const totalFestivosProporcionales = Math.round((daysWorked / daysInYear) * holidays.length);
    
    holidays.forEach(h => {
      const [y, m, d] = h.date.split('-').map(Number);
      const att = attendance.find(a => a.mes === m && a.dia === d);
      
      const holidayDate = new Date(h.date);
      holidayDate.setHours(0,0,0,0);
      
      if (holidayDate >= alta && (!emp.fechaBaja || holidayDate <= baja)) {
        if (!att || (att.code !== 'F' && att.code !== 'SC' && att.code !== 'V')) {
          festivosTrabajados.push(`${h.date} (${h.name})`);
        }
      }
    });

    let adelantoInfo = 'Sin adelanto';
    if ((emp.adelanto || 0) > 0) {
      adelantoInfo = `-${emp.adelanto} € adelanto`;
    }

    setSummaryData({
      empName: emp.nombre,
      festivosTrabajados,
      festivosDisfrutados,
      totalFestivos: totalFestivosProporcionales,
      nivelSalarial: emp.nivelSalarial,
      otrasRetribuciones: emp.otrasRetribuciones,
      adelantoInfo
    });
    setActiveTab('summary');
  };

  const handleDelete = (id: string, nombre: string) => {
    if (window.confirm(`¿Eliminar a ${nombre}? Se perderán todos sus datos de asistencia.`)) {
      onDelete(id);
      if (editId === id) onClose();
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === employees.length - 1) return;

    const newEmployees = [...employees];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newEmployees[index], newEmployees[targetIndex]] = [newEmployees[targetIndex], newEmployees[index]];
    onReorder(newEmployees);
  };

  const calculateTrialEnd = (start: string, days: number) => {
    if (!start) return '';
    const date = new Date(start);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.fechaAlta) return;

    const newEmp: Employee = {
      id: formData.id || `emp_${Date.now()}`,
      nombre: formData.nombre!,
      fechaAlta: formData.fechaAlta!,
      fechaBaja: formData.fechaBaja || null,
      periodoPrueba: {
        activo: formData.periodoPrueba?.activo || false,
        dias: formData.periodoPrueba?.dias || 0,
        fechaFin: (formData.periodoPrueba?.activo && formData.fechaAlta)
          ? calculateTrialEnd(formData.fechaAlta, formData.periodoPrueba.dias) 
          : null
      },
      nivelSalarial: formData.nivelSalarial || 'NIVEL 2',
      otrasRetribuciones: Number(formData.otrasRetribuciones) || 0,
      adelanto: Number(formData.adelanto) || 0,
      asistencia: formData.asistencia || {},
      horasExtras: formData.horasExtras || {}
    };

    onSave(newEmp);
    if (editId) onClose();
    else setActiveTab('list');
  };

  const currentRate = salaryTable.find(r => r.level === (formData.nivelSalarial || 'NIVEL 2')) || salaryTable[1] || { level: 'NIVEL 2', priceDayOff: 130, priceExtraHour: 16.25 };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {activeTab === 'list' ? 'Gestión de Empleados' : (activeTab === 'summary' ? `Resumen: ${summaryData?.empName}` : (formData.id ? 'Editar Empleado' : 'Nuevo Empleado'))}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'list' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">
                  Los datos de <strong>Nivel Salarial</strong> y <strong>Otras Retribuciones</strong> quedan guardados por defecto y se mantienen mes a mes.
                </p>
                <button 
                  onClick={handleCreateNew}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium shadow-sm"
                >
                  <span>+</span> Añadir Empleado
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-sm font-semibold text-gray-600 w-12 text-center">Orden</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Nombre</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Nivel Salarial</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Otras Retrib.</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Adelanto</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Alta</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, index) => {
                    const hasAdelanto = (emp.adelanto || 0) > 0;

                    return (
                      <tr key={emp.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-center">
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <button 
                              onClick={() => handleMove(index, 'up')} 
                              disabled={index === 0}
                              className={`text-xs p-1 rounded hover:bg-blue-100 ${index === 0 ? 'text-gray-300' : 'text-blue-600'}`}
                              title="Subir"
                            >
                              ▲
                            </button>
                            <button 
                              onClick={() => handleMove(index, 'down')} 
                              disabled={index === employees.length - 1}
                              className={`text-xs p-1 rounded hover:bg-blue-100 ${index === employees.length - 1 ? 'text-gray-300' : 'text-blue-600'}`}
                              title="Bajar"
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            {emp.periodoPrueba?.activo && <span title="Periodo de Prueba">⏱️</span>}
                            <span>{emp.nombre}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs">
                          <span className="inline-block bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full text-xs">
                            {emp.nivelSalarial ? emp.nivelSalarial.split(' - ')[0] : 'NIVEL 2'}
                          </span>
                        </td>
                        <td className="p-3 text-xs font-semibold text-gray-700">
                          {emp.otrasRetribuciones ? `${emp.otrasRetribuciones} €` : '0 €'}
                        </td>
                        <td className="p-3 text-xs">
                          {hasAdelanto ? (
                            <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-xs" title="Adelanto a descontar del total">
                              -{emp.adelanto} €
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-gray-600">{emp.fechaAlta}</td>
                        <td className="p-3 text-right space-x-2">
                          <button onClick={() => handleViewSummary(emp)} className="text-purple-600 hover:text-purple-800" title="Resumen de Festivos">📊</button>
                          <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800" title="Editar">✏️</button>
                          <button onClick={() => handleDelete(emp.id, emp.nombre)} className="text-red-600 hover:text-red-800" title="Borrar">🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">No hay empleados registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan García López"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Alta *</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    value={formData.fechaAlta}
                    onChange={e => setFormData({...formData, fechaAlta: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Baja</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    value={formData.fechaBaja || ''}
                    onChange={e => setFormData({...formData, fechaBaja: e.target.value || null})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Dejar vacío si sigue activo</p>
                </div>
              </div>

              {/* Retribución (Matching Image 2) */}
              <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-5 space-y-4 shadow-sm">
                <h4 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <span>💰</span> Retribución
                </h4>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nivel Salarial
                  </label>
                  <select
                    value={formData.nivelSalarial || salaryTable[1]?.level || 'NIVEL 2'}
                    onChange={e => setFormData({...formData, nivelSalarial: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-800 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {salaryTable.map(s => (
                      <option key={s.level} value={s.level}>
                        {s.level} — {Number(s.priceDayOff || 0).toFixed(2)} € / día libre | {Number(s.priceExtraHour || 0).toFixed(2)} € / hora extra
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rates Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-extrabold text-indigo-600">
                      {Number(currentRate.priceDayOff || 0).toFixed(2)} €
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-1">
                      por día libre trabajado
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-extrabold text-indigo-600">
                      {Number(currentRate.priceExtraHour || 0).toFixed(2)} €
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-1">
                      por hora extra
                    </div>
                  </div>
                </div>

                {/* Inputs Grid for Otras Retribuciones and Adelanto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Otras Retribuciones (€/mes)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.otrasRetribuciones ?? 0}
                        onChange={e => setFormData({...formData, otrasRetribuciones: parseFloat(e.target.value) || 0})}
                        className="w-full p-2.5 pr-8 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-800 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-gray-500 font-medium">€</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span>Adelanto (€)</span>
                      {currentMonth && (
                        <span className="text-[11px] font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          {MONTHS[currentMonth - 1]} {currentYear}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.adelanto ?? 0}
                        onChange={e => setFormData({...formData, adelanto: parseFloat(e.target.value) || 0})}
                        className="w-full p-2.5 pr-8 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-800 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-gray-500 font-medium">€</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Exclusivo del mes vigente (se resta del total). En meses nuevos iniciará a 0 €.
                    </p>
                  </div>
                </div>
              </div>

              {/* Periodo de prueba */}
              <div className="border p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="pp_active"
                    checked={formData.periodoPrueba?.activo}
                    onChange={e => setFormData({
                      ...formData, 
                      periodoPrueba: { ...formData.periodoPrueba!, activo: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="pp_active" className="font-medium text-gray-700">Empleado en periodo de prueba</label>
                </div>

                {formData.periodoPrueba?.activo && (
                  <div className="ml-6 space-y-3">
                    <div className="flex gap-4">
                      {[45, 60, 120].map(days => (
                        <label key={days} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="pp_days"
                            checked={formData.periodoPrueba?.dias === days}
                            onChange={() => setFormData({
                              ...formData,
                              periodoPrueba: { ...formData.periodoPrueba!, dias: days }
                            })}
                          />
                          <span className="text-sm">{days} días</span>
                        </label>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                      Fin del periodo: <strong>
                        {formData.fechaAlta ? calculateTrialEnd(formData.fechaAlta, formData.periodoPrueba!.dias) : 'Define fecha alta'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow font-medium"
                >
                  Guardar Empleado
                </button>
              </div>
            </form>
          )}

          {activeTab === 'summary' && summaryData && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                  <div className="text-2xl font-bold text-blue-700">{summaryData.festivosTrabajados.length}</div>
                  <div className="text-xs font-medium text-blue-900 mt-1">Festivos Trabajados</div>
                  <div className="text-[10px] text-blue-700 mt-0.5">(Pendientes)</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                  <div className="text-2xl font-bold text-green-700">{summaryData.festivosDisfrutados.length}</div>
                  <div className="text-xs font-medium text-green-900 mt-1">Festivos Disfrutados</div>
                  <div className="text-[10px] text-green-700 mt-0.5">(Código F)</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                  <div className="text-2xl font-bold text-purple-700">
                    {Math.max(0, summaryData.totalFestivos - summaryData.festivosDisfrutados.length)}
                  </div>
                  <div className="text-xs font-medium text-purple-900 mt-1">Restantes</div>
                  <div className="text-[10px] text-purple-700 mt-0.5">(Total año: {summaryData.totalFestivos})</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
                  <div className="text-sm font-bold text-amber-900 truncate">{summaryData.adelantoInfo}</div>
                  <div className="text-xs font-medium text-amber-900 mt-1">Adelanto / Retrib.</div>
                  <div className="text-[10px] text-amber-700 mt-0.5">Nivel: {summaryData.nivelSalarial?.split(' - ')[0] || 'N/A'}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b font-bold text-gray-700">
                    Fechas Trabajadas (Festivos Oficiales)
                  </div>
                  <ul className="divide-y max-h-60 overflow-y-auto">
                    {summaryData.festivosTrabajados.length > 0 ? (
                      summaryData.festivosTrabajados.map((f, i) => (
                        <li key={i} className="p-3 text-sm text-gray-600">{f}</li>
                      ))
                    ) : (
                      <li className="p-4 text-sm text-gray-500 text-center italic">Ninguno</li>
                    )}
                  </ul>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b font-bold text-gray-700">
                    Fechas Disfrutadas (Marcadas con F)
                  </div>
                  <ul className="divide-y max-h-60 overflow-y-auto">
                    {summaryData.festivosDisfrutados.length > 0 ? (
                      summaryData.festivosDisfrutados.map((f, i) => (
                        <li key={i} className="p-3 text-sm text-gray-600">{f}</li>
                      ))
                    ) : (
                      <li className="p-4 text-sm text-gray-500 text-center italic">Ninguno</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
                >
                  Volver a la lista
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeModal;
