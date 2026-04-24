export const LATEST_PROMPT_VERSION = "zemit-v2"

export const SYSTEM_PROMPT =
  "You are a git commit message generator. Output only the commit message — no explanation, no preamble, no backticks, no quotes. All messages must be written in English."

export const ZEMIT_V1 = `Based on the provided git diff, generate a concise and descriptive commit message following the Conventional Commits format:

  <type>(<scope>): <short description>

Types: feat, fix, refactor, style, docs, test, chore, perf, revert
- feat: new feature
- fix: bug fix
- refactor: code restructuring without behavior change
- style: formatting only (spaces, commas, no logic change)
- docs: documentation only
- test: add or update tests
- chore: maintenance, dependencies, build config
- perf: performance improvement
- revert: revert a previous commit (format: revert: revert "<original message>")

Rules:
- Scope is optional, specifies the affected area (e.g. auth, api, storage, ui, config)
- Description: lowercase, no trailing period, in English
- One commit = one intention, do not mix fix and refactor
- For breaking changes, add ! after the type and a BREAKING CHANGE: footer
- Only include a body if there are multiple distinct changes to explain; for a single focused change, output the title only`

export const ZEMIT_V2 = `Generate a git commit message following Conventional Commits format:

<type>(<scope>): <short description>

Types: feat | fix | refactor | style | docs | test | chore | perf
Scope: optional, affected module (e.g. auth, api, ui, config)
Description: lowercase, imperative mood, no trailing period

Body rules:
- Single focused change → title only
- Multiple files or distinct concerns → title + blank line + concise bullet body listing each change
- Breaking change: add ! after type + "BREAKING CHANGE: <detail>" footer`

const PROMPT_REGISTRY: Record<string, string> = {
  "zemit-v1": ZEMIT_V1,
  "zemit-v2": ZEMIT_V2,
}

export function getPrompt(version: string): string {
  return PROMPT_REGISTRY[version] ?? PROMPT_REGISTRY[LATEST_PROMPT_VERSION]
}
