import http, { form } from '@/api'
import type { SearchPlugin, SearchResults, SearchStatus } from '@/types/qbittorrent'

export type SearchPluginSelector = 'all' | 'enabled' | 'multi' | string[]

export async function startSearch(
  pattern: string,
  category = 'all',
  plugins: SearchPluginSelector = 'enabled',
): Promise<number> {
  const pluginValue = Array.isArray(plugins) ? plugins.join('|') : plugins
  const res = await http.post<{ id: number }>('/search/start', form({ pattern, category, plugins: pluginValue }))
  return res.data.id
}

export async function stopSearch(id: number): Promise<void> {
  await http.post('/search/stop', form({ id }))
}

export async function getSearchStatus(id = 0): Promise<SearchStatus[]> {
  const res = await http.get<SearchStatus[]>('/search/status', { params: { id } })
  return res.data
}

export async function getSearchResults(
  id: number,
  params: { limit?: number; offset?: number } = {},
): Promise<SearchResults> {
  const res = await http.get<SearchResults>('/search/results', { params: { id, ...params } })
  return res.data
}

export async function deleteSearch(id: number): Promise<void> {
  await http.post('/search/delete', form({ id }))
}

export async function downloadSearchResult(torrentUrl: string, pluginName: string): Promise<void> {
  await http.post('/search/downloadTorrent', form({ torrentUrl, pluginName }))
}

export async function getSearchPlugins(): Promise<SearchPlugin[]> {
  const res = await http.get<SearchPlugin[]>('/search/plugins')
  return res.data
}

export async function installSearchPlugin(sources: string[]): Promise<void> {
  await http.post('/search/installPlugin', form({ sources: sources.join('|') }))
}

export async function uninstallSearchPlugin(names: string[]): Promise<void> {
  await http.post('/search/uninstallPlugin', form({ names: names.join('|') }))
}

export async function enableSearchPlugin(names: string[], enable: boolean): Promise<void> {
  await http.post('/search/enablePlugin', form({ names: names.join('|'), enable }))
}

export async function updateSearchPlugins(): Promise<void> {
  await http.post('/search/updatePlugins', form({}))
}
