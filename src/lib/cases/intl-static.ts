import { getLocale } from 'next-intl/server'

export async function subject(): Promise<string> {
  return await getLocale()
}
