export async function subject(): Promise<string> {
  const { getLocale } = await import('next-intl/server')
  return await getLocale()
}
