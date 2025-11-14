import * as React from 'react'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Desglose de Torres',
  description: 'Sistema de búsqueda y cálculo de materiales para torres',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return React.createElement(
    'html',
    { lang: 'es' },
    React.createElement('body', null, children)
  )
}