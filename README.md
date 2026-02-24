# FlowDesk

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/marco-giuseppe-starace/flowdesk)](https://github.com/marco-giuseppe-starace/flowdesk/releases)
[![Platform: Windows](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows)](https://github.com/marco-giuseppe-starace/flowdesk/releases)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F?logo=electron)](https://www.electronjs.org/)

Desktop app offline-first per produttivita su Microsoft Power Platform.

- Versione corrente: `0.7.0`
- Stack: Electron + React + TypeScript + SQLite (`better-sqlite3`)
- Target: Windows (installer NSIS `.exe`)

## Cosa fa
FlowDesk unifica in una sola app:

- pianificazione giornaliera (obiettivi, task, backlog)
- tracking lavoro (timer sessioni, pomodoro, changelog)
- knowledge base (note, snippet, bookmark, learning)
- gestione team/progetto (progetti, ambienti, contatti, bug, checklist)
- analytics/report (storico, report giornaliero, export PDF)
- Power Apps workflow (Analyzer `.msapp` + FDHub locale)
- hub web interni (AI Hub e Microsoft 365 Hub a tab)
- SharePoint via Microsoft Graph (liste e documenti)

## Novita v0.7.0
- Auto-update in app integrato (`electron-updater`)
- Sezione Aggiornamenti con stato live: check, download progress, installa al riavvio
- Pulsanti update in-app:
  - `Scarica aggiornamento in app`
  - `Riavvia e installa ora`
- Fallback automatico alla release GitHub se l'update OTA non e disponibile
- Migliorie UI modal reset (spaziatura azioni)

## Installazione rapida
### Utente finale
1. Vai su [Releases](https://github.com/marco-giuseppe-starace/flowdesk/releases)
2. Scarica `FlowDesk Setup <version>.exe`
3. Esegui installer

### Da sorgente
```bash
git clone https://github.com/marco-giuseppe-starace/flowdesk.git
cd flowdesk
npm install
npm run dev
```

## Script
- `npm run dev`: Vite + Electron in sviluppo
- `npm run build`: build frontend produzione
- `npm run build:app`: build completa + installer Windows
- `npm start`: avvio desktop produzione
- `npm run lint`: linting

## Prima configurazione database
Al primo avvio FlowDesk chiede dove salvare `flowdesk.db`:
- cartella custom
- OneDrive (`OneDrive/FlowDesk`)
- path predefinito app

Se il config si perde, tenta il recupero automatico del DB esistente.

## Moduli principali
### Pianificazione
- Dashboard KPI
- Obiettivi giornalieri
- Task Kanban (Todo/Doing/Done)
- Backlog

### Esecuzione
- Timer sessioni
- Pomodoro
- Registro modifiche
- Bug Tracker
- Checklist

### Conoscenza
- Note
- Snippet
- Link utili
- Formazione

### Analisi
- App Impact
- Power Apps Analyzer
- FDHub
- AI Hub
- M365 Hub
- SharePoint

### Revisione e utility
- Retrospettive
- Storico
- Report
- Ricerca globale
- Cestino
- Aggiornamenti
- Guida integrata

## AI Hub e M365 Hub
Entrambi usano browser interno a tab singola finestra (no caos multi-finestra).

### AI Hub
Provider pronti: ChatGPT, Copilot, Gemini, Claude, Perplexity, Grok, Mistral, Meta AI, Poe, You.com.

### Microsoft 365 Hub
Accesso rapido a app Microsoft 365 in tab interni + apertura esterna.

## SharePoint
Supporto Graph API con login Microsoft:
- config tenant/client
- navigazione siti/liste
- CRUD item lista
- document library (upload/download/cartelle)

## Auto-update: come funziona
FlowDesk usa update OTA da GitHub Releases.

Per ogni release pubblica devi allegare sempre:
1. `FlowDesk Setup <version>.exe`
2. `FlowDesk Setup <version>.exe.blockmap`
3. `latest.yml`

Se manca `latest.yml`, l'app mostra errore di verifica update (404).

## Build release corretta
```bash
npm run build:app
```
Output in `release/`:
- installer `.exe`
- `.blockmap`
- `latest.yml`

## Architettura tecnica
- `src/App.tsx`: UI e logica renderer
- `electron/preload.cjs`: API sicura `window.flowdesk`
- `electron/main.cjs`: IPC, menu, filesystem, auto-update, browser hub
- `electron/db.cjs`: schema SQLite + CRUD + migrazioni
- `electron/msapp-parser.cjs`: parser/analyzer `.msapp`

Flusso:
`React -> preload (ipcRenderer) -> main (ipcMain) -> db/file system -> ritorno al renderer`

## Struttura progetto
```text
flowdesk/
  electron/
    main.cjs
    preload.cjs
    db.cjs
    msapp-parser.cjs
  src/
    App.tsx
    App.css
    main.tsx
  build/
    icon.ico
  release/
  docs/
  scripts/
  package.json
```

## Scorciatoie principali
- `Ctrl+K`: Command Palette
- `Ctrl+D`: Toggle dark mode
- `F1`: Guida
- `Ctrl+1..5`: viste rapide principali

## Sicurezza
- `contextIsolation: true`
- `nodeIntegration: false` nel renderer
- API esposte solo da preload
- validazioni path su apertura allegati

## Licenza
MIT - vedi [LICENSE](LICENSE)
