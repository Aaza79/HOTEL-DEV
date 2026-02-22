import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppData, Employee } from '../types';
import { CODES, MONTHS, SC_CODE } from '../constants';

const prepareDataForReport = (data: AppData, employees: Employee[]) => {
  const { año, mes } = data.metadata;
  const daysInMonth = new Date(año, mes, 0).getDate();
  const headers = ['Empleado'];
  for (let i = 1; i <= daysInMonth; i++) headers.push(String(i));
  headers.push('L. Trab', 'L. Disfr', 'Vacac', 'H. Ext');

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
    row.push(String(countLT), String(countL), String(countV), String(totalHE));
    return row;
  });

  return { headers, body, daysInMonth };
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

export const generateExcelReport = (data: AppData, employees: Employee[]) => {
  const { headers, body, daysInMonth } = prepareDataForReport(data, employees);
  const ratios = calculateRatios(data, employees, daysInMonth);
  
  // Legend Data for Excel
  const legendRows = [
    [],
    ['LEYENDA:'],
    ...CODES.map(c => [c.code, c.name]),
    [SC_CODE.code, SC_CODE.name]
  ];

  const wsData = [
    [`CONTROL ASISTENCIA - ${data.metadata.hotel.toUpperCase()}`],
    [`Dpto: ${data.metadata.departamento} | Período: ${MONTHS[data.metadata.mes - 1]} ${data.metadata.año}`],
    [], headers, ...body, ['RATIO PERSONAL', ...ratios, '', '', '', ''],
    ...legendRows
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cuadrante");
  XLSX.writeFile(wb, `Report_${data.metadata.hotel}_${data.metadata.mes}.xlsx`);
};

// Internal function to create the PDF document
const createPDFDoc = (data: AppData, employees: Employee[]): jsPDF => {
  const { headers, body, daysInMonth } = prepareDataForReport(data, employees);
  const ratios = calculateRatios(data, employees, daysInMonth);
  const finalBody = [...body, ['RATIO PERSONAL', ...ratios, '', '', '', '']];
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.text(`CONTROL - ${data.metadata.hotel} (${data.metadata.departamento})`, 14, 15);
  autoTable(doc, {
    startY: 20, head: [headers], body: finalBody, theme: 'grid', styles: { fontSize: 6, cellPadding: 1, halign: 'center' },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === finalBody.length - 1) { d.cell.styles.fillColor = [40, 40, 40]; d.cell.styles.textColor = 255; }
      if (d.section === 'body' && d.column.index > 0 && d.column.index <= daysInMonth && d.row.index < finalBody.length - 1) {
        const val = d.cell.raw as string;
        if (val === 'SC') d.cell.styles.fillColor = [60, 60, 60];
        const c = CODES.find(x => x.code === val);
        if (c) { const rgb = hexToRgb(c.bgColor); d.cell.styles.fillColor = [rgb[0], rgb[1], rgb[2]]; d.cell.styles.textColor = c.textColor === '#FFFFFF' ? 255 : 0; }
      }
    }
  });

  // Draw Legend manually at bottom
  let startY = (doc as any).lastAutoTable.finalY + 10;
  
  // Check if we need a new page for legend
  if (startY > 180) {
    doc.addPage();
    startY = 20;
  }

  doc.setFontSize(8);
  doc.text("LEYENDA:", 14, startY);
  startY += 5;

  let xPos = 14;
  const itemsPerRow = 5;
  let count = 0;

  [...CODES, SC_CODE].forEach((code) => {
      if (count > 0 && count % itemsPerRow === 0) {
          xPos = 14;
          startY += 8;
      }

      // Draw Square Box
      const rgb = hexToRgb(code.bgColor);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(xPos, startY - 3, 4, 4, 'F');
      
      // Draw Text
      doc.setTextColor(0);
      doc.text(`${code.code} - ${code.name}`, xPos + 6, startY);
      
      xPos += 50; // Spacing
      count++;
  });

  return doc;
};

export const generatePDFReport = (data: AppData, employees: Employee[]) => {
  const doc = createPDFDoc(data, employees);
  doc.save(`Report_${data.metadata.hotel}.pdf`);
};

export const sharePDFReport = async (data: AppData, employees: Employee[]) => {
  const doc = createPDFDoc(data, employees);
  const blob = doc.output('blob');
  const fileName = `Reporte_${data.metadata.departamento}_${MONTHS[data.metadata.mes - 1]}.pdf`;
  
  // Create a File object from the blob
  const file = new File([blob], fileName, { type: 'application/pdf' });

  // 1. Try to use Web Share API (Mobile & supported browsers)
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
        return; // User cancelled share
      }
    }
  }

  // 2. Fallback: Download file + Open Mail Client
  // Note: Mailto cannot attach files programmatically due to browser security.
  // We download the file and ask user to attach it.
  
  doc.save(fileName);
  
  const subject = encodeURIComponent(`Informe Asistencia: ${data.metadata.departamento} - ${MONTHS[data.metadata.mes - 1]}`);
  const body = encodeURIComponent(`Adjunto el informe de asistencia correspondiente.\n\n(NOTA: El archivo se ha descargado en tu dispositivo. Por favor, adjúntalo manualmente a este correo).`);
  
  setTimeout(() => {
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    alert("ℹ️ El informe se ha descargado en tu dispositivo.\n\nSe ha abierto tu cliente de correo. Por favor, adjunta manualmente el archivo PDF descargado.");
  }, 500);
};