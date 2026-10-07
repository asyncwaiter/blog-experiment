'use client'

import { ReactQueryPanel } from './panel-react-query'
import { RemountPanel } from './panel-remount'
import { RerenderPanel } from './panel-rerender'
import { RetryPanel } from './panel-retry'

/**
 * 리렌더 / 리마운트 / 재시도 비교표를 검증하는 실험.
 *
 * 읽는 법
 * - 세 패널 모두 같은 Probe 컴포넌트를 쓴다. 측정 도구가 같아야 로그 차이를
 *   React의 동작 차이로 읽을 수 있다.
 * - 모든 패널은 "언마운트 상태"에서 시작한다. 마운트부터 로그에 남겨야
 *   init / mounted with 횟수를 세는 기준이 생긴다.
 * - 표의 핵심 증거는 두 숫자다: init 횟수와 mounted with 횟수.
 *   리마운트는 둘 다 늘고, 재시도는 init만 늘고 mounted with는 한 번뿐이다.
 */
export function RerenderRemountRetryExperiment() {
  return (
    <div>
      <RerenderPanel />
      <RemountPanel />
      <RetryPanel />
      <ReactQueryPanel />
    </div>
  )
}
