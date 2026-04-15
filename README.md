# Zemit

Génère des messages de commit dans VSCode à partir du diff en cours, via un modèle d'IA.

## Ce que ça fait

Zemit lit le diff stagé dans ton dépôt Git et envoie le contenu à un modèle d'IA pour produire un message de commit. Le message apparaît directement dans le champ de saisie du panneau Source Control.

Tu peux interrompre la génération à tout moment depuis le même panneau.

## Prérequis

- VS Code 1.85 ou plus récent
- Un dépôt Git avec des changements stagés
- Une clé API pour le fournisseur choisi (non requise pour Ollama)

## Installation

Lance la commande `vsce package` pour générer le fichier `.vsix`, puis installe-le via **Extensions > Installer depuis un fichier VSIX**.

## Configuration

Les paramètres se trouvent dans les préférences VS Code sous **Zemit**.

| Paramètre | Description | Défaut |
|---|---|---|
| `aiCommit.provider` | Fournisseur d'IA : `anthropic`, `openai` ou `ollama` | `anthropic` |
| `aiCommit.apiKey` | Clé API du fournisseur (inutile pour Ollama) | _(vide)_ |
| `aiCommit.model` | Modèle à utiliser | `claude-haiku-4-5-20251001` |
| `aiCommit.baseUrl` | URL de base personnalisée (ex. Ollama local) | _(vide)_ |
| `aiCommit.commitStyle` | Style du message : `conventional` ou `simple` | `conventional` |
| `aiCommit.maxDiffSize` | Taille maximale du diff envoyé à l'IA (en caractères) | `5000` |

Pour choisir un modèle parmi ceux disponibles chez ton fournisseur, lance la commande **Zemit: Select Model** depuis la palette de commandes.

## Utilisation

1. Stage tes fichiers dans le panneau Source Control.
2. Clique sur l'icône ✦ dans la barre du panneau.
3. Le message de commit se remplit automatiquement.

Pour arrêter une génération en cours, clique sur l'icône d'arrêt au même endroit.

## Fournisseurs supportés

- **Anthropic** : modèles Claude (Haiku, Sonnet, Opus)
- **OpenAI** : modèles GPT
- **Ollama** : modèles locaux, aucune clé requise

## Développement

```bash
npm install
npm run build   # build unique
npm run watch   # recompile à chaque changement
npm run package # génère le .vsix
```
