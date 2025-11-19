'use client';

import { useState, useRef, useEffect } from 'react';

interface PlanoViewerProps {
  planoUrl: string;
  planoName: string;
  onClose: () => void;
}

export default function PlanoViewer({ planoUrl, planoName, onClose }: PlanoViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resetear cuando cambia la imagen
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsLoading(true);
    setImageError(false);
  }, [planoUrl]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(5, scale * delta));
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Solo botón izquierdo
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(5, prev * 1.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev / 1.2));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Ajustar al 90% del contenedor para dejar margen
      const scaleX = (containerWidth * 0.9) / 1920; // Asumiendo imagen de ~1920px
      const scaleY = (containerHeight * 0.9) / 1080; // Asumiendo imagen de ~1080px
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setScale(newScale);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleRotate = () => {
    // Rotar 90 grados (podrías implementar esto con transform)
    alert('Funcionalidad de rotación - próximamente');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = planoUrl;
    link.download = planoName || 'plano.png';
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      {/* Header con controles */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold">📐 {planoName || 'Plano'}</h3>
          <span className="text-sm text-gray-400">Zoom: {Math.round(scale * 100)}%</span>
        </div>
        
        <div className="flex gap-2">
          {/* Controles de zoom */}
          <button
            onClick={handleZoomOut}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded transition"
            title="Alejar (Scroll down)"
          >
            🔍−
          </button>
          <button
            onClick={handleZoomIn}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded transition"
            title="Acercar (Scroll up)"
          >
            🔍+
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded transition"
            title="Restablecer vista"
          >
            ↺ Reset
          </button>
          <button
            onClick={handleFitToScreen}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded transition"
            title="Ajustar a pantalla"
          >
            ⛶ Ajustar
          </button>
          
          <div className="border-l border-gray-600 mx-2"></div>
          
          {/* Controles adicionales */}
          <button
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded transition"
            title="Descargar plano"
          >
            💾 Descargar
          </button>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded transition font-bold"
            title="Cerrar (Esc)"
          >
            ✕ Cerrar
          </button>
        </div>
      </div>

      {/* Área de visualización */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-xl">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
              Cargando plano...
            </div>
          </div>
        )}

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <div className="text-xl mb-2">No se pudo cargar el plano</div>
              <div className="text-sm text-gray-400">
                URL: {planoUrl}
              </div>
              <button
                onClick={onClose}
                className="mt-4 bg-red-600 hover:bg-red-700 px-6 py-2 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <img
            src={planoUrl}
            alt={planoName}
            className="max-w-none select-none"
            draggable={false}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setImageError(true);
            }}
            style={{
              display: imageError ? 'none' : 'block'
            }}
          />
        </div>

        {/* Instrucciones de uso */}
        {!isLoading && !imageError && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white text-sm p-3 rounded">
            <div className="font-bold mb-1">💡 Controles:</div>
            <div>• Arrastrar con el mouse para mover</div>
            <div>• Scroll para hacer zoom</div>
            <div>• Botones superiores para más opciones</div>
          </div>
        )}
      </div>

      {/* Footer con información */}
      <div className="bg-gray-800 text-white text-sm p-2 text-center">
        <span className="text-gray-400">
          Posición: X: {Math.round(position.x)}px, Y: {Math.round(position.y)}px
        </span>
      </div>
    </div>
  );
}

// Hook ESC para cerrar
export function usePlanoViewer() {
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    planoUrl: string;
    planoName: string;
  }>({
    isOpen: false,
    planoUrl: '',
    planoName: ''
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewerState.isOpen) {
        setViewerState({ isOpen: false, planoUrl: '', planoName: '' });
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [viewerState.isOpen]);

  const openViewer = (planoUrl: string, planoName: string) => {
    setViewerState({ isOpen: true, planoUrl, planoName });
  };

  const closeViewer = () => {
    setViewerState({ isOpen: false, planoUrl: '', planoName: '' });
  };

  return {
    ...viewerState,
    openViewer,
    closeViewer
  };
}