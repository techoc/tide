import http, { form } from '@/api'

export async function loadClientData<T extends Record<string, unknown> = Record<string, unknown>>(
  keys?: string[],
): Promise<T> {
  const res = await http.get<T>('/clientData/load', {
    params: keys ? { keys: JSON.stringify(keys) } : undefined,
  })
  return res.data
}

export async function storeClientData(data: Record<string, unknown>): Promise<void> {
  await http.post('/clientData/store', form({ data: JSON.stringify(data) }))
}
