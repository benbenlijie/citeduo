import {
  searchResponseSchema, networkDataSchema, jobStatusSchema, detailsResponseSchema, lineageResponseSchema,
  connectionResponseSchema,
} from './schemas'
import type { NetworkData, Paper, PaperConnection, PaperDetails, PaperLineage } from '../types/domain'
import { API_BASE } from '../lib/apiBase'

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

const MESSAGES: Record<string, string> = {
  PAPER_NOT_FOUND: '找不到指定的论文，请检查论文ID',
  PAPER_FETCH_FAILED: '无法从数据源获取论文，可能受速率限制，请稍后重试',
  MISSING_PAPER_ID: '论文ID缺失，请选择有效的论文',
  RATE_LIMITED: 'API请求过于频繁，请稍后重试',
  UPSTREAM_FAILED: '上游数据源暂时不可用或已限流，请稍后重试',
  NETWORK_BUILD_FAILED: '网络构建失败，请重试',
  JOB_NOT_FOUND: '任务不存在或已过期',
}

async function request(path: string, body?: unknown): Promise<any> {
  const res = await fetch(API_BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const code = data?.error?.code ?? 'INTERNAL_SERVER_ERROR'
    throw new ApiError(code, MESSAGES[code] ?? data?.error?.message ?? '请求失败')
  }
  return data
}

/**
 * 入队建图并轮询至完成。放在单个 queryFn 内，让 React Query 以 paperId 为键共享缓存，
 * 多个组件调用不会重复触发。
 */
async function networkWithPolling(paperId: string, depth: number, maxNodes: number): Promise<NetworkData> {
  const res = await request('/network', { paper_id: paperId, depth, max_nodes: maxNodes })
  if (res.data) return networkDataSchema.parse(res.data) as NetworkData
  const jobId: string = res.job_id
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500))
    const job = jobStatusSchema.parse(await request(`/jobs/${jobId}`))
    if (job.status === 'done') {
      if (job.data) return job.data as NetworkData
      throw new Error('网络结果已过期，请重试')
    }
    if (job.status === 'failed') throw new Error(job.error ?? '网络构建失败')
  }
  throw new Error('网络构建超时')
}

export const api = {
  async search(query: string, query_type: string): Promise<{ papers: Paper[]; total_count: number; warning?: string }> {
    const parsed = searchResponseSchema.parse(await request('/search', { query, query_type }))
    return { ...(parsed.data as any), warning: parsed.warning ?? undefined }
  },
  async details(paperId: string): Promise<PaperDetails> {
    return detailsResponseSchema.parse(await request('/details', { paper_id: paperId })).data as any
  },
  async detailsRelated(paperId: string): Promise<Pick<PaperDetails, 'recommendations' | 'citation_contexts'>> {
    return (await request('/details-related', { paper_id: paperId })).data as any
  },
  async lineage(paperId: string): Promise<PaperLineage> {
    const parsed = lineageResponseSchema.parse(await request('/lineage', { paper_id: paperId })) as { data: PaperLineage }
    return parsed.data
  },
  /**
   * How two papers are connected. Longest request in the app: the server may
   * crawl outward from both endpoints, so there is no client-side timeout.
   */
  async connect(fromId: string, toId: string, live?: boolean): Promise<PaperConnection> {
    const parsed = connectionResponseSchema.parse(
      await request('/connect', { from_id: fromId, to_id: toId, live }),
    )
    return parsed.data as unknown as PaperConnection
  },
  /**
   * Instance defaults the UI must honour, e.g. whether `/connect` may go
   * upstream. `CONNECT_LOCAL_ONLY` is an operator setting, so the client asks
   * instead of guessing.
   */
  async getConfig(): Promise<{ connectLocalOnly: boolean }> {
    const data = await request('/config')
    return { connectLocalOnly: Boolean(data?.data?.connectLocalOnly) }
  },
  networkWithPolling,
}
