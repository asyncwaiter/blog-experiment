import { createBench } from './bench'

/**
 * 패널마다 로그 채널을 따로 둔다. 한 패널을 조작할 때 다른 패널의 로그가
 * 섞이지 않아야 표의 각 열을 따로 캡처할 수 있다.
 */
export const rerenderBench = createBench('리렌더')
export const remountBench = createBench('리마운트')
export const retryBench = createBench('재시도')
export const reactQueryBench = createBench('react-query')
