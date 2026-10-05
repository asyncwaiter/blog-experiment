import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'effect order experiment',
  description: 'useSyncExternalStore 구독과 useEffect 실행 순서 실험',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          padding: '2rem',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          lineHeight: 1.7,
        }}
      >
        {children}
      </body>
    </html>
  )
}
