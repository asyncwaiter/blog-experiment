'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { subject } from '@exp/subject'
import { EXP_CASE } from '@/lib/exp-case'

const callSubject = async (): Promise<string> => {
  try {
    return await subject()
  } catch (e) {
    return 'ERR: ' + (e as Error).message
  }
}

export default function ClientSubject() {
  const { data: result } = useSuspenseQuery({
    queryKey: ['exp', EXP_CASE],
    queryFn: callSubject,
  })
  console.log('[exp]', typeof window === 'undefined' ? 'ssr' : 'browser', result)

  return (
    <p>
      case <code>{EXP_CASE}</code> → <span data-exp-result>{result}</span>
    </p>
  )
}
