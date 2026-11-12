import type { EdgeType } from '../types/domain'
import { linkEndId, type GraphLink } from './graphAdapter'

/** How long the pointer must rest on a legend entry before the preview engages. */
export const EDGE_TYPE_FOCUS_DELAY_MS = 1000

export interface EdgeTypeFocusSets {
  nodeIds: Set<string>
  linkKeys: Set<string>
}

/**
 * The subgraph a legend hover previews: links of `type` that touch the root
 * paper, plus their endpoints. The root is the only anchor the preview has, so
 * same-type links elsewhere in the graph stay dimmed. Returning empty sets when
 * there is no anchor (or no such link) lets callers treat it as "no preview".
 */
export function focusSetsForEdgeType(
  links: GraphLink[],
  type: EdgeType | null,
  rootId: string | null,
): EdgeTypeFocusSets {
  const nodeIds = new Set<string>()
  const linkKeys = new Set<string>()
  if (!type || !rootId) return { nodeIds, linkKeys }

  for (const link of links) {
    if (link.type !== type) continue
    const source = linkEndId(link.source)
    const target = linkEndId(link.target)
    if (source !== rootId && target !== rootId) continue
    nodeIds.add(source)
    nodeIds.add(target)
    // Type-qualified: the same pair can carry several edge types, and only the
    // previewed type's link should light up.
    linkKeys.add(`${link.type}|${source}->${target}`)
  }
  return { nodeIds, linkKeys }
}
