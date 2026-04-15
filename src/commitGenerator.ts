import * as path from "path"
import * as vscode from "vscode"
import { getGitDiffStagedFirst } from "./git"
import { createProvider } from "./providers"

let abortController: AbortController | undefined

export async function generateCommitMsg(scm?: vscode.SourceControl): Promise<void> {
  try {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports
    if (!gitExtension) {
      throw new Error("Git extension not found")
    }

    const git = gitExtension.getAPI(1)
    if (git.repositories.length === 0) {
      throw new Error("No Git repositories available")
    }

    // If invoked from SCM panel button, a specific repo is provided
    if (scm) {
      const repository = git.getRepository(scm.rootUri)
      if (!repository) {
        throw new Error("Repository not found for the selected SCM")
      }
      await generateForRepository(repository)
      return
    }

    await orchestrateMultiRepo(git.repositories)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    vscode.window.showErrorMessage(`[Zemit] ${msg}`)
  }
}

export function abortGeneration(): void {
  abortController?.abort()
  vscode.commands.executeCommand("setContext", "aiCommit.isGenerating", false)
}

// ─── Multi-repo orchestration ─────────────────────────────────────────────────

async function orchestrateMultiRepo(repos: unknown[]): Promise<void> {
  const reposWithChanges = await filterReposWithChanges(repos)

  if (reposWithChanges.length === 0) {
    vscode.window.showInformationMessage("[Zemit] No changes found in any repository.")
    return
  }

  if (reposWithChanges.length === 1) {
    await generateForRepository(reposWithChanges[0])
    return
  }

  const items = reposWithChanges.map((repo: any) => ({
    label: repo.rootUri.fsPath.split(path.sep).pop() || repo.rootUri.fsPath,
    description: repo.rootUri.fsPath,
    repo,
  }))

  items.unshift({
    label: "$(git-commit) All repositories with changes",
    description: `Generate for ${reposWithChanges.length} repositories`,
    repo: null as any,
  })

  const selection = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a repository to generate a commit message for",
  })

  if (!selection) return

  if (selection.repo === null) {
    for (const repo of reposWithChanges) {
      await generateForRepository(repo).catch(() => {})
    }
  } else {
    await generateForRepository(selection.repo)
  }
}

async function filterReposWithChanges(repos: unknown[]): Promise<unknown[]> {
  const result = []
  for (const repo of repos) {
    try {
      const diff = await getGitDiffStagedFirst((repo as any).rootUri.fsPath)
      if (diff) result.push(repo)
    } catch {
      // repo has no changes — skip
    }
  }
  return result
}

// ─── Generation for a single repository ──────────────────────────────────────

async function generateForRepository(repository: any): Promise<void> {
  const repoPath = repository.rootUri.fsPath
  const repoName = repoPath.split(path.sep).pop() || "repository"
  const diff = await getGitDiffStagedFirst(repoPath)

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.SourceControl,
      title: `Zemit: Generating commit message for ${repoName}...`,
      cancellable: true,
    },
    (_progress, token) => performGeneration(repository.inputBox, diff, token),
  )
}

async function performGeneration(
  inputBox: any,
  diff: string,
  token: vscode.CancellationToken,
): Promise<void> {
  const config = vscode.workspace.getConfiguration("aiCommit")
  const maxDiffSize = config.get<number>("maxDiffSize", 5000)
  const style = config.get<string>("commitStyle", "conventional")

  const truncatedDiff =
    diff.length > maxDiffSize ? diff.substring(0, maxDiffSize) + "\n\n[Diff truncated due to size]" : diff

  // Include any existing user note in the prompt
  const existingNote = inputBox.value?.trim() || ""

  let prompt = truncatedDiff
  if (existingNote) {
    prompt = `Developer note (use if relevant): ${existingNote}\n\n${prompt}`
  }

  abortController = new AbortController()
  token.onCancellationRequested(() => abortController?.abort())

  try {
    await vscode.commands.executeCommand("setContext", "aiCommit.isGenerating", true)

    const provider = createProvider(config)
    let response = ""

    for await (const chunk of provider.generateCommitMessage(prompt, style, abortController.signal)) {
      if (token.isCancellationRequested) break
      response += chunk
      inputBox.value = cleanCommitMessage(response)
    }

    if (!inputBox.value) {
      throw new Error("The AI returned an empty response")
    }
  } finally {
    await vscode.commands.executeCommand("setContext", "aiCommit.isGenerating", false)
  }
}

function cleanCommitMessage(str: string): string {
  return str
    .trim()
    .replace(/^```[^\n]*\n?|```$/g, "")
    .trim()
}
