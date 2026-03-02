# FlowDesk

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/marco-giuseppe-starace/flowdesk)](https://github.com/marco-giuseppe-starace/flowdesk/releases)
[![Platform: Windows](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows)](https://github.com/marco-giuseppe-starace/flowdesk/releases)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F?logo=electron)](https://www.electronjs.org/)

Desktop app offline-first per produttivita su Microsoft Power Platform.

- Versione corrente: `1.0.0`
- Stack: Electron + React + TypeScript + SQLite (`better-sqlite3`)
- Target: Windows (`Setup` + `Portable`)

## Cosa fa

FlowDesk unifica in una sola app:

- pianificazione giornaliera (dashboard, obiettivi, task Kanban, backlog)
- tracking lavoro (timer sessioni, pomodoro, registro modifiche)
- knowledge base (note, snippets, link utili, formazione)
- gestione team/progetto (progetti, ambienti, contatti, bug tracker, checklist)
- analisi e report (storico, report giornaliero, export PDF)
- workflow Power Apps (`App Analyzer` + `FDHub`)
- hub web interni (`AI Hub` e `M365 Hub` a tab)
- integrazione SharePoint via Microsoft Graph (liste e documenti)
- inventario rete locale (`Asset Scanner`)
- update checker e auto-update (quando supportato)

## Novita principali in v1.0.0

- packaging Windows doppio: installer + portable
- update checker con stato live e azioni in-app
- AI Hub e M365 Hub con finestra tab condivisa
- SharePoint hub con login Microsoft e operazioni su liste/documenti
- Asset Scanner LAN (ping + ARP) su subnet locale selezionata

## Installazione

### Utente finale

1. Vai su [Releases](https://github.com/marco-giuseppe-starace/flowdesk/releases)
2. Scarica uno degli artefatti:
- `FlowDesk-Setup-<version>.exe`
- `FlowDesk-Portable-<version>.exe`
3. Avvia il file scaricato

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
- `npm run build:app`: build completa + pacchetti Windows
- `npm start`: avvio desktop produzione
- `npm run lint`: linting

## Database

Al primo avvio FlowDesk chiede dove salvare `flowdesk.db`:

- cartella custom
- OneDrive (`OneDrive/FlowDesk`)
- percorso predefinito app

Se il config viene perso, l'app tenta il recupero automatico del database esistente.

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
- Bug tracker
- Checklist

### Conoscenza

- Note
- Snippets
- Link utili
- Formazione

### Analisi

- App Impact
- App Analyzer (`.msapp`)
- FDHub
- AI Hub
- M365 Hub
- SharePoint
- Asset Scanner

### Revisione e utility

- Retrospettive
- Storico
- Report
- Ricerca globale
- Cestino (soft delete)
- Aggiornamenti
- Guida integrata

## Auto-update

FlowDesk usa update OTA da GitHub Releases.

Per release setup con update in-app, includere:

1. `FlowDesk-Setup-<version>.exe`
2. `FlowDesk-Setup-<version>.exe.blockmap`
3. `latest.yml`

Note:

- in modalita `portable` l'auto-update e disabilitato per design
- in sviluppo (`dev`) l'auto-update e disabilitato

## Build release

```bash
npm run build:app
```

Output in `release/`:

- `FlowDesk-Setup-<version>.exe`
- `FlowDesk-Setup-<version>.exe.blockmap`
- `FlowDesk-Portable-<version>.exe`
- `win-unpacked/`

## Architettura tecnica

- `src/App.tsx`: UI e logica renderer
- `electron/preload.cjs`: API sicura esposta in `window.flowdesk`
- `electron/main.cjs`: IPC, menu, filesystem, auto-update, hub browser, scanner rete
- `electron/db.cjs`: schema SQLite + CRUD + migrazioni
- `electron/msapp-parser.cjs`: parser/analyzer `.msapp`

Flusso:
`React -> preload (ipcRenderer) -> main (ipcMain) -> db/file system -> ritorno al renderer`

## Sicurezza

- `contextIsolation: true`
- `nodeIntegration: false` nel renderer
- API esposte solo via preload
- validazione path per apertura allegati
- scanner rete solo su subnet scelta manualmente (usare solo su reti autorizzate)

## Licenza

MIT - vedi [LICENSE](LICENSE)
