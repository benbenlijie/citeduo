import { articlePath, SITE_ARTICLES } from './content/articles'
import { categoryPath } from './content/categories'
import { SITE_FACTS, type SiteLocale } from './facts'
import {
  absoluteSiteUrl,
  escapeHtml,
  renderAboutPage,
  renderArticlePage,
  renderCategoryPage,
  renderLandingPage,
  renderNotFoundPage,
} from './render'
import type { ArticleCategory } from './types'

const SITE_ASSETS_DIR = new URL('./assets', import.meta.url).pathname

export interface SitemapEntry {
  loc: string
  lastmod: string
  enUrl: string
  zhUrl: string
}

export function listSitemapEntries(locale: SiteLocale): SitemapEntry[] {
  const entries: SitemapEntry[] = [
    {
      loc: absoluteSiteUrl(locale === 'zh' ? '/zh/' : '/'),
      lastmod: SITE_FACTS.lastUpdated,
      enUrl: absoluteSiteUrl('/'),
      zhUrl: absoluteSiteUrl('/zh/'),
    },
    {
      loc: absoluteSiteUrl(locale === 'zh' ? '/zh/about' : '/about'),
      lastmod: SITE_FACTS.lastUpdated,
      enUrl: absoluteSiteUrl('/about'),
      zhUrl: absoluteSiteUrl('/zh/about'),
    },
  ]
  for (const category of ['guides', 'compare', 'docs'] as ArticleCategory[]) {
    const enUrl = absoluteSiteUrl(categoryPath(category, 'en'))
    const zhUrl = absoluteSiteUrl(categoryPath(category, 'zh'))
    entries.push({
      loc: locale === 'zh' ? zhUrl : enUrl,
      lastmod: SITE_FACTS.lastUpdated,
      enUrl,
      zhUrl,
    })
  }
  for (const article of SITE_ARTICLES) {
    const enUrl = absoluteSiteUrl(articlePath(article, 'en'))
    const zhUrl = absoluteSiteUrl(articlePath(article, 'zh'))
    entries.push({
      loc: locale === 'zh' ? zhUrl : enUrl,
      lastmod: article.updatedAt,
      enUrl,
      zhUrl,
    })
  }
  return entries
}

export function renderRobotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteSiteUrl('/sitemap.xml')}\n`
}

export function renderLlmsTxt(): string {
  const articles = SITE_ARTICLES.map(
    (article) =>
      `- ${article.en.title}: ${absoluteSiteUrl(articlePath(article, 'en'))} | ${absoluteSiteUrl(articlePath(article, 'zh'))}`,
  ).join('\n')
  return `# CiteDuo

> CiteDuo is an MIT-licensed, local-first tool for exploring citation networks and explaining how two academic papers are connected. It ranks direct citations, bibliographic coupling, co-citation, recommender links, and SPECTER2 similarity as distinct evidence types.

## Canonical facts

- Website: ${absoluteSiteUrl('/')}
- About and methodology: ${absoluteSiteUrl('/about')}
- GitHub: ${SITE_FACTS.githubRepoUrl}
- License: ${SITE_FACTS.licenseSpdx}
- Maintainer: ${SITE_FACTS.maintainer} (${SITE_FACTS.maintainerUrl})
- Data sources: Semantic Scholar, OpenAlex, SPECTER2 embeddings, arXiv / ar5iv
- Runtime: one Bun process with one SQLite database; self-hostable with Docker or Bun

## Core capabilities

- Search papers and build interactive citation networks.
- Explain how two specified papers connect, hop by hop, with alternatives.
- Distinguish direct citations, bibliographic coupling, co-citation, recommender affinity, and semantic similarity.
- Read arXiv sections in-app and optionally translate paragraphs.
- Keep cached graphs, notes, favourites, and collections locally.

## Known limitations

- A bounded live search that finds no path is inconclusive, not proof that two papers are unrelated.
- Citation coverage depends on Semantic Scholar and OpenAlex metadata.
- CiteDuo is not a PRISMA screening tool, reference manager, or exhaustive paywalled citation index.
- In-app full text depends on arXiv availability and the operator's PAPER_CONTENT_MODE setting.

## Key pages

- English home: ${absoluteSiteUrl('/')}
- Chinese home: ${absoluteSiteUrl('/zh/')}
- Guides: ${absoluteSiteUrl('/guides/')}
- Comparisons: ${absoluteSiteUrl('/compare/')}
- Documentation: ${absoluteSiteUrl('/docs/')}

## Articles

${articles}
`
}

export function renderSitemapIndexXml(): string {
  const lastmod = SITE_FACTS.lastUpdated
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeHtml(absoluteSiteUrl('/sitemap-en.xml'))}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeHtml(absoluteSiteUrl('/sitemap-zh.xml'))}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
  </sitemap>
</sitemapindex>
`
}

export function renderLocaleSitemapXml(locale: SiteLocale): string {
  const items = listSitemapEntries(locale)
    .map(
      (entry) => `  <url>
    <loc>${escapeHtml(entry.loc)}</loc>
    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(entry.enUrl)}"/>
    <xhtml:link rel="alternate" hreflang="zh-Hans" href="${escapeHtml(entry.zhUrl)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(entry.enUrl)}"/>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${items}
</urlset>
`
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
    },
  })
}

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

function redirectPermanent(location: string, search: string): Response {
  return new Response(null, {
    status: 301,
    headers: {
      Location: `${location}${search}`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

/**
 * Known prefixes owned by the server-rendered public marketing/content site.
 * Requests sent to `/site/*` (via Nginx internal rewrite on citeduo.com root)
 * OR directly to `/zh/*`, `/guides/*`, `/compare/*`, `/docs/*`, `/robots.txt`,
 * `/sitemap*.xml`, `/site-assets/*` are handled here without touching the SPA.
 */
export function isPublicSitePath(pathname: string): boolean {
  return (
    pathname === '/site' ||
    pathname.startsWith('/site/') ||
    pathname === '/zh' ||
    pathname.startsWith('/zh/') ||
    pathname.startsWith('/guides/') ||
    pathname === '/guides' ||
    pathname.startsWith('/compare/') ||
    pathname === '/compare' ||
    pathname.startsWith('/docs/') ||
    pathname === '/docs' ||
    pathname === '/about' ||
    pathname.startsWith('/about/') ||
    pathname.startsWith('/zh/about') ||
    pathname.startsWith('/site-assets/') ||
    pathname === '/llms.txt' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/sitemap-en.xml' ||
    pathname === '/sitemap-zh.xml'
  )
}

export async function handlePublicSiteRequest(req: Request, url: URL): Promise<Response | null> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return null

  let p = url.pathname
  let forcedSiteNamespace = false
  if (p === '/site' || p.startsWith('/site/')) {
    forcedSiteNamespace = true
    p = p.slice('/site'.length) || '/'
  } else if (!isPublicSitePath(p)) {
    return null
  }

  const headOnly = (res: Response): Response =>
    req.method === 'HEAD' ? new Response(null, { status: res.status, headers: res.headers }) : res

  if (p === '/robots.txt') {
    return headOnly(
      new Response(renderRobotsTxt(), {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      }),
    )
  }

  if (p === '/sitemap.xml') return headOnly(xmlResponse(renderSitemapIndexXml()))
  if (p === '/sitemap-en.xml') return headOnly(xmlResponse(renderLocaleSitemapXml('en')))
  if (p === '/sitemap-zh.xml') return headOnly(xmlResponse(renderLocaleSitemapXml('zh')))
  if (p === '/llms.txt') {
    return headOnly(
      new Response(renderLlmsTxt(), {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      }),
    )
  }

  if (p.startsWith('/site-assets/')) {
    const rel = p.slice('/site-assets/'.length)
    if (!rel || rel.includes('..') || rel.includes('/')) {
      return headOnly(htmlResponse(renderNotFoundPage(p), 404))
    }
    const file = Bun.file(`${SITE_ASSETS_DIR}/${rel}`)
    if (!(await file.exists())) {
      return headOnly(htmlResponse(renderNotFoundPage(p), 404))
    }
    return headOnly(
      new Response(file, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400',
        },
      }),
    )
  }

  if (p === '/') {
    return headOnly(htmlResponse(renderLandingPage('en'), 200))
  }
  if (p === '/zh') {
    return headOnly(redirectPermanent('/zh/', url.search))
  }
  if (p === '/zh/') {
    return headOnly(htmlResponse(renderLandingPage('zh'), 200))
  }

  if (p === '/about') return headOnly(htmlResponse(renderAboutPage('en'), 200))
  if (p === '/zh/about') return headOnly(htmlResponse(renderAboutPage('zh'), 200))
  if (p === '/about/' || p === '/zh/about/') {
    return headOnly(redirectPermanent(p.replace(/\/+$/, ''), url.search))
  }

  for (const category of ['guides', 'compare', 'docs'] as ArticleCategory[]) {
    if (p === `/${category}`) return headOnly(redirectPermanent(`/${category}/`, url.search))
    if (p === `/${category}/`) {
      return headOnly(htmlResponse(renderCategoryPage(category, 'en'), 200))
    }
    if (p === `/zh/${category}`) {
      return headOnly(redirectPermanent(`/zh/${category}/`, url.search))
    }
    if (p === `/zh/${category}/`) {
      return headOnly(htmlResponse(renderCategoryPage(category, 'zh'), 200))
    }
  }

  // Canonicalize trailing slashes on article URLs (/guides/foo/ -> /guides/foo)
  if (p.length > 1 && p.endsWith('/')) {
    const trimmed = p.replace(/\/+$/, '')
    const matchesArticle = SITE_ARTICLES.some(
      (a) => trimmed === articlePath(a, 'en') || trimmed === articlePath(a, 'zh'),
    )
    if (matchesArticle) {
      return headOnly(redirectPermanent(trimmed, url.search))
    }
  }

  for (const article of SITE_ARTICLES) {
    if (p === articlePath(article, 'en')) {
      return headOnly(htmlResponse(renderArticlePage(article, 'en'), 200))
    }
    if (p === articlePath(article, 'zh')) {
      return headOnly(htmlResponse(renderArticlePage(article, 'zh'), 200))
    }
  }

  if (forcedSiteNamespace || isPublicSitePath(p)) {
    return headOnly(htmlResponse(renderNotFoundPage(p), 404))
  }

  return null
}
