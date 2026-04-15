export const SYSTEM_PROMPT =
  "You are a git commit message generator. Output only the commit message — no explanation, no preamble, no backticks, no quotes. All messages must be written in English."

export const CONVENTIONAL_INSTRUCTION = `Based on the provided git diff, generate a concise and descriptive commit message following the Conventional Commits format:

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

export const SIMPLE_INSTRUCTION = `Based on the provided git diff, generate a short and clear one-line commit message (50-72 characters).`
