// app/calculadora/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PlanoViewer, { usePlanoViewer } from '@/components/PlanoViewer';

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

      const response = await fetch(`/api/options?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOptions(data.options);

        if (data.options.PARTE_DIVISION && data.options.PARTE_DIVISION.length > 0) {
          const newParts: Record<string, SelectedPart> = {};
          data.options.PARTE_DIVISION.forEach((partName: string) => {
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
      }
    } catch (error) {
      console.error('Error loading options:', error);
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
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          parts: selectedParts.map(p => ({ part: p.part, quantity: p.quantity }))
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setTotals(data.totals);
        setMessage(`✅ ${data.results.length} piezas diferentes encontradas`);
      } else {
        setMessage(`❌ Error: ${data.message}`);
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

  const exportToCSV = () => {
    if (results.length === 0) {
      showModal('⚠️ No hay datos para exportar');
      return;
    }

    let csv = 'Material,Descripción,Parte,Posición,Cant. Original,Cant. Calculada,Peso Unit.,Peso Total,Long 2,Plano,Mod Plano\n';
    
    results.forEach(piece => {
      const row = [
        piece.id_item || '-',
        piece.texto_breve || '-',
        piece.descripcion || '-',
        piece.parte_division || '-',
        piece.posicion || '-',
        piece.cantidad_original || 0,
        piece.cantidad_calculada || 0,
        (piece.peso_unitario || 0).toFixed(2),
        (piece.peso_total || 0).toFixed(2),
        piece.long_2_principal || '-',
        piece.plano || '-',
        piece.mod_plano || '-'
      ].map(v => `"${v}"`).join(',');
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `materiales_torre_${Date.now()}.csv`;
    link.click();
  };

  const showModal = (msg: string) => {
    alert(msg);
  };

  const handleViewPlano = (plano: string | undefined, modPlano: string | undefined, itemId: string) => {
    if (!plano || plano === '-') {
      alert('⚠️ Este ítem no tiene un plano asociado');
      return;
    }
    
    const planoUrl = `/planos/${plano}`;
    const planoTitle = `${itemId} - ${plano}${modPlano && modPlano !== '-' ? ` (Mod: ${modPlano})` : ''}`;
    
    openViewer(planoUrl, planoTitle);
  };

  return (
    <div className="min-h-screen p-5" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-[1600px] mx-auto bg-white p-8 rounded-xl shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">🔧 Calculadora de Materiales - Torres</h1>
            <p className="text-[#7f8c8d] text-sm">Selecciona las partes de la torre que necesitas y calcula automáticamente los materiales requeridos</p>
          </div>
          <Link href="/" className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold">
            ← Volver al Buscador
          </Link>
        </div>

        <div className="bg-[#f8f9fa] p-5 rounded-lg border-2 border-[#e9ecef] mb-6">
          <div className="text-xl font-bold text-[#495057] mb-4 flex items-center gap-2">
            📋 Configuración de Torre
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <FilterSelect label="TIPO:" value={filters.tipo} options={options.TIPO} onChange={(v) => handleFilterChange('tipo', v)} />
            <FilterSelect label="FABRICANTE:" value={filters.fabricante} options={options.FABRICANTE} onChange={(v) => handleFilterChange('fabricante', v)} />
            <FilterSelect label="CABEZA:" value={filters.cabeza} options={options.CABEZA} onChange={(v) => handleFilterChange('cabeza', v)} />
          </div>

          <div className="text-xl font-bold text-[#495057] mb-4 mt-6 flex items-center gap-2">
            🗝️ Selecciona las Partes de la Torre
          </div>

          {partsMessage ? (
            <p className="text-center text-[#6c757d] italic p-5 bg-[#f8f9fa] rounded-lg">{partsMessage}</p>
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

          <div className="flex gap-4 mt-5 flex-wrap">
            <button onClick={handleCalculate} className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition">
              🧮 Calcular Materiales
            </button>
            <button onClick={handleReset} className="bg-[#6c757d] hover:bg-[#5a6268] text-white px-8 py-3 rounded-lg font-semibold transition">
              🔄 Limpiar
            </button>
          </div>
        </div>

        {showResults && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4 p-4 bg-[#f8f9fa] rounded-lg">
              <div className="font-bold text-[#495057]">{message}</div>
              <div className="flex gap-5 text-sm">
                <div className="flex flex-col items-center">
                  <span className="text-[#6c757d] text-xs">Total Piezas</span>
                  <span className="font-bold text-[#667eea] text-xl">{Math.round(totals.total_pieces)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[#6c757d] text-xs">Peso Total (kg)</span>
                  <span className="font-bold text-[#667eea] text-xl">{totals.total_weight.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-lg border-2 border-[#dee2e6]">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white sticky top-0 z-10">
                  <tr>
                    {['Material', 'Texto Breve', 'Descripción', 'Parte', 'Posición', 'Cant. Original', 'Cant. Calculada', 'Peso Unit. (kg)', 'Peso Total (kg)', 'Long 2', 'Ver Plano'].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((piece, idx) => (
                    <tr key={idx} className="border-b border-[#e9ecef] hover:bg-[#f8f9fa]">
                      <td className="px-3 py-2">{piece.id_item || '-'}</td>
                      <td className="px-3 py-2">{piece.texto_breve || '-'}</td>
                      <td className="px-3 py-2">{piece.descripcion || '-'}</td>
                      <td className="px-3 py-2">{piece.parte_division || '-'}</td>
                      <td className="px-3 py-2">{piece.posicion || '-'}</td>
                      <td className="px-3 py-2">{piece.cantidad_original}</td>
                      <td className="px-3 py-2">
                        <span className="bg-[#fff3cd] text-[#856404] font-bold px-2 py-1 rounded">{piece.cantidad_calculada}</span>
                      </td>
                      <td className="px-3 py-2">{piece.peso_unitario.toFixed(2)}</td>
                      <td className="px-3 py-2">{piece.peso_total.toFixed(2)}</td>
                      <td className="px-3 py-2">{piece.long_2_principal || '-'}</td>
                      <td className="px-3 py-2">
                        {piece.plano && piece.plano !== '-' ? (
                          <button
                            onClick={() => handleViewPlano(piece.plano, piece.mod_plano, piece.id_item)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                            title="Ver plano"
                          >
                            📐 Ver
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-[#e7f3ff] rounded-lg flex justify-between items-center">
              <span>💾 Exportar resultados para usar en tu proyecto</span>
              <button onClick={exportToCSV} className="bg-[#28a745] hover:bg-[#218838] text-white px-6 py-2 rounded-lg font-semibold">
                📥 Exportar a CSV
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

function FilterSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block font-semibold text-[#495057] mb-1 text-sm">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border-2 border-[#dee2e6] rounded-md focus:border-[#667eea] focus:outline-none"
      >
        <option value="">Seleccionar {label.replace(':', '')}</option>
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
      className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition hover:shadow-lg ${
        part.selected ? 'border-[#667eea] bg-[#f0f3ff]' : 'border-[#dee2e6]'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={part.selected}
          onChange={onToggle}
          className="w-5 h-5"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="font-bold text-lg flex-1">{part.part}</span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <label className="text-sm text-[#495057]">Cantidad:</label>
        <input
          type="number"
          min="1"
          value={part.quantity}
          disabled={!part.selected}
          onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          onClick={(e) => e.stopPropagation()}
          className="w-20 p-1 border-2 border-[#dee2e6] rounded text-center font-bold disabled:opacity-50"
        />
      </div>
    </div>
  );
}