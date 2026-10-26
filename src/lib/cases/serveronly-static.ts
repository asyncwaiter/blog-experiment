import 'server-only'

export async function subject(): Promise<string> {
  return 'imported server-only'
}
