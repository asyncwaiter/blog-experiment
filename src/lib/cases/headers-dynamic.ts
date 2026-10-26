export async function subject(): Promise<string> {
  const { cookies } = await import('next/headers')
  return (await cookies()).get('exp')?.value ?? 'no-cookie'
}
