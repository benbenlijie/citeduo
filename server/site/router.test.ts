import { describe, expect, test } from 'bun:test'
import { openDb } from '../db'
import { ensureUsageContext, recordClientEvent } from '../analytics'
import { articlePath, SITE_ARTICLES } from './content/articles'
import { SITE_FACTS } from './facts'
import { handlePublicSiteRequest } from './router'

function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    blocks.push(JSON.parse(m[1]))
  }
  return blocks
}

describe('public site SSR, SEO metadata, hreflang, sitemap, and 404 semantics', () => {
  test('renders English landing page via /site/ with H1, canonical, hreflang, OG image, and valid JSON-LD', async () => {
    const req = new Request('https://citeduo.com/site/')
    const res = await handlePublicSiteRequest(req, new URL(req.url))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(200)
    expect(res!.headers.get('content-type')).toContain('text/html')

    const html = await res!.text()
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<h1>See how any two research papers are actually connected.</h1>')
    expect(html).toContain('<link rel="canonical" href="https://citeduo.com/">')
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://citeduo.com/">')
    expect(html).toContain('<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com/zh/">')
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://citeduo.com/">')
    expect(html).toContain('content="https://citeduo.com/site-assets/social-preview.png"')
    expect(html).not.toContain('watchdeep.net')

    // Deep-link example CTA points to verified pair in /papers/
    expect(html).toContain('/papers/?paper=2304.02643&amp;from=2304.02643&amp;to=2410.24164')

    const ld = extractJsonLd(html)
    expect(ld.length).toBeGreaterThanOrEqual(2)
    expect(ld.map((x) => x['@type'])).toEqual(expect.arrayContaining(['WebSite', 'SoftwareApplication']))
  })

  test('renders Simplified Chinese landing page at /zh/ and 301-redirects bare /zh preserving query string', async () => {
    const bare = new Request('https://citeduo.com/zh?utm_source=test')
    const bareRes = await handlePublicSiteRequest(bare, new URL(bare.url))
    expect(bareRes!.status).toBe(301)
    expect(bareRes!.headers.get('location')).toBe('/zh/?utm_source=test')

    const zh = new Request('https://citeduo.com/zh/')
    const zhRes = await handlePublicSiteRequest(zh, new URL(zh.url))
    expect(zhRes!.status).toBe(200)
    const html = await zhRes!.text()
    expect(html).toContain('<html lang="zh-CN">')
    expect(html).toContain('<h1>查清任意两篇学术论文到底是怎么连上的。</h1>')
    expect(html).toContain('<link rel="canonical" href="https://citeduo.com/zh/">')
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://citeduo.com/">')
    expect(html).toContain('<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com/zh/">')
  })

  test('renders all 6 bilingual launch articles (12 URLs) with unique titles, reciprocal hreflang, and valid JSON-LD', async () => {
    expect(SITE_ARTICLES).toHaveLength(6)
    const titles = new Set<string>()

    for (const article of SITE_ARTICLES) {
      const enPath = articlePath(article, 'en')
      const zhPath = articlePath(article, 'zh')

      const enRes = await handlePublicSiteRequest(
        new Request(`https://citeduo.com${enPath}`),
        new URL(`https://citeduo.com${enPath}`),
      )
      const zhRes = await handlePublicSiteRequest(
        new Request(`https://citeduo.com${zhPath}`),
        new URL(`https://citeduo.com${zhPath}`),
      )
      expect(enRes!.status).toBe(200)
      expect(zhRes!.status).toBe(200)

      const enHtml = await enRes!.text()
      const zhHtml = await zhRes!.text()

      expect(titles.has(article.en.metaTitle)).toBe(false)
      expect(titles.has(article.zh.metaTitle)).toBe(false)
      titles.add(article.en.metaTitle)
      titles.add(article.zh.metaTitle)

      expect(enHtml).toContain(`<link rel="canonical" href="https://citeduo.com${enPath}">`)
      expect(enHtml).toContain(`<link rel="alternate" hreflang="en" href="https://citeduo.com${enPath}">`)
      expect(enHtml).toContain(`<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com${zhPath}">`)

      expect(zhHtml).toContain(`<link rel="canonical" href="https://citeduo.com${zhPath}">`)
      expect(zhHtml).toContain(`<link rel="alternate" hreflang="en" href="https://citeduo.com${enPath}">`)
      expect(zhHtml).toContain(`<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com${zhPath}">`)

      expect(extractJsonLd(enHtml).map((b) => b['@type'])).toEqual(
        expect.arrayContaining(['Article', 'BreadcrumbList']),
      )
      expect(extractJsonLd(zhHtml).map((b) => b['@type'])).toEqual(
        expect.arrayContaining(['Article', 'BreadcrumbList']),
      )
    }
  })

  test('serves robots.txt and clean sitemaps without app shell, query states, or admin endpoints', async () => {
    const robotsRes = await handlePublicSiteRequest(
      new Request('https://citeduo.com/robots.txt'),
      new URL('https://citeduo.com/robots.txt'),
    )
    expect(robotsRes!.status).toBe(200)
    expect(robotsRes!.headers.get('content-type')).toContain('text/plain')
    const robots = await robotsRes!.text()
    expect(robots).toContain('Sitemap: https://citeduo.com/sitemap.xml')

    const indexRes = await handlePublicSiteRequest(
      new Request('https://citeduo.com/sitemap.xml'),
      new URL('https://citeduo.com/sitemap.xml'),
    )
    expect(indexRes!.status).toBe(200)
    const indexXml = await indexRes!.text()
    expect(indexXml).toContain('https://citeduo.com/sitemap-en.xml')
    expect(indexXml).toContain('https://citeduo.com/sitemap-zh.xml')

    const enXml = await (
      await handlePublicSiteRequest(
        new Request('https://citeduo.com/sitemap-en.xml'),
        new URL('https://citeduo.com/sitemap-en.xml'),
      )
    )!.text()
    const zhXml = await (
      await handlePublicSiteRequest(
        new Request('https://citeduo.com/sitemap-zh.xml'),
        new URL('https://citeduo.com/sitemap-zh.xml'),
      )
    )!.text()

    expect(enXml).toContain('<loc>https://citeduo.com/</loc>')
    expect(zhXml).toContain('<loc>https://citeduo.com/zh/</loc>')
    for (const xml of [enXml, zhXml]) {
      expect(xml).not.toContain('/papers/')
      expect(xml).not.toContain('?from=')
      expect(xml).not.toContain('/stats')
      expect(xml).not.toContain('/api/')
    }
  })

  test('serves social preview image and returns explicit 404 with noindex for unknown paths', async () => {
    const imgRes = await handlePublicSiteRequest(
      new Request(`https://citeduo.com${SITE_FACTS.socialImagePath}`),
      new URL(`https://citeduo.com${SITE_FACTS.socialImagePath}`),
    )
    expect(imgRes!.status).toBe(200)

    const notFound = await handlePublicSiteRequest(
      new Request('https://citeduo.com/site/definitely-not-found'),
      new URL('https://citeduo.com/site/definitely-not-found'),
    )
    expect(notFound!.status).toBe(404)
    const html404 = await notFound!.text()
    expect(html404).toContain('noindex,follow')

    const zhNotFound = await handlePublicSiteRequest(
      new Request('https://citeduo.com/zh/guides/missing-guide'),
      new URL('https://citeduo.com/zh/guides/missing-guide'),
    )
    expect(zhNotFound!.status).toBe(404)
  })

  test('records privacy-safe conversion events and drops raw search terms, tokens, and unknown events', () => {
    const db = openDb(':memory:')
    const req = new Request('http://localhost/api/analytics/event', {
      method: 'POST',
      headers: { 'user-agent': 'Mozilla/5.0 Chrome/155' },
    })
    ensureUsageContext(req, { secure: false })

    expect(recordClientEvent(req, { event: 'unknown_hack_event' }, db)).toBe(false)

    const ok = recordClientEvent(
      req,
      {
        event: 'star_cta_click',
        path: '/papers/?from=2304.02643&to=2410.24164&token=supersecret',
        referrer: 'https://citeduo.com/zh/?token=supersecret',
        meta: {
          placement: 'connection_panel',
          valueVerified: true,
          secretQuery: 'my private paper query',
        },
      },
      db,
    )
    expect(ok).toBe(true)

    const row = db
      .query('select event, path, query, referrer, meta from usage_events order by id desc limit 1')
      .get() as { event: string; path: string; query: string | null; referrer: string; meta: string }
    expect(row.event).toBe('star_cta_click')
    expect(row.path).toBe('/papers/')
    expect(row.query).toBeNull()
    expect(row.referrer).toBe('https://citeduo.com/zh/')
    expect(JSON.parse(row.meta)).toEqual({
      placement: 'connection_panel',
      valueVerified: true,
    })
    expect(JSON.stringify(row)).not.toContain('supersecret')
    expect(JSON.stringify(row)).not.toContain('my private paper query')
  })
})
