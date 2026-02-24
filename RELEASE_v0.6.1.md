## FlowDesk v0.6.1 - Release Notes

**Date:** 24 February 2026

### Fixed

- Fixed **AI Hub white page issue** for providers that block iframe embedding (e.g. Gemini and similar services).
- Replaced iframe-only access with a robust flow that opens providers in an **internal Electron browser window**.

### Improved

- Added new API bridge action `openInAppBrowser(url, title?)` from renderer to main process.
- Added secure in-app browser window behavior:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `sandbox: true`
  - popup links are redirected externally.
- Updated AI Hub UX with clear actions:
  - `Apri in finestra interna` (recommended)
  - `Apri nel browser` (fallback)

### Versioning

- App version bumped to `0.6.1`.
- New installer artifact: `FlowDesk Setup 0.6.1.exe` (Windows x64).

### Technical Notes

- No database schema changes.
- No API/IPC breaking changes for existing features.
- Existing lint issues unrelated to AI Hub remain in `src/App.tsx`.

### Download

| File | Platform |
|------|----------|
| `FlowDesk Setup 0.6.1.exe` | Windows x64 |

---

Full version: 0.6.1 - [GitHub Repository](https://github.com/marco-giuseppe-starace/flowdesk)
