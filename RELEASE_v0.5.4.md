## FlowDesk v0.5.4 - Release Notes

**Date:** 24 February 2026

### Updated

- Updated core desktop runtime to `electron 40.6.0`.
- Updated TypeScript lint stack to the latest compatible set:
  - `typescript-eslint 8.56.1`
  - `eslint 9.39.3`
  - `@eslint/js 9.39.3`
- Updated development and typing dependencies:
  - `@types/node 25.3.0`
  - `eslint-plugin-react-refresh 0.5.2`
  - `globals 17.3.0`

### Packaging

- Rebuilt Windows installer with updated runtime and lockfile.
- New installer artifact: `FlowDesk Setup 0.5.4.exe` (Windows x64).

### Technical Notes

- `@azure/msal-node` remains at `5.0.4` intentionally.
  - NPM `latest` dist-tag currently points to `3.8.8`, but `5.0.4` is newer and already in use.
- ESLint major `10` not adopted because `eslint-plugin-react-hooks 7.0.1` currently supports ESLint up to `9`.
- No database schema changes.
- No API/IPC contract changes.

### Download

| File | Platform |
|------|----------|
| `FlowDesk Setup 0.5.4.exe` | Windows x64 |

---

Full version: 0.5.4 - [GitHub Repository](https://github.com/marco-giuseppe-starace/flowdesk)
