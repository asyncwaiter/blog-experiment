import { fetchUser } from '@/lib/user'

// 브라우저 쪽 경로(bff). 캐시되면 요청 횟수 집계가 틀어진다.
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(await fetchUser())
}
