# Zemit

Génère des messages de commit dans VSCode, via un modèle d'IA.

## Ce que ça fait

Zemit lit le diff stagé dans ton dépôt Git et envoie le contenu à un modèle d'IA pour produire un message de commit. Le message apparaît directement dans le champ de saisie du panneau Source Control.

Tu peux interrompre la génération à tout moment depuis le même panneau.

## Prérequis

- VS Code 1.85 ou plus récent
- Un dépôt Git avec des changements stagés
- Une clé API pour le fournisseur choisi (non requise pour Ollama)

## Installation

### Via le marketplace (recommandé)

Recherche **Zemit** dans l'onglet Extensions de ton éditeur, ou installe directement depuis :

- **VS Code** : [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=hykocx.zemit)
- **VSCodium / Open VSX** : [open-vsx.org](https://open-vsx.org/extension/hykocx/zemit)

### Via un fichier VSIX

1. Télécharge le fichier `.vsix` depuis les [releases](https://git.hyko.cx/hykocx/zemit/releases).
2. Ouvre la palette de commandes (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Cherche **Extensions: Installer depuis un fichier VSIX...** et sélectionne le fichier téléchargé.

Ou via le menu **Extensions** (icône en barre latérale) → `...` → **Installer depuis un fichier VSIX...**

## Configuration

Les paramètres se trouvent dans les préférences VS Code sous **Zemit**.

| Paramètre | Description | Défaut |
|---|---|---|
| `zemit.provider` | Fournisseur d'IA : `anthropic`, `openai` ou `ollama` | `anthropic` |
| `zemit.apiKey` | Clé API du fournisseur (inutile pour Ollama) | _(vide)_ |
| `zemit.model` | Modèle à utiliser | `claude-sonnet-4-6` |
| `zemit.baseUrl` | URL de base personnalisée (ex. Ollama local) | _(vide)_ |
| `zemit.commitStyle` | Style du message : `conventional` ou `simple` | `conventional` |
| `zemit.maxDiffSize` | Taille maximale du diff envoyé à l'IA (en caractères) | `5000` |

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
