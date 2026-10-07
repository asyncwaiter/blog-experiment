'use client'

import { use, useEffect, useState, useSyncExternalStore } from 'react'
import type { Bench, ProbeObserver } from './bench'
import { Button } from './ui'

type ProbeInstance = {
  readonly id: number
  readonly observer: ProbeObserver
}

export type ProbeProps = {
  readonly bench: Bench
  /** 부모가 내려주는 effect 의존성. 리렌더 때 "바뀐 의존성만" 정리되는지 보려고 둔다. */
  readonly dep: number
  /** 넘기면 훅을 모두 통과한 뒤 render 중에 suspend 한다. */
  readonly promise?: Promise<string> | null
}

/**
 * 세 열(리렌더 / 리마운트 / 재시도)에서 똑같이 쓰는 측정 도구.
 *
 * 측정 도구가 세 경우에 모두 동일해야 로그 차이를 React의 동작 차이로 읽을 수 있다.
 * 그래서 패널은 이 컴포넌트를 "어떻게 흔드는지"만 다르게 하고, 컴포넌트 자체는 공유한다.
 */
export function Probe({ bench, dep, promise = null }: ProbeProps) {
  // useState 초기화 함수 = "이 fiber의 훅 메모리가 새로 만들어졌는가"의 리트머스.
  // 다시 실행됐다면 이어 쓴 fiber가 아니라 새 fiber다.
  const [instance] = useState<ProbeInstance>(() => {
    const id = bench.nextInstanceId()
    bench.log('render', `init 실행 → instance #${id}`)
    return { id, observer: bench.createObserver(id) }
  })

  const [tick, setTick] = useState(0)

  bench.log(
    'render',
    `render body (instance #${instance.id}, tick=${tick}, dep=${dep})`,
  )

  useEffect(() => {
    bench.log('effect', `mounted with instance #${instance.id}`)
    return () => {
      bench.log('cleanup', `cleanup(mount) instance #${instance.id}`)
    }
  }, [bench, instance])

  // 의존성이 있는 effect. 리렌더 열의 "의존성이 바뀐 effect만" 칸을 확인하는 자리.
  useEffect(() => {
    bench.log('effect', `effect[dep=${dep}] instance #${instance.id}`)
    return () => {
      bench.log('cleanup', `cleanup[dep=${dep}] instance #${instance.id}`)
    }
  }, [bench, dep, instance])

  // React Query의 observer가 구독되는 자리와 같다(effect에서 subscribe).
  useSyncExternalStore(
    instance.observer.subscribe,
    instance.observer.getSnapshot,
    instance.observer.getServerSnapshot,
  )

  // useBaseQuery가 observer를 만든 뒤에 throw 하는 것과 같은 위치.
  // 훅을 모두 통과했기 때문에 "init은 돌았지만 commit은 안 된" 상태가 만들어진다.
  const resolved = promise ? use(promise) : null

  return (
    <div>
      <div style={{ fontSize: '0.85rem' }}>
        instance <strong>#{instance.id}</strong> · observer{' '}
        <strong>#{instance.observer.id}</strong> · tick {tick} · dep {dep}
        {resolved === null ? null : ` · promise="${resolved}"`}
      </div>
      <div style={{ marginTop: '0.4rem' }}>
        <Button onClick={() => setTick((current) => current + 1)}>
          자기 state 변경 (tick + 1)
        </Button>
      </div>
    </div>
  )
}
