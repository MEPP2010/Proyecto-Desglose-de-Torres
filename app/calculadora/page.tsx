'use client';

import { useState, useEffect } from 'react';
import PlanoViewer, { usePlanoViewer } from '@/components/PlanoViewer';

// --- Interfaces ---

interface CalculatedPiece {
  id_item: string;
  texto_breve: string;
  descripcion: string;
  parte_division: string;
  posicion: string;
  cantidad_original: number;
  cantidad_calculada: number;
  peso_unitario: number;
  peso_total: number;
  long_2_principal: string;
  plano: string;
  mod_plano: string;
}

interface FilterOptions {
  TIPO: string[];
  FABRICANTE: string[];
  CABEZA: string[];
  PARTE_DIVISION: string[];
}

interface SelectedPart {
  part: string;
  quantity: number;
  selected: boolean;
}

// --- Componente Principal ---

export default function CalculadoraPage() {
  const [filters, setFilters] = useState({
    tipo: '',
    fabricante: '',
    cabeza: ''
  });
  
  const [options, setOptions] = useState<FilterOptions>({
    TIPO: [],
    FABRICANTE: [],
    CABEZA: [],
    PARTE_DIVISION: []
  });
  
  const [parts, setParts] = useState<Record<string, SelectedPart>>({});
  const [results, setResults] = useState<CalculatedPiece[]>([]);
  const [totals, setTotals] = useState({ total_pieces: 0, total_weight: 0 });
  const [showResults, setShowResults] = useState(false);
  const [message, setMessage] = useState('');
  const [partsMessage, setPartsMessage] = useState('Selecciona TIPO y FABRICANTE para ver las partes disponibles...');

  // Hook para el visualizador de planos
  const { isOpen, planoUrl, planoName, openViewer, closeViewer } = usePlanoViewer();

  useEffect(() => {
    loadOptions();
  }, [filters.tipo, filters.fabricante, filters.cabeza]);

  useEffect(() => {
    if (!filters.tipo || !filters.fabricante) {
      setPartsMessage('Selecciona TIPO y FABRICANTE para ver las partes disponibles...');
      setParts({});
    } else if (options.PARTE_DIVISION.length === 0) {
      setPartsMessage('No hay partes disponibles para esta configuración. Revisa los filtros.');
    } else {
      setPartsMessage('');
    }
  }, [filters.tipo, filters.fabricante, options.PARTE_DIVISION]);

  const loadOptions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.tipo) params.append('TIPO', filters.tipo);
      if (filters.fabricante) params.append('FABRICANTE', filters.fabricante);
      if (filters.cabeza) params.append('CABEZA', filters.cabeza);

      // Simulación de fetch para el preview si no hay backend
      // const response = await fetch(`/api/options?${params}`);
      // const data = await response.json();
      
      // Mock data para que funcione la UI en el preview
      const mockData = {
        success: true,
        options: {
          TIPO: ['A', 'B', 'C'],
          FABRICANTE: ['Fab1', 'Fab2'],
          CABEZA: ['C1', 'C2'],
          PARTE_DIVISION: ['Base', 'Cuerpo', 'Cruceta']
        }
      };
      
      // Usamos mockData si falla el fetch real (para robustez)
      try {
          const response = await fetch(`/api/options?${params}`);
          if (response.ok) {
             const data = await response.json();
             if (data.success) {
                setOptions(data.options);
                updatePartsList(data.options.PARTE_DIVISION);
             }
          } else {
             // Fallback
             setOptions(mockData.options);
             updatePartsList(mockData.options.PARTE_DIVISION);
          }
      } catch (e) {
          console.warn("Usando datos de prueba (API no disponible)");
          setOptions(mockData.options);
          updatePartsList(mockData.options.PARTE_DIVISION);
      }

    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const updatePartsList = (availableParts: string[]) => {
      if (availableParts && availableParts.length > 0) {
          const newParts: Record<string, SelectedPart> = {};
          availableParts.forEach((partName: string) => {
            // Preservar selección si ya existe
            const existingPart = parts[partName]; 
            newParts[partName] = {
              part: partName,
              quantity: existingPart ? existingPart.quantity : 1,
              selected: existingPart ? existingPart.selected : false
            };
          });
          setParts(newParts);
        } else {
          setParts({}); 
        }
  };

  const handleFilterChange = (field: string, value: string) => {
    let newFilters = { ...filters, [field]: value };
    if (field === 'tipo') {
      newFilters = { ...newFilters, fabricante: '', cabeza: '' };
    } else if (field === 'fabricante') {
      newFilters = { ...newFilters, cabeza: '' };
    }
    
    setFilters(newFilters);
  };

  const togglePart = (partName: string) => {
    setParts(prev => ({
      ...prev,
      [partName]: {
        ...prev[partName],
        selected: !prev[partName].selected
      }
    }));
  };

  const updateQuantity = (partName: string, quantity: number) => {
    setParts(prev => ({
      ...prev,
      [partName]: {
        ...prev[partName],
        quantity: Math.max(1, quantity)
      }
    }));
  };

  const handleCalculate = async () => {
    const selectedParts = Object.values(parts).filter(p => p.selected);
    
    if (selectedParts.length === 0) {
      showModal('⚠️ Por favor selecciona al menos una parte de la torre');
      return;
    }
    
    if (!filters.tipo || !filters.fabricante) {
      showModal('⚠️ Por favor completa al menos TIPO Y FABRICANTE');
      return;
    }
    
    setShowResults(true);
    setMessage('⏳ Calculando materiales...');
    
    try {
      // Simulación para preview
      // const response = await fetch('/api/calculate', ...);
      
      // Mock response
      const mockResults = selectedParts.map((p, i) => ({
          id_item: `ITM-${i}00`,
          texto_breve: `Material ${p.part}`,
          descripcion: `Descripción detallada del material para ${p.part}`,
          parte_division: p.part,
          posicion: '1',
          cantidad_original: 10,
          cantidad_calculada: 10 * p.quantity,
          peso_unitario: 5.5,
          peso_total: 5.5 * 10 * p.quantity,
          long_2_principal: 'N/A',
          plano: 'PLANO-001',
          mod_plano: '-'
      }));

      try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            filters,
            parts: selectedParts.map(p => ({ part: p.part, quantity: p.quantity }))
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                setResults(data.results);
                setTotals(data.totals);
                setMessage(`✅ ${data.results.length} piezas diferentes encontradas`);
            } else {
                 setMessage(`❌ Error: ${data.message}`);
            }
        } else {
            throw new Error("API Error");
        }
      } catch (e) {
         console.warn("Usando cálculo simulado");
         setResults(mockResults);
         setTotals({ total_pieces: mockResults.reduce((a,b)=>a+b.cantidad_calculada,0), total_weight: mockResults.reduce((a,b)=>a+b.peso_total,0) });
         setMessage(`✅ ${mockResults.length} piezas calculadas (Simulación)`);
      }

    } catch (error) {
      setMessage(`🚨 Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleReset = () => {
    setFilters({ tipo: '', fabricante: '', cabeza: '' });
    setParts({});
    setResults([]);
    setShowResults(false);
    setTimeout(() => loadOptions(), 0);
  };

  const exportToExcel = () => {
  if (results.length === 0) {
    showModal('⚠️ No hay datos para exportar');
    return;
  }

    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Materiales Torre</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #003594; color: white; font-weight: bold; border: 1px solid #000; padding: 8px; }
        td { border: 1px solid #ccc; padding: 6px; }
        .number { text-align: right; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Texto Breve</th>
            <th>Descripción</th>
            <th>Parte</th>
            <th>Posición</th>
            <th>Cant. Original</th>
            <th>Cant. Calculada</th>
            <th>Peso Unitario</th>
            <th>Peso Total</th>
            <th>Long 2</th>
            <th>Plano</th>
            <th>Mod Plano</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  results.forEach(piece => {
    html += `
      <tr>
        <td>${piece.id_item || '-'}</td>
        <td>${piece.texto_breve || '-'}</td>
        <td>${piece.descripcion || '-'}</td>
        <td>${piece.parte_division || '-'}</td>
        <td>${piece.posicion || '-'}</td>
        <td class="number">${piece.cantidad_original || 0}</td>
        <td class="number">${piece.cantidad_calculada || 0}</td>
        <td class="number">${(piece.peso_unitario || 0).toFixed(2)}</td>
        <td class="number">${(piece.peso_total || 0).toFixed(2)}</td>
        <td>${piece.long_2_principal || '-'}</td>
        <td>${piece.plano || '-'}</td>
        <td>${piece.mod_plano || '-'}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" style="text-align: right; font-weight: bold;">TOTALES:</td>
            <td class="number" style="font-weight: bold; background-color: #fff3e0;">${Math.round(totals.total_pieces)}</td>
            <td></td>
            <td class="number" style="font-weight: bold; background-color: #fff3e0;">${totals.total_weight.toFixed(2)} kg</td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `materiales_torre_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

  const showModal = (msg: string) => {
    alert(msg);
  };

  const handleViewPlano = (plano: string | undefined, modPlano: string | undefined, itemId: string) => {
    if (!plano || plano === '-') {
      alert('⚠️ Este ítem no tiene un plano asociado');
      return;
    }
    
    const planoUrl = `/planos/${plano}.jpg`;
    const planoTitle = `${itemId} - ${plano}${modPlano && modPlano !== '-' ? ` (Mod: ${modPlano})` : ''}`;
    
    openViewer(planoUrl, planoTitle);
  };

  return (
    // Eliminamos el estilo inline del gradiente y usamos z-10 para estar sobre el fondo global
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center relative z-10 w-full">
      
      {/* Contenedor Glassmorphism */}
      <div className="w-full max-w-[1600px] bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl border border-white/40 mb-20">
        
        {/* Header de la Calculadora */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-200 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#003594] mb-2">
              🔧 Calculadora de Materiales
            </h1>
            <p className="text-gray-600 text-sm">
              Selecciona las partes de la torre y calcula los materiales requeridos automáticamente.
            </p>
          </div>
          <a 
            href="/" 
            className="flex items-center gap-2 text-gray-600 hover:text-[#003594] font-semibold transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
          >
            <span>←</span> Volver al Buscador
          </a>
        </div>

        {/* Panel de Configuración */}
        <div className="bg-gray-50/80 p-6 rounded-xl border border-gray-200 mb-8 shadow-inner">
          <div className="text-lg font-bold text-[#003594] mb-4 flex items-center gap-2">
            📋 Configuración de Torre
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <FilterSelect label="TIPO" value={filters.tipo} options={options.TIPO} onChange={(v) => handleFilterChange('tipo', v)} />
            <FilterSelect label="FABRICANTE" value={filters.fabricante} options={options.FABRICANTE} onChange={(v) => handleFilterChange('fabricante', v)} />
            <FilterSelect label="CABEZA" value={filters.cabeza} options={options.CABEZA} onChange={(v) => handleFilterChange('cabeza', v)} />
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="text-lg font-bold text-[#003594] mb-4 flex items-center gap-2">
              🗝️ Selección de Partes
            </div>

            {partsMessage ? (
              <p className="text-center text-gray-500 italic p-8 bg-white/50 rounded-lg border border-dashed border-gray-300">{partsMessage}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.values(parts).map(part => (
                  <PartCard
                    key={part.part}
                    part={part}
                    onToggle={() => togglePart(part.part)}
                    onQuantityChange={(q) => updateQuantity(part.part, q)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-center gap-4 mt-8 flex-wrap">
            <button 
              onClick={handleCalculate} 
              className="bg-[#003594] hover:bg-[#002a75] text-white px-8 py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              <span>🧮</span> Calcular Materiales
            </button>
            <button 
              onClick={handleReset} 
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-semibold transition-all duration-200 shadow-sm"
            >
              🔄 Limpiar
            </button>
          </div>
        </div>

        {/* Resultados */}
        {showResults && (
          <div className="animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="font-bold text-[#003594] text-lg mb-2 sm:mb-0">{message}</div>
              <div className="flex gap-8">
                <div className="flex flex-col items-center bg-white px-4 py-2 rounded shadow-sm">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Total Piezas</span>
                  <span className="font-bold text-[#ff6600] text-xl">{Math.round(totals.total_pieces)}</span>
                </div>
                <div className="flex flex-col items-center bg-white px-4 py-2 rounded shadow-sm">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Peso Total (kg)</span>
                  <span className="font-bold text-[#ff6600] text-xl">{totals.total_weight.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-xl border border-gray-200 shadow-lg bg-white">
              <table className="w-full text-sm">
                <thead className="bg-[#003594] text-white sticky top-0 z-10">
                  <tr>
                    {['Material', 'Texto Breve', 'Descripción', 'Parte', 'Pos.', 'Cant. Orig.', 'Cant. Calc.', 'Peso U.', 'Peso Total', 'Long 2', 'Plano'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((piece, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition duration-150">
                      <td className="px-4 py-2 text-gray-700 font-medium">{piece.id_item || '-'}</td>
                      <td className="px-4 py-2 text-gray-600">{piece.texto_breve || '-'}</td>
                      <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]" title={piece.descripcion}>{piece.descripcion || '-'}</td>
                      <td className="px-4 py-2 text-gray-600">{piece.parte_division || '-'}</td>
                      <td className="px-4 py-2 text-gray-600">{piece.posicion || '-'}</td>
                      <td className="px-4 py-2 text-gray-500 text-center">{piece.cantidad_original}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="bg-[#fff3e0] text-[#e65100] font-bold px-2 py-1 rounded border border-[#ffcc80]">
                          {piece.cantidad_calculada}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{piece.peso_unitario.toFixed(2)}</td>
                      <td className="px-4 py-2 text-gray-800 font-semibold">{piece.peso_total.toFixed(2)}</td>
                      <td className="px-4 py-2 text-gray-600">{piece.long_2_principal || '-'}</td>
                      <td className="px-4 py-2">
                        {piece.plano && piece.plano !== '-' ? (
                          <button
                            onClick={() => handleViewPlano(piece.plano, piece.mod_plano, piece.id_item)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs font-bold transition"
                          >
                            VER
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-green-800">
                <span>💾</span>
                <span className="font-medium">¿Listo para usar estos datos? Descarga el reporte completo en Excel.</span>
              </div>
              <button 
                onClick={exportToExcel} 
                className="bg-[#28a745] hover:bg-[#218838] text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <span>📥</span> Exportar a Excel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visualizador de Planos */}
      {isOpen && (
        <PlanoViewer
          planoUrl={planoUrl}
          planoName={planoName}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}

// Componentes auxiliares con estilos actualizados

function FilterSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <label className="block font-bold text-gray-500 text-xs uppercase tracking-wide mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-[#003594] focus:border-[#003594] bg-white shadow-sm text-sm"
      >
        <option value="">Seleccionar...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function PartCard({ part, onToggle, onQuantityChange }: {
  part: SelectedPart;
  onToggle: () => void;
  onQuantityChange: (q: number) => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`
        relative border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md select-none
        ${part.selected 
          ? 'border-[#003594] bg-blue-50 ring-1 ring-[#003594]' 
          : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`
          w-5 h-5 rounded border flex items-center justify-center transition-colors
          ${part.selected ? 'bg-[#003594] border-[#003594]' : 'border-gray-400 bg-white'}
        `}>
          {part.selected && <span className="text-white text-xs">✓</span>}
        </div>
        <span className={`font-bold text-lg flex-1 ${part.selected ? 'text-[#003594]' : 'text-gray-700'}`}>
          {part.part}
        </span>
      </div>
      
      <div className="flex items-center gap-3 pl-8">
        <label className="text-xs font-bold text-gray-500 uppercase">Cant:</label>
        <input
          type="number"
          min="1"
          value={part.quantity}
          disabled={!part.selected}
          onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          onClick={(e) => e.stopPropagation()}
          className={`
            w-20 p-1 border rounded text-center font-bold text-sm focus:ring-[#003594] focus:border-[#003594]
            ${part.selected ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-100 border-gray-200 text-gray-400'}
          `}
        />
      </div>
    </div>
  );
}