import http, { form } from '@/api'
import type { RSSItem, RSSRule } from '@/types/qbittorrent'

export async function addRssFolder(path: string): Promise<void> {
  await http.post('/rss/addFolder', form({ path }))
}

export async function addRssFeed(url: string, path = '', refreshInterval?: number): Promise<void> {
  await http.post('/rss/addFeed', form({ url, path, refreshInterval }))
}

export async function setRssFeedUrl(path: string, url: string): Promise<void> {
  await http.post('/rss/setFeedURL', form({ path, url }))
}

export async function setRssFeedRefreshInterval(path: string, refreshInterval: number): Promise<void> {
  await http.post('/rss/setFeedRefreshInterval', form({ path, refreshInterval }))
}

export async function removeRssItem(path: string): Promise<void> {
  await http.post('/rss/removeItem', form({ path }))
}

export async function moveRssItem(itemPath: string, destPath: string): Promise<void> {
  await http.post('/rss/moveItem', form({ itemPath, destPath }))
}

export async function getRssItems(withData = true): Promise<Record<string, RSSItem>> {
  const res = await http.get<Record<string, RSSItem>>('/rss/items', { params: { withData } })
  return res.data
}

export async function markRssAsRead(itemPath: string, articleId?: string): Promise<void> {
  await http.post('/rss/markAsRead', form({ itemPath, articleId }))
}

export async function refreshRssItem(itemPath: string): Promise<void> {
  await http.post('/rss/refreshItem', form({ itemPath }))
}

export async function setRssRule(ruleName: string, ruleDef: RSSRule): Promise<void> {
  await http.post('/rss/setRule', form({ ruleName, ruleDef: JSON.stringify(ruleDef) }))
}

export async function renameRssRule(ruleName: string, newRuleName: string): Promise<void> {
  await http.post('/rss/renameRule', form({ ruleName, newRuleName }))
}

export async function cloneRssRule(sourceName: string, cloneName: string): Promise<void> {
  await http.post('/rss/cloneRule', form({ sourceName, cloneName }))
}

export async function removeRssRule(ruleName: string): Promise<void> {
  await http.post('/rss/removeRule', form({ ruleName }))
}

export async function getRssRules(): Promise<Record<string, RSSRule>> {
  const res = await http.get<Record<string, RSSRule>>('/rss/rules')
  return res.data
}

export async function getMatchingRssArticles(ruleName: string): Promise<Record<string, string[]>> {
  const res = await http.get<Record<string, string[]>>('/rss/matchingArticles', { params: { ruleName } })
  return res.data
}
