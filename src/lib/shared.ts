// 디렉티브 없음. page.tsx(rsc)와 ClientBox.tsx(ssr/client) 양쪽에서 import된다.
import { whereAmI } from 'where-am-i'

export const tag = whereAmI
