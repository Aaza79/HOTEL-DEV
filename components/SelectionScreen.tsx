import React, { useState } from 'react';
import { HOTELS, DEPARTMENTS, MONTHS } from '../constants';
import { User } from '../types';

interface SelectionScreenProps {
  onStart: (hotel: string, dept: string, year: number, month: number) => void;
  onOpenManual: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  currentUser: User;
}

const SelectionScreen: React.FC<SelectionScreenProps> = ({ onStart, onOpenManual, onOpenAdmin, onLogout, currentUser }) => {
  const [hotel, setHotel] = useState("");
  const [dept, setDept] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i); // 2023 - 2030

  // Filter hotels based on permissions
  const availableHotels = (!currentUser.allowedHotels || currentUser.allowedHotels.includes('ALL'))
    ? HOTELS
    : HOTELS.filter(h => currentUser.allowedHotels.includes(h));

  // Filter departments based on permissions
  const availableDepartments = (!currentUser.allowedDepartments || currentUser.allowedDepartments.includes('ALL'))
    ? DEPARTMENTS 
    : DEPARTMENTS.filter(d => currentUser.allowedDepartments.includes(d));

  // Auto-select if only 1 hotel or department
  React.useEffect(() => {
    if (availableHotels.length === 1 && !hotel) {
      setHotel(availableHotels[0]);
    }
    if (availableDepartments.length === 1 && !dept) {
      setDept(availableDepartments[0]);
    }
  }, [availableHotels, availableDepartments]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (hotel && dept) {
      onStart(hotel, dept, year, month + 1); // Pass 1-based month
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
              <span className="material-icons-round text-primary dark:text-blue-400 text-5xl">apartment</span>
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
            Sistema de Control de Asistencia
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            Magic Hotels & Trend Hotel
          </p>
          <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-300 text-xs font-semibold">
            <span className="material-icons-round text-sm">person</span>
            {currentUser.username}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleStart} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
              Hotel
            </label>
            <select 
              value={hotel} 
              onChange={(e) => setHotel(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
            >
              <option value="" disabled>-- Selecciona un hotel --</option>
              {availableHotels.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            {availableHotels.length === 0 && (
              <p className="text-xs text-red-500 ml-1">Sin hoteles asignados.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
              Departamento
            </label>
            <select 
              value={dept} 
              onChange={(e) => setDept(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
            >
              <option value="" disabled>-- Selecciona un departamento --</option>
              {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {availableDepartments.length === 0 && (
              <p className="text-xs text-red-500 ml-1">Sin departamentos asignados.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                Año
              </label>
              <select 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                Mes
              </label>
              <select 
                value={month} 
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={!hotel || !dept}
            className={`w-full mt-4 bg-gradient-to-br from-primary to-blue-800 hover:from-blue-800 hover:to-primary text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${(!hotel || !dept) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="material-icons-round text-xl">grid_view</span>
            <span>Acceder al Cuadrante</span>
          </button>
        </form>

        {/* Footer Actions */}
        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-4">
          <div className="flex w-full justify-between px-4">
             {currentUser.role === 'admin' && (
              <button onClick={onOpenAdmin} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 text-sm font-medium transition-colors">
                <span className="material-icons-round text-lg">admin_panel_settings</span>
                <span>Admin Usuarios</span>
              </button>
             )}
              
             <button onClick={onLogout} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-red-600 text-sm font-medium transition-colors ml-auto">
                <span className="material-icons-round text-lg">logout</span>
                <span>Salir</span>
              </button>
          </div>
          
          <button onClick={onOpenManual} className="flex items-center space-x-2 text-primary dark:text-blue-400 hover:underline text-sm font-medium transition-colors mt-2">
            <span className="material-icons-round text-lg">menu_book</span>
            <span>Ver Manual de Usuario</span>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-bold">
            HotelDevPro v1.6 Enterprise
          </p>
        </div>
      </div>

      {/* Dark Mode Toggle */}
      <div className="fixed bottom-6 right-6">
        <button 
          className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 ios-shadow flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform" 
          onClick={() => document.documentElement.classList.toggle('dark')}
        >
          <span className="material-icons-round">dark_mode</span>
        </button>
      </div>
    </div>
  );
};

export default SelectionScreen;