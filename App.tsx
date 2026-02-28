import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import SelectionScreen from './components/SelectionScreen';
import QuadrantScreen from './components/QuadrantScreen';
import ManualModal from './components/ManualModal';
import AdminUserModal from './components/AdminUserModal';
import { AppData, User } from './types';
import { INITIAL_EMPLOYEES_MOCK } from './constants';
import { initDB, loadFromStorage, findRecentEmployees } from './services/storageService';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'loading' | 'login' | 'error' | 'selection' | 'quadrant'>('loading');
  const [appData, setAppData] = useState<AppData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Use refs to avoid reconnecting WebSocket on every data change
  const currentViewRef = React.useRef({
    hotel: '',
    departamento: '',
    año: 0,
    mes: 0
  });

  useEffect(() => {
    if (appData) {
      currentViewRef.current = {
        hotel: appData.metadata.hotel,
        departamento: appData.metadata.departamento,
        año: appData.metadata.año,
        mes: appData.metadata.mes
      };
    }
  }, [appData]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'APPDATA_CHANGED' || data.type === 'HOLIDAYS_CHANGED') {
          const { hotel, departamento, año, mes } = data.payload || { hotel: '', departamento: '', año: -1, mes: -1 };
          const current = currentViewRef.current;
          
          if (
            (current.hotel === hotel && current.departamento === departamento && current.año === año && current.mes === mes) ||
            (año === -1 && mes === -1) // Global sync for this hotel/dept or all
          ) {
            // Reload data if we are viewing the same quadrant
            const updated = await loadFromStorage(current.hotel, current.departamento, current.año, current.mes);
            if (updated) {
              setAppData(updated);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    // Check if there is an active session in session storage (simple persistence)
    const storedUser = sessionStorage.getItem('hotel_user');
    
    initDB()
      .then(() => {
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
          setCurrentScreen('selection');
        } else {
          setCurrentScreen('login');
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage(err.message || "Error cargando la base de datos");
        setCurrentScreen('error');
      });
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('hotel_user', JSON.stringify(user));
    setCurrentScreen('selection');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppData(null);
    sessionStorage.removeItem('hotel_user');
    setCurrentScreen('login');
  };

  const handleStart = async (hotel: string, dept: string, year: number, month: number) => {
    const existing = await loadFromStorage(hotel, dept, year, month);
    if (existing) {
      setAppData(existing);
    } else {
      const existingEmployees = await findRecentEmployees(hotel, dept);
      
      let employeesToUse;

      if (existingEmployees.length > 0) {
        // If employees exist in other months, use them but empty attendance
        employeesToUse = existingEmployees.map(e => ({
          ...e,
          asistencia: {},
          horasExtras: {}
        }));
      } else {
        // If no employees exist in DB, use MOCK
        // Only keep mock attendance if the selected month is February (2)
        if (month === 2) {
          employeesToUse = INITIAL_EMPLOYEES_MOCK.map(e => ({...e, horasExtras: {}}));
        } else {
          // For any other month, use mock employees but clear attendance
          employeesToUse = INITIAL_EMPLOYEES_MOCK.map(e => ({
            ...e,
            asistencia: {},
            horasExtras: {}
          }));
        }
      }

      setAppData({
        metadata: { hotel, departamento: dept, año: year, mes: month, ultimaModificacion: new Date().toISOString() },
        empleados: employeesToUse
      });
    }
    setCurrentScreen('quadrant');
  };

  const handleMonthChange = async (year: number, month: number) => {
    if (!appData) return;
    
    // Normalize month/year if out of bounds
    let newMonth = month;
    let newYear = year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    await handleStart(appData.metadata.hotel, appData.metadata.departamento, newYear, newMonth);
  };

  if (currentScreen === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white flex-col gap-4">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="font-bold animate-pulse">Cargando Sistema HotelDevPro...</p>
      </div>
    );
  }

  if (currentScreen === 'error') {
    return (
      <div className="h-screen flex items-center justify-center bg-red-50 p-4 text-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Error de Inicialización</h2>
          <p className="text-gray-700 mb-4">{errorMessage}</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Reintentar</button>
        </div>
      </div>
    );
  }

  if (currentScreen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <>
      {currentScreen === 'selection' && currentUser && (
        <SelectionScreen 
          onStart={handleStart} 
          onOpenManual={() => setShowManual(true)}
          onOpenAdmin={() => setShowAdmin(true)}
          onLogout={handleLogout}
          currentUser={currentUser}
        />
      )}
      
      {currentScreen === 'quadrant' && appData && (
        <QuadrantScreen 
          data={appData} 
          onBack={() => setCurrentScreen('selection')} 
          onUpdateData={setAppData} 
          onChangeMonth={handleMonthChange}
        />
      )}
      
      <ManualModal isOpen={showManual} onClose={() => setShowManual(false)} />
      
      {currentUser && (
        <AdminUserModal 
          isOpen={showAdmin} 
          onClose={() => setShowAdmin(false)} 
          currentUser={currentUser}
        />
      )}
    </>
  );
};

export default App;