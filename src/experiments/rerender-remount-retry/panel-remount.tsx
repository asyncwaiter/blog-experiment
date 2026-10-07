'use client'

import { useState, type ReactNode } from 'react'
import { remountBench } from './benches'
import { PanelShell } from './panel-shell'
import { Probe } from './probe'
import { Button } from './ui'

/**
 * 같은 자리에 들어가지만 "컴포넌트 타입"이 다른 두 래퍼.
 * 타입이 바뀌면 React는 이어 쓰지 않고 그 자리의 서브트리를 버리고 새로 만든다.
 */
function BoxA({ children }: { readonly children: ReactNode }) {
  return <div data-variant="A">{children}</div>
}

function BoxB({ children }: { readonly children: ReactNode }) {
  return <div data-variant="B">{children}</div>
}

export function RemountPanel() {
  const [mounted, setMounted] = useState(false)
  const [probeKey, setProbeKey] = useState(1)
  const [variant, setVariant] = useState<'A' | 'B'>('A')

  const Wrapper = variant === 'A' ? BoxA : BoxB

  return (
    <PanelShell
      bench={remountBench}
      title="② 리마운트"
      trigger="key나 컴포넌트 타입이 바뀔 때"
      expect={
        <>
          이전 instance의 cleanup이 <strong>전부</strong> 실행되고, init이 다시
          찍히고, mounted with가 <strong>한 번 더</strong> 늘어난다. 기존 observer는
          unsubscribe, 새 observer가 subscribe.
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
            onClick={() => setProbeKey((current) => current + 1)}
            disabled={!mounted}
          >
            key 바꾸기
          </Button>
          <Button
            onClick={() => setVariant((current) => (current === 'A' ? 'B' : 'A'))}
            disabled={!mounted}
          >
            컴포넌트 타입 바꾸기
          </Button>
        </>
      }
    >
      <div style={{ fontSize: '0.75rem', color: '#777', marginBottom: '0.3rem' }}>
        key: {probeKey} · 래퍼 타입: {variant}
      </div>
      {mounted ? (
        <Wrapper>
          <Probe key={probeKey} bench={remountBench} dep={0} />
        </Wrapper>
      ) : (
        '언마운트 상태'
      )}
    </PanelShell>
  )
}
