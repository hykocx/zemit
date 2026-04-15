import * as vscode from "vscode"
import { abortGeneration, generateCommitMsg } from "./commitGenerator"
import { fetchAvailableModels } from "./providers"

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("zemit.generateCommitMessage", (scm?: vscode.SourceControl) =>
      generateCommitMsg(scm),
    ),
    vscode.commands.registerCommand("zemit.abortGeneration", () => abortGeneration()),
    vscode.commands.registerCommand("zemit.selectModel", () => selectModel()),
  )
}

async function selectModel(): Promise<void> {
  const config = vscode.workspace.getConfiguration("aiCommit")

  let models: string[]
  try {
    models = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Zemit : Récupération des modèles disponibles…", cancellable: false },
      () => fetchAvailableModels(config),
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    vscode.window.showErrorMessage(`[Zemit] ${msg}`)
    return
  }

  if (models.length === 0) {
    vscode.window.showWarningMessage("[Zemit] Aucun modèle trouvé pour le fournisseur configuré.")
    return
  }

  const currentModel = config.get<string>("model", "")
  const items = models.map((id) => ({
    label: id,
    description: id === currentModel ? "actuel" : undefined,
  }))

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Sélectionner un modèle",
    matchOnDescription: false,
  })

  if (!picked) return

  await config.update("model", picked.label, vscode.ConfigurationTarget.Global)
  vscode.window.showInformationMessage(`[Zemit] Modèle défini sur ${picked.label}`)
}

export function deactivate(): void {}
