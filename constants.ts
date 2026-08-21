import { AttendanceCode } from './types';

export const HOTELS = [
  "Magic Hotels Can Picafort Palace",
  "Trend Hotel"
];

export const DEPARTMENTS = [
  "Cocina",
  "Bar/Comedor",
  "SSTT",
  "Pisos",
  "Recepción",
  "Animación",
  "Administración",
  "Dirección"
];

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const CODES: AttendanceCode[] = [
  { code: "1", name: "Día trabajado", bgColor: "#4CAF50", textColor: "#FFFFFF", ratio: 1.0, key: "1" },
  { code: "0.5", name: "Reducción jornada", bgColor: "#8BC34A", textColor: "#000000", ratio: 0.5, key: "5" },
  { code: "L", name: "Día libre", bgColor: "#FFFFFF", textColor: "#333333", ratio: 0, key: "l" },
  { code: "LT", name: "Libre trabajado", bgColor: "#FFC107", textColor: "#000000", ratio: 1.0, key: "t" },
  { code: "LR", name: "Libre recuperado", bgColor: "#FFEB3B", textColor: "#000000", ratio: 0, key: "r" },
  { code: "F", name: "Festivo disfrutado", bgColor: "#FF9800", textColor: "#000000", ratio: 0, key: "f" },
  { code: "FT", name: "Festivo trabajado", bgColor: "#E65100", textColor: "#FFFFFF", ratio: 1.0, key: "g" },
  { code: "FR", name: "Festivo recuperado", bgColor: "#FFB74D", textColor: "#000000", ratio: 0, key: "h" },
  { code: "V", name: "Vacaciones", bgColor: "#2196F3", textColor: "#FFFFFF", ratio: 0, key: "v" },
  { code: "BE", name: "Baja enfermedad", bgColor: "#F48FB1", textColor: "#000000", ratio: 0, key: "b" },
  { code: "BA", name: "Baja accidente", bgColor: "#E53935", textColor: "#FFFFFF", ratio: 0, key: "a" },
  { code: "AU", name: "Ausencia", bgColor: "#9E9E9E", textColor: "#FFFFFF", ratio: 0, key: "u" },
  { code: "PR", name: "Permiso remunerado", bgColor: "#CE93D8", textColor: "#000000", ratio: 0, key: "p" },
  { code: "PNR", name: "Permiso no remunerado", bgColor: "#7B1FA2", textColor: "#FFFFFF", ratio: 0, key: "n" },
];

export const SC_CODE: AttendanceCode = {
  code: "SC",
  name: "Sin contrato",
  bgColor: "#37474F",
  textColor: "#90A4AE",
  ratio: 0,
  key: "-"
};

export const DEFAULT_SALARY_TABLE = [
  { level: "NIVEL 1", priceDayOff: 140, priceExtraHour: 17.5 },
  { level: "NIVEL 2", priceDayOff: 130, priceExtraHour: 16.25 },
  { level: "NIVEL 3", priceDayOff: 120, priceExtraHour: 15 },
  { level: "NIVEL 4", priceDayOff: 90, priceExtraHour: 11.25 },
  { level: "NIVEL 5", priceDayOff: 75, priceExtraHour: 10 },
  { level: "NIVEL 6", priceDayOff: 60, priceExtraHour: 7.5 }
];

export const SALARY_LEVELS = [
  "NIVEL 1",
  "NIVEL 2",
  "NIVEL 3",
  "NIVEL 4",
  "NIVEL 5",
  "NIVEL 6"
];

export const INITIAL_EMPLOYEES_MOCK = [
  {
    id: "emp_ejemplo_1",
    nombre: "Carlos Martínez Ruiz",
    fechaAlta: "2024-01-15",
    fechaBaja: null,
    periodoPrueba: { activo: false, dias: 0, fechaFin: null },
    nivelSalarial: "NIVEL 3",
    otrasRetribuciones: 150,
    adelanto: 0,
    asistencia: { "1": "1", "2": "1", "3": "L", "4": "1" }
  },
  {
    id: "emp_ejemplo_2",
    nombre: "Ana López García",
    fechaAlta: "2025-05-01",
    fechaBaja: null,
    periodoPrueba: { activo: true, dias: 60, fechaFin: "2025-06-30" },
    nivelSalarial: "NIVEL 2",
    otrasRetribuciones: 200,
    adelanto: 50,
    asistencia: { "1": "V", "2": "V", "3": "1" }
  },
  {
    id: "emp_ejemplo_3",
    nombre: "Pedro Sánchez Díaz",
    fechaAlta: "2023-06-01",
    fechaBaja: "2025-06-15",
    periodoPrueba: { activo: false, dias: 0, fechaFin: null },
    nivelSalarial: "NIVEL 4",
    otrasRetribuciones: 0,
    adelanto: 0,
    asistencia: { "1": "1", "2": "1", "3": "1", "16": "SC" }
  }
];

