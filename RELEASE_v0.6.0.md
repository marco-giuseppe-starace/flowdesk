## FlowDesk v0.6.0 - Release Notes

**Date:** 24 February 2026

### New

- Added **AI Hub**: a new in-app section to access multiple AI assistants directly from FlowDesk.
- Added provider switcher with quick selection cards and built-in refresh.
- Added support for these providers:
  - ChatGPT (OpenAI)
  - Copilot (Microsoft)
  - Gemini (Google)
  - Claude (Anthropic)
  - Perplexity
  - Grok (xAI)
  - Le Chat (Mistral)
  - Meta AI
  - Poe (Quora)
  - You.com

### Navigation

- Added **AI Hub** to sidebar navigation.
- Added **AI Hub** in desktop menu (`Navigazione`) with shortcut `Ctrl/Cmd + I`.

### Security & UX

- Embedded AI pages via sandboxed iframe configuration.
- Added external-open fallback (`Apri nel browser` / `Apri esterno`) for providers that restrict embedding policies.

### Versioning

- App version bumped to `0.6.0`.
- New installer artifact: `FlowDesk Setup 0.6.0.exe` (Windows x64).

### Technical Notes

- No database schema changes.
- No API/IPC contract changes.
- Existing lint issues unrelated to AI Hub remain in `src/App.tsx`.

### Download

| File | Platform |
|------|----------|
| `FlowDesk Setup 0.6.0.exe` | Windows x64 |

---

Full version: 0.6.0 - [GitHub Repository](https://github.com/marco-giuseppe-starace/flowdesk)
