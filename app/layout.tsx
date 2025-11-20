import * as React from 'react'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Desglose de Torres - ISA Transelca',
  description: 'Sistema de búsqueda y cálculo de materiales para torres',
  icons: {
    icon: '/icon.png', // o '/logo.png'
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png', // Opcional para iOS
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="relative min-h-screen w-full bg-[#003594]">
        
        {/* --- CAPA DE FONDO (Imágenes Decorativas) --- */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          
          {/* 1. Mariposas (Esquina superior izquierda) */}
          {/* CAMBIO: Se cambió 'left-10' a 'left-0' para moverlas totalmente a la izquierda */}
          <div className="absolute top-10 left-0 w-32 md:w-48 lg:w-64 animate-float opacity-90">
            <img 
              src="/img/mariposas.png" 
              alt="Mariposas" 
              // Corrección: Se completó 'h-' a 'h-auto' para asegurar la proporción
              className="w-full h-auto object-contain"
            />
          </div>

          {/* 2. Línea Naranja (Curva central) */}
          <div className="absolute top-1/4 left-0 w-full opacity-80">
             <img 
              src="/img/linea-naranja.png" 
              alt="Linea Decorativa" 
              className="w-full h-auto object-cover min-h-[200px]"
            />
          </div>

          {/* 3. Jaguar (Esquina inferior derecha) */}
          <div className="absolute bottom-0 right-0 z-0">
             <img 
              src="/img/jaguar.png" 
              alt="Jaguar" 
              className="w-64 md:w-96 lg:w-[450px] h-auto object-contain translate-y-4" 
            />
          </div>

          {/* 4. Logo ISA Transelca (Esquina inferior izquierda) */}
          <div className="absolute bottom-6 left-6 z-10">
             <img 
              src="/img/logo-isa.png" 
              alt="ISA Transelca" 
              className="w-32 md:w-48 lg:w-60 h-auto object-contain"
            />
          </div>
        </div>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <main className="relative z-10 min-h-screen flex flex-col">
          {children}
        </main>
        
      </body>
    </html>
  )
}