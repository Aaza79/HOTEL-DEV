import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppData, Employee, SalaryLevelRate } from '../types';
import { CODES, MONTHS, SC_CODE, DEFAULT_SALARY_TABLE } from '../constants';
import { getSalaryTable } from './storageService';

const getRateForEmployee = (emp: Employee, salaryTable: SalaryLevelRate[]) => {
  const levelKey = (emp.nivelSalarial || 'NIVEL 2').toUpperCase().trim();
  const match = salaryTable.find(s => s.level.toUpperCase().trim() === levelKey || levelKey.includes(s.level.toUpperCase().trim()));
  if (match) return match;
  const defaultMatch = DEFAULT_SALARY_TABLE.find(s => s.level.toUpperCase().trim() === levelKey);
  return defaultMatch || { level: emp.nivelSalarial || 'NIVEL 2', priceDayOff: 130, priceExtraHour: 16.25 };
};

const prepareDataForReport = (data: AppData, employees: Employee[], salaryTable: SalaryLevelRate[]) => {
  const { año, mes } = data.metadata;
  const daysInMonth = new Date(año, mes, 0).getDate();
  const headers = ['Empleado'];
  for (let i = 1; i <= daysInMonth; i++) headers.push(String(i));
  headers.push('Nivel', 'L. Trab', 'Imp. LT', 'H. Ext', 'Imp. HE', 'Otras Ret.', 'Adelanto', 'TOTAL');

  let sumCountLT = 0;
  let sumImpLT = 0;
  let sumTotalHE = 0;
  let sumImpHE = 0;
  let sumOtras = 0;
  let sumAdelanto = 0;
  let grandTotal = 0;

  const body = employees.map(emp => {
    const row: any[] = [emp.nombre];
    const alta = new Date(emp.fechaAlta);
    const baja = emp.fechaBaja ? new Date(emp.fechaBaja) : null;
    let countLT = 0, countL = 0, countV = 0, totalHE = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateCheck = new Date(año, mes - 1, d);
      let cellValue = emp.asistencia[String(d)] || '';
      dateCheck.setHours(0,0,0,0);
      const altaNorm = new Date(alta); altaNorm.setHours(0,0,0,0);
      const bajaNorm = baja ? new Date(baja) : null;
      if(bajaNorm) bajaNorm.setHours(0,0,0,0);

      if (dateCheck < altaNorm || (bajaNorm && dateCheck > bajaNorm)) cellValue = 'SC';
      row.push(cellValue);

      if (cellValue !== 'SC') {
        if (cellValue === 'LT') countLT++;
        if (cellValue === 'L') countL++;
        if (cellValue === 'V') countV++;
      }
      totalHE += emp.horasExtras?.[String(d)] || 0;
    }

    const rate = getRateForEmployee(emp, salaryTable);
    const impLT = countLT * rate.priceDayOff;
    const impHE = totalHE * rate.priceExtraHour;
    const otras = emp.otrasRetribuciones || 0;
    const adelanto = emp.adelanto || 0;
    const totalPercibir = impLT + impHE + otras - adelanto;

    sumCountLT += countLT;
    sumImpLT += impLT;
    sumTotalHE += totalHE;
    sumImpHE += impHE;
    sumOtras += otras;
    sumAdelanto += adelanto;
    grandTotal += totalPercibir;

    const nivelStr = emp.nivelSalarial ? emp.nivelSalarial.split(' - ')[0] : 'NIVEL 2';

    row.push(
      nivelStr,
      String(countLT),
      `${impLT.toFixed(2)} €`,
      String(totalHE),
      `${impHE.toFixed(2)} €`,
      `${otras.toFixed(2)} €`,
      adelanto > 0 ? `-${adelanto.toFixed(2)} €` : '0.00 €',
      `${totalPercibir.toFixed(2)} €`
    );
    return row;
  });

  // Summary Row with Totals
  const totalRow: any[] = ['TOTALES'];
  for (let i = 1; i <= daysInMonth; i++) totalRow.push('');
  totalRow.push(
    '',
    String(sumCountLT),
    `${sumImpLT.toFixed(2)} €`,
    String(sumTotalHE),
    `${sumImpHE.toFixed(2)} €`,
    `${sumOtras.toFixed(2)} €`,
    sumAdelanto > 0 ? `-${sumAdelanto.toFixed(2)} €` : '0.00 €',
    `${grandTotal.toFixed(2)} €`
  );

  return { headers, body, totalRow, daysInMonth, grandTotal };
};

const calculateRatios = (data: AppData, employees: Employee[], daysInMonth: number) => {
  const ratios = [];
  for (let d = 1; d <= daysInMonth; d++) {
    let total = 0;
    employees.forEach(emp => {
      const alta = new Date(emp.fechaAlta);
      const baja = emp.fechaBaja ? new Date(emp.fechaBaja) : null;
      const dateCheck = new Date(data.metadata.año, data.metadata.mes - 1, d);
      dateCheck.setHours(0,0,0,0);
      alta.setHours(0,0,0,0);
      if(baja) baja.setHours(0,0,0,0);
      const status = emp.asistencia[String(d)];
      if (dateCheck < alta || (baja && dateCheck > baja)) return;
      const code = CODES.find(c => c.code === status);
      if (code) total += code.ratio;
    });
    ratios.push(total % 1 === 0 ? total : total.toFixed(1));
  }
  return ratios;
};

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  return [parseInt(cleanHex.substring(0, 2), 16), parseInt(cleanHex.substring(2, 4), 16), parseInt(cleanHex.substring(4, 6), 16)];
};

export const generateExcelReport = async (data: AppData, employees: Employee[]) => {
  let salaryTable = DEFAULT_SALARY_TABLE;
  try {
    const list = await getSalaryTable();
    if (list && list.length > 0) salaryTable = list;
  } catch (e) {}

  const { headers, body, totalRow, daysInMonth } = prepareDataForReport(data, employees, salaryTable);
  const ratios = calculateRatios(data, employees, daysInMonth);
  
  // Legend Data for Excel
  const legendRows = [
    [],
    ['LEYENDA:'],
    ...CODES.map(c => [c.code, c.name]),
    [SC_CODE.code, SC_CODE.name]
  ];

  const wsData = [
    [`CONTROL ASISTENCIA Y RETRIBUCIONES - ${data.metadata.hotel.toUpperCase()}`],
    [`Dpto: ${data.metadata.departamento} | Período: ${MONTHS[data.metadata.mes - 1]} ${data.metadata.año}`],
    [], 
    headers, 
    ...body, 
    totalRow,
    ['RATIO PERSONAL', ...ratios, '', '', '', '', '', '', '', ''],
    ...legendRows
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cuadrante");
  XLSX.writeFile(wb, `Report_${data.metadata.hotel}_${data.metadata.mes}.xlsx`);
};

// Internal function to create the PDF document
const createPDFDoc = async (data: AppData, employees: Employee[]): Promise<jsPDF> => {
  let salaryTable = DEFAULT_SALARY_TABLE;
  try {
    const list = await getSalaryTable();
    if (list && list.length > 0) salaryTable = list;
  } catch (e) {}

  const { headers, body, totalRow, daysInMonth } = prepareDataForReport(data, employees, salaryTable);
  const ratios = calculateRatios(data, employees, daysInMonth);
  const finalBody = [...body, totalRow, ['RATIO PERSONAL', ...ratios, '', '', '', '', '', '', '', '']];
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(12);
  doc.text(`CONTROL ASISTENCIA Y RETRIBUCIONES - ${data.metadata.hotel} (${data.metadata.departamento})`, 14, 12);
  doc.setFontSize(9);
  doc.text(`Período: ${MONTHS[data.metadata.mes - 1]} ${data.metadata.año}`, 14, 17);

  autoTable(doc, {
    startY: 20, 
    head: [headers], 
    body: finalBody, 
    theme: 'grid', 
    styles: { fontSize: 5.5, cellPadding: 0.8, halign: 'center' },
    didParseCell: (d) => {
      // Style Totals row (penultimate row)
      if (d.section === 'body' && d.row.index === finalBody.length - 2) {
        d.cell.styles.fillColor = [220, 230, 245];
        d.cell.styles.textColor = [15, 23, 42];
        d.cell.styles.fontStyle = 'bold';
      }
      // Style Ratio row (last row)
      if (d.section === 'body' && d.row.index === finalBody.length - 1) { 
        d.cell.styles.fillColor = [40, 40, 40]; 
        d.cell.styles.textColor = 255; 
      }
      if (d.section === 'body' && d.column.index > 0 && d.column.index <= daysInMonth && d.row.index < finalBody.length - 2) {
        const val = d.cell.raw as string;
        if (val === 'SC') d.cell.styles.fillColor = [60, 60, 60];
        const c = CODES.find(x => x.code === val);
        if (c) { const rgb = hexToRgb(c.bgColor); d.cell.styles.fillColor = [rgb[0], rgb[1], rgb[2]]; d.cell.styles.textColor = c.textColor === '#FFFFFF' ? 255 : 0; }
      }
    }
  });

  // Draw Legend manually at bottom
  let startY = (doc as any).lastAutoTable.finalY + 8;
  
  if (startY > 180) {
    doc.addPage();
    startY = 15;
  }

  doc.setFontSize(7.5);
  doc.text("LEYENDA:", 14, startY);
  startY += 4;

  let xPos = 14;
  const itemsPerRow = 6;
  let count = 0;

  [...CODES, SC_CODE].forEach((code) => {
      if (count > 0 && count % itemsPerRow === 0) {
          xPos = 14;
          startY += 6;
      }

      const rgb = hexToRgb(code.bgColor);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(xPos, startY - 2.5, 3.5, 3.5, 'F');
      
      doc.setTextColor(0);
      doc.text(`${code.code} - ${code.name}`, xPos + 5, startY);
      
      xPos += 45;
      count++;
  });

  return doc;
};

export const generatePDFReport = async (data: AppData, employees: Employee[]) => {
  const doc = await createPDFDoc(data, employees);
  doc.save(`Report_${data.metadata.hotel}_${data.metadata.mes}.pdf`);
};

export const sharePDFReport = async (data: AppData, employees: Employee[]) => {
  const doc = await createPDFDoc(data, employees);
  const blob = doc.output('blob');
  const fileName = `Reporte_${data.metadata.departamento}_${MONTHS[data.metadata.mes - 1]}.pdf`;
  
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Informe Asistencia - ${data.metadata.departamento}`,
        text: `Adjunto informe de asistencia del departamento ${data.metadata.departamento} para ${MONTHS[data.metadata.mes - 1]}.`,
        files: [file]
      });
      return;
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.error('Error sharing:', error);
      } else {
        return;
      }
    }
  }

  doc.save(fileName);
  
  const subject = encodeURIComponent(`Informe Asistencia: ${data.metadata.departamento} - ${MONTHS[data.metadata.mes - 1]}`);
  const body = encodeURIComponent(`Adjunto el informe de asistencia correspondiente.\n\n(NOTA: El archivo se ha descargado en tu dispositivo. Por favor, adjúntalo manualmente a este correo).`);
  
  setTimeout(() => {
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    alert("ℹ️ El informe se ha descargado en tu dispositivo.\n\nSe ha abierto tu cliente de correo. Por favor, adjunta manualmente el archivo PDF descargado.");
  }, 500);
};