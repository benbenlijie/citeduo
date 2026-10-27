/**
 * Self-contained dashboard for the first-party usage table. Deliberately not a
 * React route: it must stay reachable even if the SPA build is stale, and it
 * has no dependencies beyond the JSON endpoint next to it.
 */
export function renderStatsPage(): string {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CiteDuo · 使用统计</title>
<style>
:root{--bg:#080d16;--panel:#0f172a;--line:#1e293b;--text:#e5e7eb;--muted:#94a3b8;--accent:#34d399;--blue:#60a5fa;--red:#f87171}
*{box-sizing:border-box}
html,body{margin:0}
body{background:radial-gradient(1100px 560px at 18% -12%,#11304a 0%,transparent 62%),var(--bg);color:var(--text);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;min-height:100vh}
main{max-width:1180px;margin:0 auto;padding:42px 24px 72px}
a{color:#7dd3fc;text-decoration:none}
a:hover{text-decoration:underline}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:24px}
.eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:600}
h1{font-size:34px;line-height:1.1;letter-spacing:-.035em;margin:6px 0 8px}
.sub{color:var(--muted);font-size:13px;margin:0;max-width:640px}
.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-end}
button{font:inherit;color:var(--text);background:#111c33;border:1px solid var(--line);border-radius:10px;padding:8px 13px;cursor:pointer;transition:border-color .15s,background .15s}
button:hover{border-color:#334155;background:#16233d}
button.ghost{background:transparent}
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;flex-wrap:wrap}
.tabs{display:inline-flex;background:#0b1424;border:1px solid var(--line);border-radius:12px;padding:3px;gap:3px}
.tabs button{border:0;background:transparent;padding:7px 13px;border-radius:9px;color:var(--muted);font-size:13px}
.tabs button.active{background:#1e293b;color:#fff}
.muted{color:var(--muted);font-size:12px}
.error{margin:0 0 18px;padding:12px 14px;border:1px solid rgba(248,113,113,.35);background:rgba(248,113,113,.08);color:#fecaca;border-radius:12px;font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:12px;margin-bottom:18px}
.kpi{background:linear-gradient(180deg,rgba(17,28,51,.92),rgba(15,23,42,.92));border:1px solid var(--line);border-radius:14px;padding:15px 16px}
.kpi span{display:block;color:var(--muted);font-size:11px;letter-spacing:.04em;margin-bottom:8px}
.kpi strong{display:block;font-size:29px;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.kpi small{display:block;color:var(--muted);font-size:11px;margin-top:9px;line-height:1.35}
.panel{background:linear-gradient(180deg,rgba(17,28,51,.9),rgba(15,23,42,.9));border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin-bottom:18px}
.panel h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin:0 0 12px;font-weight:600}
.panel h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 8px;font-weight:600}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.panel-head h2{margin:0}
.legend{display:flex;gap:14px;color:var(--muted);font-size:11px}
.legend span{display:inline-flex;align-items:center;gap:6px}
.dot{width:8px;height:8px;border-radius:99px;display:inline-block;background:var(--accent)}
.dot.views{background:var(--blue)}
.chart{display:flex;align-items:flex-end;gap:5px;height:190px;overflow-x:auto;padding:14px 2px 0}
.col{flex:1 0 22px;min-width:22px;display:flex;flex-direction:column;align-items:center;gap:6px}
.bars{height:150px;display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%}
.bar{width:7px;border-radius:3px 3px 0 0;background:var(--accent);opacity:.92;min-height:0}
.bar.views{background:var(--blue)}
.col span{font-size:9px;color:var(--muted);white-space:nowrap}
.col span.hide{opacity:0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.grid .panel{margin-bottom:0}
.split{display:grid;grid-template-columns:1fr 1fr;gap:18px}
table{width:100%;border-collapse:collapse}
th{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;text-align:left;padding:0 0 6px}
td{padding:8px 0;border-top:1px solid rgba(30,41,59,.72);vertical-align:top;font-size:13px}
th:not(:first-child),td:not(:first-child){text-align:right;white-space:nowrap;padding-left:12px}
td:first-child{max-width:360px;overflow:hidden;text-overflow:ellipsis}
.num{font-variant-numeric:tabular-nums}
.empty{color:var(--muted);font-size:13px;padding:10px 0 4px;margin:0}
footer{color:var(--muted);font-size:11px;line-height:1.7;margin-top:26px;border-top:1px solid var(--line);padding-top:16px}
@media(max-width:820px){
  main{padding:28px 16px 56px}
  header{flex-direction:column}
  .actions{justify-content:flex-start}
  h1{font-size:27px}
  .grid,.split{grid-template-columns:1fr}
  .grid .panel{margin-bottom:0}
}
</style>
</head>
<body>
<main>
  <header>
    <div>
      <div class="eyebrow">CiteDuo / papers</div>
      <h1>使用统计</h1>
      <p class="sub">第一方统计，只写入本地 SQLite；不接第三方，不存原始 IP、User-Agent 或消息正文。</p>
    </div>
    <div class="actions">
      <button id="refresh" class="ghost" type="button">刷新</button>
      <span id="updated" class="muted"></span>
    </div>
  </header>

  <div class="toolbar">
    <div class="tabs" role="tablist" aria-label="时间范围">
      <button data-range="7d" type="button">7 天</button>
      <button data-range="30d" class="active" type="button">30 天</button>
      <button data-range="90d" type="button">90 天</button>
      <button data-range="all" type="button">全部</button>
    </div>
    <span id="status" class="muted"></span>
  </div>

  <div id="error" class="error" hidden></div>
  <section id="kpis" class="kpis"></section>

  <section class="panel">
    <div class="panel-head">
      <h2>每日趋势</h2>
      <div class="legend">
        <span><i class="dot"></i>访客</span>
        <span><i class="dot views"></i>页面浏览</span>
      </div>
    </div>
    <div id="chart" class="chart"></div>
  </section>

  <section class="grid">
    <div class="panel"><h2>热门页面</h2><div id="pages"></div></div>
    <div class="panel"><h2>热门论文</h2><div id="papers"></div></div>
    <div class="panel"><h2>搜索词</h2><div id="searches"></div></div>
    <div class="panel"><h2>功能使用</h2><div id="features"></div></div>
    <div class="panel"><h2>来源</h2><div id="referrers"></div></div>
    <div class="panel"><h2>浏览器 / 设备</h2><div id="tech"></div></div>
  </section>

  <footer>
    <div id="foot">正在加载…</div>
    <div>口径：页面浏览由前端在 SPA 路由变化时上报；搜索、建图、翻译、AI 等由服务端记录。会话按同一访客 30 分钟窗口切分。</div>
  </footer>
</main>
<script>
(function () {
  'use strict';
  // Work at "/stats" and at a sub-path mount such as "/papers/stats" without
  // hard-coding the mount: derive it from the page's own public URL.
  var MOUNT = window.location.pathname.replace(/\\/stats\\/?$/, '');
  var BASE = MOUNT;
  var API = MOUNT + '/api/admin/usage';
  var current = '30d';
  var seq = 0;
  var fmt = new Intl.NumberFormat('zh-CN');
  var EVENT_LABELS = {
    page_view: '页面浏览', search: '搜索', details: '论文详情', network: '建图',
    lineage: '研究脉络', connect: '找关联', reader_open: '阅读器', translate: '翻译',
    ai_session: 'AI 会话', ai_chat: 'AI 对话', neighbors: '邻居扩展'
  };

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function kpi(label, value, hint, suffix) {
    return '<div class="kpi"><span>' + esc(label) + '</span><strong>' + fmt.format(value) + (suffix || '') +
      '</strong>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</div>';
  }

  function table(headers, rows, empty) {
    if (!rows.length) return '<p class="empty">' + esc(empty || '暂无数据') + '</p>';
    var head = headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('');
    var body = rows.map(function (cells) {
      return '<tr>' + cells.map(function (cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderKpis(d) {
    var t = d.totals;
    var today = d.today;
    var rate = t.visitors ? Math.round(t.returningVisitors / t.visitors * 100) : 0;
    $('kpis').innerHTML = [
      kpi('活跃访客', t.visitors, '新 ' + fmt.format(t.newVisitors) + ' · 回访 ' + fmt.format(t.returningVisitors)),
      kpi('页面浏览', t.pageViews, 'SPA 路由变化'),
      kpi('会话', t.sessions, '30 分钟窗口'),
      kpi('功能事件', t.events, '搜索/建图/翻译/AI'),
      kpi('今日访客', today.visitors, '今日 ' + fmt.format(today.pageViews) + ' 次浏览'),
      kpi('回访率', rate, '回访访客 / 活跃访客', '%')
    ].join('');
  }

  function renderChart(d) {
    var rows = d.daily || [];
    if (!rows.length) {
      $('chart').innerHTML = '<p class="empty">暂无数据</p>';
      return;
    }
    var max = 1;
    rows.forEach(function (r) { max = Math.max(max, r.visitors, r.pageViews); });
    var step = Math.max(1, Math.ceil(rows.length / 8));
    $('chart').innerHTML = rows.map(function (r, i) {
      var vh = r.visitors === 0 ? 0 : Math.max(3, Math.round(r.visitors / max * 100));
      var ph = r.pageViews === 0 ? 0 : Math.max(3, Math.round(r.pageViews / max * 100));
      var show = rows.length <= 14 || i % step === 0 || i === rows.length - 1;
      return '<div class="col" title="' + esc(r.date) + '：' + fmt.format(r.visitors) + ' 访客 / ' +
        fmt.format(r.pageViews) + ' 浏览"><div class="bars">' +
        '<i class="bar" style="height:' + vh + '%"></i>' +
        '<i class="bar views" style="height:' + ph + '%"></i>' +
        '</div><span class="' + (show ? '' : 'hide') + '">' + esc(r.date.slice(5)) + '</span></div>';
    }).join('');
  }

  function renderPages(d) {
    var rows = (d.topPages || []).map(function (r) {
      var href = BASE + (r.path === '/' ? '/' : r.path);
      return ['<a href="' + esc(href) + '" target="_blank" rel="noreferrer">' + esc(r.path || '/') + '</a>',
        fmt.format(r.views), fmt.format(r.visitors)];
    });
    $('pages').innerHTML = table(['路径', '浏览', '访客'], rows);
  }

  function renderPapers(d) {
    var rows = (d.topPapers || []).map(function (r) {
      var label = r.title || r.paperId;
      var href = r.arxivId
        ? BASE + '/read/' + encodeURIComponent(r.arxivId)
        : BASE + '/?paper=' + encodeURIComponent(r.paperId);
      return ['<a href="' + esc(href) + '" target="_blank" rel="noreferrer">' + esc(label) + '</a>',
        fmt.format(r.views), fmt.format(r.visitors)];
    });
    $('papers').innerHTML = table(['论文', '浏览', '访客'], rows);
  }

  function renderSearches(d) {
    var rows = (d.topSearches || []).map(function (r) {
      return [esc(r.query), fmt.format(r.count), fmt.format(r.visitors)];
    });
    $('searches').innerHTML = table(['搜索词', '次数', '访客'], rows);
  }

  function renderFeatures(d) {
    var rows = (d.events || []).map(function (r) {
      return [esc(EVENT_LABELS[r.event] || r.event), fmt.format(r.count), fmt.format(r.visitors)];
    });
    $('features').innerHTML = table(['功能', '次数', '访客'], rows);
  }

  function renderReferrers(d) {
    var rows = (d.referrers || []).map(function (r) {
      return [esc(r.referrer), fmt.format(r.count)];
    });
    $('referrers').innerHTML = table(['来源', '浏览'], rows);
  }

  function renderTech(d) {
    var browsers = (d.browsers || []).map(function (r) { return [esc(r.browser), fmt.format(r.count)]; });
    var devices = (d.devices || []).map(function (r) { return [esc(r.device), fmt.format(r.count)]; });
    $('tech').innerHTML = '<div class="split"><div><h3>浏览器</h3>' +
      table(['浏览器', '浏览'], browsers) + '</div><div><h3>设备</h3>' +
      table(['设备', '浏览'], devices) + '</div></div>';
  }

  function renderFoot(d) {
    if (!d.firstEventAt) {
      $('foot').textContent = '还没有数据。打开一次 /papers 并操作一下，这里就会出现记录。';
      return;
    }
    $('foot').textContent = '记录始于 ' + d.firstEventAt + ' UTC，最后一条 ' + d.lastEventAt + ' UTC；' +
      '当前范围 ' + d.range.from + ' 至 ' + d.range.to + '。';
  }

  function render(d) {
    renderKpis(d);
    renderChart(d);
    renderPages(d);
    renderPapers(d);
    renderSearches(d);
    renderFeatures(d);
    renderReferrers(d);
    renderTech(d);
    renderFoot(d);
  }

  async function load(range) {
    current = range;
    var id = ++seq;
    document.querySelectorAll('[data-range]').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-range') === range);
    });
    $('status').textContent = '加载中…';
    $('error').hidden = true;
    try {
      var res = await fetch(API + '?range=' + encodeURIComponent(range), {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(res.status === 401 ? '需要管理员口令' : 'HTTP ' + res.status);
      var payload = await res.json();
      if (id !== seq) return;
      render(payload.data);
      $('status').textContent = '';
      $('updated').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    } catch (error) {
      if (id !== seq) return;
      $('error').hidden = false;
      $('error').textContent = '加载失败：' + error.message;
      $('status').textContent = '';
    }
  }

  document.querySelectorAll('[data-range]').forEach(function (button) {
    button.addEventListener('click', function () { load(button.getAttribute('data-range')); });
  });
  $('refresh').addEventListener('click', function () { load(current); });

  load('30d');
  setInterval(function () {
    if (!document.hidden) load(current);
  }, 60000);
})();
</script>
</body>
</html>`
  return html
}
