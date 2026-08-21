import React, { useState, useEffect } from 'react';
import { User, SalaryLevelRate } from '../types';
import { HOTELS, DEPARTMENTS, MONTHS, DEFAULT_SALARY_TABLE } from '../constants';
import { getAllUsers, saveUser, deleteUser, getAllMonths, toggleMonthLock, getHolidays, saveHoliday, deleteHoliday, Holiday, deleteDataByYear, getSalaryTable, saveSalaryTable } from '../services/storageService';

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

interface MonthData {
  hotel: string;
  departamento: string;
  año: number;
  mes: number;
  isLocked?: boolean;
}

const AdminUserModal: React.FC<AdminUserModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'months' | 'holidays' | 'salary' | 'database'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [months, setMonths] = useState<MonthData[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [salaryTable, setSalaryTable] = useState<SalaryLevelRate[]>(DEFAULT_SALARY_TABLE);
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [salarySaveSuccess, setSalarySaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formUser, setFormUser] = useState<User>({ username: '', role: 'user', allowedHotels: ['ALL'], allowedDepartments: [] });
  const [formPassword, setFormPassword] = useState('');
  
  const [formHoliday, setFormHoliday] = useState<Holiday>({ date: '', name: '' });
  const [isEditingHoliday, setIsEditingHoliday] = useState(false);
  
  const [deleteYear, setDeleteYear] = useState<number>(new Date().getFullYear() - 1);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadMonths();
      loadHolidays();
      loadSalaryTable();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    const list = await getAllUsers();
    setUsers(list);
  };

  const loadMonths = async () => {
    const list = await getAllMonths();
    setMonths(list);
  };

  const loadHolidays = async () => {
    const list = await getHolidays();
    setHolidays(list);
  };

  const loadSalaryTable = async () => {
    try {
      const list = await getSalaryTable();
      if (list && list.length > 0) {
        setSalaryTable(list);
      }
    } catch (e) {
      console.error('Error loading salary table:', e);
    }
  };

  const handleSalaryRateChange = (level: string, field: 'priceDayOff' | 'priceExtraHour', value: string) => {
    const normalized = value.replace(',', '.');
    const num = parseFloat(normalized);
    setSalaryTable(prev => prev.map(item => {
      if (item.level === level) {
        return {
          ...item,
          [field]: isNaN(num) ? 0 : num
        };
      }
      return item;
    }));
  };

  const handleSaveSalaryTable = async () => {
    setIsSavingSalary(true);
    try {
      await saveSalaryTable(salaryTable);
      setSalarySaveSuccess(true);
      setTimeout(() => setSalarySaveSuccess(false), 2500);
    } catch (e) {
      alert('Error al guardar la tabla salarial');
    } finally {
      setIsSavingSalary(false);
    }
  };

  const handleToggleLock = async (m: MonthData) => {
    // Calculate default lock status if undefined
    let currentLocked = m.isLocked;
    if (currentLocked === undefined) {
      const lastDayOfMonth = new Date(m.año, m.mes, 0); 
      const lockDate = new Date(lastDayOfMonth);
      lockDate.setDate(lockDate.getDate() + 7);
      lockDate.setHours(23, 59, 59, 999);
      currentLocked = new Date() > lockDate;
    }
    
    const newLocked = !currentLocked;
    await toggleMonthLock(m.hotel, m.departamento, m.año, m.mes, newLocked);
    loadMonths();
  };

  const handleEditHoliday = (h: Holiday) => {
    setFormHoliday(h);
    setIsEditingHoliday(true);
  };

  const handleNewHoliday = () => {
    setFormHoliday({ date: '', name: '' });
    setIsEditingHoliday(true);
  };

  const handleDeleteHoliday = async (date: string) => {
    if (confirm(`¿Eliminar festivo del ${date}?`)) {
      await deleteHoliday(date);
      loadHolidays();
    }
  };

  const handleSubmitHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHoliday.date || !formHoliday.name) return;
    await saveHoliday(formHoliday);
    setIsEditingHoliday(false);
    loadHolidays();
  };

  const handleDeleteYear = async () => {
    if (confirm(`⚠️ ATENCIÓN ⚠️\n\n¿Estás seguro de que deseas eliminar TODOS los datos (asistencia, meses, festivos) del año ${deleteYear}?\n\nEsta acción NO se puede deshacer.`)) {
      await deleteDataByYear(deleteYear);
      alert(`Datos del año ${deleteYear} eliminados correctamente.`);
      loadMonths();
      loadHolidays();
    }
  };

  const handleEdit = (u: User) => {
    setFormUser({
      username: u.username,
      role: u.role,
      allowedHotels: u.allowedHotels || ['ALL'],
      allowedDepartments: u.allowedDepartments || ['ALL']
    });
    setFormPassword('');
    setIsEditing(true);
  };

  const handleNew = () => {
    setFormUser({ username: '', role: 'user', allowedHotels: ['ALL'], allowedDepartments: [] });
    setFormPassword('');
    setIsEditing(true);
  };

  const handleDelete = async (username: string) => {
    if (username === currentUser.username) {
      alert("No puedes eliminar tu propio usuario.");
      return;
    }
    if (confirm(`¿Eliminar usuario ${username}?`)) {
      await deleteUser(username);
      loadUsers();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUser.username) return;
    if (formUser.role !== 'admin') {
      if (!formUser.allowedHotels || formUser.allowedHotels.length === 0) {
        alert("Debes seleccionar al menos un hotel.");
        return;
      }
      if (!formUser.allowedDepartments || formUser.allowedDepartments.length === 0) {
        alert("Debes seleccionar al menos un departamento.");
        return;
      }
    }
    
    // For new users, password is required
    const isNew = !users.find(u => u.username === formUser.username);
    if (isNew && !formPassword) {
      alert("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    await saveUser(formUser, formPassword || undefined);
    setIsEditing(false);
    loadUsers();
  };

  const toggleHotel = (hotel: string) => {
    if (hotel === 'ALL') {
      setFormUser({ ...formUser, allowedHotels: ['ALL'] });
    } else {
      let current = (formUser.allowedHotels || []).filter(h => h !== 'ALL');
      if (current.includes(hotel)) {
        current = current.filter(h => h !== hotel);
      } else {
        current.push(hotel);
      }
      setFormUser({ ...formUser, allowedHotels: current.length === 0 ? ['ALL'] : current });
    }
  };

  const toggleDept = (dept: string) => {
    if (dept === 'ALL') {
      setFormUser({ ...formUser, allowedDepartments: ['ALL'] });
    } else {
      let current = (formUser.allowedDepartments || []).filter(d => d !== 'ALL');
      if (current.includes(dept)) {
        current = current.filter(d => d !== dept);
      } else {
        current.push(dept);
      }
      setFormUser({ ...formUser, allowedDepartments: current.length === 0 ? ['ALL'] : current });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">🛡️ Panel de Administración</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300 text-2xl">&times;</button>
        </div>

        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 font-medium text-center ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('users')}
          >
            Gestión de Usuarios
          </button>
          <button 
            className={`flex-1 py-3 font-medium text-center ${activeTab === 'months' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('months')}
          >
            Gestión de Meses (Cierres)
          </button>
          <button 
            className={`flex-1 py-3 font-medium text-center ${activeTab === 'holidays' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('holidays')}
          >
            Calendario de Festivos
          </button>
          <button 
            className={`flex-1 py-3 font-medium text-center ${activeTab === 'salary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('salary')}
          >
            Tabla Salarial
          </button>
          <button 
            className={`flex-1 py-3 font-medium text-center ${activeTab === 'database' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('database')}
          >
            Base de Datos
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'users' && (
            !isEditing ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-700">Usuarios del Sistema</h3>
                <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">+ Nuevo Usuario</button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Hoteles Permitidos</th>
                    <th className="p-3">Departamentos Permitidos</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.username} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{u.username}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {(!u.allowedHotels || u.allowedHotels.includes('ALL')) ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Todos los Hoteles</span>
                        ) : (
                          u.allowedHotels.join(', ')
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {(!u.allowedDepartments || u.allowedDepartments.includes('ALL')) ? (
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Todos los Departamentos</span>
                        ) : (
                          u.allowedDepartments.join(', ')
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        {u.username !== 'admin' && u.username !== currentUser.username && (
                          <button onClick={() => handleDelete(u.username)} className="text-red-600 hover:text-red-800 font-medium">Borrar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{formUser.username && users.find(u => u.username === formUser.username) ? 'Editar Usuario' : 'Crear Usuario'}</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre de Usuario</label>
                <input 
                  type="text" 
                  value={formUser.username}
                  onChange={e => setFormUser({...formUser, username: e.target.value})}
                  className="w-full p-2 border rounded"
                  disabled={!!users.find(u => u.username === formUser.username)} // Cannot change username once created
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña {users.find(u => u.username === formUser.username) && '(Dejar en blanco para mantener)'}</label>
                <input 
                  type="text" 
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Nueva contraseña"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select 
                  value={formUser.role} 
                  onChange={e => setFormUser({...formUser, role: e.target.value as 'admin' | 'user'})}
                  className="w-full p-2 border rounded"
                >
                  <option value="user">Usuario Estándar</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {formUser.role !== 'admin' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">🏨 Hoteles Permitidos</label>
                    <div className="space-y-2 border p-3 rounded bg-gray-50">
                      <label className="flex items-center gap-2 cursor-pointer pb-2 border-b">
                        <input 
                          type="checkbox" 
                          checked={formUser.allowedHotels?.includes('ALL')}
                          onChange={() => toggleHotel('ALL')}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-semibold text-gray-800">Todos los Hoteles</span>
                      </label>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {HOTELS.map(hotel => (
                          <label key={hotel} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded">
                            <input 
                              type="checkbox" 
                              checked={formUser.allowedHotels?.includes('ALL') || formUser.allowedHotels?.includes(hotel)}
                              onChange={() => toggleHotel(hotel)}
                              disabled={formUser.allowedHotels?.includes('ALL')}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{hotel}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">🏢 Departamentos Permitidos</label>
                    <div className="space-y-2 border p-3 rounded bg-gray-50">
                      <label className="flex items-center gap-2 cursor-pointer pb-2 border-b">
                        <input 
                          type="checkbox" 
                          checked={formUser.allowedDepartments?.includes('ALL')}
                          onChange={() => toggleDept('ALL')}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-semibold text-gray-800">Todos los Departamentos</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                        {DEPARTMENTS.map(dept => (
                          <label key={dept} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded">
                            <input 
                              type="checkbox" 
                              checked={formUser.allowedDepartments?.includes('ALL') || formUser.allowedDepartments?.includes(dept)}
                              onChange={() => toggleDept(dept)}
                              disabled={formUser.allowedDepartments?.includes('ALL')}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {formUser.role === 'admin' && (
                 <div className="p-3 bg-purple-50 text-purple-800 text-sm rounded border border-purple-200">
                   👑 Los administradores tienen acceso automático y total a todos los hoteles y departamentos.
                 </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Guardar Usuario</button>
              </div>
            </form>
            )
          )}

          {activeTab === 'months' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-700">Estado de Meses</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3">Hotel</th>
                    <th className="p-3">Departamento</th>
                    <th className="p-3">Mes/Año</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, idx) => {
                    let isLocked = m.isLocked;
                    if (isLocked === undefined) {
                      const lastDayOfMonth = new Date(m.año, m.mes, 0); 
                      const lockDate = new Date(lastDayOfMonth);
                      lockDate.setDate(lockDate.getDate() + 7);
                      lockDate.setHours(23, 59, 59, 999);
                      isLocked = new Date() > lockDate;
                    }

                    return (
                      <tr key={`${m.hotel}-${m.departamento}-${m.año}-${m.mes}-${idx}`} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{m.hotel}</td>
                        <td className="p-3">{m.departamento}</td>
                        <td className="p-3">{MONTHS[m.mes - 1]} {m.año}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${isLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {isLocked ? 'CERRADO' : 'ABIERTO'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleToggleLock(m)} 
                            className={`px-3 py-1 rounded text-sm font-medium text-white ${isLocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                          >
                            {isLocked ? 'Abrir Mes' : 'Cerrar Mes'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {months.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">No hay meses registrados aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'holidays' && (
            !isEditingHoliday ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-700">Festivos Oficiales</h3>
                <button onClick={handleNewHoliday} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">+ Nuevo Festivo</button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Nombre / Descripción</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map(h => (
                    <tr key={h.date} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{h.date}</td>
                      <td className="p-3">{h.name}</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => handleEditHoliday(h)} className="text-blue-600 hover:text-blue-800">Editar</button>
                        <button onClick={() => handleDeleteHoliday(h.date)} className="text-red-600 hover:text-red-800">Borrar</button>
                      </td>
                    </tr>
                  ))}
                  {holidays.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-gray-500">No hay festivos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            ) : (
            <form onSubmit={handleSubmitHoliday} className="max-w-xl mx-auto space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{formHoliday.date && holidays.find(h => h.date === formHoliday.date) ? 'Editar Festivo' : 'Crear Festivo'}</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha</label>
                <input 
                  type="date" 
                  value={formHoliday.date}
                  onChange={e => setFormHoliday({...formHoliday, date: e.target.value})}
                  className="w-full p-2 border rounded"
                  disabled={!!(formHoliday.date && holidays.find(h => h.date === formHoliday.date))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre / Descripción</label>
                <input 
                  type="text" 
                  value={formHoliday.name}
                  onChange={e => setFormHoliday({...formHoliday, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Ej: Año Nuevo"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setIsEditingHoliday(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
              </div>
            </form>
            )
          )}

          {activeTab === 'salary' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>💰</span> Tabla Salarial
                </h3>
                <button
                  type="button"
                  onClick={handleSaveSalaryTable}
                  disabled={isSavingSalary}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                    salarySaveSuccess
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <span>{salarySaveSuccess ? '✓' : '💾'}</span>
                  <span>{salarySaveSuccess ? '¡Guardado con Éxito!' : isSavingSalary ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1e293b] text-white">
                      <th className="py-3.5 px-6 text-sm font-semibold text-center w-1/3">Nivel</th>
                      <th className="py-3.5 px-6 text-sm font-semibold text-center w-1/3">€ / Día Libre Trabajado</th>
                      <th className="py-3.5 px-6 text-sm font-semibold text-center w-1/3">€ / Hora Extra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {salaryTable.map((row) => (
                      <tr key={row.level} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 text-center">
                          <span className="inline-block bg-indigo-100 text-indigo-700 font-bold px-4 py-1.5 rounded-full text-xs tracking-wider">
                            {row.level}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.priceDayOff || ''}
                              onChange={(e) => handleSalaryRateChange(row.level, 'priceDayOff', e.target.value)}
                              className="w-32 py-1.5 px-3 text-center border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                              placeholder="0"
                            />
                            <span className="text-gray-500 text-sm font-medium">€</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.priceExtraHour || ''}
                              onChange={(e) => handleSalaryRateChange(row.level, 'priceExtraHour', e.target.value)}
                              className="w-32 py-1.5 px-3 text-center border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                              placeholder="0"
                            />
                            <span className="text-gray-500 text-sm font-medium">€</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Los cambios se reflejarán en la ficha de cada empleado. Recuerda guardar antes de salir.
              </p>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="max-w-2xl mx-auto mt-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                  <span>⚠️</span> Zona de Peligro: Borrado de Datos
                </h3>
                <p className="text-gray-700 mb-6">
                  Esta opción permite eliminar todos los registros de asistencia, metadatos de meses y festivos asociados a un año específico. 
                  <strong> Los empleados no serán eliminados</strong>, pero sí todo su historial de asistencia de ese año.
                </p>
                
                <div className="flex items-end gap-4 bg-white p-4 rounded border border-red-100">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Año a eliminar</label>
                    <input 
                      type="number" 
                      value={deleteYear}
                      onChange={e => setDeleteYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500"
                      min="2000"
                      max="2100"
                    />
                  </div>
                  <button 
                    onClick={handleDeleteYear}
                    className="bg-red-600 text-white px-6 py-2 rounded font-medium hover:bg-red-700 transition-colors h-[42px]"
                  >
                    Borrar Datos del {deleteYear}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserModal;

