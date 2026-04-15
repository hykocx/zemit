import * as vscode from "vscode"
import { abortGeneration, generateCommitMsg } from "./commitGenerator"
import { fetchAvailableModels } from "./providers"

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("aiCommit.generateCommitMessage", (scm?: vscode.SourceControl) =>
      generateCommitMsg(scm),
    ),
    vscode.commands.registerCommand("aiCommit.abortGeneration", () => abortGeneration()),
    vscode.commands.registerCommand("aiCommit.selectModel", () => selectModel()),
  )
}

async function selectModel(): Promise<void> {
  const config = vscode.workspace.getConfiguration("aiCommit")

  let models: string[]
  try {
    models = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Zemit: Fetching available models…", cancellable: false },
      () => fetchAvailableModels(config),
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    vscode.window.showErrorMessage(`[Zemit] ${msg}`)
    return
  }

  if (models.length === 0) {
    vscode.window.showWarningMessage("[Zemit] No models found for the configured provider.")
    return
  }

  const currentModel = config.get<string>("model", "")
  const items = models.map((id) => ({
    label: id,
    description: id === currentModel ? "current" : undefined,
  }))

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a model",
    matchOnDescription: false,
  })

  if (!picked) return

  await config.update("model", picked.label, vscode.ConfigurationTarget.Global)
  vscode.window.showInformationMessage(`[Zemit] Model set to ${picked.label}`)
}

export function deactivate(): void {}
