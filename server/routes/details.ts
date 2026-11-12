import { readJson, json, ApiError } from '../errors'
import { toS2Input } from '../resolve'
import { normalizeS2Paper } from '../normalize'
import { getPaper, getRecommendations, getCitationContexts } from '../s2'
import { upsertPaper } from '../papers'

export async function detailsRoute(req: Request): Promise<Response> {
  const { paper_id } = await readJson<{ paper_id?: string }>(req)
  if (!paper_id) throw new ApiError('MISSING_PAPER_ID', '论文ID不能为空')

  let paper
  try {
    paper = await getPaper(await toS2Input(paper_id))
  } catch (e) {
    if (e instanceof ApiError) throw e
    const status = (e as { status?: number })?.status
    if (status === 404) throw new ApiError('PAPER_NOT_FOUND', '论文未找到', 404)
    throw new ApiError('PAPER_FETCH_FAILED', `无法获取论文: ${(e as Error).message}`, 502)
  }
  upsertPaper(paper)

  return json({ data: { paper: normalizeS2Paper(paper), metrics: { h_index: 0, impact_factor: 0, altmetric_score: 0 } } })
}

export async function detailsRelatedRoute(req: Request): Promise<Response> {
  const { paper_id } = await readJson<{ paper_id?: string }>(req)
  if (!paper_id) throw new ApiError('MISSING_PAPER_ID', '论文ID不能为空')
  const s2Path = await toS2Input(paper_id)

  const [recommendations, citationContexts] = await Promise.all([
    getRecommendations(s2Path).then((r: any) => r.recommendedPapers ?? []).catch(() => []),
    getCitationContexts(s2Path).then((r: any) => r.data ?? []).catch(() => []),
  ])

  return json({ data: { recommendations, citation_contexts: citationContexts } })
}
