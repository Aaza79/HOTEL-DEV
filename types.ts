
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

export interface SalaryLevelRate {
  level: string; // e.g. "NIVEL 1", "NIVEL 2", etc.
  priceDayOff: number; // € / Día Libre Trabajado (LT)
  priceExtraHour: number; // € / Hora Extra (HE)
}

export interface Employee {
  id: string;
  nombre: string;
  fechaAlta: string;
  fechaBaja: string | null;
  periodoPrueba: PeriodoPrueba;
  nivelSalarial?: string; // e.g. "NIVEL 1", "NIVEL 2", "NIVEL 3"
  otrasRetribuciones?: number; // Retribuciones adicionales (€/mes) guardadas por defecto mes a mes
  adelanto?: number; // Importe del adelanto (€) a restar del total
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
  password?: string; // Optional because we don't always pass it around in UI
  role: 'admin' | 'user';
  allowedHotels: string[]; // ['ALL'] or specific hotels
  allowedDepartments: string[]; // ['ALL'] or specific departments
}

