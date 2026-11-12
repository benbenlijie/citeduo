import { randomUUID } from 'node:crypto'
import { db } from './db'
import { ApiError } from './errors'
import { buildNetwork } from './graph'
import { getPaper, getPapersBatch } from './s2'
import { resolvePaperId } from './ids'
import { toS2Input } from './resolve'
import { cacheNetwork, queryHash, getCachedNetwork } from './db-queries'
import { config } from './config'

export interface Job { id: string; kind: string; status: string; progress: any; result_hash: string | null; error: string | null }

export function createJob(kind: string, payload: unknown): string {
  const id = randomUUID()
  db.run("insert into jobs (id, kind, payload, status) values (?,?,?,'pending')", [id, kind, JSON.stringify(payload)])
  return id
}

export function getJob(id: string): Job | null {
  const row = db.query('select id, kind, status, progress, result_hash, error from jobs where id=?').get(id) as Job | null
  if (!row) return null
  if (!row.progress) return { ...row, progress: undefined }
  try {
    return { ...row, progress: JSON.parse(row.progress) }
  } catch {
    return row
  }
}

export function setJob(id: string, patch: { status?: string; progress?: unknown; result_hash?: string; error?: string }): void {
  const cur = db.query('select status, attempts from jobs where id=?').get(id) as { status: string; attempts: number } | null
  if (!cur) return
  const sets: string[] = []
  const args: (string | number | null)[] = []
  if (patch.status !== undefined) { sets.push('status=?'); args.push(patch.status) }
  if (patch.progress !== undefined) { sets.push('progress=?'); args.push(JSON.stringify(patch.progress)) }
  if (patch.result_hash !== undefined) { sets.push('result_hash=?'); args.push(patch.result_hash) }
  if (patch.error !== undefined) { sets.push('error=?'); args.push(patch.error) }
  // 仅在状态真正变化时计数（run start / 终态流转），进度更新不再累加 attempts
  if (patch.status !== undefined && patch.status !== cur.status) { sets.push('attempts=?'); args.push(cur.attempts + 1) }
  sets.push("updated_at=datetime('now')")
  args.push(id)
  db.run(`update jobs set ${sets.join(', ')} where id=?`, args)
}

/** 启动时把中断的 running 任务复位，并重新拾起 pending。 */
export function recoverJobs(): void {
  db.run("update jobs set status='pending' where status='running'")
  const pending = db.query("select id from jobs where status='pending'").all() as { id: string }[]
  for (const { id } of pending) void runJob(id).catch((e) => console.error('runJob rejected', id, e))
}

async function runJob(id: string): Promise<void> {
  const job = db.query('select payload from jobs where id=?').get(id) as { payload: string } | null
  if (!job) return
  try {
    const payload = JSON.parse(job.payload) as { paper_id: string; depth: number; max_nodes: number; query_hash: string }
    setJob(id, { status: 'running', progress: { phase: 'fetch-root', nodes: 0 } })
    const s2Path = await toS2Input(payload.paper_id)
    // The single-paper endpoint rate-limits independently of the batch endpoint;
    // fall back so one 429 does not fail a graph that the batch can still seed.
    const root = await getPaper(s2Path).catch(async () => {
      const [viaBatch] = await getPapersBatch([s2Path])
      if (!viaBatch) throw new ApiError('PAPER_NOT_FOUND', '论文不存在', 404)
      return viaBatch
    })
    const graph = await buildNetwork(root, {
      depth: payload.depth,
      maxNodes: payload.max_nodes,
      onProgress: (done, total) => setJob(id, { status: 'running', progress: { phase: 'crawl', nodes: done, total } }),
    })
    // 复用入队时算好的 query_hash，保证读写同键（勿用 root.paperId 重算）
    cacheNetwork(payload.query_hash, root.paperId, payload.depth, payload.max_nodes, graph)
    setJob(id, { status: 'done', progress: { phase: 'done', nodes: graph.nodes.length }, result_hash: payload.query_hash })
  } catch (e) {
    try {
      setJob(id, { status: 'failed', error: e instanceof Error ? e.message : String(e) })
    } catch (err) {
      console.error('setJob failed', id, err)
    }
  }
}

export function getJobResult(id: string): unknown | null {
  const job = getJob(id)
  if (!job) throw new ApiError('JOB_NOT_FOUND', '任务不存在', 404)
  if (job.status !== 'done' || !job.result_hash) return null
  return getCachedNetwork(job.result_hash)
}

export function enqueueNetwork(payload: { paper_id: string; depth: number; max_nodes: number }): { job_id?: string; cached?: unknown } {
  const depth = payload.depth ?? config.crawl.defaultDepth
  const maxNodes = payload.max_nodes ?? config.crawl.maxNodes
  const resolved = resolvePaperId(payload.paper_id)
  const hash = queryHash(resolved.s2Path, depth, maxNodes)
  const cached = getCachedNetwork(hash)
  if (cached) return { cached }
  const id = createJob('network', { paper_id: payload.paper_id, depth, max_nodes: maxNodes, query_hash: hash })
  void runJob(id).catch((e) => console.error('runJob rejected', id, e))
  return { job_id: id }
}
