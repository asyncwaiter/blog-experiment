import { cookies } from 'next/headers'

export async function subject(): Promise<string> {
  return (await cookies()).get('exp')?.value ?? 'no-cookie'
}
