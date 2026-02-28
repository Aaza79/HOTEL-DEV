import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { DEPARTMENTS, MONTHS } from '../constants';
import { getAllUsers, saveUser, deleteUser, getAllMonths, toggleMonthLock, getHolidays, saveHoliday, deleteHoliday, Holiday } from '../services/storageService';

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
  const [activeTab, setActiveTab] = useState<'users' | 'months' | 'holidays'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [months, setMonths] = useState<MonthData[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formUser, setFormUser] = useState<User>({ username: '', role: 'user', allowedDepartments: [] });
  const [formPassword, setFormPassword] = useState('');
  
  const [formHoliday, setFormHoliday] = useState<Holiday>({ date: '', name: '' });
  const [isEditingHoliday, setIsEditingHoliday] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadMonths();
      loadHolidays();
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

  const handleEdit = (u: User) => {
    setFormUser(u);
    setFormPassword('');
    setIsEditing(true);
  };

  const handleNew = () => {
    setFormUser({ username: '', role: 'user', allowedDepartments: [] });
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
    if (formUser.allowedDepartments.length === 0 && formUser.role !== 'admin') {
      alert("Debes seleccionar al menos un departamento.");
      return;
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

  const toggleDept = (dept: string) => {
    if (dept === 'ALL') {
      setFormUser({ ...formUser, allowedDepartments: ['ALL'] });
    } else {
      let current = formUser.allowedDepartments.filter(d => d !== 'ALL');
      if (current.includes(dept)) {
        current = current.filter(d => d !== dept);
      } else {
        current.push(dept);
      }
      setFormUser({ ...formUser, allowedDepartments: current });
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
                    <th className="p-3">Permisos</th>
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
                        {u.allowedDepartments.includes('ALL') ? 'Acceso Total' : u.allowedDepartments.join(', ')}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-800">Editar</button>
                        {u.username !== 'admin' && u.username !== currentUser.username && (
                          <button onClick={() => handleDelete(u.username)} className="text-red-600 hover:text-red-800">Borrar</button>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departamentos Permitidos</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded">
                    {DEPARTMENTS.map(dept => (
                      <label key={dept} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={formUser.allowedDepartments.includes(dept)}
                          onChange={() => toggleDept(dept)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{dept}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formUser.role === 'admin' && (
                 <div className="p-3 bg-purple-50 text-purple-800 text-sm rounded">
                   Los administradores tienen acceso a todos los departamentos automáticamente.
                 </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
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
        </div>
      </div>
    </div>
  );
};

export default AdminUserModal;
