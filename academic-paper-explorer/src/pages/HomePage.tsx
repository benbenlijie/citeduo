import React from 'react'
import SearchBar from '../components/SearchBar'
import PaperList from '../components/PaperList'
import NetworkGraph from '../components/NetworkGraph'
import DetailsPanel from '../components/DetailsPanel'
import ConnectionPanel from '../components/ConnectionPanel'
import ConnectionCapsule from '../components/ConnectionCapsule'
import { HeaderStarLink } from '../components/StarConversionPrompt'
import { recordDemoStartOnce, recordNetworkViewOnce } from '../lib/conversion'
import { resolvePaperKey } from '../lib/paperKey'
import FilterPanel from '../components/FilterPanel'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../components/ui/resizable'
import { useUiStore } from '../store/useUiStore'
import { usePaperNetwork } from '../hooks/usePaperNetwork'
import { useUrlSync } from '../hooks/useUrlSync'
import { api } from '../services/api'

const HomePage: React.FC = () => {
  const {
    selectedPaper,
    graphDepth,
    graphMaxNodes,
    comparePaper,
    setComparePaper,
    connectPair,
    submittedQuery,
  } = useUiStore()
  useUrlSync()
  const { data: networkData } = usePaperNetwork(selectedPaper, graphDepth ?? undefined, graphMaxNodes ?? undefined)
  const [icpBeianNumber, setIcpBeianNumber] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    api.getConfig().then(({ icpBeianNumber }) => {
      if (!cancelled) setIcpBeianNumber(icpBeianNumber)
    }).catch(() => {
      // 站点配置暂不可用时仍可正常使用工作台。
    })
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    const src = new URLSearchParams(window.location.search).get('src') ?? undefined
    recordDemoStartOnce(src)
  }, [])

  React.useEffect(() => {
    if (networkData && networkData.nodes.length > 0) {
      recordNetworkViewOnce(resolvePaperKey(selectedPaper) ?? undefined)
    }
  }, [networkData, selectedPaper])

  const [mobilePane, setMobilePane] = React.useState<'list' | 'graph' | 'details'>('graph')

  React.useEffect(() => {
    if (selectedPaper) setMobilePane('graph')
  }, [selectedPaper])

  React.useEffect(() => {
    if (submittedQuery) setMobilePane('list')
  }, [submittedQuery])

  const emptyGraphState = (
    <div className="flex h-full items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 md:mb-6 md:h-32 md:w-32">
          <svg className="h-12 w-12 text-white md:h-16 md:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-300 md:text-xl">
          开始探索学术网络
        </h3>
        <p className="mb-4 text-sm text-gray-500 md:text-base">
          请在上方搜索框中输入 DOI、arXiv ID、Semantic Scholar ID 或关键词，
          或直接点开一组示例论文查看逐跳关联路径。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              const from = { id: '2304.02643', title: 'Segment Anything', authors: '', citation_count: 0, source: 'semantic_scholar' as const }
              const to = { id: '2410.24164', title: 'π0: Vision-Language-Action Flow Model', authors: '', citation_count: 0, source: 'semantic_scholar' as const }
              useUiStore.getState().selectRootPaper(from)
              connectPair(from, to, { run: true })
            }}
            className="min-h-11 w-full rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 sm:w-auto"
          >
            用两篇示例论文体验（SAM ↔ π0）
          </button>
        </div>
      </div>
    </div>
  )

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col bg-gray-800">
      <div className="hidden border-b border-gray-700 p-4 md:block">
        <h2 className="text-lg font-semibold text-gray-200">论文列表</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <PaperList />
      </div>
      <div className="border-t border-gray-700">
        <FilterPanel />
      </div>
    </div>
  )

  const detailsPanel = (
    <div className="h-full min-h-0 bg-gray-800">
      <DetailsPanel />
    </div>
  )

  const mobileGraphPanel = (
    <div className="relative flex h-full min-h-0 flex-col bg-gray-900">
      {selectedPaper && comparePaper && (
        <div className="z-20 flex items-center gap-2 border-b border-gray-700 bg-gray-800/95 px-3 py-2 text-xs text-white">
          <span className="min-w-0 flex-1 truncate">{comparePaper.title || '对比论文'}</span>
          <button
            type="button"
            onClick={() => connectPair(selectedPaper, comparePaper, { run: true })}
            className="min-h-11 shrink-0 rounded border border-emerald-600 px-2 text-emerald-300 hover:bg-emerald-600/20"
          >
            分析关联
          </button>
          <button
            type="button"
            aria-label="退出对比"
            onClick={() => setComparePaper(null)}
            className="min-h-11 min-w-11 shrink-0 rounded text-gray-400 hover:bg-gray-600 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {selectedPaper ? <NetworkGraph /> : emptyGraphState}
      </div>
      <ConnectionPanel />
    </div>
  )

  const desktopGraphPanel = (
    <div className="relative h-full min-h-0 bg-gray-900">
      {selectedPaper && comparePaper ? (
        <ResizablePanelGroup direction="horizontal" autoSaveId="cpe:home-compare" className="h-full">
          <ResizablePanel id="compare-primary" order={1} defaultSize={50} minSize={20} className="relative h-full">
            <NetworkGraph />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="compare-secondary" order={2} minSize={20} className="relative h-full">
            <div className="absolute left-1/2 top-4 z-20 flex max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-lg bg-gray-800/90 px-3 py-1.5 text-xs text-white">
              <span className="truncate">{comparePaper.title || '对比论文'}</span>
              <button
                type="button"
                onClick={() => connectPair(selectedPaper, comparePaper, { run: true })}
                className="flex-shrink-0 whitespace-nowrap rounded border border-emerald-600 px-1.5 py-0.5 text-emerald-300 hover:bg-emerald-600/20"
                title="分析这两篇论文之间的关联路径"
              >
                分析这两篇的关联
              </button>
              <button
                type="button"
                aria-label="退出对比"
                onClick={() => setComparePaper(null)}
                className="flex-shrink-0 rounded px-1 text-gray-400 hover:bg-gray-600 hover:text-white"
              >
                ✕
              </button>
            </div>
            <NetworkGraph paper={comparePaper} slot="compare" />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : selectedPaper ? (
        <NetworkGraph />
      ) : (
        emptyGraphState
      )}

      <ConnectionPanel />
    </div>
  )

  const mobileTabs = [
    { id: 'list' as const, label: '列表' },
    { id: 'graph' as const, label: '图谱' },
    { id: 'details' as const, label: '详情' },
  ]

  return (
    <div className="flex h-screen h-[100dvh] flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="border-b border-gray-700 bg-gray-800 px-3 py-2 lg:px-6 lg:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <h1 className="text-xl font-bold text-blue-400 md:text-2xl">
              CiteDuo
            </h1>
            <div className="hidden truncate text-sm text-gray-400 lg:block">
              学术论文关联网络分析平台
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionCapsule />
            <div className="hidden lg:block text-sm text-gray-400">
              查清两篇论文到底是怎么连上的
            </div>
            <div className="hidden sm:block">
              <HeaderStarLink />
            </div>
          </div>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="border-b border-gray-700 bg-gray-800 px-3 py-2 lg:px-6 lg:py-3">
        <SearchBar />
      </div>

      {/* 主要内容区域：左右面板宽度可拖拽调整 */}
      <div className="hidden min-h-0 flex-1 lg:block">
        <ResizablePanelGroup direction="horizontal" autoSaveId="cpe:home-layout" className="h-full w-full">
        {/* 左侧论文列表 */}
        <ResizablePanel
          id="paper-list"
          order={1}
          defaultSize={22}
          minSize={14}
          maxSize={40}
          className="bg-gray-800 overflow-hidden flex flex-col"
        >
          {listPanel}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 中间网络图 */}
        <ResizablePanel id="graph" order={2} defaultSize={52} minSize={25} className="relative bg-gray-900">
          {desktopGraphPanel}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 右侧详情面板 */}
        <ResizablePanel
          id="details"
          order={3}
          defaultSize={26}
          minSize={16}
          maxSize={50}
          className="bg-gray-800 overflow-hidden"
        >
          {detailsPanel}
        </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <nav className="grid grid-cols-3 border-b border-gray-700 bg-gray-800 lg:hidden" role="tablist" aria-label="移动端面板">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            id={`mobile-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={mobilePane === tab.id}
            aria-controls={`mobile-panel-${tab.id}`}
            onClick={() => setMobilePane(tab.id)}
            className={`min-h-11 border-b-2 px-2 py-2 text-sm font-medium transition-colors ${
              mobilePane === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main
        id={`mobile-panel-${mobilePane}`}
        role="tabpanel"
        aria-labelledby={`mobile-tab-${mobilePane}`}
        className="min-h-0 flex-1 overflow-hidden lg:hidden"
      >
        {mobilePane === 'list' ? listPanel : mobilePane === 'graph' ? mobileGraphPanel : detailsPanel}
      </main>

      {/* 底部状态栏 */}
      <footer className="border-t border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-400 md:px-6 md:text-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {networkData && (
              <span>
                网络: {networkData.nodes.length} 节点, {networkData.edges.length} 边
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>数据源: OpenAlex · Semantic Scholar · CrossRef</span>
          </div>
        </div>
        {icpBeianNumber && (
          <div className="text-center">
            <a className="inline-flex min-h-11 items-center underline" href="https://beian.miit.gov.cn/">
              {icpBeianNumber}
            </a>
          </div>
        )}
      </footer>
    </div>
  )
}

export default HomePage
