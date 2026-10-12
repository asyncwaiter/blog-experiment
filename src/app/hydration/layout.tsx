import type { ReactNode } from 'react'
import { Providers } from '@/components/Providers'

export default function HydrationLayout({
  children,
}: {
  readonly children: ReactNode
}) {
  return <Providers>{children}</Providers>
}
