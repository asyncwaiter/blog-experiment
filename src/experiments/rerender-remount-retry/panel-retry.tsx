'use client'

import { Suspense, useEffect, useState } from 'react'
import type { Bench } from './bench'
import { retryBench } from './benches'
import { SUSPEND_MS, delayedValue } from './delay'
import { PanelShell } from './panel-shell'
import { Probe } from './probe'
import { Button } from './ui'

/**
 * fallback이 실제로 커밋됐는지 기록한다.
 * 이 로그가 있어야 "즉시 replay"가 아니라 "fallback을 보여준 뒤의 재시도"임이 확실해진다.
 */
function Fallback({ bench }: { readonly bench: Bench }) {
  useEffect(() => {
    bench.log('effect', 'fallback 커밋됨 (여기부터 재시도 대기)')
    return () => {
      bench.log('cleanup', 'fallback 제거됨')
    }
  }, [bench])

  return <span style={{ color: '#b35309' }}>fallback 표시 중…</span>
}

type RetryRun = {
  readonly runId: number
  readonly promise: Promise<string>
}

export function RetryPanel() {
  const [run, setRun] = useState<RetryRun | null>(null)
  const [runSeq, setRunSeq] = useState(0)
  // 부록: 이미 커밋된 뒤에 suspend 시키는 경우. 표의 범위 밖이라는 걸 눈으로 보려고 둔다.
  const [updatePromise, setUpdatePromise] = useState<Promise<string> | null>(null)

  const start = () => {
    const nextId = runSeq + 1
    setRunSeq(nextId)
    setUpdatePromise(null)
    // promise는 반드시 핸들러에서 만든다. render 중에 만들면 매번 새 promise라 영원히 suspend.
    setRun({ runId: nextId, promise: delayedValue(`mount-${nextId}`, SUSPEND_MS) })
  }

  const unmount = () => {
    setRun(null)
    setUpdatePromise(null)
  }

  const suspendAgain = () => {
    setUpdatePromise(delayedValue(`update-${runSeq}`, SUSPEND_MS))
  }

  return (
    <PanelShell
      bench={retryBench}
      title="③ 재시도 (처음 마운트하다가 suspend된 경우)"
      trigger="suspend를 일으킨 Promise가 resolve될 때"
      expect={
        <>
          init은 다시 찍히지만 mounted with는 <strong>한 번만</strong> 찍힌다.
          첫 instance의 cleanup은 아예 없다(effect가 돈 적이 없으므로). 첫 observer는
          subscribe 없이 사라진다.
          <br />
          주의: React는 resolve 전까지 suspend된 트리를 여러 번 다시 렌더해 보므로
          init은 <strong>2번이 아니라 여러 번</strong> 찍힐 수 있다. 횟수 자체가 아니라
          &quot;mounted with는 끝까지 한 번뿐&quot;이라는 쪽이 증거다.
        </>
      }
      controls={
        <>
          <Button tone="primary" onClick={start} disabled={run !== null}>
            마운트해서 suspend 시키기 ({SUSPEND_MS}ms)
          </Button>
          <Button onClick={unmount} disabled={run === null}>
            언마운트
          </Button>
          <Button
            onClick={suspendAgain}
            disabled={run === null || updatePromise !== null}
          >
            부록: 이미 마운트된 뒤 suspend
          </Button>
        </>
      }
    >
      <div style={{ fontSize: '0.75rem', color: '#777', marginBottom: '0.4rem' }}>
        부록 버튼은 이미 커밋된 뒤에 suspend 시킨다. 표의 범위 밖이고, instance 번호가
        그대로 유지되는지 · cleanup이 도는지 · observer가 구독을 유지하는지를 비교해
        보는 자리다.
      </div>
      <Suspense fallback={<Fallback bench={retryBench} />}>
        {run === null ? (
          '언마운트 상태'
        ) : (
          <Probe
            key={run.runId}
            bench={retryBench}
            dep={0}
            promise={updatePromise ?? run.promise}
          />
        )}
      </Suspense>
    </PanelShell>
  )
}
