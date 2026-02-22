import React, { useState, useEffect } from 'react';
import { Employee } from '../types';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Employee) => void;
  onDelete: (id: string) => void;
  onReorder: (employees: Employee[]) => void;
  employees: Employee[];
  editId: string | null;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave, onDelete, onReorder, employees, editId }) => {
  // Fix: Ensure the initial state includes the required horasExtras property
  const [formData, setFormData] = useState<Partial<Employee>>({
    nombre: '',
    fechaAlta: '',
    fechaBaja: null,
    periodoPrueba: { activo: false, dias: 60, fechaFin: null },
    asistencia: {},
    horasExtras: {}
  });

  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');

  useEffect(() => {
    if (isOpen) {
      if (editId) {
        const emp = employees.find(e => e.id === editId);
        if (emp) {
          setFormData(JSON.parse(JSON.stringify(emp))); // Deep copy
          setActiveTab('form');
        }
      } else {
        // Reset if opening without ID (via header button usually means list view first)
        setActiveTab('list');
        resetForm();
      }
    }
  }, [isOpen, editId, employees]);

  const resetForm = () => {
    // Fix: Ensure the reset state includes the required horasExtras property
    setFormData({
      nombre: '',
      fechaAlta: new Date().toISOString().split('T')[0],
      fechaBaja: null,
      periodoPrueba: { activo: false, dias: 60, fechaFin: null },
      asistencia: {},
      horasExtras: {}
    });
  };

  const handleCreateNew = () => {
    resetForm();
    setActiveTab('form');
  }

  const handleEdit = (emp: Employee) => {
    setFormData(JSON.parse(JSON.stringify(emp)));
    setActiveTab('form');
  }

  const handleDelete = (id: string, nombre: string) => {
    if (window.confirm(`¿Eliminar a ${nombre}? Se perderán todos sus datos de asistencia.`)) {
      onDelete(id);
      if (editId === id) onClose();
    }
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === employees.length - 1) return;

    const newEmployees = [...employees];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
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

    // Fix: Adding missing horasExtras property to satisfy Employee interface and using non-null assertions safely
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
      asistencia: formData.asistencia || {},
      horasExtras: formData.horasExtras || {}
    };

    onSave(newEmp);
    if (editId) onClose(); // If direct edit, close
    else setActiveTab('list'); // If from list, go back to list
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {activeTab === 'list' ? 'Gestión de Empleados' : (formData.id ? 'Editar Empleado' : 'Nuevo Empleado')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'list' ? (
            <div>
              <div className="flex justify-end mb-4">
                <button 
                  onClick={handleCreateNew}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <span>+</span> Añadir Empleado
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-sm font-semibold text-gray-600 w-16 text-center">Orden</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Nombre</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Alta</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Baja</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Prueba</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, index) => (
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
                      <td className="p-3 font-medium">{emp.nombre}</td>
                      <td className="p-3 text-sm text-gray-600">{emp.fechaAlta}</td>
                      <td className="p-3 text-sm text-gray-600">{emp.fechaBaja || '-'}</td>
                      <td className="p-3 text-sm">
                        {emp.periodoPrueba.activo ? (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                            ⏱️ {emp.periodoPrueba.dias} días
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Completado/No</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800">✏️</button>
                        <button onClick={() => handleDelete(emp.id, emp.nombre)} className="text-red-600 hover:text-red-800">🗑️</button>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">No hay empleados registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
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
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow"
                >
                  Guardar Empleado
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeModal;