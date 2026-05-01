import { spawn } from "child_process"
import * as vscode from "vscode"
import { SYSTEM_PROMPT, getPrompt } from "./prompts"

export interface AIProvider {
  generateCommitMessage(diff: string, style: string, signal: AbortSignal): AsyncIterable<string>
}

// ─── OpenAI / Ollama ────────────────────────────────────────────────────────

class OpenAICompatibleProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
  ) {}

  async *generateCommitMessage(diff: string, style: string, signal: AbortSignal): AsyncIterable<string> {
    const instruction = getPrompt(style)
    const url = `${this.baseUrl}/chat/completions`

    const response = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${instruction}\n\n${diff}` },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error ${response.status}: ${error}`)
    }

    if (!response.body) {
      throw new Error("No response body received")
    }

    yield* parseSSEStream(response.body, extractOpenAIDelta)
  }
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

class AnthropicProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
  ) {}

  async *generateCommitMessage(diff: string, style: string, signal: AbortSignal): AsyncIterable<string> {
    const instruction = getPrompt(style)
    const url = `${this.baseUrl}/messages`

    const response = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 512,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${instruction}\n\n${diff}` }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${error}`)
    }

    if (!response.body) {
      throw new Error("No response body received")
    }

    yield* parseSSEStream(response.body, extractAnthropicDelta)
  }
}

// ─── Claude Code CLI ─────────────────────────────────────────────────────────

class ClaudeCodeProvider implements AIProvider {
  constructor(private readonly model: string) {}

  async *generateCommitMessage(diff: string, style: string, signal: AbortSignal): AsyncIterable<string> {
    const instruction = getPrompt(style)
    const input = `<input>${instruction}\n\n${diff}</input>`

    // ~/.local/bin may not be in PATH inside the VSCode extension host
    const env = { ...process.env, PATH: `${process.env.HOME ?? ""}/.local/bin:${process.env.PATH ?? ""}` }

    const proc = spawn("claude", [
      "-p", "--output-format", "text",
      "--model", this.model,
      "--system-prompt", SYSTEM_PROMPT,
    ], { env })

    const onAbort = () => proc.kill()
    signal.addEventListener("abort", onAbort, { once: true })

    proc.stdin.end(input)

    let stderrData = ""
    proc.stderr.on("data", (chunk: Buffer) => { stderrData += chunk.toString() })

    // When spawn fails (e.g. ENOENT), 'close' never fires — resolve via 'error' too
    let spawnError: Error | undefined
    const closeOrError = new Promise<number | null>((resolve) => {
      proc.on("close", resolve)
      proc.on("error", (err: Error) => {
        spawnError = err
        proc.stdout.destroy()  // Unblock the for-await below
        resolve(null)
      })
    })

    try {
      for await (const chunk of proc.stdout) {
        yield (chunk as Buffer).toString()
      }
    } catch {
      // stdout may throw if destroyed due to a spawn error — handled below
    } finally {
      signal.removeEventListener("abort", onAbort)
    }

    await closeOrError

    if (spawnError) {
      const isNotFound = (spawnError as NodeJS.ErrnoException).code === "ENOENT"
      throw new Error(isNotFound
        ? "Claude Code CLI introuvable. Assurez-vous que 'claude' est installé et accessible (ex. ~/.local/bin)."
        : `Claude Code CLI: ${spawnError.message}`)
    }

    const exitCode = await closeOrError
    if (exitCode !== 0 && !signal.aborted) {
      throw new Error(`Claude Code CLI error: ${stderrData || `exit code ${exitCode}`}`)
    }
  }
}

// ─── SSE parsing helpers ─────────────────────────────────────────────────────

async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
  extractDelta: (data: string) => string | null,
): AsyncIterable<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue

        const data = trimmed.slice(5).trim()
        if (data === "[DONE]") return

        const text = extractDelta(data)
        if (text) yield text
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function extractOpenAIDelta(data: string): string | null {
  try {
    const parsed = JSON.parse(data)
    return parsed?.choices?.[0]?.delta?.content ?? null
  } catch {
    return null
  }
}

function extractAnthropicDelta(data: string): string | null {
  try {
    const parsed = JSON.parse(data)
    if (parsed?.type === "content_block_delta" && parsed?.delta?.type === "text_delta") {
      return parsed.delta.text ?? null
    }
    return null
  } catch {
    return null
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createProvider(config: vscode.WorkspaceConfiguration): AIProvider {
  const provider = config.get<string>("provider", "anthropic")
  const apiKey = config.get<string>("apiKey", "")
  const model = config.get<string>("model", "claude-sonnet-4-6")
  const customBaseUrl = config.get<string>("baseUrl", "")

  switch (provider) {
    case "anthropic": {
      const baseUrl = customBaseUrl || "https://api.anthropic.com/v1"
      if (!apiKey) throw new Error("Clé API Anthropic requise. Configurez-la dans Paramètres → Zemit AI Commit.")
      return new AnthropicProvider(apiKey, model, baseUrl)
    }
    case "claudecode": {
      return new ClaudeCodeProvider(model)
    }
    case "ollama": {
      const baseUrl = customBaseUrl || "http://localhost:11434/v1"
      return new OpenAICompatibleProvider("ollama", model, baseUrl)
    }
    default: {
      const baseUrl = customBaseUrl || "https://api.openai.com/v1"
      if (!apiKey) throw new Error("Clé API OpenAI requise. Configurez-la dans Paramètres → Zemit AI Commit.")
      return new OpenAICompatibleProvider(apiKey, model, baseUrl)
    }
  }
}

// ─── Model discovery ──────────────────────────────────────────────────────────

export async function fetchAvailableModels(config: vscode.WorkspaceConfiguration): Promise<string[]> {
  const provider = config.get<string>("provider", "anthropic")
  const apiKey = config.get<string>("apiKey", "")
  const customBaseUrl = config.get<string>("baseUrl", "")

  switch (provider) {
    case "anthropic": {
      const baseUrl = customBaseUrl || "https://api.anthropic.com/v1"
      if (!apiKey) throw new Error("Clé API Anthropic requise. Configurez-la dans Paramètres → Zemit AI Commit.")
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      })
      if (!response.ok) throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`)
      const data = (await response.json()) as { data: { id: string }[] }
      return data.data.map((m) => m.id).sort()
    }
    case "openai": {
      const baseUrl = customBaseUrl || "https://api.openai.com/v1"
      if (!apiKey) throw new Error("Clé API OpenAI requise. Configurez-la dans Paramètres → Zemit AI Commit.")
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`)
      const data = (await response.json()) as { data: { id: string }[] }
      return data.data
        .map((m) => m.id)
        .filter((id) => /^(gpt-|o1|o3|chatgpt-)/.test(id))
        .sort()
    }
    case "claudecode":
      return []
    case "ollama": {
      const baseUrl = customBaseUrl || "http://localhost:11434/v1"
      const response = await fetch(`${baseUrl}/models`)
      if (!response.ok) throw new Error(`Ollama API error ${response.status}: ${await response.text()}`)
      const data = (await response.json()) as { data?: { id: string }[]; models?: { name: string }[] }
      if (data.data) return data.data.map((m) => m.id).sort()
      if (data.models) return data.models.map((m) => m.name).sort()
      return []
    }
    default:
      return []
  }
}
