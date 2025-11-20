'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PlanoViewer, { usePlanoViewer } from '@/components/PlanoViewer';

interface Piece {
  id_item: string;
  texto_breve: string;
  tipo: string;
  fabricante: string;
  cabeza: string;
  parte_division: string;
  cuerpo: string;
  tramo: string;
  posicion: string;
  descripcion: string;
  long_2_principal: string;
  cantidad_x_torre: number;
  peso_unitario: number;
  plano: string;
  mod_plano: string;
}

interface FilterOptions {
  TIPO: string[];
  FABRICANTE: string[];
  CABEZA: string[];
  CUERPO: string[];
  PARTE_DIVISION: string[];
  TRAMO: string[];
}

export default function BuscadorPage() {
  const [filters, setFilters] = useState({
    tipo: '',
    fabricante: '',
    cabeza: '',
    parte: '',
    cuerpo: '',
    tramo: ''
  });
  
  const [options, setOptions] = useState<FilterOptions>({
    TIPO: [],
    FABRICANTE: [],
    CABEZA: [],
    CUERPO: [],
    PARTE_DIVISION: [],
    TRAMO: []
  });
  
  const [results, setResults] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Seleccione filtros para buscar');

  // Hook para el visualizador de planos
  const { isOpen, planoUrl, planoName, openViewer, closeViewer } = usePlanoViewer();

  useEffect(() => {
    loadOptions();
  }, [filters.tipo, filters.fabricante, filters.cabeza, filters.cuerpo, filters.tramo]);

  const loadOptions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.tipo) params.append('TIPO', filters.tipo);
      if (filters.fabricante) params.append('FABRICANTE', filters.fabricante);
      if (filters.cabeza) params.append('CABEZA', filters.cabeza);
      if (filters.cuerpo) params.append('CUERPO', filters.cuerpo);
      if (filters.tramo) params.append('TRAMO', filters.tramo);

      const response = await fetch(`/api/options?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOptions(data.options);
      }
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleFilterChange = (filterName: string, value: any) => {
    let newFilters = { ...filters, [filterName]: value };

    // Lógica de reseteo en cascada
    if (filterName === 'tipo') {
      newFilters = { ...newFilters, fabricante: '', cabeza: '', parte: '', cuerpo: '', tramo: '' };
    }
    else if (filterName === 'fabricante') {
      newFilters = { ...newFilters, cabeza: '', parte: '', cuerpo: '', tramo: '' };
    }
    setFilters(newFilters); 
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Buscando materiales...');
    
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setMessage(data.results.length > 0 ? `✅ ${data.count} piezas encontradas` : '⚠️ No se encontraron resultados');
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      setMessage(`🚨 Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlano = (plano: string, modPlano: string, itemId: string) => {
    if (!plano || plano === '-') {
      alert('⚠️ Este ítem no tiene un plano asociado');
      return;
    }
    const planoUrl = `/planos/${plano}.jpg`;
    const planoTitle = `${itemId} - ${plano}${modPlano && modPlano !== '-' ? ` (Mod: ${modPlano})` : ''}`;
    openViewer(planoUrl, planoTitle);
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen flex flex-col items-center w-full">
      
      {/* --- TARJETA DE CRISTAL (Glassmorphism) --- */}
      <div className="w-full max-w-7xl bg-white/90 backdrop-blur-md p-6 sm:p-10 rounded-2xl shadow-2xl border border-white/40 mt-4 mb-20 relative z-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-300 pb-4 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#003594]">
              Buscador de Materiales
            </h1>
            <p className="text-gray-500 text-sm mt-1">Sistema de gestión de torres de transmisión</p>
          </div>
          
          <Link
            href="/calculadora"
            className="group bg-[#ff6600] hover:bg-[#e65c00] text-white transition-all duration-200 font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2 hover:-translate-y-1"
          >
            <span>Calculadora de Torres</span>
            <span className="group-hover:translate-x-1 transition-transform">➡️</span>
          </Link>
        </div>

        {/* Filtros */}
        <form onSubmit={handleSearch} className="bg-gray-50/80 p-6 rounded-xl border border-gray-200 shadow-inner">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <FilterSelect label="TIPO" value={filters.tipo} options={options.TIPO} onChange={(v) => handleFilterChange('tipo', v)} />
            <FilterSelect label="FABRICANTE" value={filters.fabricante} options={options.FABRICANTE} onChange={(v) => handleFilterChange('fabricante', v)} />
            <FilterSelect label="CABEZA" value={filters.cabeza} options={options.CABEZA} onChange={(v) => handleFilterChange('cabeza', v)} />
            <FilterSelect label="PARTE" value={filters.parte} options={options.PARTE_DIVISION} onChange={(v) => handleFilterChange('parte', v)} />
            <FilterSelect label="CUERPO" value={filters.cuerpo} options={options.CUERPO} onChange={(v) => handleFilterChange('cuerpo', v)} />
            <FilterSelect label="TRAMO" value={filters.tramo} options={options.TRAMO} onChange={(v) => handleFilterChange('tramo', v)} />
          </div>

          <div className="flex justify-center">
             <button
              type="submit"
              disabled={loading}
              className="w-full md:w-1/3 py-3 px-8 bg-[#003594] hover:bg-[#002a75] text-white font-bold rounded-lg transition duration-200 shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? 'Buscando...' : '🔍 Buscar Desglose'}
            </button>
          </div>
        </form>

        {/* Mensaje de Estado */}
        <div className="mt-6 flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${message.includes('✅') ? 'bg-green-500' : message.includes('❌') ? 'bg-red-500' : 'bg-gray-400'}`}></div>
          <p className="font-medium text-gray-700">{message}</p>
        </div>

        {/* Tabla de Resultados */}
        <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white">
          <div className="overflow-x-auto max-h-[55vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  {[
                    'Material', 'Texto Breve', 'Tipo', 'Fabricante', 'Cabeza', 
                    'Parte', 'Cuerpo', 'Tramo', 'Pos.', 'Descripción', 
                    'Long 2', 'Cant.', 'Peso U.', 'Plano', 'Acción'
                  ].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap bg-gray-100">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-6 py-10 text-center text-gray-400 italic">
                      Sin resultados para mostrar
                    </td>
                  </tr>
                ) : (
                  results.map((piece, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition duration-150 group">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{piece.id_item || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.texto_breve || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.tipo}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.fabricante}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.cabeza}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.parte_division}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.cuerpo}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.tramo}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.posicion}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-[200px]" title={piece.descripcion}>{piece.descripcion}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.long_2_principal}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 font-semibold">{piece.cantidad_x_torre}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {piece.peso_unitario ? `${Number(piece.peso_unitario).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{piece.plano || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {piece.plano && piece.plano !== '-' ? (
                          <button
                            onClick={() => handleViewPlano(piece.plano, piece.mod_plano, piece.id_item)}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-md text-xs font-bold transition-colors"
                          >
                            VER
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs select-none">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Visualizador Modal */}
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
    <div className="flex flex-col">
      <label className="mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#003594] focus:border-[#003594] block w-full shadow-sm hover:border-gray-400 transition-colors"
      >
        <option value="">Todos</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}