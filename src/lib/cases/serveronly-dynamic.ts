export async function subject(): Promise<string> {
  await import('server-only')
  return 'imported server-only'
}
