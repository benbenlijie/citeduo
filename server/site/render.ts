import { articlePath, SITE_ARTICLES } from './content/articles'
import { HOME_COPY } from './content/home'
import { buildAppHomeUrl, buildAppPairUrl, buildGithubOutboundUrl, SITE_FACTS, type SiteLocale } from './facts'
import type { ResolvedPageMeta, SiteArticleSpec } from './types'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function absoluteSiteUrl(pathname: string): string {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${SITE_FACTS.canonicalOrigin}${clean}`
}

const SITE_CSS = `
:root{--bg:#070c16;--panel:#0f172a;--panel2:#111c33;--line:#1e293b;--text:#e5e7eb;--muted:#94a3b8;--accent:#34d399;--accent-bg:rgba(52,211,153,.13);--blue:#60a5fa;--amber:#fbbf24}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:radial-gradient(1080px 520px at 16% -10%,#102c44 0%,transparent 60%),var(--bg);color:var(--text);font:16px/1.68 ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;min-height:100vh}
a{color:#7dd3fc;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1120px;margin:0 auto;padding:0 22px}
.site-header{border-bottom:1px solid var(--line);background:rgba(7,12,22,.86);backdrop-filter:blur(10px);position:sticky;top:0;z-index:20}
.nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;flex-wrap:wrap}
.brand{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:19px;color:#fff;letter-spacing:-.02em}
.brand:hover{text-decoration:none}
.badge-dot{width:10px;height:10px;border-radius:99px;background:linear-gradient(135deg,var(--accent),var(--blue))}
.nav-links{display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:14px}
.nav-links a{color:var(--muted)}
.nav-links a:hover,.nav-links a.active{color:#fff;text-decoration:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;padding:10px 16px;font-weight:600;font-size:14px;border:1px solid var(--line);background:var(--panel2);color:#fff;text-decoration:none;transition:border-color .15s,background .15s}
.btn:hover{border-color:#3b82f6;background:#162544;text-decoration:none}
.btn.primary{background:#059669;border-color:#10b981;color:#fff}
.btn.primary:hover{background:#10b981}
.btn.sm{padding:6px 11px;font-size:13px;border-radius:8px}
.hero{padding:64px 0 42px}
.eyebrow{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);background:var(--accent-bg);border:1px solid rgba(52,211,153,.3);border-radius:999px;padding:4px 11px;margin-bottom:16px}
h1{font-size:clamp(30px,4.4vw,48px);line-height:1.14;letter-spacing:-.03em;margin:0 0 18px;color:#fff;max-width:880px}
.lead{font-size:18px;color:#cbd5e1;max-width:820px;margin:0 0 26px}
.cta-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
section{padding:34px 0}
h2{font-size:24px;line-height:1.28;letter-spacing:-.02em;color:#fff;margin:0 0 10px}
h3{font-size:17px;line-height:1.35;color:#f8fafc;margin:0 0 8px}
.sub{color:var(--muted);margin:0 0 20px;max-width:780px;font-size:15px}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}
.card{background:linear-gradient(180deg,rgba(17,28,51,.88),rgba(15,23,42,.92));border:1px solid var(--line);border-radius:14px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;gap:12px}
.card p{margin:0;color:#cbd5e1;font-size:14.5px}
.pair-endpoints{font-size:13px;color:#93c5fd;background:rgba(15,23,42,.8);border:1px solid rgba(59,130,246,.22);border-radius:9px;padding:9px 11px;line-height:1.45}
.shot{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.shot img{display:block;width:100%;height:auto}
.shot figcaption{padding:11px 14px;font-size:13px;color:var(--muted);border-top:1px solid var(--line)}
.list-box{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px}
.list-box ul{margin:10px 0 0;padding-left:20px;color:#cbd5e1}
.list-box li{margin-bottom:8px;font-size:15px}
.star-banner{background:linear-gradient(135deg,rgba(5,150,105,.18),rgba(30,58,138,.28));border:1px solid rgba(52,211,153,.35);border-radius:16px;padding:26px;margin:20px 0}
.article-shell{max-width:840px;margin:0 auto;padding:44px 0 36px}
.answer-box{background:rgba(16,185,129,.09);border-left:4px solid var(--accent);border-radius:10px;padding:16px 18px;margin:22px 0 28px;color:#ecfdf5;font-size:16px}
.meta-line{font-size:13px;color:var(--muted);margin-bottom:18px}
.article-sec{margin:32px 0}
.article-sec p{color:#cbd5e1;margin:0 0 14px}
.article-sec ul{padding-left:22px;color:#cbd5e1}
.article-sec li{margin-bottom:9px}
.table-wrap{overflow-x:auto;margin:16px 0;border:1px solid var(--line);border-radius:12px}
table{width:100%;border-collapse:collapse;background:var(--panel);font-size:14px}
th,td{text-align:left;padding:11px 13px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:#f8fafc;background:rgba(17,28,51,.9);font-weight:600}
tr:last-child td{border-bottom:0}
pre{background:#050811;border:1px solid var(--line);border-radius:11px;padding:14px 16px;overflow-x:auto;color:#e2e8f0;font-size:13.5px;line-height:1.55}
.breadcrumbs{font-size:13px;color:var(--muted);margin-bottom:14px}
.site-footer{border-top:1px solid var(--line);padding:32px 0 48px;margin-top:36px;color:var(--muted);font-size:13.5px}
.footer-grid{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
@media(max-width:720px){.hero{padding:40px 0 26px}.lead{font-size:16px}}
`

function clientBeaconScript(pageEvent: 'landing_view' | 'page_view', locale: SiteLocale): string {
  return `<script>
(function(){
  function send(ev, meta){
    try{
      var payload = JSON.stringify({ event: ev, path: location.pathname, referrer: document.referrer || '', meta: Object.assign({ locale: '${locale}' }, meta || {}) });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/analytics/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true, credentials: 'same-origin' }).catch(function(){});
      }
    }catch(_){}
  }
  if (${JSON.stringify(pageEvent)} === 'landing_view') send('landing_view');
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('[data-track]') : null;
    if (!el) return;
    var kind = el.getAttribute('data-track');
    var placement = el.getAttribute('data-placement') || 'unknown';
    if (kind === 'example_open') {
      send('example_open', { pair: el.getAttribute('data-pair') || '', placement: placement });
    } else if (kind === 'star_cta_click') {
      send('star_cta_click', { placement: placement });
      send('github_outbound', { placement: placement });
    } else if (kind === 'github_outbound') {
      send('github_outbound', { placement: placement });
    }
  });
  var starEl = document.querySelector('[data-observe-star]');
  if (starEl && 'IntersectionObserver' in window) {
    var seen = false;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!seen && entry.isIntersecting) {
          seen = true;
          send('star_cta_view', { placement: starEl.getAttribute('data-observe-star') || 'banner' });
          io.disconnect();
        }
      });
    }, { threshold: 0.35 });
    io.observe(starEl);
  }
})();
</script>`
}

function renderHead(meta: ResolvedPageMeta, jsonLdBlocks: Record<string, unknown>[], extraMeta = ''): string {
  const canonicalUrl = absoluteSiteUrl(meta.canonicalPath)
  const enUrl = absoluteSiteUrl(meta.enPath)
  const zhUrl = absoluteSiteUrl(meta.zhPath)
  const socialImg = absoluteSiteUrl(SITE_FACTS.socialImagePath)
  const jsonLdHtml = jsonLdBlocks
    .map((block) => `<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`)
    .join('\n')

  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<link rel="alternate" hreflang="en" href="${escapeHtml(enUrl)}">
<link rel="alternate" hreflang="zh-Hans" href="${escapeHtml(zhUrl)}">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(enUrl)}">
<meta property="og:type" content="${meta.ogType}">
<meta property="og:site_name" content="${escapeHtml(SITE_FACTS.brandName)}">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:image" content="${escapeHtml(socialImg)}">
<meta property="og:image:width" content="${SITE_FACTS.socialImageWidth}">
<meta property="og:image:height" content="${SITE_FACTS.socialImageHeight}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${escapeHtml(socialImg)}">
${extraMeta}
<style>${SITE_CSS}</style>
${jsonLdHtml}
</head>`
}

function renderHeader(meta: ResolvedPageMeta): string {
  const isZh = meta.locale === 'zh'
  const homeHref = isZh ? '/zh/' : '/'
  const guidesAnchor = `${homeHref}#guides`
  const selfHostHref = isZh ? '/zh/docs/self-hosting-citeduo' : '/docs/self-hosting-citeduo'
  const switchHref = isZh ? meta.enPath : meta.zhPath
  const switchLabel = isZh ? 'English' : '简体中文'
  const appHref = buildAppHomeUrl(isZh ? 'header_zh' : 'header_en')
  const githubHref = buildGithubOutboundUrl('header', meta.locale)

  return `<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="${escapeHtml(homeHref)}">
      <span class="badge-dot" aria-hidden="true"></span>
      <span>${escapeHtml(SITE_FACTS.brandName)}</span>
    </a>
    <nav class="nav-links" aria-label="${isZh ? '主导航' : 'Primary'}">
      <a href="${escapeHtml(guidesAnchor)}">${isZh ? '指南与对比' : 'Guides & Compare'}</a>
      <a href="${escapeHtml(selfHostHref)}">${isZh ? '自托管部署' : 'Self-Hosting'}</a>
      <a href="${escapeHtml(appHref)}">${isZh ? '论文工作台' : 'Workspace'}</a>
      <a href="${escapeHtml(githubHref)}" target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="header">GitHub</a>
      <a class="btn sm" href="${escapeHtml(switchHref)}" hreflang="${isZh ? 'en' : 'zh-Hans'}">${switchLabel}</a>
    </nav>
  </div>
</header>`
}

function renderFooter(locale: SiteLocale): string {
  const isZh = locale === 'zh'
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <strong>${escapeHtml(SITE_FACTS.brandName)}</strong> · ${
        isZh
          ? `本地优先开源学术论文关系探索器（${SITE_FACTS.licenseSpdx} 许可证）`
          : `Open-source, local-first academic paper relation explorer (${SITE_FACTS.licenseSpdx} License)`
      }<br>
      <span>${isZh ? '最后更新' : 'Last updated'}: ${SITE_FACTS.lastUpdated} · ${escapeHtml(SITE_FACTS.maintainer)}</span>
    </div>
    <div class="nav-links">
      <a href="${isZh ? '/zh/' : '/'}">${isZh ? '首页' : 'Home'}</a>
      <a href="${escapeHtml(buildAppHomeUrl(isZh ? 'footer_zh' : 'footer_en'))}">${isZh ? '进入应用 (/papers/)' : 'Open App (/papers/)'}</a>
      <a href="/sitemap.xml">Sitemap</a>
      <a href="${escapeHtml(buildGithubOutboundUrl('footer', locale))}" target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="footer">GitHub (${SITE_FACTS.licenseSpdx})</a>
    </div>
  </div>
</footer>`
}

export function renderLandingPage(locale: SiteLocale): string {
  const copy = HOME_COPY[locale]
  const isZh = locale === 'zh'
  const canonicalPath = isZh ? '/zh/' : '/'
  const meta: ResolvedPageMeta = {
    locale,
    htmlLang: isZh ? 'zh-CN' : 'en',
    hreflangSelf: isZh ? 'zh-Hans' : 'en',
    title: copy.metaTitle,
    description: copy.description,
    canonicalPath,
    enPath: '/',
    zhPath: '/zh/',
    lastmod: SITE_FACTS.lastUpdated,
    ogType: 'website',
  }

  const primaryPair = SITE_FACTS.examplePairs[0]
  const primaryPairHref = buildAppPairUrl(primaryPair)
  const heroStarHref = buildGithubOutboundUrl('hero', locale)
  const bannerStarHref = buildGithubOutboundUrl('value_banner', locale)
  const selfHostHref = isZh ? '/zh/docs/self-hosting-citeduo' : '/docs/self-hosting-citeduo'

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_FACTS.brandName,
      url: absoluteSiteUrl(canonicalPath),
      inLanguage: meta.htmlLang,
      description: copy.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_FACTS.brandName,
      applicationCategory: 'ReferenceApplication',
      operatingSystem: 'Linux, macOS, Windows, Docker, Web',
      url: absoluteSiteUrl(canonicalPath),
      codeRepository: SITE_FACTS.githubRepoUrl,
      license: SITE_FACTS.licenseUrl,
      description: copy.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ]

  const examplesHtml = SITE_FACTS.examplePairs
    .map((pair) => {
      const href = buildAppPairUrl(pair)
      return `<article class="card">
        <div>
          <h3>${escapeHtml(pair.title[locale])}</h3>
          <div class="pair-endpoints">
            <div><strong>A:</strong> ${escapeHtml(pair.fromTitle)}</div>
            <div><strong>B:</strong> ${escapeHtml(pair.toTitle)}</div>
          </div>
          <p style="margin-top:10px">${escapeHtml(pair.bridgeSummary[locale])}</p>
        </div>
        <div>
          <a class="btn primary sm" href="${escapeHtml(href)}" data-track="example_open" data-pair="${escapeHtml(pair.id)}" data-placement="examples_grid">${escapeHtml(copy.tryPairLabel)}</a>
        </div>
      </article>`
    })
    .join('\n')

  const stepsHtml = copy.steps
    .map(
      (step) => `<div class="card">
      <div>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.body)}</p>
      </div>
    </div>`,
    )
    .join('\n')

  const visualsHtml = copy.visuals
    .map(
      (v) => `<figure class="shot">
      <img src="${escapeHtml(v.src)}" alt="${escapeHtml(v.alt)}" width="${v.width}" height="${v.height}" loading="lazy" decoding="async">
      <figcaption>${escapeHtml(v.caption)}</figcaption>
    </figure>`,
    )
    .join('\n')

  const diffsHtml = copy.diffs
    .map(
      (d) => `<div class="card">
      <div>
        <h3>${escapeHtml(d.title)}</h3>
        <p>${escapeHtml(d.body)}</p>
      </div>
    </div>`,
    )
    .join('\n')

  const articlesHtml = SITE_ARTICLES.map((article) => {
    const item = article[locale]
    const href = articlePath(article, locale)
    return `<article class="card">
      <div>
        <span class="eyebrow" style="margin-bottom:10px">${escapeHtml(item.eyebrow)}</span>
        <h3><a href="${escapeHtml(href)}" style="color:#fff">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
      <div>
        <a href="${escapeHtml(href)}">${isZh ? '阅读全文 →' : 'Read guide →'}</a>
      </div>
    </article>`
  }).join('\n')

  return `<!doctype html>
<html lang="${meta.htmlLang}">
${renderHead(meta, jsonLd)}
<body>
${renderHeader(meta)}
<main class="wrap">
  <section class="hero">
    <span class="eyebrow">${escapeHtml(copy.eyebrow)}</span>
    <h1>${escapeHtml(copy.h1)}</h1>
    <p class="lead">${escapeHtml(copy.lead)}</p>
    <div class="cta-row">
      <a class="btn primary" href="${escapeHtml(primaryPairHref)}" data-track="example_open" data-pair="${escapeHtml(primaryPair.id)}" data-placement="hero">${escapeHtml(copy.primaryCta)}</a>
      <a class="btn" href="${escapeHtml(buildAppHomeUrl(isZh ? 'hero_workspace_zh' : 'hero_workspace_en'))}">${escapeHtml(copy.openWorkspaceCta)}</a>
      <a class="btn" href="${escapeHtml(heroStarHref)}" target="_blank" rel="noopener noreferrer" data-track="star_cta_click" data-placement="hero">${escapeHtml(copy.secondaryCta)}</a>
    </div>
  </section>

  <section id="examples">
    <h2>${escapeHtml(copy.examplesHeading)}</h2>
    <p class="sub">${escapeHtml(copy.examplesSub)}</p>
    <div class="grid-3">
      ${examplesHtml}
    </div>
  </section>

  <section id="how-it-works">
    <h2>${escapeHtml(copy.stepsHeading)}</h2>
    <div class="grid-2">
      ${stepsHtml}
    </div>
  </section>

  <section id="screenshots">
    <h2>${escapeHtml(copy.visualHeading)}</h2>
    <p class="sub">${escapeHtml(copy.visualSub)}</p>
    <div class="grid-2">
      ${visualsHtml}
    </div>
  </section>

  <section id="differentiators">
    <h2>${escapeHtml(copy.diffHeading)}</h2>
    <p class="sub">${escapeHtml(copy.diffSub)}</p>
    <div class="grid-2">
      ${diffsHtml}
    </div>
  </section>

  <section id="fit">
    <h2>${escapeHtml(copy.fitHeading)}</h2>
    <div class="grid-2">
      <div class="list-box">
        <h3>${escapeHtml(copy.goodFitTitle)}</h3>
        <ul>${copy.goodFit.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="list-box">
        <h3>${escapeHtml(copy.notFitTitle)}</h3>
        <ul>${copy.notFit.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  <section id="limitations">
    <h2>${escapeHtml(copy.limitsHeading)}</h2>
    <div class="list-box">
      <ul>${copy.limits.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  </section>

  <section id="guides">
    <h2>${escapeHtml(copy.resourcesHeading)}</h2>
    <p class="sub">${escapeHtml(copy.resourcesSub)}</p>
    <div class="grid-3">
      ${articlesHtml}
    </div>
  </section>

  <section>
    <div class="star-banner" data-observe-star="landing_bottom">
      <h2>${escapeHtml(copy.starBannerHeading)}</h2>
      <p class="sub" style="color:#e2e8f0;margin-bottom:16px">${escapeHtml(copy.starBannerBody)}</p>
      <div class="cta-row">
        <a class="btn primary" href="${escapeHtml(bannerStarHref)}" target="_blank" rel="noopener noreferrer" data-track="star_cta_click" data-placement="landing_bottom">★ ${escapeHtml(copy.starBannerButton)}</a>
        <a class="btn" href="${escapeHtml(selfHostHref)}">${escapeHtml(copy.selfHostButton)}</a>
      </div>
    </div>
  </section>
</main>
${renderFooter(locale)}
${clientBeaconScript('landing_view', locale)}
</body>
</html>`
}

export function renderArticlePage(article: SiteArticleSpec, locale: SiteLocale): string {
  const isZh = locale === 'zh'
  const content = article[locale]
  const enPath = articlePath(article, 'en')
  const zhPath = articlePath(article, 'zh')
  const canonicalPath = isZh ? zhPath : enPath
  const homePath = isZh ? '/zh/' : '/'

  const meta: ResolvedPageMeta = {
    locale,
    htmlLang: isZh ? 'zh-CN' : 'en',
    hreflangSelf: isZh ? 'zh-Hans' : 'en',
    title: content.metaTitle,
    description: content.description,
    canonicalPath,
    enPath,
    zhPath,
    lastmod: article.lastmod,
    ogType: 'article',
  }

  const categoryLabel =
    article.category === 'guides'
      ? isZh ? '方法指南' : 'Guides'
      : article.category === 'compare'
        ? isZh ? '工具对比' : 'Comparisons'
        : isZh ? '部署文档' : 'Documentation'

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: content.title,
      description: content.description,
      dateModified: article.lastmod,
      datePublished: article.lastmod,
      inLanguage: meta.htmlLang,
      mainEntityOfPage: absoluteSiteUrl(canonicalPath),
      author: {
        '@type': 'Organization',
        name: SITE_FACTS.brandName,
        url: SITE_FACTS.canonicalOrigin,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_FACTS.brandName,
        url: SITE_FACTS.canonicalOrigin,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: isZh ? 'CiteDuo 首页' : 'CiteDuo Home',
          item: absoluteSiteUrl(homePath),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: categoryLabel,
          item: `${absoluteSiteUrl(homePath)}#guides`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: content.title,
          item: absoluteSiteUrl(canonicalPath),
        },
      ],
    },
  ]

  const sectionsHtml = content.sections
    .map((sec) => {
      const paragraphs = sec.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
      const bullets = sec.bullets
        ? `<ul>${sec.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
        : ''
      const table = sec.table
        ? `<div class="table-wrap"><table><thead><tr>${sec.table.headers
            .map((h) => `<th>${escapeHtml(h)}</th>`)
            .join('')}</tr></thead><tbody>${sec.table.rows
            .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table></div>`
        : ''
      const code = sec.code ? `<pre><code>${escapeHtml(sec.code)}</code></pre>` : ''
      return `<section class="article-sec">
        <h2>${escapeHtml(sec.heading)}</h2>
        ${paragraphs}
        ${bullets}
        ${table}
        ${code}
      </section>`
    })
    .join('\n')

  const related = SITE_ARTICLES.filter((a) => a.id !== article.id).slice(0, 3)
  const relatedHtml = related
    .map((item) => {
      const href = articlePath(item, locale)
      return `<article class="card">
        <div>
          <h3><a href="${escapeHtml(href)}" style="color:#fff">${escapeHtml(item[locale].title)}</a></h3>
          <p>${escapeHtml(item[locale].description)}</p>
        </div>
      </article>`
    })
    .join('\n')

  const starHref = buildGithubOutboundUrl(`article_${article.slug}`, locale)
  const isCtaExternal = content.ctaHref.startsWith('http')
  const isSecondaryExternal = content.secondaryCtaHref?.startsWith('http') ?? false

  return `<!doctype html>
<html lang="${meta.htmlLang}">
${renderHead(meta, jsonLd)}
<body>
${renderHeader(meta)}
<main class="wrap">
  <article class="article-shell">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${escapeHtml(homePath)}">${isZh ? '首页' : 'Home'}</a> /
      <a href="${escapeHtml(`${homePath}#guides`)}">${escapeHtml(categoryLabel)}</a> /
      <span>${escapeHtml(content.title)}</span>
    </nav>
    <span class="eyebrow">${escapeHtml(content.eyebrow)}</span>
    <h1>${escapeHtml(content.title)}</h1>
    <div class="meta-line">
      ${isZh ? '维护者' : 'Maintained by'}: ${escapeHtml(SITE_FACTS.maintainer)} ·
      ${isZh ? '更新日期' : 'Updated'}: <time datetime="${escapeHtml(article.lastmod)}">${escapeHtml(article.lastmod)}</time>
    </div>

    <div class="answer-box">
      <strong>${isZh ? '核心结论：' : 'Short answer: '}</strong>${escapeHtml(content.summaryAnswer)}
    </div>

    <div class="cta-row" style="margin-bottom:28px">
      <a class="btn primary" href="${escapeHtml(content.ctaHref)}"${isCtaExternal ? ' target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="article_top"' : ' data-track="example_open" data-placement="article_top"'}>${escapeHtml(content.ctaLabel)}</a>
      ${
        content.secondaryCtaLabel && content.secondaryCtaHref
          ? `<a class="btn" href="${escapeHtml(content.secondaryCtaHref)}"${isSecondaryExternal ? ' target="_blank" rel="noopener noreferrer" data-track="github_outbound" data-placement="article_top_secondary"' : ''}>${escapeHtml(content.secondaryCtaLabel)}</a>`
          : ''
      }
    </div>

    ${sectionsHtml}

    <section class="article-sec">
      <h2>${isZh ? '参考资料与可核验来源' : 'References & Verifiable Sources'}</h2>
      <ul>
        ${content.sources
          .map(
            (s) =>
              `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a></li>`,
          )
          .join('')}
      </ul>
    </section>

    <div class="star-banner" data-observe-star="article_${escapeHtml(article.slug)}">
      <h2>${isZh ? '觉得这篇指南有帮助？' : 'Was this guide useful for your literature workflow?'}</h2>
      <p class="sub" style="color:#e2e8f0;margin-bottom:14px">${
        isZh
          ? '先在工作台用你手头的两篇论文试跑一次关联分析；如果确实帮到了你，欢迎在 GitHub 点亮 Star 支持开源维护。'
          : 'Run a relation check on two papers from your own reading list first — and if CiteDuo saves you time, star the open-source repository on GitHub.'
      }</p>
      <div class="cta-row">
        <a class="btn primary" href="${escapeHtml(starHref)}" target="_blank" rel="noopener noreferrer" data-track="star_cta_click" data-placement="article_${escapeHtml(article.slug)}">★ ${isZh ? '在 GitHub 上点 Star' : 'Star on GitHub'}</a>
        <a class="btn" href="${escapeHtml(buildAppHomeUrl(`article_bottom_${locale}`))}">${isZh ? '打开 CiteDuo 工作台' : 'Open CiteDuo Workspace'}</a>
      </div>
    </div>
  </article>

  <section>
    <h2>${isZh ? '继续阅读相关指南' : 'Related Guides & Comparisons'}</h2>
    <div class="grid-3">
      ${relatedHtml}
    </div>
  </section>
</main>
${renderFooter(locale)}
${clientBeaconScript('page_view', locale)}
</body>
</html>`
}

export function renderNotFoundPage(pathname: string): string {
  const isZh = pathname === '/zh' || pathname.startsWith('/zh/')
  const htmlLang = isZh ? 'zh-CN' : 'en'
  const title = isZh ? '404 页面不存在 · CiteDuo' : '404 Page Not Found · CiteDuo'
  const heading = isZh ? '找不到你访问的页面（404）' : 'Page not found (404)'
  const body = isZh
    ? '该地址不存在或已被移动。你可以返回 CiteDuo 首页阅读指南，或直接进入交互式论文关系工作台。'
    : 'This URL does not exist on citeduo.com. Return to the CiteDuo home page or open the interactive paper workspace.'

  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex,follow">
<style>${SITE_CSS}</style>
</head>
<body>
<main class="wrap" style="padding:84px 22px">
  <span class="eyebrow">HTTP 404</span>
  <h1>${escapeHtml(heading)}</h1>
  <p class="lead">${escapeHtml(body)}</p>
  <div class="cta-row">
    <a class="btn primary" href="${isZh ? '/zh/' : '/'}">${isZh ? '返回首页' : 'Back to Home'}</a>
    <a class="btn" href="${escapeHtml(buildAppHomeUrl('404'))}">${isZh ? '打开论文工作台 (/papers/)' : 'Open Workspace (/papers/)'}</a>
  </div>
</main>
</body>
</html>`
}
