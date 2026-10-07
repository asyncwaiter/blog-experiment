'use client'

import { useSyncExternalStore } from 'react'
import type { Bench, LogEntry, Phase } from './bench'

const phaseColor: Record<Phase, string> = {
  render: '#7a4ddb',
  effect: '#1a7f37',
  cleanup: '#b35309',
  store: '#0969da',
}

/**
 * 요약 숫자. 앞의 세 항목(init / mounted with / cleanup(mount))은 표의 핵심 증거라
 * 0이어도 보여주고, 나머지는 그 패널에서 실제로 찍힌 것만 보여준다.
 * 가짜 observer 패널은 subscribe/unsubscribe를, 진짜 React Query 패널은
 * observerAdded/observerRemoved를 쓰기 때문이다.
 */
const summaryItems = (logs: readonly LogEntry[]) => {
  const countOf = (needle: string) =>
    logs.filter((entry) => entry.text.includes(needle)).length

  const items = [
    { label: 'init', value: countOf('init 실행') },
    { label: 'mounted with', value: countOf('mounted with') },
    { label: 'cleanup(mount)', value: countOf('cleanup(mount)') },
    { label: 'subscribe', value: countOf('(구독 시작)') },
    { label: 'unsubscribe', value: countOf('(구독 해제)') },
    { label: 'observerAdded', value: countOf('observerAdded') },
    { label: 'observerRemoved', value: countOf('observerRemoved') },
  ]

  return items.filter((item, index) => index < 3 || item.value > 0)
}

export function LogView({ bench }: { readonly bench: Bench }) {
  const { logs, observers } = useSyncExternalStore(
    bench.subscribe,
    bench.getSnapshot,
    bench.getServerSnapshot,
  )

  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#444', marginBottom: '0.3rem' }}>
        {summaryItems(logs).map((item, index) => (
          <span key={item.label}>
            {index === 0 ? null : ' · '}
            {item.label} <strong>{item.value}</strong>
          </span>
        ))}
      </div>

      <ol
        style={{
          margin: 0,
          padding: '0.5rem 0.6rem',
          listStyle: 'none',
          fontSize: '0.75rem',
          lineHeight: 1.6,
          background: '#1b1f24',
          color: '#e6edf3',
          borderRadius: 4,
          maxHeight: '15rem',
          overflowY: 'auto',
        }}
      >
        {logs.length === 0 ? (
          <li style={{ color: '#8b949e' }}>로그 없음. 아래 버튼을 눌러보세요.</li>
        ) : (
          logs.map((entry) => (
            <li key={entry.seq}>
              <span style={{ color: '#8b949e' }}>
                {String(entry.seq).padStart(2, '0')} {String(entry.ms).padStart(4, ' ')}ms{' '}
              </span>
              <span style={{ color: phaseColor[entry.phase], fontWeight: 600 }}>
                {entry.phase.padEnd(7, ' ')}
              </span>
              <span style={{ whiteSpace: 'pre-wrap' }}>{entry.text}</span>
            </li>
          ))
        )}
      </ol>

      {observers.length === 0 ? null : (
        <table
          style={{
            marginTop: '0.5rem',
            borderCollapse: 'collapse',
            fontSize: '0.72rem',
          }}
        >
          <thead>
            <tr style={{ color: '#555' }}>
              <th style={cellStyle}>observer</th>
              <th style={cellStyle}>만든 instance</th>
              <th style={cellStyle}>subscribe</th>
              <th style={cellStyle}>unsubscribe</th>
              <th style={cellStyle}>한 번도 구독 안 함</th>
            </tr>
          </thead>
          <tbody>
            {observers.map((record) => (
              <tr key={record.id}>
                <td style={cellStyle}>#{record.id}</td>
                <td style={cellStyle}>#{record.instanceId}</td>
                <td style={cellStyle}>{record.subscribeCount}</td>
                <td style={cellStyle}>{record.unsubscribeCount}</td>
                <td style={cellStyle}>
                  {record.subscribeCount === 0 ? '○' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const cellStyle = {
  border: '1px solid #ddd',
  padding: '0.15rem 0.45rem',
  textAlign: 'left' as const,
}
