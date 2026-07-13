import http, { form } from '@/api'
import type { TorrentCreatorParams, TorrentCreatorTask } from '@/types/qbittorrent'

function encodeLines(values?: string[]): string | undefined {
  return values?.map((value) => encodeURIComponent(value)).join('|')
}

export async function addTorrentCreatorTask(params: TorrentCreatorParams): Promise<string> {
  const res = await http.post<{ taskID: string }>('/torrentcreator/addTask', form({
    sourcePath: params.sourcePath,
    torrentFilePath: params.torrentFilePath,
    comment: params.comment,
    source: params.source,
    trackers: encodeLines(params.trackers),
    urlSeeds: encodeLines(params.urlSeeds),
    pieceSize: params.pieceSize,
    private: params.private,
    ignoreDotfiles: params.ignoreDotFiles,
    startSeeding: params.startSeeding,
    format: params.format,
    optimizeAlignment: params.optimizeAlignment,
    paddedFileSizeLimit: params.paddedFileSizeLimit,
  }))
  return res.data.taskID
}

export async function getTorrentCreatorTasks(taskID?: string): Promise<TorrentCreatorTask[]> {
  const res = await http.get<TorrentCreatorTask[]>('/torrentcreator/status', { params: { taskID } })
  return res.data
}

export async function getCreatedTorrentFile(taskID: string): Promise<Blob> {
  const res = await http.get<Blob>('/torrentcreator/torrentFile', {
    params: { taskID },
    responseType: 'blob',
  })
  return res.data
}

export async function deleteTorrentCreatorTask(taskID: string): Promise<void> {
  await http.post('/torrentcreator/deleteTask', form({ taskID }))
}
