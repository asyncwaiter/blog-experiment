import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { ScenarioPage, USER_QUERY_KEY } from '@/components/ScenarioPage'
import { getQueryClient } from '@/lib/get-query-client'
import { getUser } from '@/lib/user'

// prod에서 prerender되면 prefetch가 빌드 시각에 한 번만 돌아
// "마운트 시 데이터 나이"가 몇 시간짜리가 된다. 요청마다 새로 돌게 한다.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const queryClient = getQueryClient()

  await queryClient.prefetchQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: () => getUser(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScenarioPage scenario="hydrated-fresh" staleTime={5_000} />
    </HydrationBoundary>
  )
}
