## FlowDesk v0.6.2 - Release Notes

**Date:** 24 February 2026

### New

- Added **Microsoft 365 Hub** in FlowDesk with quick launch cards for:
  - Microsoft 365 Home
  - Outlook
  - Teams
  - OneDrive
  - SharePoint Web
  - Planner
  - To Do
  - Loop
  - Forms
  - Power Apps
  - Power Automate
  - Power BI

### Major Improvement

- Implemented a **single in-app browser window with tab management** (complete mode), shared by AI Hub and M365 Hub.
- You can now:
  - open services as tabs
  - switch active tab
  - close tabs
  - focus the existing hub window
- This prevents the “10 windows” problem while keeping all services accessible.

### AI Hub Upgrade

- AI Hub now uses the same shared tabbed browser system.
- Keeps compatibility for providers that block iframe embedding, without opening many separate windows.

### Navigation

- Added **M365 Hub** in sidebar navigation.
- Added desktop menu shortcut for M365 Hub: `Ctrl/Cmd + M`.

### Technical

- Added hub IPC APIs and events:
  - `hubOpenTab`
  - `hubActivateTab`
  - `hubCloseTab`
  - `hubListTabs`
  - `hubFocusWindow`
  - `hub:tabsChanged` event
- `openInAppBrowser` now routes through the shared tabbed hub (backward compatible).

### Versioning

- App version bumped to `0.6.2`.
- New installer artifact: `FlowDesk Setup 0.6.2.exe` (Windows x64).

### Notes

- No database schema changes.
- Existing lint issues in `src/App.tsx` are pre-existing and unrelated to this feature set.

### Download

| File | Platform |
|------|----------|
| `FlowDesk Setup 0.6.2.exe` | Windows x64 |

---

Full version: 0.6.2 - [GitHub Repository](https://github.com/marco-giuseppe-starace/flowdesk)
