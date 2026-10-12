export type User = {
  readonly id: string
  readonly name: string
  /** 서버에서 몇 번째로 실행됐는지. 요청 횟수를 세는 눈금. */
  readonly fetchSeq: number
  /** MockAPI 호출을 시작한 서버 시각. */
  readonly fetchStartedAt: number
  /** MockAPI가 응답한 서버 시각. React Query의 dataUpdatedAt은 이 직후에 찍힌다. */
  readonly fetchedAt: number
}

/** 단순 딜레이만 준 MockAPI. */
export const MOCK_DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? '300')

let fetchSeq = 0

export async function fetchUser(): Promise<User> {
  fetchSeq += 1
  const seq = fetchSeq
  const fetchStartedAt = Date.now()

  await new Promise<void>((resolve) => {
    setTimeout(resolve, MOCK_DELAY_MS)
  })

  return {
    id: `u-${seq}`,
    name: `user-${seq}`,
    fetchSeq: seq,
    fetchStartedAt,
    fetchedAt: Date.now(),
  }
}

/**
 * 서버에서는 MockAPI를 직접 부르고(ssr-direct), 브라우저에서는 BFF를 거친다.
 * 같은 queryFn이 두 환경에서 다른 경로로 나가므로, 브라우저가 refetch하면
 * /api/bff/user 요청이 한 건 찍힌다.
 */
export async function getUser(): Promise<User> {
  if (typeof window === 'undefined') {
    return fetchUser()
  }

  try {
    const response = await fetch('/api/bff/user', { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    return (await response.json()) as User
  } catch (error) {
    console.error('BFF 요청 실패:', error)
    throw new Error('유저 정보를 가져오지 못했습니다.')
  }
}
