import ClientSubject from '@/components/ClientSubject'

export default function Page() {
  return (
    <main>
      <h1 style={{ fontSize: '1.1rem' }}>
        클라이언트 그래프에서 서버 전용 모듈 import 실험
      </h1>
      <ClientSubject />
    </main>
  )
}
