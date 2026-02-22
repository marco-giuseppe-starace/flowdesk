## 🚀 FlowDesk v0.5.0 — Release Notes

**Data:** 22 febbraio 2026

### ✨ Nuove Funzionalità

- **🗑️ Cestino (Trash / Soft Delete)** — I task e i progetti eliminati finiscono nel cestino anziché essere cancellati definitivamente. Puoi ripristinarli o eliminarli in modo permanente dalla nuova vista "Cestino".
- **🔁 Task Ricorrenti** — Crea task con ricorrenza giornaliera, settimanale o mensile. Il sistema genera automaticamente nuove istanze all'avvio dell'app.
- **🔔 Notifiche Toast** — Feedback visivo per ogni azione (creazione, eliminazione, errori) con notifiche toast animate in basso a destra, con supporto light/dark mode.
- **🖱️ Drag-and-Drop Kanban** — Sposta i task tra le colonne del Kanban trascinandoli direttamente con il mouse. Feedback visivo durante il trascinamento.
- **📦 Export JSON Completo** — Esporta l'intero database in un singolo file JSON strutturato (task, note, progetti, ambienti, contatti, bug, checklist, ecc.), oltre all'export CSV già esistente.

### 🛡️ Miglioramenti alla Robustezza

- **Gestione errori completa** — Tutti i ~60+ handler asincroni ora hanno try/catch con messaggi di errore localizzati in italiano tramite toast.
- **Integrità database (Foreign Keys)** — Abilitato `PRAGMA foreign_keys = ON` per garantire la coerenza referenziale tra le tabelle.
- **Migrazione DB v3** — Nuove colonne `deleted_at`, `updated_at`, campi ricorrenza, indici ottimizzati su 15+ tabelle.
- **Sicurezza allegati** — Validazione del percorso file prima dell'apertura per prevenire path traversal.

### ⚡ Ottimizzazioni Performance

- **Caricamento tag batch** — Eliminata la query N+1: tutti i tag dei task vengono caricati in una singola query SQL anziché uno per task.

### 🎨 Miglioramenti UI

- **Badge ricorrenza** — I task ricorrenti mostrano un badge visivo sulla card nel Kanban.
- **Vista Cestino** — Tabella completa con azioni di ripristino, eliminazione permanente e svuotamento cestino.
- **Dropdown ricorrenza** — Selettore nel form di creazione task per impostare la frequenza di ripetizione.
- **Nuovi stili CSS** — Toast animati, feedback drag-and-drop, badge ricorrenza, tabella cestino, pulsante danger — tutti con supporto dark mode.

### 🔧 Dettagli Tecnici

- **7 nuovi canali IPC**: `tags:getAllForTasks`, `tasks:generateRecurring`, `trash:list`, `trash:restore`, `trash:permanentDelete`, `trash:empty`, `export:fullJson`
- **7 nuove API nel preload bridge** esposte al renderer
- **TypeScript** — Zero errori di compilazione verificati con `tsc --noEmit`
- **Stack**: Electron 40 + React 19 + Vite 7 + better-sqlite3 (WAL mode)

### 📥 Download

| File | Piattaforma |
|------|------------|
| `FlowDesk Setup 0.5.0.exe` | Windows x64 |

---

*Versione completa: 0.5.0 — [Repository GitHub](https://github.com/marco-giuseppe-starace/flowdesk)*
