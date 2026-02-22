import React from 'react';
import { CODES } from '../constants';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b bg-blue-600 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">📖 Manual de Usuario Actualizado</h2>
          <button onClick={onClose} className="text-white hover:text-blue-100 text-3xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 text-gray-800 leading-relaxed">
          
          {/* 1. INTRODUCCIÓN */}
          <section>
            <h3 className="text-xl font-bold text-blue-800 mb-3 border-b pb-1">1. Introducción</h3>
            <p className="mb-2"><strong>Sistema de Control de Asistencia</strong> es la herramienta centralizada para gestionar el personal de Magic Hotels Can Picafort Palace y Trend Hotel.</p>
            <p className="text-sm text-gray-600">
              Esta versión incluye sincronización automática de datos, generación avanzada de informes y control de cierres mensuales.
            </p>
          </section>

          {/* 2. INTERFAZ Y SELECCIÓN */}
          <section>
            <h3 className="text-xl font-bold text-blue-800 mb-3 border-b pb-1">2. Uso del Cuadrante</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-700 mb-2">Selección de Celdas</h4>
                <p className="text-sm text-gray-600 mb-2">Las celdas seleccionadas se resaltan con un <strong>borde azul interior</strong>.</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li><strong>Click simple:</strong> Selecciona una única celda.</li>
                  <li><strong>Arrastrar:</strong> Selecciona un bloque de días consecutivos.</li>
                  <li><strong>Ctrl + Click:</strong> Añade o quita celdas individuales a la selección.</li>
                  <li><strong>Shift + Click:</strong> Selecciona todo el rango desde la última celda activa.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-700 mb-2">Aplicar Asistencia</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Una vez seleccionadas las celdas, usa la <strong>Barra de Herramientas Superior</strong> o las teclas rápidas.
                </p>
                <div className="bg-gray-100 p-2 rounded text-xs border border-gray-200">
                  <strong>Tip:</strong> Puedes pulsar la tecla "1" para marcar días trabajados o "L" para libres rápidamente.
                </div>
              </div>
            </div>
          </section>

          {/* 3. GESTIÓN DE EMPLEADOS (NUEVO: REPLICACIÓN) */}
          <section>
            <h3 className="text-xl font-bold text-blue-800 mb-3 border-b pb-1">3. Gestión de Empleados y Sincronización</h3>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
              <h4 className="font-bold text-blue-900 mb-1">🔄 Replicación de Datos (Sincronización Inteligente)</h4>
              <p className="text-sm text-blue-800">
                El sistema ahora funciona como una base de datos centralizada.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-blue-800">
                <li><strong>Crear/Editar:</strong> Si modificas el nombre, fecha de alta o baja de un empleado, el cambio <strong>se aplica automáticamente a todos los meses</strong> (pasados y futuros) de ese hotel y departamento.</li>
                <li><strong>Eliminar:</strong> Si eliminas un empleado, se borrará de todos los meses registrados.</li>
              </ul>
            </div>
            
            <h4 className="font-bold text-gray-700 mb-2">Periodo de Prueba</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>Los empleados en prueba muestran un icono ⏱️ junto al nombre.</li>
              <li>Las celdas durante el periodo de prueba tienen un <strong>borde inferior naranja</strong> para fácil identificación.</li>
              <li>Se puede configurar a 45, 60 o 120 días desde la fecha de alta.</li>
            </ul>
          </section>

          {/* 4. GUARDADO Y REPORTES */}
          <section>
            <h3 className="text-xl font-bold text-blue-800 mb-3 border-b pb-1">4. Guardado e Informes</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-700 mb-2">💾 Guardado Automático</h4>
                <p className="text-sm text-gray-600">
                  No necesitas pulsar ningún botón de guardar. Cada cambio que haces en el cuadrante se guarda instantáneamente.
                  Verás un indicador <strong>"Sincronizando..."</strong> y luego <strong>"✓ Guardado"</strong> en la esquina inferior derecha.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 mb-2">📥 Descarga de Informes</h4>
                <p className="text-sm text-gray-600 mb-2">Despliega el menú "Descargar Informe" para elegir:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li><strong>PDF (Horizontal):</strong> Genera un documento listo para imprimir, con colores y leyenda.</li>
                  <li><strong>Excel (.xlsx):</strong> Genera una hoja de cálculo editable con fórmulas y formatos.</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <h4 className="font-bold text-gray-700 text-sm mb-1">Copias de Seguridad (Backup)</h4>
              <p className="text-xs text-gray-600">
                Usa los botones <strong>"Backup JSON"</strong> y <strong>"Restaurar JSON"</strong> para guardar una copia física de los datos en tu ordenador o transferirlos a otro dispositivo manualmente.
              </p>
            </div>
          </section>

          {/* 5. BLOQUEO DE MESES */}
          <section>
            <h3 className="text-xl font-bold text-blue-800 mb-3 border-b pb-1">5. Cierre Mensual y Bloqueos</h3>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
              <div className="text-2xl">🔒</div>
              <div>
                <h4 className="font-bold text-red-900">Política de Cierre Automático</h4>
                <p className="text-sm text-red-800 mt-1">
                  Por seguridad, el cuadrante de asistencia <strong>se bloquea automáticamente 7 días después de finalizar el mes</strong>.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-red-800">
                  <li>Aparecerá un aviso rojo indicando "ESTE MES ESTÁ CERRADO".</li>
                  <li>Podrás visualizar los datos y generar informes PDF/Excel.</li>
                  <li><strong>No podrás:</strong> Modificar asistencia, añadir empleados o importar backups en ese mes.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 6. LEYENDA DE CÓDIGOS */}
          <section>
            <h3 className="text-xl font-bold text-blue-800 mb-3 border-b pb-1">6. Referencia de Códigos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Código</th>
                    <th className="p-2 border">Descripción</th>
                    <th className="p-2 border">Ratio</th>
                    <th className="p-2 border">Tecla</th>
                  </tr>
                </thead>
                <tbody>
                  {CODES.map(c => (
                    <tr key={c.code} className="border-b">
                      <td className="p-2 border font-bold text-center" style={{ backgroundColor: c.bgColor, color: c.textColor }}>{c.code}</td>
                      <td className="p-2 border">{c.name}</td>
                      <td className="p-2 border text-center">{c.ratio}</td>
                      <td className="p-2 border text-center font-mono bg-gray-50">{c.key.toUpperCase()}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2 border font-bold bg-[#37474F] text-[#90A4AE] text-center">SC</td>
                    <td className="p-2 border">Sin Contrato (Automático según Fechas Alta/Baja)</td>
                    <td className="p-2 border text-center">0</td>
                    <td className="p-2 border text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>
        
        <div className="p-4 border-t bg-gray-50 text-right">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium shadow-sm transition-colors"
          >
            Entendido, volver a la aplicación
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualModal;