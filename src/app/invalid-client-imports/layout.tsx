import type { ReactNode } from 'react'
import { Providers } from '@/components/Providers'

export default function InvalidClientImportsLayout({
  children,
}: {
  readonly children: ReactNode
}) {
  return <Providers>{children}</Providers>
}
