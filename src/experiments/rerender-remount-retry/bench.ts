/**
 * 실험용 관측 장비(bench).
 *
 * 리렌더 / 리마운트 / 재시도(Suspense retry)를 구분하려면 "무엇이 다시 실행됐는지"를
 * 순서대로 남겨야 한다. bench는 패널마다 하나씩 만들어 쓰는 독립 로그 채널이고,
 * 동시에 React Query의 observer와 같은 모양(render 중 생성 → effect에서 구독)의
 * 가짜 observer를 만들어 준다.
 *
 * useBaseQuery의 실제 구조:
 *   const [observer] = useState(() => new Observer(client, options))  // render 중 생성
 *   useSyncExternalStore(cb => observer.subscribe(...), ...)          // effect에서 구독
 *   if (shouldSuspend(...)) throw fetchOptimistic(...)                // 생성 뒤에 suspend
 * 아래 createObserver + Probe가 이 순서를 그대로 흉내낸다.
 */

export type Phase = 'render' | 'effect' | 'cleanup' | 'store'

export type LogEntry = {
  readonly seq: number
  readonly ms: number
  readonly phase: Phase
  readonly text: string
}

export type ObserverRecord = {
  readonly id: number
  readonly instanceId: number
  readonly subscribeCount: number
  readonly unsubscribeCount: number
}

export type BenchSnapshot = {
  readonly logs: readonly LogEntry[]
  readonly observers: readonly ObserverRecord[]
}

export type ProbeObserver = {
  readonly id: number
  readonly subscribe: (onStoreChange: () => void) => () => void
  readonly getSnapshot: () => number
  readonly getServerSnapshot: () => number
}

export type Bench = {
  readonly name: string
  readonly log: (phase: Phase, text: string) => void
  readonly nextInstanceId: () => number
  readonly createObserver: (instanceId: number) => ProbeObserver
  readonly notifyAll: () => void
  readonly clearLogs: () => void
  readonly subscribe: (onChange: () => void) => () => void
  readonly getSnapshot: () => BenchSnapshot
  readonly getServerSnapshot: () => BenchSnapshot
}

/** getServerSnapshot은 매번 같은 참조를 돌려줘야 한다. */
const EMPTY_SNAPSHOT: BenchSnapshot = { logs: [], observers: [] }

export function createBench(name: string): Bench {
  let snapshot: BenchSnapshot = EMPTY_SNAPSHOT
  let logSeq = 0
  let instanceSeq = 0
  let observerSeq = 0
  let startedAt: number | null = null
  let storeVersion = 0
  let flushQueued = false

  const viewListeners = new Set<() => void>()
  const storeListeners = new Set<() => void>()

  const callAll = (listeners: ReadonlySet<() => void>) => {
    listeners.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        console.error(`[bench:${name}] 리스너 실행이 실패했습니다.`, error)
      }
    })
  }

  /**
   * log()는 render 중에도 불린다(useState 초기화 함수, render 본문).
   * 그 자리에서 바로 알리면 "다른 컴포넌트를 렌더하는 중에 state를 바꿨다"는
   * React 경고가 난다. 그래서 화면 갱신 알림만 매크로태스크로 한 번 미룬다.
   * 로그 내용 자체는 호출 시점에 이미 기록되므로 순서는 보존된다.
   */
  const scheduleViewFlush = () => {
    if (flushQueued) return
    flushQueued = true
    setTimeout(() => {
      flushQueued = false
      callAll(viewListeners)
    }, 0)
  }

  const log = (phase: Phase, text: string) => {
    if (startedAt === null) startedAt = performance.now()
    logSeq += 1
    const entry: LogEntry = {
      seq: logSeq,
      ms: Math.round(performance.now() - startedAt),
      phase,
      text,
    }
    snapshot = { ...snapshot, logs: [...snapshot.logs, entry] }
    // 이 실험의 관찰 수단 자체. 화면 로그와 브라우저 콘솔 양쪽에 남긴다.
    console.log(
      `[${name}] ${String(entry.seq).padStart(2, '0')} ${phase.padEnd(7)} ${text}`,
    )
    scheduleViewFlush()
  }

  const updateObserver = (
    id: number,
    update: (record: ObserverRecord) => ObserverRecord,
  ) => {
    snapshot = {
      ...snapshot,
      observers: snapshot.observers.map((record) =>
        record.id === id ? update(record) : record,
      ),
    }
  }

  const createObserver = (instanceId: number): ProbeObserver => {
    observerSeq += 1
    const id = observerSeq
    snapshot = {
      ...snapshot,
      observers: [
        ...snapshot.observers,
        { id, instanceId, subscribeCount: 0, unsubscribeCount: 0 },
      ],
    }
    log('render', `observer #${id} 생성 (render 중, 아직 구독 안 함)`)

    const subscribe = (onStoreChange: () => void) => {
      storeListeners.add(onStoreChange)
      updateObserver(id, (record) => ({
        ...record,
        subscribeCount: record.subscribeCount + 1,
      }))
      log('effect', `observer #${id} subscribe (구독 시작)`)

      return () => {
        storeListeners.delete(onStoreChange)
        updateObserver(id, (record) => ({
          ...record,
          unsubscribeCount: record.unsubscribeCount + 1,
        }))
        log('cleanup', `observer #${id} unsubscribe (구독 해제)`)
      }
    }

    return {
      id,
      subscribe,
      getSnapshot: () => storeVersion,
      getServerSnapshot: () => 0,
    }
  }

  return {
    name,
    log,
    nextInstanceId: () => {
      instanceSeq += 1
      return instanceSeq
    },
    createObserver,
    notifyAll: () => {
      storeVersion += 1
      log('store', `외부 저장소 알림 (version=${storeVersion})`)
      callAll(storeListeners)
    },
    clearLogs: () => {
      // observer 누적 기록은 남긴다. 완전 초기화는 페이지 새로고침.
      snapshot = { ...snapshot, logs: [] }
      logSeq = 0
      startedAt = null
      scheduleViewFlush()
    },
    subscribe: (onChange: () => void) => {
      viewListeners.add(onChange)
      return () => {
        viewListeners.delete(onChange)
      }
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_SNAPSHOT,
  }
}
