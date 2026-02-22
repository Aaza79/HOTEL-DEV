import React, { useState } from 'react';
import { loginUser } from '../services/storageService';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Small artificial delay for UX feel
      await new Promise(r => setTimeout(r, 500));
      const user = await loginUser(username, password);
      
      if (user) {
        onLogin(user);
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      setError('Error al conectar con la base de datos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 ios-shadow border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        {/* Gradient Top Border */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary"></div>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
              <span className="material-icons-round text-primary dark:text-blue-400 text-5xl">lock</span>
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
            Acceso Profesional
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            Sistema HotelDevPro
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
              Usuario
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 pl-10 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                placeholder="Ej: admin"
                autoFocus
              />
              <span className="material-icons-round absolute left-3 top-3.5 text-slate-400 text-lg">person</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 pl-10 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                placeholder="••••••••"
              />
              <span className="material-icons-round absolute left-3 top-3.5 text-slate-400 text-lg">vpn_key</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium border border-red-100 dark:border-red-800">
              <div className="flex items-center justify-center gap-2">
                <span className="material-icons-round text-sm">error</span>
                {error}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className={`w-full mt-4 bg-gradient-to-br from-primary to-blue-800 hover:from-blue-800 hover:to-primary text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${
              loading || !username || !password ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
               <div className="flex items-center gap-2">
                 <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                 <span>Verificando...</span>
               </div>
            ) : (
               <>
                 <span className="material-icons-round text-xl">login</span>
                 <span>Iniciar Sesión</span>
               </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-bold">
            Secure Access RBAC v1.5
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;