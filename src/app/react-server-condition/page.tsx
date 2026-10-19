import { whereAmI } from 'where-am-i'
import { tag } from '@/lib/shared'
import ClientBox from '@/components/ClientBox'

export default function Page() {
  return (
    <main>
      <h1 style={{ fontSize: '1.1rem' }}>
        package.json exports의 react-server 조건 실험
      </h1>
      <p>page.tsx whereAmI(): {whereAmI()}</p>
      <p>page.tsx tag(): {tag()}</p>
      <ClientBox />
    </main>
  )
}
