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

const HomePage: React.FC = () => {
  const {
    selectedPaper,
    graphDepth,
    graphMaxNodes,
    comparePaper,
    setComparePaper,
    connectPair,
  } = useUiStore()
  useUrlSync()
  const { data: networkData } = usePaperNetwork(selectedPaper, graphDepth ?? undefined, graphMaxNodes ?? undefined)

  React.useEffect(() => {
    const src = new URLSearchParams(window.location.search).get('src') ?? undefined
    recordDemoStartOnce(src)
  }, [])

  React.useEffect(() => {
    if (networkData && networkData.nodes.length > 0) {
      recordNetworkViewOnce(resolvePaperKey(selectedPaper) ?? undefined)
    }
  }, [networkData, selectedPaper])

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-400">
              CiteDuo
            </h1>
            <div className="text-sm text-gray-400">
              学术论文关联网络分析平台
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ConnectionCapsule />
            <div className="hidden lg:block text-sm text-gray-400">
              查清两篇论文到底是怎么连上的
            </div>
            <HeaderStarLink />
          </div>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <SearchBar />
      </div>

      {/* 主要内容区域：左右面板宽度可拖拽调整 */}
      <ResizablePanelGroup direction="horizontal" autoSaveId="cpe:home-layout" className="flex-1">
        {/* 左侧论文列表 */}
        <ResizablePanel
          id="paper-list"
          order={1}
          defaultSize={22}
          minSize={14}
          maxSize={40}
          className="bg-gray-800 overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-200">论文列表</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <PaperList />
          </div>
          {/* 过滤器 */}
          <div className="border-t border-gray-700">
            <FilterPanel />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 中间网络图 */}
        <ResizablePanel id="graph" order={2} defaultSize={52} minSize={25} className="relative bg-gray-900">
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
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  开始探索学术网络
                </h3>
                <p className="text-gray-500 max-w-md mb-4">
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
                    className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                  >
                    用两篇示例论文体验（SAM ↔ π0）
                  </button>
                </div>
              </div>
            </div>
          )}

          <ConnectionPanel />
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
          <DetailsPanel />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* 底部状态栏 */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            {networkData && (
              <span>
                网络: {networkData.nodes.length} 节点, {networkData.edges.length} 边
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>数据源: OpenAlex · Semantic Scholar · CrossRef</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage