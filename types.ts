
export interface AttendanceCode {
  code: string;
  name: string;
  bgColor: string;
  textColor: string;
  ratio: number;
  key: string;
}

export interface PeriodoPrueba {
  activo: boolean;
  dias: number;
  fechaFin: string | null;
}

export interface Employee {
  id: string;
  nombre: string;
  fechaAlta: string;
  fechaBaja: string | null;
  periodoPrueba: PeriodoPrueba;
  asistencia: Record<string, string>; // key is day number (1-31)
  horasExtras: Record<string, number>; // key is day number, value is hours
}

export interface AppMetadata {
  hotel: string;
  departamento: string;
  año: number;
  mes: number;
  ultimaModificacion: string;
  isLocked?: boolean;
}

export interface AppData {
  metadata: AppMetadata;
  empleados: Employee[];
}

export interface SelectionState {
  start: { empId: string; day: number } | null;
  current: { empId: string; day: number } | null;
  selectedCells: Set<string>; // Format: "empId_day"
}

export interface DragState {
  isDragging: boolean;
  startEmpIndex: number;
  startDay: number;
}

export interface User {
  username: string;
  password?: string; // Optional because we don't always want to pass it around in UI
  role: 'admin' | 'user';
  allowedDepartments: string[]; // ['ALL'] or specific departments
}
