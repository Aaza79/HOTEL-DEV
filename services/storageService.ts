import localforage from 'localforage';
import { AppData, Employee, User } from '../types';

let db: any = null;
const DB_NAME = 'hotel_attendance_db';

const CDN_URLS = [
  "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/dist/",
  "https://unpkg.com/sql.js@1.12.0/dist/"
];

// Helper to dynamically load the SQL.js script with fallback
const loadSqlJsLib = async (): Promise<{ initSqlJs: any, baseUrl: string }> => {
  if ((window as any).initSqlJs) {
    return { initSqlJs: (window as any).initSqlJs, baseUrl: CDN_URLS[0] };
  }

  for (const baseUrl of CDN_URLS) {
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${baseUrl}sql-wasm.js`;
        script.async = true;
        
        script.onload = () => {
          if ((window as any).initSqlJs) {
            resolve();
          } else {
            reject(new Error("Script loaded but initSqlJs is not defined."));
          }
        };
        
        script.onerror = () => {
          reject(new Error(`Failed to load script from ${baseUrl}`));
        };

        document.head.appendChild(script);
      });
      
      console.log(`Successfully loaded sql.js from ${baseUrl}`);
      return { initSqlJs: (window as any).initSqlJs, baseUrl };
    } catch (error) {
      console.warn(`Attempt to load sql.js from ${baseUrl} failed. Trying next source...`);
    }
  }

  throw new Error("CRITICAL: sql.js library could not be loaded from any CDN. Please check your internet connection.");
};

export const initDB = async () => {
  if (db) return db;
  
  try {
    const { initSqlJs, baseUrl } = await loadSqlJsLib();
    
    const SQL = await initSqlJs({
      locateFile: (file: string) => `${baseUrl}${file}`
    });

    const savedDb: ArrayBuffer | null = await localforage.getItem(DB_NAME);
    
    if (savedDb) {
      db = new SQL.Database(new Uint8Array(savedDb));
    } else {
      db = new SQL.Database();
    }
    
    // Schema definition - Always run to ensure new tables/columns are added to existing DBs
    db.run(`
      CREATE TABLE IF NOT EXISTS metadata (
        hotel TEXT,
        departamento TEXT,
        año INTEGER,
        mes INTEGER,
        ultimaModificacion TEXT,
        PRIMARY KEY (hotel, departamento, año, mes)
      );
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        hotel TEXT,
        departamento TEXT,
        nombre TEXT,
        fechaAlta TEXT,
        fechaBaja TEXT,
        trial_active INTEGER,
        trial_dias INTEGER,
        trial_fechaFin TEXT
      );
      CREATE TABLE IF NOT EXISTS attendance (
        employee_id TEXT,
        año INTEGER,
        mes INTEGER,
        dia INTEGER,
        code TEXT,
        horas_extras REAL,
        PRIMARY KEY (employee_id, año, mes, dia)
      );
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT,
        role TEXT,
        allowed_departments TEXT
      );
    `);
    
    await persistDB();
    await seedUsers();

    return db;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

const seedUsers = async () => {
  if (!db) return;
  db.run(`INSERT OR IGNORE INTO users (username, password, role, allowed_departments) VALUES (?, ?, ?, ?)`,
    ['admin', '1579@Chemas', 'admin', '["ALL"]']);
  db.run(`INSERT OR IGNORE INTO users (username, password, role, allowed_departments) VALUES (?, ?, ?, ?)`,
    ['cocina', 'cocina', 'user', '["Cocina"]']);
  await persistDB();
};

const persistDB = async () => {
  if (!db) return;
  const binaryDb = db.export();
  await localforage.setItem(DB_NAME, binaryDb.buffer);
};

// --- USER MANAGEMENT ---

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  await initDB();
  const res = db.exec(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password]);
  if (res.length > 0 && res[0].values.length > 0) {
    const row = res[0].values[0];
    return {
      username: row[0] as string,
      role: row[2] as 'admin' | 'user',
      allowedDepartments: JSON.parse(row[3] as string)
    };
  }
  return null;
};

export const getAllUsers = async (): Promise<User[]> => {
  await initDB();
  const res = db.exec(`SELECT username, role, allowed_departments FROM users`);
  if (res.length === 0) return [];
  return res[0].values.map((row: any) => ({
    username: row[0],
    role: row[1],
    allowedDepartments: JSON.parse(row[2])
  }));
};

export const saveUser = async (user: User, password?: string) => {
  await initDB();
  if (password) {
    db.run(`INSERT OR REPLACE INTO users (username, password, role, allowed_departments) VALUES (?, ?, ?, ?)`,
      [user.username, password, user.role, JSON.stringify(user.allowedDepartments)]);
  } else {
    const oldRes = db.exec(`SELECT password FROM users WHERE username = ?`, [user.username]);
    const oldPass = oldRes.length > 0 ? oldRes[0].values[0][0] : '123456'; 
    db.run(`INSERT OR REPLACE INTO users (username, password, role, allowed_departments) VALUES (?, ?, ?, ?)`,
      [user.username, oldPass, user.role, JSON.stringify(user.allowedDepartments)]);
  }
  await persistDB();
};

export const deleteUser = async (username: string) => {
  await initDB();
  db.run(`DELETE FROM users WHERE username = ?`, [username]);
  await persistDB();
};

// --- APP DATA ---

export const saveToStorage = async (data: AppData) => {
  if (!db) await initDB();

  const { hotel, departamento, año, mes } = data.metadata;
  const modDate = new Date().toISOString();

  // Save Metadata
  db.run(`INSERT OR REPLACE INTO metadata VALUES (?, ?, ?, ?, ?)`, 
    [hotel, departamento, año, mes, modDate]);

  // Save Employees and Attendance
  for (const emp of data.empleados) {
    db.run(`INSERT OR REPLACE INTO employees VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      emp.id, hotel, departamento, emp.nombre, emp.fechaAlta, emp.fechaBaja,
      emp.periodoPrueba.activo ? 1 : 0, emp.periodoPrueba.dias, emp.periodoPrueba.fechaFin
    ]);

    db.run(`DELETE FROM attendance WHERE employee_id = ? AND año = ? AND mes = ?`, [emp.id, año, mes]);

    for (const day in emp.asistencia) {
      const code = emp.asistencia[day];
      const he = emp.horasExtras[day] || 0;
      if (code || he > 0) {
        db.run(`INSERT INTO attendance VALUES (?, ?, ?, ?, ?, ?)`, 
          [emp.id, año, mes, parseInt(day), code, he]);
      }
    }
  }
  await persistDB();
};

export const loadFromStorage = async (hotel: string, dept: string, año: number, mes: number): Promise<AppData | null> => {
  await initDB();
  
  // Try finding metadata, but don't hard fail if missing if employees exist
  const meta = db.exec(`SELECT * FROM metadata WHERE hotel=? AND departamento=? AND año=? AND mes=?`, [hotel, dept, año, mes]);
  
  const employeesResult = db.exec(`SELECT * FROM employees WHERE hotel=? AND departamento=?`, [hotel, dept]);
  
  // If absolutely nothing exists for this context
  if (employeesResult.length === 0 && meta.length === 0) return null;

  const employees: Employee[] = [];

  if (employeesResult.length > 0) {
    const rows = employeesResult[0].values;
    for (const row of rows) {
      const empId = row[0] as string;
      
      const attendanceResult = db.exec(`SELECT dia, code, horas_extras FROM attendance WHERE employee_id=? AND año=? AND mes=?`, [empId, año, mes]);
      const asistencia: Record<string, string> = {};
      const horasExtras: Record<string, number> = {};

      if (attendanceResult.length > 0) {
        attendanceResult[0].values.forEach((attRow: any) => {
          asistencia[String(attRow[0])] = attRow[1];
          if (attRow[2]) horasExtras[String(attRow[0])] = attRow[2];
        });
      }

      employees.push({
        id: empId,
        nombre: row[3] as string,
        fechaAlta: row[4] as string,
        fechaBaja: row[5] as string || null,
        periodoPrueba: {
          activo: row[6] === 1,
          dias: row[7] as number,
          fechaFin: row[8] as string || null
        },
        asistencia,
        horasExtras
      });
    }
  }

  const lastMod = meta.length > 0 ? meta[0].values[0][4] : new Date().toISOString();

  return {
    metadata: {
      hotel,
      departamento: dept,
      año,
      mes,
      ultimaModificacion: lastMod
    },
    empleados: employees
  };
};

export const findRecentEmployees = async (hotel: string, dept: string): Promise<Employee[]> => {
  await initDB();
  const employeesResult = db.exec(`SELECT * FROM employees WHERE hotel=? AND departamento=?`, [hotel, dept]);
  if (employeesResult.length === 0) return [];

  return employeesResult[0].values.map((row: any) => ({
    id: row[0],
    nombre: row[3],
    fechaAlta: row[4],
    fechaBaja: row[5],
    periodoPrueba: { activo: row[6] === 1, dias: row[7], fechaFin: row[8] },
    asistencia: {},
    horasExtras: {}
  }));
};

export const syncEmployeeAcrossMonths = async (hotel: string, dept: string, employee: Employee) => {
  await initDB();
  db.run(`INSERT OR REPLACE INTO employees VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    employee.id, hotel, dept, employee.nombre, employee.fechaAlta, employee.fechaBaja,
    employee.periodoPrueba.activo ? 1 : 0, employee.periodoPrueba.dias, employee.periodoPrueba.fechaFin
  ]);
  await persistDB();
};

export const deleteEmployeeAcrossMonths = async (hotel: string, dept: string, employeeId: string) => {
  await initDB();
  db.run(`DELETE FROM employees WHERE id = ?`, [employeeId]);
  db.run(`DELETE FROM attendance WHERE employee_id = ?`, [employeeId]);
  await persistDB();
};

export const loadPreviousMonthData = async (hotel: string, dept: string, currentYear: number, currentMonth: number): Promise<AppData | null> => {
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) { prevMonth = 12; prevYear = currentYear - 1; }
  return loadFromStorage(hotel, dept, prevYear, prevMonth);
};