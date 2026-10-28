import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './config'
import { loadProviders } from './llm'
import { buildOpencodeConfig, buildPaperToolSources } from './opencode-config'
import { INTERNAL_TOKEN } from './internal-token'

export interface OpencodeClient {
  createSession(title: string): Promise<string>
  sessionExists(sessionId: string): Promise<boolean>
  promptAsync(
    sessionId: string,
    agent: string,
    providerID: string,
    modelID: string,
    text: string,
  ): Promise<void>
  messages(sessionId: string): Promise<unknown[]>
  abort(sessionId: string): Promise<void>
  eventStream(): Promise<Response>
}

/** `opencode serve` HTTP Basic auth (username is always `opencode`). */
export function opencodeAuthHeaders(password: string | undefined): Record<string, string> {
  if (!password) return {}
  return { Authorization: `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}` }
}

export function createOpencodeClient(
  baseUrl: string,
  timeoutMs = 120000,
  password = '',
): OpencodeClient {
  const root = baseUrl.replace(/\/+$/, '')
  const auth = opencodeAuthHeaders(password)
  const sessionPath = (sessionId: string) => `${root}/session/${encodeURIComponent(sessionId)}`
  return {
    async createSession(title) {
      const res = await fetch(`${root}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ title }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`opencode createSession ${res.status}`)
      const body = (await res.json()) as { id: string }
      return body.id
    },
    async promptAsync(sessionId, agent, providerID, modelID, text) {
      const res = await fetch(`${sessionPath(sessionId)}/prompt_async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          agent,
          model: { providerID, modelID },
          parts: [{ type: 'text', text }],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`opencode promptAsync ${res.status}`)
    },
    async sessionExists(sessionId) {
      const res = await fetch(sessionPath(sessionId), {
        headers: auth,
        signal: AbortSignal.timeout(timeoutMs),
      })
      return res.ok
    },
    async messages(sessionId) {
      const res = await fetch(`${sessionPath(sessionId)}/message`, {
        headers: auth,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`opencode messages ${res.status}`)
      return (await res.json()) as unknown[]
    },
    async abort(sessionId) {
      const res = await fetch(`${sessionPath(sessionId)}/abort`, {
        method: 'POST',
        headers: auth,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`opencode abort ${res.status}`)
    },
    async eventStream() {
      return fetch(`${root}/event`, { headers: auth })
    },
  }
}

export interface OpencodeManagerOptions {
  runtimeDir: string
  baseUrl: string
  port: number
  /** Basic auth password for the spawned server; empty disables auth. */
  password?: string
}

export class OpencodeManager {
  private proc: ReturnType<typeof Bun.spawn> | null = null
  private ready = false
  private stopped = false
  private restartAttempt = 0
  private startedAt: number | null = null

  constructor(private opts: OpencodeManagerOptions) {}

  get baseUrl(): string {
    return this.opts.baseUrl
  }

  isHealthy(): boolean {
    return this.ready
  }

  async start(): Promise<void> {
    const provider = loadProviders().find((p) => p.kind === 'openai')
    if (!provider) throw new Error('no openai provider configured for the AI agent')
    if (provider.kind === 'openai' && !provider.baseUrl) throw new Error('provider missing baseUrl')

    const toolsDir = join(this.opts.runtimeDir, '.opencode', 'tools')
    mkdirSync(toolsDir, { recursive: true, mode: 0o700 })
    writeFileSync(join(this.opts.runtimeDir, 'opencode.json'), buildOpencodeConfig(provider, config.ai.maxSteps), {
      mode: 0o600,
    })
    // One default-exported file per tool (filename becomes the tool name).
    for (const [filename, source] of Object.entries(buildPaperToolSources())) {
      writeFileSync(join(toolsDir, filename), source)
    }

    // Isolate from the user's global opencode config: the spike showed global
    // agents/models/plugins leak in otherwise (findings §4).
    const configHome = join(this.opts.runtimeDir, 'config')
    const dataHome = join(this.opts.runtimeDir, 'data')
    const cacheHome = join(this.opts.runtimeDir, 'cache')
    const stateHome = join(this.opts.runtimeDir, 'state')
    for (const dir of [configHome, dataHome, cacheHome, stateHome]) mkdirSync(dir, { recursive: true, mode: 0o700 })

    const proc = Bun.spawn(
      [config.ai.bin, 'serve', '--pure', '--hostname', '127.0.0.1', '--port', String(this.opts.port)],
      {
        cwd: this.opts.runtimeDir,
        // Do not inherit the server's whole environment: ACCESS_TOKEN, SMTP
        // credentials and every provider key would otherwise be readable by
        // the agent process. Only what opencode and our two tools need.
        env: this.childEnv(configHome, dataHome, cacheHome, stateHome),
        stdout: 'inherit',
        stderr: 'inherit',
      },
    )
    this.proc = proc

    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      if (await this.ping()) {
        this.ready = true
        this.startedAt = Date.now()
        void proc.exited.then(() => this.onExit())
        return
      }
      await Bun.sleep(250)
    }
    proc.kill()
    this.proc = null
    throw new Error('opencode server did not become healthy')
  }

  /**
   * A deliberately small environment for the agent. The server's process env
   * contains ACCESS_TOKEN, SMTP_PASS, LLM_PROVIDERS and other secrets that the
   * agent has no business seeing; inheritance turned a tool-policy bypass into
   * a credential leak. Add a variable here if opencode genuinely needs it.
   */
  private childEnv(
    configHome: string,
    dataHome: string,
    cacheHome: string,
    stateHome: string,
  ): Record<string, string> {
    const env: Record<string, string> = {}
    const passthrough = [
      'PATH',
      'LANG',
      'LC_ALL',
      'SHELL',
      'TMPDIR',
      'SSL_CERT_FILE',
      'SSL_CERT_DIR',
      'NODE_EXTRA_CA_CERTS',
      'HTTP_PROXY',
      'HTTPS_PROXY',
      'NO_PROXY',
      'http_proxy',
      'https_proxy',
      'no_proxy',
    ]
    for (const key of passthrough) {
      const value = process.env[key]
      if (value) env[key] = value
    }
    env.HOME = this.opts.runtimeDir
    env.PWD = this.opts.runtimeDir
    env.XDG_CONFIG_HOME = configHome
    env.XDG_DATA_HOME = dataHome
    env.XDG_CACHE_HOME = cacheHome
    env.XDG_STATE_HOME = stateHome
    env.PAPER_API_BASE = Bun.env.PAPER_API_BASE ?? `http://127.0.0.1:${config.server.port}/api`
    env.PAPER_INTERNAL_TOKEN = INTERNAL_TOKEN
    if (this.opts.password) env.OPENCODE_SERVER_PASSWORD = this.opts.password
    return env
  }

  private onExit(): void {
    const uptime = this.startedAt ? Date.now() - this.startedAt : 0
    this.ready = false
    if (this.stopped || !this.proc) return
    if (uptime > 30_000) this.restartAttempt = 0
    void this.scheduleRestart()
  }

  private async scheduleRestart(): Promise<void> {
    const attempt = this.restartAttempt++
    const delay = Math.min(30_000, 500 * 2 ** attempt)
    await Bun.sleep(delay)
    if (this.stopped) return
    try {
      await this.start()
    } catch (e) {
      console.error('[opencode] restart failed:', e)
      if (!this.stopped) void this.scheduleRestart()
    }
  }

  private async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.opts.baseUrl}/global/health`, {
        headers: opencodeAuthHeaders(this.opts.password),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async stop(): Promise<void> {
    this.stopped = true
    this.ready = false
    this.startedAt = null
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
    // Keep the runtime dir: it holds opencode's session store, which the
    // ai_sessions mapping depends on across restarts.
  }
}
