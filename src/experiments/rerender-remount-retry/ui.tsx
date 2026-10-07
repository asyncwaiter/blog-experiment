'use client'

import type { CSSProperties, ReactNode } from 'react'

export const panelStyle: CSSProperties = {
  border: '1px solid #d4d4d4',
  borderRadius: 6,
  padding: '1rem 1.1rem',
  marginBottom: '1.5rem',
  background: '#fcfcfc',
}

export const noteStyle: CSSProperties = {
  color: '#666',
  fontSize: '0.8rem',
  margin: '0.2rem 0 0.9rem',
}

export const controlRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.4rem',
  marginBottom: '0.9rem',
}

export const probeBoxStyle: CSSProperties = {
  border: '1px dashed #bbb',
  borderRadius: 4,
  padding: '0.6rem 0.8rem',
  marginBottom: '0.9rem',
  minHeight: '3.2rem',
  background: '#fff',
}

type ButtonProps = {
  readonly onClick: () => void
  readonly disabled?: boolean
  readonly tone?: 'default' | 'primary'
  readonly children: ReactNode
}

export function Button({
  onClick,
  disabled = false,
  tone = 'default',
  children,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        font: 'inherit',
        fontSize: '0.8rem',
        padding: '0.3rem 0.6rem',
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid',
        borderColor: tone === 'primary' ? '#1f6feb' : '#c0c0c0',
        background: tone === 'primary' ? '#1f6feb' : '#fff',
        color: tone === 'primary' ? '#fff' : '#222',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}
