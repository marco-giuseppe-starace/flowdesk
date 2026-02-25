## FlowDesk v0.9.1 - Release Notes

**Date:** 25 February 2026

### Highlights

- Added dual Windows distribution:
  - **Installer** (`Setup`)
  - **Portable** (no installation required)
- Improved deployment stability for antivirus-sensitive environments (including Sophos scenarios).

### New

- Added Windows **portable target** to build pipeline.
- Release now includes:
  - `FlowDesk-Setup-0.9.1.exe`
  - `FlowDesk-Portable-0.9.1.exe`

### Runtime & Data Stability

- Introduced a **stable `userData` path strategy** to keep app data behavior consistent across install modes.
- Database/config runtime flow remains aligned between setup and portable usage.

### Updates

- **Auto-update is disabled in portable mode** (expected behavior).
- Setup installation keeps standard update flow.
- `latest.yml` regenerated and aligned to `0.9.1` installer artifact for update checks.

### Technical

- Updated `electron-builder` Windows targets to include both `nsis` and `portable`.
- Added dedicated portable artifact naming:
  - `FlowDesk-Portable-${version}.exe`
- Kept setup artifact naming consistent:
  - `FlowDesk-Setup-${version}.exe`
- Added `requestedExecutionLevel: asInvoker` for smoother installer behavior in controlled environments.

### Notes

- This release focuses on packaging/distribution reliability and compatibility.
- No functional regression expected in main app workflows.

### Download

| File | Platform |
|------|----------|
| `FlowDesk-Setup-0.9.1.exe` | Windows x64 |
| `FlowDesk-Portable-0.9.1.exe` | Windows x64 |

---

Full version: 0.9.1 - [GitHub Repository](https://github.com/marco-giuseppe-starace/flowdesk)
