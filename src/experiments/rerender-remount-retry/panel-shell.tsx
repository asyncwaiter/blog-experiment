'use client'

import type { ReactNode } from 'react'
import type { Bench } from './bench'
import { LogView } from './log-view'
import {
  Button,
  controlRowStyle,
  noteStyle,
  panelStyle,
  probeBoxStyle,
} from './ui'

type PanelShellProps = {
  readonly bench: Bench
  readonly title: string
  /** 표의 "언제 일어나나" 칸. */
  readonly trigger: string
  /** 표가 예측하는 로그. 눌러보고 맞는지 대조하는 용도. */
  readonly expect: ReactNode
  readonly controls: ReactNode
  readonly children: ReactNode
}

export function PanelShell({
  bench,
  title,
  trigger,
  expect,
  controls,
  children,
}: PanelShellProps) {
  return (
    <section style={panelStyle}>
      <h2 style={{ fontSize: '0.95rem', margin: 0 }}>{title}</h2>
      <p style={noteStyle}>
        언제 일어나나: {trigger}
        <br />
        표의 예측: {expect}
      </p>

      <div style={controlRowStyle}>
        {controls}
        <Button onClick={bench.clearLogs}>로그 지우기</Button>
      </div>

      <div style={probeBoxStyle}>{children}</div>

      <LogView bench={bench} />
    </section>
  )
}
