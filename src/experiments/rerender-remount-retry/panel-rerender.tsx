'use client'

import { useState } from 'react'
import { rerenderBench } from './benches'
import { PanelShell } from './panel-shell'
import { Probe } from './probe'
import { Button } from './ui'

export function RerenderPanel() {
  const [mounted, setMounted] = useState(false)
  const [parentRenders, setParentRenders] = useState(1)
  const [dep, setDep] = useState(0)

  return (
    <PanelShell
      bench={rerenderBench}
      title="① 리렌더"
      trigger="state 변경, 부모 리렌더, 구독한 외부 저장소의 알림"
      expect={
        <>
          init은 다시 찍히지 <strong>않고</strong>, mounted with도 늘지 않는다.
          cleanup은 의존성이 바뀐 effect만. observer는 그대로.
        </>
      }
      controls={
        <>
          <Button
            tone="primary"
            onClick={() => setMounted(true)}
            disabled={mounted}
          >
            마운트
          </Button>
          <Button onClick={() => setMounted(false)} disabled={!mounted}>
            언마운트
          </Button>
          <Button
            onClick={() => setParentRenders((current) => current + 1)}
            disabled={!mounted}
          >
            부모만 리렌더 (dep 그대로)
          </Button>
          <Button
            onClick={() => setDep((current) => current + 1)}
            disabled={!mounted}
          >
            부모가 dep 변경
          </Button>
          <Button onClick={rerenderBench.notifyAll} disabled={!mounted}>
            외부 저장소 알림
          </Button>
        </>
      }
    >
      <div style={{ fontSize: '0.75rem', color: '#777', marginBottom: '0.3rem' }}>
        부모 render 횟수: {parentRenders}
      </div>
      {mounted ? <Probe bench={rerenderBench} dep={dep} /> : '언마운트 상태'}
    </PanelShell>
  )
}
