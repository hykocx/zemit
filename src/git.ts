import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

async function isGitInstalled(): Promise<boolean> {
  try {
    await execAsync("git --version")
    return true
  } catch {
    return false
  }
}

async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execAsync("git rev-parse --git-dir", { cwd })
    return true
  } catch {
    return false
  }
}

async function hasCommits(cwd: string): Promise<boolean> {
  try {
    await execAsync("git rev-parse HEAD", { cwd })
    return true
  } catch {
    return false
  }
}

export async function getGitDiff(cwd: string, stagedOnly = false): Promise<string> {
  if (!(await isGitInstalled())) {
    throw new Error("Git n'est pas installé")
  }
  if (!(await isGitRepo(cwd))) {
    throw new Error("Pas un dépôt git")
  }

  let diff = ""

  if (await hasCommits(cwd)) {
    const { stdout: staged } = await execAsync("git --no-pager diff --staged --diff-filter=d", { cwd })
    diff = staged.trim()
  }

  if (!stagedOnly && !diff) {
    const { stdout: unstaged } = await execAsync("git --no-pager diff HEAD --diff-filter=d", { cwd })
    diff = unstaged.trim()
  }

  // New repo with no commits yet — show everything that's staged/tracked
  if (!diff) {
    const { stdout: newRepo } = await execAsync("git --no-pager diff --cached --diff-filter=d", { cwd })
    diff = newRepo.trim()
  }

  // Include untracked (new) files when not limiting to staged only
  if (!stagedOnly) {
    const { stdout: untrackedList } = await execAsync("git ls-files --others --exclude-standard", { cwd })
    const untrackedFiles = untrackedList.trim().split("\n").filter(Boolean)
    for (const file of untrackedFiles) {
      // git diff --no-index exits with code 1 when files differ — that's normal
      const result = await execAsync(
        `git --no-pager diff --no-index -- /dev/null ${JSON.stringify(file)}`,
        { cwd },
      ).catch((e: any) => ({ stdout: e.stdout as string | undefined }))
      if (result.stdout) diff += (diff ? "\n" : "") + result.stdout
    }
    diff = diff.trim()
  }

  if (!diff) {
    throw new Error("Aucune modification trouvée pour générer un message de commit")
  }

  return diff
}

export async function getGitDiffStagedFirst(cwd: string): Promise<string> {
  try {
    return await getGitDiff(cwd, true)
  } catch {
    return await getGitDiff(cwd, false)
  }
}
