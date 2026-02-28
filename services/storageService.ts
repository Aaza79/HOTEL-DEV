import { AppData, Employee, User } from '../types';

const API_URL = '/api';

export const initDB = async () => {
  // DB is initialized on the server
  return true;
};

export const loadFromStorage = async (hotel: string, dept: string, year: number, month: number): Promise<AppData | null> => {
  const res = await fetch(`${API_URL}/appdata?hotel=${hotel}&dept=${dept}&year=${year}&month=${month}`);
  return res.json();
};

export const saveToStorage = async (data: AppData) => {
  await fetch(`${API_URL}/appdata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const findRecentEmployees = async (hotel: string, dept: string): Promise<Employee[]> => {
  const res = await fetch(`${API_URL}/employees/recent?hotel=${hotel}&dept=${dept}`);
  return res.json();
};

export const loadPreviousMonthData = async (hotel: string, dept: string, year: number, month: number): Promise<AppData | null> => {
  const res = await fetch(`${API_URL}/appdata/previous?hotel=${hotel}&dept=${dept}&year=${year}&month=${month}`);
  return res.json();
};

export const getAllUsers = async (): Promise<User[]> => {
  const res = await fetch(`${API_URL}/users`);
  return res.json();
};

export const saveUser = async (user: User, password?: string) => {
  await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, password })
  });
};

export const deleteUser = async (username: string) => {
  await fetch(`${API_URL}/users/${username}`, { method: 'DELETE' });
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  return data.success ? data.user : null;
};

export const getAllMonths = async () => {
  const res = await fetch(`${API_URL}/months`);
  return res.json();
};

export const toggleMonthLock = async (hotel: string, departamento: string, año: number, mes: number, isLocked: boolean) => {
  await fetch(`${API_URL}/months/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hotel, departamento, año, mes, isLocked })
  });
};

export interface Holiday {
  date: string;
  name: string;
}

export const getHolidays = async (year?: number): Promise<Holiday[]> => {
  const url = year ? `${API_URL}/holidays?year=${year}` : `${API_URL}/holidays`;
  const res = await fetch(url);
  return res.json();
};

export const saveHoliday = async (holiday: Holiday) => {
  await fetch(`${API_URL}/holidays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(holiday)
  });
};

export const deleteHoliday = async (date: string) => {
  await fetch(`${API_URL}/holidays/${date}`, { method: 'DELETE' });
};

export const deleteDataByYear = async (year: number) => {
  await fetch(`${API_URL}/data/year/${year}`, { method: 'DELETE' });
};

export const syncEmployeeAcrossMonths = async (hotel: string, dept: string, employee: Employee) => {
  await fetch(`${API_URL}/employees/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...employee, hotel, departamento: dept })
  });
};

export const deleteEmployeeAcrossMonths = async (hotel: string, dept: string, employeeId: string) => {
  await fetch(`${API_URL}/employees/${employeeId}/sync`, { method: 'DELETE' });
};

export const getEmployeeYearlyAttendance = async (employeeId: string, year: number) => {
  const res = await fetch(`${API_URL}/employees/${employeeId}/attendance?year=${year}`);
  return res.json();
};
