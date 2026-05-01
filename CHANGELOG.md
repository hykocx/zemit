# Changelog

All notable changes to Zemit are documented here.

## [Unreleased]

### Added
- Claude Code CLI provider (local, no API key required)

### Fixed
- File deletions were not detected when generating commit messages (`--diff-filter=d` excluded deleted files)

---

## [1.1.4] - 2026-04-24

### Changed
- Improved prompt structure: diff is now accompanied by a `--name-status` summary of changed files
- Updated README description and settings table to reflect new prompt version
- Updated extension icon and banner image

---

## [1.1.3] - 2026-04-15

### Changed
- Refactored prompt system into a dedicated `prompts` module with enhanced commit instructions
- Updated app icon and git banner images

---

## [1.1.2] - 2026-04-15

### Changed
- Updated extension icon
- Shortened marketplace description

---

## [1.1.1] - 2026-04-15

### Changed
- Translated all UI messages to French
- Updated default model to `claude-sonnet-4-6`

---

## [1.1.0] - 2026-04-15

### Added
- Dedicated `providers` module to support multiple AI backends
- Dedicated `git` module for staged/unstaged diff handling
- VS Code extension entry point with model selection

### Changed
- Refined conventional commit prompt to limit body usage
- Extracted commit generation logic into its own module

---

## [1.0.0] - 2026-04-15

### Added
- Initial release of Zemit
- AI-powered commit message generation using the Anthropic Claude API
- Support for staged and unstaged git diffs
- Conventional commit format by default
- GNU General Public License v3.0
