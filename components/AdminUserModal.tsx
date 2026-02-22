import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { DEPARTMENTS } from '../constants';
import { getAllUsers, saveUser, deleteUser } from '../services/storageService';

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const AdminUserModal: React.FC<AdminUserModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formUser, setFormUser] = useState<User>({ username: '', role: 'user', allowedDepartments: [] });
  const [formPassword, setFormPassword] = useState('');

  useEffect(() => {
    if (isOpen) loadUsers();
  }, [isOpen]);

  const loadUsers = async () => {
    const list = await getAllUsers();
    setUsers(list);
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

        <div className="flex-1 overflow-auto p-6">
          {!isEditing ? (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserModal;
