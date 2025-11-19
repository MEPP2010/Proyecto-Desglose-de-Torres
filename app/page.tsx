// app/page.tsx
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
  const [message, setMessage] = useState('Esperando búsqueda... (Búsqueda exacta activada)');

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
    setMessage('Buscando...');
    
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setMessage(`✅ Resultados encontrados: ${data.count} (Búsqueda exacta)`);
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
    
    // Aquí debes construir la URL real de tu plano
    // Por ejemplo, si los planos están en /public/planos/ o en un CDN
    const planoUrl = `/planos/${plano}.jpg`;
    const planoTitle = `${itemId} - ${plano}${modPlano && modPlano !== '-' ? ` (Mod: ${modPlano})` : ''}`;
    
    openViewer(planoUrl, planoTitle);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="container mx-auto max-w-7xl bg-white p-6 sm:p-10 rounded-xl shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b-2 border-gray-200 pb-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#004d99]">
            Buscador de Desglose de Torres 🔩
          </h1>
          <Link
            href="/calculadora"
            className="bg-indigo-600 text-white hover:bg-indigo-700 transition duration-150 ease-in-out font-semibold py-2 px-4 rounded-lg shadow-md flex items-center whitespace-nowrap text-sm sm:text-base"
          >
            <span className="mr-2 hidden sm:inline">➡️</span> Ir a Calculadora
          </Link>
        </div>

        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <FilterSelect
              label="TIPO:"
              value={filters.tipo}
              options={options.TIPO}
              onChange={(v) => handleFilterChange('tipo', v)}
              placeholder="Todos los Tipos"
            />
            <FilterSelect
              label="FABRICANTE:"
              value={filters.fabricante}
              options={options.FABRICANTE}
              onChange={(v) => handleFilterChange('fabricante', v)}
              placeholder="Todos los Fabricantes"
            />
            <FilterSelect
              label="CABEZA:"
              value={filters.cabeza}
              options={options.CABEZA}
              onChange={(v) => handleFilterChange('cabeza', v)}
              placeholder="Todas las Cabezas"
            />
            <FilterSelect
              label="PARTE (DIVISIÓN):"
              value={filters.parte}
              options={options.PARTE_DIVISION}
              onChange={(v) => handleFilterChange('parte', v)}
              placeholder="Todas las Partes"
            />
            <FilterSelect
              label="CUERPO:"
              value={filters.cuerpo}
              options={options.CUERPO}
              onChange={(v) => handleFilterChange('cuerpo', v)}
              placeholder="Todos los Cuerpos"
            />
            <FilterSelect
              label="TRAMO:"
              value={filters.tramo}
              options={options.TRAMO}
              onChange={(v) => handleFilterChange('tramo', v)}
              placeholder="Todos los Tramos"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto mt-2 py-3 px-6 bg-[#007bff] text-white font-bold rounded-md hover:bg-blue-600 transition duration-200 shadow-lg disabled:opacity-50"
          >
            🔍 Buscar Desglose
          </button>
        </form>

        <p className="mt-8 font-semibold text-gray-600">{message}</p>

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto mt-4 border border-gray-200 rounded-lg shadow-inner">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {['Material', 'Texto Breve', 'TIPO', 'FABRICANTE', 'CABEZA', 'PARTE(DIVISION)', 'CUERPO', 'TRAMO', 'Posición', 'Descripción', 'Long 2', 'Cantidad x Torre', 'Peso Unitario', 'PLANO', 'Mod Plano', 'Ver Plano'].map(header => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((piece, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition duration-100">
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.id_item || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.texto_breve || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.tipo || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.fabricante || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.cabeza || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.parte_division || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.cuerpo || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.tramo || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.posicion || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.descripcion || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.long_2_principal || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.cantidad_x_torre || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">
                    {piece.peso_unitario ? `${Number(piece.peso_unitario).toFixed(2)} kg` : '-'}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.plano || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{piece.mod_plano || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm">
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

function FilterSelect({ label, value, options, onChange, placeholder }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="form-group">
      <label className="block mb-1 font-semibold text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="p-2 border border-gray-300 rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}