const path = require('node:path');
const Database = require('better-sqlite3');

let db;
let currentDbPath = '';

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nowIso() {
  return new Date().toISOString();
}

/* ═══════════════════════ Migration System ═══════════════════════ */

/**
 * Helper: aggiunge una colonna se non esiste già (ignora errore se presente)
 */
function safeAddColumn(database, table, col, def) {
  try { database.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch (_) {}
}

/**
 * Helper: crea un indice se non esiste già
 */
function safeCreateIndex(database, name, table, cols) {
  database.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${cols})`);
}

/**
 * Verifica se una tabella esiste nel database
 */
function tableExists(database, name) {
  const row = database.prepare("SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type='table' AND name=?").get(name);
  return row && row.cnt > 0;
}

/**
 * Verifica se una colonna esiste in una tabella
 */
function columnExists(database, table, column) {
  try {
    const cols = database.pragma(`table_info(${table})`);
    return cols.some(c => c.name === column);
  } catch (_) { return false; }
}

/**
 * Lista di tutte le migrazioni in ordine di versione.
 * Ogni migrazione ha: version, description, up(db).
 * Le migrazioni usano CREATE TABLE IF NOT EXISTS e safeAddColumn per
 * essere idempotenti — non distruggono mai dati esistenti.
 */
const MIGRATIONS = [
  {
    version: 1,
    description: 'Schema iniziale — tutte le tabelle base',
    up: (database) => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          planned_minutes INTEGER NOT NULL DEFAULT 60,
          priority TEXT NOT NULL DEFAULT 'Medium',
          status TEXT NOT NULL DEFAULT 'Todo',
          scheduled_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          project_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS work_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          duration_minutes INTEGER,
          note TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        );

        CREATE TABLE IF NOT EXISTS change_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER,
          tool TEXT NOT NULL,
          artifact TEXT NOT NULL,
          change_type TEXT NOT NULL,
          summary TEXT NOT NULL,
          before_text TEXT DEFAULT '',
          after_text TEXT DEFAULT '',
          test_result TEXT DEFAULT 'Non testato',
          work_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          project_id INTEGER,
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        );

        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL DEFAULT 'Generale',
          title TEXT NOT NULL,
          content TEXT DEFAULT '',
          pinned INTEGER NOT NULL DEFAULT 0,
          work_date TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS daily_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          is_done INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          work_date TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#3b82f6',
          description TEXT DEFAULT '',
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL DEFAULT '#64748b'
        );

        CREATE TABLE IF NOT EXISTS task_tags (
          task_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY(task_id, tag_id),
          FOREIGN KEY(task_id) REFERENCES tasks(id),
          FOREIGN KEY(tag_id) REFERENCES tags(id)
        );

        CREATE TABLE IF NOT EXISTS task_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          planned_minutes INTEGER NOT NULL DEFAULT 60,
          priority TEXT NOT NULL DEFAULT 'Medium',
          tool TEXT DEFAULT '',
          project_id INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS snippets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          language TEXT NOT NULL DEFAULT 'PowerFx',
          code TEXT NOT NULL DEFAULT '',
          description TEXT DEFAULT '',
          is_favorite INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Altro',
          description TEXT DEFAULT '',
          project_id INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          role TEXT DEFAULT '',
          email TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          company TEXT DEFAULT '',
          notes TEXT DEFAULT '',
          project_id INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS environments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          url TEXT DEFAULT '',
          env_type TEXT NOT NULL DEFAULT 'Dev',
          status TEXT NOT NULL DEFAULT 'Attivo',
          description TEXT DEFAULT '',
          project_id INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS retrospectives (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          week_start TEXT NOT NULL,
          went_well TEXT DEFAULT '',
          to_improve TEXT DEFAULT '',
          actions TEXT DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bugs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          severity TEXT NOT NULL DEFAULT 'Medium',
          status TEXT NOT NULL DEFAULT 'Aperto',
          steps_to_reproduce TEXT DEFAULT '',
          solution TEXT DEFAULT '',
          project_id INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS learning (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Corso',
          url TEXT DEFAULT '',
          progress INTEGER NOT NULL DEFAULT 0,
          notes TEXT DEFAULT '',
          completed INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS checklists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          project_id INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS checklist_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          checklist_id INTEGER NOT NULL,
          text TEXT NOT NULL,
          is_done INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY(checklist_id) REFERENCES checklists(id)
        );
      `);
      // Colonne aggiunte post-lancio (sicure: ignorano errore se già presenti)
      safeAddColumn(database, 'tasks', 'description', "TEXT DEFAULT ''");
      safeAddColumn(database, 'tasks', 'project_id', 'INTEGER');
      safeAddColumn(database, 'change_entries', 'project_id', 'INTEGER');
    }
  },

  {
    version: 2,
    description: 'FDHub (version control locale) e Allegati',
    up: (database) => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS fdhub_repos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          app_type TEXT NOT NULL DEFAULT 'PowerApps',
          project_id INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS fdhub_commits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          tag TEXT DEFAULT '',
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL DEFAULT 0,
          summary_json TEXT DEFAULT '{}',
          health_score INTEGER DEFAULT 0,
          screen_count INTEGER DEFAULT 0,
          control_count INTEGER DEFAULT 0,
          formula_count INTEGER DEFAULT 0,
          datasource_count INTEGER DEFAULT 0,
          issue_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY(repo_id) REFERENCES fdhub_repos(id)
        );

        CREATE TABLE IF NOT EXISTS attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL DEFAULT 0,
          mime_type TEXT DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_fdhub_commits_repo ON fdhub_commits(repo_id);
        CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
      `);
    }
  },

  // ── Migration v3: Soft delete, recurring tasks, updated_at, integrity ──
  {
    version: 3,
    description: 'Soft delete, task ricorrenti, updated_at, integrità dati',
    up: (database) => {
      // Soft delete: aggiunge deleted_at a tutte le entità principali
      const softDeleteTables = [
        'tasks', 'notes', 'daily_goals', 'projects', 'snippets', 'bookmarks',
        'contacts', 'environments', 'retrospectives', 'bugs', 'learning',
        'checklists', 'change_entries', 'tags', 'fdhub_repos'
      ];
      for (const table of softDeleteTables) {
        safeAddColumn(database, table, 'deleted_at', 'TEXT DEFAULT NULL');
      }

      // updated_at: aggiunge timestamp di modifica alle tabelle principali
      const updatedAtTables = [
        'tasks', 'notes', 'projects', 'snippets', 'bookmarks',
        'contacts', 'environments', 'retrospectives', 'bugs', 'learning',
        'checklists', 'change_entries'
      ];
      for (const table of updatedAtTables) {
        safeAddColumn(database, table, 'updated_at', 'TEXT DEFAULT NULL');
      }

      // Task ricorrenti: aggiunge colonne per la ricorrenza
      safeAddColumn(database, 'tasks', 'recurrence', "TEXT DEFAULT NULL"); // 'daily', 'weekly', 'monthly' o null
      safeAddColumn(database, 'tasks', 'recurrence_parent_id', 'INTEGER DEFAULT NULL');

      // Indici per performance
      safeCreateIndex(database, 'idx_tasks_deleted', 'tasks', 'deleted_at');
      safeCreateIndex(database, 'idx_tasks_recurrence', 'tasks', 'recurrence');
      safeCreateIndex(database, 'idx_tasks_scheduled', 'tasks', 'scheduled_date');
    }
  },
];

/** Versione corrente (= ultima migrazione disponibile) */
const LATEST_VERSION = MIGRATIONS.length > 0 ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;

/* ═══════════════════════ initDb ═══════════════════════ */

function initDb(basePath) {
  const fs = require('node:fs');
  const dbPath = path.join(basePath, 'flowdesk.db');
  currentDbPath = dbPath;

  // Backup automatico del database prima di aprirlo (max 3 backup rotanti)
  try {
    if (fs.existsSync(dbPath)) {
      const backupDir = path.join(basePath, 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupPath = path.join(backupDir, `flowdesk-${ts}.db`);
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[FlowDesk DB] Backup creato: ${backupPath}`);
      // Mantieni solo gli ultimi 3 backup
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('flowdesk-') && f.endsWith('.db'))
        .sort()
        .reverse();
      for (const old of backups.slice(3)) {
        try { fs.unlinkSync(path.join(backupDir, old)); } catch (_) {}
      }
    }
  } catch (backupErr) {
    console.warn('[FlowDesk DB] ⚠ Backup automatico fallito:', backupErr.message);
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 1. Crea la tabella schema_version se non esiste
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    )
  `);

  // 2. Leggi la versione corrente
  let row = db.prepare('SELECT version FROM schema_version LIMIT 1').get();
  if (!row) {
    // Se il DB è pre-migration (utente esistente) o è nuovo:
    // controlla se ci sono già tabelle applicative
    const hasTables = tableExists(db, 'tasks');
    const startVersion = hasTables ? 0 : 0; // Parte sempre da 0, le migrazioni sono idempotenti
    db.prepare('INSERT INTO schema_version (version, updated_at) VALUES (?, ?)').run(startVersion, nowIso());
    row = { version: startVersion };
  }

  let currentVersion = row.version;

  // 3. Esegui le migrazioni pendenti
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`[FlowDesk DB] Migrazione v${migration.version}: ${migration.description}`);
      try {
        db.transaction(() => {
          migration.up(db);
          db.prepare('UPDATE schema_version SET version = ?, updated_at = ?').run(migration.version, nowIso());
        })();
        currentVersion = migration.version;
        console.log(`[FlowDesk DB] ✔ Migrazione v${migration.version} completata`);
      } catch (err) {
        console.error(`[FlowDesk DB] ✘ Errore migrazione v${migration.version}:`, err.message);
        // Non interrompere: logga l'errore ma continua con le altre migrazioni
      }
    }
  }

  // 4. Controllo di integrità: verifica che tutte le tabelle attese esistano
  const expectedTables = [
    'tasks', 'work_sessions', 'change_entries', 'notes', 'daily_goals',
    'projects', 'tags', 'task_tags', 'task_templates', 'snippets',
    'bookmarks', 'contacts', 'environments', 'retrospectives', 'bugs',
    'learning', 'checklists', 'checklist_items', 'schema_version',
    'fdhub_repos', 'fdhub_commits', 'attachments'
  ];
  const missingTables = expectedTables.filter(t => !tableExists(db, t));
  if (missingTables.length > 0) {
    console.warn(`[FlowDesk DB] ⚠ Tabelle mancanti rilevate: ${missingTables.join(', ')}. Riesecuzione migrazioni...`);
    try {
      for (const mig of MIGRATIONS) {
        try { db.transaction(() => { mig.up(db); })(); } catch (_) {}
      }
      console.log('[FlowDesk DB] ✔ Tabelle mancanti ricreate');
    } catch (err) {
      console.error('[FlowDesk DB] ✘ Errore recupero tabelle:', err.message);
    }
  }

  // 5. Controllo colonne attese sulle tabelle principali
  const expectedColumns = {
    tasks: ['id', 'title', 'description', 'planned_minutes', 'priority', 'status', 'scheduled_date', 'created_at', 'project_id'],
    change_entries: ['id', 'task_id', 'tool', 'artifact', 'change_type', 'summary', 'before_text', 'after_text', 'test_result', 'work_date', 'created_at', 'project_id'],
    work_sessions: ['id', 'task_id', 'started_at', 'ended_at', 'duration_minutes', 'note', 'is_active'],
    notes: ['id', 'category', 'title', 'content', 'pinned', 'work_date', 'created_at'],
    daily_goals: ['id', 'text', 'is_done', 'sort_order', 'work_date', 'created_at'],
    projects: ['id', 'name', 'color', 'description', 'is_archived', 'created_at'],
    tags: ['id', 'name', 'color'],
    snippets: ['id', 'title', 'language', 'code', 'description', 'is_favorite', 'created_at'],
    bookmarks: ['id', 'title', 'url', 'category', 'description', 'project_id', 'created_at'],
    contacts: ['id', 'name', 'role', 'email', 'phone', 'company', 'notes', 'project_id', 'created_at'],
    environments: ['id', 'name', 'url', 'env_type', 'status', 'description', 'project_id', 'created_at'],
    bugs: ['id', 'title', 'description', 'severity', 'status', 'steps_to_reproduce', 'solution', 'project_id', 'created_at'],
    learning: ['id', 'title', 'category', 'url', 'progress', 'notes', 'completed', 'created_at'],
    retrospectives: ['id', 'week_start', 'went_well', 'to_improve', 'actions', 'created_at'],
    checklists: ['id', 'title', 'description', 'project_id', 'created_at'],
    checklist_items: ['id', 'checklist_id', 'text', 'is_done', 'sort_order'],
    fdhub_repos: ['id', 'name', 'description', 'app_type', 'project_id', 'created_at'],
    fdhub_commits: ['id', 'repo_id', 'message', 'tag', 'file_name', 'file_path', 'file_size', 'summary_json', 'health_score', 'screen_count', 'control_count', 'formula_count', 'datasource_count', 'issue_count', 'created_at'],
    attachments: ['id', 'entity_type', 'entity_id', 'file_name', 'file_path', 'file_size', 'mime_type', 'created_at'],
  };
  let colFixCount = 0;
  for (const [table, cols] of Object.entries(expectedColumns)) {
    if (!tableExists(db, table)) continue;
    for (const col of cols) {
      if (!columnExists(db, table, col)) {
        // Prova ad aggiungere la colonna con un default sicuro
        const defaultVal = col.includes('id') ? 'INTEGER' :
                           col.includes('is_') || col.includes('sort_') || col.includes('progress') || col === 'completed' || col === 'pinned' ? 'INTEGER NOT NULL DEFAULT 0' :
                           "TEXT DEFAULT ''";
        console.warn(`[FlowDesk DB] ⚠ Colonna mancante: ${table}.${col} — aggiunta con default`);
        safeAddColumn(db, table, col, defaultVal);
        colFixCount++;
      }
    }
  }
  if (colFixCount > 0) {
    console.log(`[FlowDesk DB] ✔ ${colFixCount} colonne mancanti aggiunte`);
  }

  console.log(`[FlowDesk DB] Schema v${currentVersion}/${LATEST_VERSION} — DB pronto`);
}

/* ═══════════════════════ Tasks ═══════════════════════ */

const TASK_COLS = `id, title, description, planned_minutes AS plannedMinutes, priority, status,
  scheduled_date AS scheduledDate, created_at AS createdAt, project_id AS projectId,
  recurrence, recurrence_parent_id AS recurrenceParentId`;

function listTasks(scheduledDate = localDateString(), projectId = null) {
  if (projectId) {
    return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE scheduled_date = ? AND project_id = ? AND deleted_at IS NULL
      ORDER BY CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, id DESC`)
      .all(scheduledDate, projectId);
  }
  return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE scheduled_date = ? AND deleted_at IS NULL
    ORDER BY CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, id DESC`)
    .all(scheduledDate);
}

function createTask(p) {
  const date = p.scheduledDate || localDateString();
  const info = db.prepare(
    `INSERT INTO tasks (title, description, planned_minutes, priority, status, scheduled_date, project_id, created_at)
     VALUES (?, ?, ?, ?, 'Todo', ?, ?, ?)`
  ).run(p.title, p.description || '', Number(p.plannedMinutes || 60), p.priority || 'Medium', date, p.projectId || null, nowIso());
  return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`).get(info.lastInsertRowid);
}

function updateTask(id, p) {
  const fields = [];
  const vals = [];
  if (p.title !== undefined) { fields.push('title = ?'); vals.push(p.title); }
  if (p.description !== undefined) { fields.push('description = ?'); vals.push(p.description); }
  if (p.plannedMinutes !== undefined) { fields.push('planned_minutes = ?'); vals.push(Number(p.plannedMinutes)); }
  if (p.priority !== undefined) { fields.push('priority = ?'); vals.push(p.priority); }
  if (p.status !== undefined) { fields.push('status = ?'); vals.push(p.status); }
  if (p.scheduledDate !== undefined) { fields.push('scheduled_date = ?'); vals.push(p.scheduledDate); }
  if (p.projectId !== undefined) { fields.push('project_id = ?'); vals.push(p.projectId || null); }
  if (fields.length) {
    vals.push(id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }
  return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`).get(id);
}

function deleteTask(id) {
  db.prepare('UPDATE change_entries SET task_id = NULL WHERE task_id = ?').run(id);
  db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
  db.prepare('DELETE FROM work_sessions WHERE task_id = ?').run(id);
  db.prepare('UPDATE tasks SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

function restoreTask(id) {
  db.prepare('UPDATE tasks SET deleted_at = NULL WHERE id = ?').run(id);
  return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`).get(id);
}

function permanentDeleteTask(id) {
  db.prepare('UPDATE change_entries SET task_id = NULL WHERE task_id = ?').run(id);
  db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
  db.prepare('DELETE FROM work_sessions WHERE task_id = ?').run(id);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return { ok: true };
}

function setTaskStatus(id, status) {
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
  return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`).get(id);
}

function duplicateTaskToDate(id, newDate) {
  const orig = db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`).get(id);
  if (!orig) return null;
  const info = db.prepare(
    `INSERT INTO tasks (title, description, planned_minutes, priority, status, scheduled_date, project_id, created_at)
     VALUES (?, ?, ?, ?, 'Todo', ?, ?, ?)`
  ).run(orig.title, orig.description || '', orig.plannedMinutes, orig.priority, newDate, orig.projectId || null, nowIso());
  return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`).get(info.lastInsertRowid);
}

/* ═══════════════════════ Sessions ═══════════════════════ */

const SESSION_COLS = `ws.id, ws.task_id AS taskId, t.title AS taskTitle,
  ws.started_at AS startedAt, ws.ended_at AS endedAt,
  ws.duration_minutes AS durationMinutes, ws.note`;

function getActiveSession() {
  return db.prepare(
    `SELECT ${SESSION_COLS} FROM work_sessions ws
     JOIN tasks t ON t.id = ws.task_id
     WHERE ws.is_active = 1 ORDER BY ws.id DESC LIMIT 1`
  ).get() || null;
}

function startSession(taskId) {
  const active = getActiveSession();
  if (active) return active;
  const info = db.prepare(
    'INSERT INTO work_sessions (task_id, started_at, is_active) VALUES (?, ?, 1)'
  ).run(taskId, nowIso());
  return db.prepare(
    `SELECT ${SESSION_COLS} FROM work_sessions ws JOIN tasks t ON t.id = ws.task_id WHERE ws.id = ?`
  ).get(info.lastInsertRowid);
}

function stopSession(note = '') {
  const active = getActiveSession();
  if (!active) return null;
  const end = new Date();
  const start = new Date(active.startedAt);
  const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  db.prepare(
    'UPDATE work_sessions SET ended_at = ?, duration_minutes = ?, note = ?, is_active = 0 WHERE id = ?'
  ).run(end.toISOString(), minutes, note, active.id);
  return db.prepare(
    `SELECT ws.id, ws.task_id AS taskId, t.title AS taskTitle, ws.started_at AS startedAt,
     ws.ended_at AS endedAt, ws.duration_minutes AS durationMinutes, ws.note
     FROM work_sessions ws JOIN tasks t ON t.id = ws.task_id WHERE ws.id = ?`
  ).get(active.id);
}

function listSessions(day = localDateString()) {
  return db.prepare(
    `SELECT ${SESSION_COLS} FROM work_sessions ws
     JOIN tasks t ON t.id = ws.task_id
     WHERE date(ws.started_at, 'localtime') = ?
     ORDER BY ws.id DESC`
  ).all(day);
}

/* ═══════════════════════ Change Log ═══════════════════════ */

const CHANGE_COLS = `id, task_id AS taskId, tool, artifact, change_type AS changeType, summary,
  before_text AS beforeText, after_text AS afterText, test_result AS testResult,
  work_date AS workDate, created_at AS createdAt, project_id AS projectId`;

function addChange(p) {
  const workDate = p.workDate || localDateString();
  const info = db.prepare(
    `INSERT INTO change_entries (task_id, tool, artifact, change_type, summary, before_text, after_text, test_result, work_date, project_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(p.taskId || null, p.tool, p.artifact, p.changeType, p.summary,
    p.beforeText || '', p.afterText || '', p.testResult || 'Non testato', workDate, p.projectId || null, nowIso());
  return db.prepare(`SELECT ${CHANGE_COLS} FROM change_entries WHERE id = ?`).get(info.lastInsertRowid);
}

function listChanges(day = localDateString()) {
  return db.prepare(`SELECT ${CHANGE_COLS} FROM change_entries WHERE work_date = ? AND deleted_at IS NULL ORDER BY id DESC`).all(day);
}

function updateChange(id, p) {
  const fields = [];
  const vals = [];
  if (p.tool !== undefined) { fields.push('tool = ?'); vals.push(p.tool); }
  if (p.artifact !== undefined) { fields.push('artifact = ?'); vals.push(p.artifact); }
  if (p.changeType !== undefined) { fields.push('change_type = ?'); vals.push(p.changeType); }
  if (p.summary !== undefined) { fields.push('summary = ?'); vals.push(p.summary); }
  if (p.beforeText !== undefined) { fields.push('before_text = ?'); vals.push(p.beforeText); }
  if (p.afterText !== undefined) { fields.push('after_text = ?'); vals.push(p.afterText); }
  if (p.testResult !== undefined) { fields.push('test_result = ?'); vals.push(p.testResult); }
  if (p.taskId !== undefined) { fields.push('task_id = ?'); vals.push(p.taskId || null); }
  if (p.projectId !== undefined) { fields.push('project_id = ?'); vals.push(p.projectId || null); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE change_entries SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${CHANGE_COLS} FROM change_entries WHERE id = ?`).get(id);
}

function deleteChange(id) {
  db.prepare('UPDATE change_entries SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Notes ═══════════════════════ */

const NOTE_COLS = `id, category, title, content, pinned, work_date AS workDate, created_at AS createdAt`;

function createNote(p) {
  const workDate = p.workDate || localDateString();
  const info = db.prepare(
    `INSERT INTO notes (category, title, content, pinned, work_date, created_at) VALUES (?, ?, ?, 0, ?, ?)`
  ).run(p.category || 'Generale', p.title, p.content || '', workDate, nowIso());
  return db.prepare(`SELECT ${NOTE_COLS} FROM notes WHERE id = ?`).get(info.lastInsertRowid);
}

function listNotes(day = localDateString()) {
  return db.prepare(`SELECT ${NOTE_COLS} FROM notes WHERE work_date = ? AND deleted_at IS NULL ORDER BY pinned DESC, id DESC`).all(day);
}

function togglePinNote(id) {
  db.prepare('UPDATE notes SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  return db.prepare(`SELECT ${NOTE_COLS} FROM notes WHERE id = ?`).get(id);
}

function deleteNote(id) {
  db.prepare('UPDATE notes SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Daily Goals ═══════════════════════ */

const GOAL_COLS = `id, text, is_done AS isDone, sort_order AS sortOrder, work_date AS workDate, created_at AS createdAt`;

function createGoal(p) {
  const workDate = p.workDate || localDateString();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM daily_goals WHERE work_date = ?').get(workDate);
  const info = db.prepare(
    `INSERT INTO daily_goals (text, is_done, sort_order, work_date, created_at) VALUES (?, 0, ?, ?, ?)`
  ).run(p.text, (maxOrder?.m || 0) + 1, workDate, nowIso());
  return db.prepare(`SELECT ${GOAL_COLS} FROM daily_goals WHERE id = ?`).get(info.lastInsertRowid);
}

function listGoals(day = localDateString()) {
  return db.prepare(`SELECT ${GOAL_COLS} FROM daily_goals WHERE work_date = ? AND deleted_at IS NULL ORDER BY sort_order ASC`).all(day);
}

function toggleGoal(id) {
  db.prepare('UPDATE daily_goals SET is_done = CASE WHEN is_done = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  return db.prepare(`SELECT ${GOAL_COLS} FROM daily_goals WHERE id = ?`).get(id);
}

function updateGoal(id, p) {
  const fields = [];
  const vals = [];
  if (p.text !== undefined) { fields.push('text = ?'); vals.push(p.text); }
  if (fields.length) {
    vals.push(id);
    db.prepare(`UPDATE daily_goals SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }
  return db.prepare(`SELECT ${GOAL_COLS} FROM daily_goals WHERE id = ?`).get(id);
}

function deleteGoal(id) {
  db.prepare('UPDATE daily_goals SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Stats ═══════════════════════ */

function getWeekStats(startDate, endDate) {
  const dailyTime = db.prepare(`
    SELECT date(ws.started_at, 'localtime') AS day,
           SUM(ws.duration_minutes) AS totalMinutes,
           COUNT(ws.id) AS sessionCount
    FROM work_sessions ws
    WHERE date(ws.started_at, 'localtime') BETWEEN ? AND ? AND ws.is_active = 0
    GROUP BY day ORDER BY day
  `).all(startDate, endDate);

  const toolUsage = db.prepare(`
    SELECT tool, COUNT(*) AS count
    FROM change_entries WHERE work_date BETWEEN ? AND ?
    GROUP BY tool ORDER BY count DESC
  `).all(startDate, endDate);

  const taskStats = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM tasks WHERE scheduled_date BETWEEN ? AND ?
    GROUP BY status
  `).all(startDate, endDate);

  const changeTypes = db.prepare(`
    SELECT change_type AS changeType, COUNT(*) AS count
    FROM change_entries WHERE work_date BETWEEN ? AND ?
    GROUP BY change_type ORDER BY count DESC
  `).all(startDate, endDate);

  const totalTime = db.prepare(`
    SELECT COALESCE(SUM(duration_minutes), 0) AS total
    FROM work_sessions
    WHERE date(started_at, 'localtime') BETWEEN ? AND ? AND is_active = 0
  `).get(startDate, endDate);

  const goalStats = db.prepare(`
    SELECT COUNT(*) AS total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) AS done
    FROM daily_goals WHERE work_date BETWEEN ? AND ?
  `).get(startDate, endDate);

  return { dailyTime, toolUsage, taskStats, changeTypes, totalMinutes: totalTime?.total || 0, goalStats };
}

/* ═══════════════════════ Search ═══════════════════════ */

function searchAll(query) {
  const q = `%${query}%`;
  const tasks = db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE title LIKE ? OR description LIKE ? ORDER BY id DESC LIMIT 30`).all(q, q);
  const changes = db.prepare(`SELECT ${CHANGE_COLS} FROM change_entries WHERE artifact LIKE ? OR summary LIKE ? ORDER BY id DESC LIMIT 30`).all(q, q);
  const notes = db.prepare(`SELECT ${NOTE_COLS} FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC LIMIT 30`).all(q, q);
  return { tasks, changes, notes };
}

/* ═══════════════════════ History ═══════════════════════ */

function getActiveDays(startDate, endDate) {
  const days = db.prepare(`
    SELECT DISTINCT d AS day FROM (
      SELECT scheduled_date AS d FROM tasks WHERE scheduled_date BETWEEN ? AND ?
      UNION SELECT work_date AS d FROM change_entries WHERE work_date BETWEEN ? AND ?
      UNION SELECT work_date AS d FROM notes WHERE work_date BETWEEN ? AND ?
      UNION SELECT date(started_at, 'localtime') AS d FROM work_sessions WHERE date(started_at, 'localtime') BETWEEN ? AND ?
    ) ORDER BY day
  `).all(startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate);
  return days.map(r => r.day);
}

function getDaySummary(day) {
  const t = listTasks(day);
  const s = listSessions(day);
  const c = listChanges(day);
  const n = listNotes(day);
  const g = listGoals(day);
  const totalMinutes = s.reduce((a, ss) => a + (ss.durationMinutes || 0), 0);
  return { day, tasks: t, sessions: s, changes: c, notes: n, goals: g, totalMinutes, tasksDone: t.filter(x => x.status === 'Done').length, tasksTotal: t.length, goalsDone: g.filter(x => x.isDone).length, goalsTotal: g.length };
}

/* ═══════════════════════ Export ═══════════════════════ */

function exportCsv(startDate, endDate) {
  const sessions = db.prepare(`
    SELECT date(ws.started_at, 'localtime') AS day, t.title AS task,
           ws.started_at AS startedAt, ws.ended_at AS endedAt,
           ws.duration_minutes AS minutes, ws.note
    FROM work_sessions ws JOIN tasks t ON t.id = ws.task_id
    WHERE date(ws.started_at, 'localtime') BETWEEN ? AND ? AND ws.is_active = 0
    ORDER BY ws.started_at
  `).all(startDate, endDate);

  const changes = db.prepare(`
    SELECT work_date AS day, tool, artifact, change_type AS changeType, summary, test_result AS testResult
    FROM change_entries WHERE work_date BETWEEN ? AND ? ORDER BY work_date, id
  `).all(startDate, endDate);

  let sessionsCsv = 'Data,Attivita,Inizio,Fine,Minuti,Nota\n';
  sessions.forEach(s => {
    sessionsCsv += `"${s.day}","${s.task}","${s.startedAt}","${s.endedAt || ''}","${s.minutes || ''}","${(s.note || '').replace(/"/g, '""')}"\n`;
  });

  let changesCsv = 'Data,Strumento,Oggetto,Tipo,Descrizione,Test\n';
  changes.forEach(c => {
    changesCsv += `"${c.day}","${c.tool}","${c.artifact}","${c.changeType}","${c.summary.replace(/"/g, '""')}","${c.testResult}"\n`;
  });

  return { sessionsCsv, changesCsv };
}

/* ═══════════════════════ Projects ═══════════════════════ */

const PROJECT_COLS = `id, name, color, description, is_archived AS isArchived, created_at AS createdAt`;

function createProject(p) {
  const info = db.prepare(
    'INSERT INTO projects (name, color, description, created_at) VALUES (?, ?, ?, ?)'
  ).run(p.name, p.color || '#3b82f6', p.description || '', nowIso());
  return db.prepare(`SELECT ${PROJECT_COLS} FROM projects WHERE id = ?`).get(info.lastInsertRowid);
}

function listProjects(includeArchived = false) {
  if (includeArchived) return db.prepare(`SELECT ${PROJECT_COLS} FROM projects WHERE deleted_at IS NULL ORDER BY name`).all();
  return db.prepare(`SELECT ${PROJECT_COLS} FROM projects WHERE is_archived = 0 AND deleted_at IS NULL ORDER BY name`).all();
}

function updateProject(id, p) {
  const fields = [];
  const vals = [];
  if (p.name !== undefined) { fields.push('name = ?'); vals.push(p.name); }
  if (p.color !== undefined) { fields.push('color = ?'); vals.push(p.color); }
  if (p.description !== undefined) { fields.push('description = ?'); vals.push(p.description); }
  if (p.isArchived !== undefined) { fields.push('is_archived = ?'); vals.push(p.isArchived ? 1 : 0); }
  if (fields.length) {
    vals.push(id);
    db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }
  return db.prepare(`SELECT ${PROJECT_COLS} FROM projects WHERE id = ?`).get(id);
}

function deleteProject(id) {
  db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE change_entries SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE bugs SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE contacts SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE environments SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE checklists SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE bookmarks SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE fdhub_repos SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('DELETE FROM task_templates WHERE project_id = ?').run(id);
  db.prepare('UPDATE projects SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

function getProjectStats(projectId) {
  const taskStats = db.prepare(`
    SELECT status, COUNT(*) AS count FROM tasks WHERE project_id = ? GROUP BY status
  `).all(projectId);
  const totalTime = db.prepare(`
    SELECT COALESCE(SUM(ws.duration_minutes), 0) AS total
    FROM work_sessions ws JOIN tasks t ON t.id = ws.task_id
    WHERE t.project_id = ? AND ws.is_active = 0
  `).get(projectId);
  const changeCount = db.prepare('SELECT COUNT(*) AS count FROM change_entries WHERE project_id = ?').get(projectId);
  return {
    taskStats,
    totalMinutes: totalTime?.total || 0,
    changeCount: changeCount?.count || 0,
  };
}

/* ═══════════════════════ Tags ═══════════════════════ */

function createTag(p) {
  const info = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(p.name, p.color || '#64748b');
  return db.prepare('SELECT id, name, color FROM tags WHERE id = ?').get(info.lastInsertRowid);
}

function listTags() {
  return db.prepare('SELECT id, name, color FROM tags ORDER BY name').all();
}

function updateTag(id, p) {
  const fields = [];
  const vals = [];
  if (p.name !== undefined) { fields.push('name = ?'); vals.push(p.name); }
  if (p.color !== undefined) { fields.push('color = ?'); vals.push(p.color); }
  if (fields.length) {
    vals.push(id);
    db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }
  return db.prepare('SELECT id, name, color FROM tags WHERE id = ?').get(id);
}

function deleteTag(id) {
  db.prepare('DELETE FROM task_tags WHERE tag_id = ?').run(id);
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  return { ok: true };
}

function addTagToTask(taskId, tagId) {
  try { db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId); } catch (_) {}
  return getTaskTags(taskId);
}

function removeTagFromTask(taskId, tagId) {
  db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(taskId, tagId);
  return getTaskTags(taskId);
}

function getTaskTags(taskId) {
  return db.prepare(
    'SELECT t.id, t.name, t.color FROM tags t JOIN task_tags tt ON tt.tag_id = t.id WHERE tt.task_id = ? ORDER BY t.name'
  ).all(taskId);
}

/* ═══════════════════════ Templates ═══════════════════════ */

const TEMPLATE_COLS = `id, title, description, planned_minutes AS plannedMinutes, priority, tool, project_id AS projectId, created_at AS createdAt`;

function createTemplate(p) {
  const info = db.prepare(
    'INSERT INTO task_templates (title, description, planned_minutes, priority, tool, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(p.title, p.description || '', Number(p.plannedMinutes || 60), p.priority || 'Medium', p.tool || '', p.projectId || null, nowIso());
  return db.prepare(`SELECT ${TEMPLATE_COLS} FROM task_templates WHERE id = ?`).get(info.lastInsertRowid);
}

function listTemplates() {
  return db.prepare(`SELECT ${TEMPLATE_COLS} FROM task_templates ORDER BY title`).all();
}

function deleteTemplate(id) {
  db.prepare('DELETE FROM task_templates WHERE id = ?').run(id);
  return { ok: true };
}

function createTaskFromTemplate(templateId, scheduledDate) {
  const tpl = db.prepare(`SELECT ${TEMPLATE_COLS} FROM task_templates WHERE id = ?`).get(templateId);
  if (!tpl) return null;
  return createTask({
    title: tpl.title,
    description: tpl.description,
    plannedMinutes: tpl.plannedMinutes,
    priority: tpl.priority,
    scheduledDate: scheduledDate || localDateString(),
    projectId: tpl.projectId,
  });
}

/* ═══════════════════════ Update Note ═══════════════════════ */

function updateNote(id, p) {
  const fields = [];
  const vals = [];
  if (p.title !== undefined) { fields.push('title = ?'); vals.push(p.title); }
  if (p.content !== undefined) { fields.push('content = ?'); vals.push(p.content); }
  if (p.category !== undefined) { fields.push('category = ?'); vals.push(p.category); }
  if (fields.length) {
    vals.push(id);
    db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }
  return db.prepare(`SELECT ${NOTE_COLS} FROM notes WHERE id = ?`).get(id);
}

/* ═══════════════════════ Snippets ═══════════════════════ */

const SNIPPET_COLS = `id, title, language, code, description, is_favorite AS isFavorite, created_at AS createdAt`;

function createSnippet(p) {
  const info = db.prepare(
    'INSERT INTO snippets (title, language, code, description, is_favorite, created_at) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(p.title, p.language || 'PowerFx', p.code || '', p.description || '', nowIso());
  return db.prepare(`SELECT ${SNIPPET_COLS} FROM snippets WHERE id = ?`).get(info.lastInsertRowid);
}

function listSnippets(language = null) {
  if (language) {
    return db.prepare(`SELECT ${SNIPPET_COLS} FROM snippets WHERE language = ? AND deleted_at IS NULL ORDER BY is_favorite DESC, title`).all(language);
  }
  return db.prepare(`SELECT ${SNIPPET_COLS} FROM snippets WHERE deleted_at IS NULL ORDER BY is_favorite DESC, title`).all();
}

function updateSnippet(id, p) {
  const fields = [];
  const vals = [];
  if (p.title !== undefined) { fields.push('title = ?'); vals.push(p.title); }
  if (p.language !== undefined) { fields.push('language = ?'); vals.push(p.language); }
  if (p.code !== undefined) { fields.push('code = ?'); vals.push(p.code); }
  if (p.description !== undefined) { fields.push('description = ?'); vals.push(p.description); }
  if (fields.length) {
    vals.push(id);
    db.prepare(`UPDATE snippets SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  }
  return db.prepare(`SELECT ${SNIPPET_COLS} FROM snippets WHERE id = ?`).get(id);
}

function toggleSnippetFav(id) {
  db.prepare('UPDATE snippets SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  return db.prepare(`SELECT ${SNIPPET_COLS} FROM snippets WHERE id = ?`).get(id);
}

function deleteSnippet(id) {
  db.prepare('UPDATE snippets SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Bookmarks ═══════════════════════ */

const BOOKMARK_COLS = `id, title, url, category, description, project_id AS projectId, created_at AS createdAt`;

function createBookmark(p) {
  const info = db.prepare(
    'INSERT INTO bookmarks (title, url, category, description, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(p.title, p.url, p.category || 'Altro', p.description || '', p.projectId || null, nowIso());
  return db.prepare(`SELECT ${BOOKMARK_COLS} FROM bookmarks WHERE id = ?`).get(info.lastInsertRowid);
}

function listBookmarks(category = null) {
  if (category) {
    return db.prepare(`SELECT ${BOOKMARK_COLS} FROM bookmarks WHERE category = ? AND deleted_at IS NULL ORDER BY title`).all(category);
  }
  return db.prepare(`SELECT ${BOOKMARK_COLS} FROM bookmarks WHERE deleted_at IS NULL ORDER BY category, title`).all();
}

function updateBookmark(id, p) {
  const fields = [];
  const vals = [];
  if (p.title !== undefined) { fields.push('title = ?'); vals.push(p.title); }
  if (p.url !== undefined) { fields.push('url = ?'); vals.push(p.url); }
  if (p.category !== undefined) { fields.push('category = ?'); vals.push(p.category); }
  if (p.description !== undefined) { fields.push('description = ?'); vals.push(p.description); }
  if (p.projectId !== undefined) { fields.push('project_id = ?'); vals.push(p.projectId || null); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE bookmarks SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${BOOKMARK_COLS} FROM bookmarks WHERE id = ?`).get(id);
}

function deleteBookmark(id) {
  db.prepare('UPDATE bookmarks SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Backlog ═══════════════════════ */

function getBacklog() {
  const today = localDateString();
  return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE status != 'Done' AND scheduled_date < ? AND deleted_at IS NULL
    ORDER BY scheduled_date DESC, CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END`).all(today);
}

function rescheduleTask(id, newDate) {
  db.prepare('UPDATE tasks SET scheduled_date = ? WHERE id = ?').run(newDate, id);
  return db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`).get(id);
}

/* ═══════════════════════ Streak ═══════════════════════ */

function getStreak() {
  const today = localDateString();
  const days = db.prepare(`
    SELECT DISTINCT d AS day FROM (
      SELECT scheduled_date AS d FROM tasks WHERE status = 'Done'
      UNION SELECT date(started_at, 'localtime') AS d FROM work_sessions WHERE is_active = 0
      UNION SELECT work_date AS d FROM change_entries
    ) ORDER BY day DESC
  `).all().map(r => r.day);

  if (!days.length) return { current: 0, longest: 0 };

  let current = 0;
  let check = today;
  // if today has no data yet, start from yesterday
  if (days[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    check = localDateString(yesterday);
    if (days[0] !== check) return { current: 0, longest: computeLongest(days) };
  }

  for (const day of days) {
    if (day === check) {
      current++;
      const prev = new Date(check + 'T00:00:00');
      prev.setDate(prev.getDate() - 1);
      check = localDateString(prev);
    } else if (day < check) {
      break;
    }
  }

  return { current, longest: computeLongest(days) };
}

function computeLongest(days) {
  if (!days.length) return 0;
  let longest = 1;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T00:00:00');
    const curr = new Date(days[i] + 'T00:00:00');
    const diff = (prev.getTime() - curr.getTime()) / (86400000);
    if (Math.abs(diff - 1) < 0.01) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      streak = 1;
    }
  }
  return longest;
}

/* ═══════════════════════ Time Budget ═══════════════════════ */

function getTimeBudget(scheduledDate) {
  const date = scheduledDate || localDateString();
  const tasks = db.prepare(`SELECT id, title, planned_minutes AS plannedMinutes FROM tasks WHERE scheduled_date = ?`).all(date);
  const result = tasks.map(t => {
    const actual = db.prepare(
      'SELECT COALESCE(SUM(duration_minutes), 0) AS total FROM work_sessions WHERE task_id = ? AND is_active = 0'
    ).get(t.id);
    return { taskId: t.id, title: t.title, plannedMinutes: t.plannedMinutes, actualMinutes: actual?.total || 0 };
  });
  const totalPlanned = result.reduce((a, r) => a + r.plannedMinutes, 0);
  const totalActual = result.reduce((a, r) => a + r.actualMinutes, 0);
  return { tasks: result, totalPlanned, totalActual };
}

/* ═══════════════════════ Contacts ═══════════════════════ */

const CONTACT_COLS = `id, name, role, email, phone, company, notes, project_id AS projectId, created_at AS createdAt`;

function createContact(p) {
  const info = db.prepare('INSERT INTO contacts (name, role, email, phone, company, notes, project_id, created_at) VALUES (?,?,?,?,?,?,?,?)').run(
    p.name, p.role || '', p.email || '', p.phone || '', p.company || '', p.notes || '', p.projectId || null, nowIso()
  );
  return db.prepare(`SELECT ${CONTACT_COLS} FROM contacts WHERE id = ?`).get(info.lastInsertRowid);
}

function listContacts(projectId = null) {
  if (projectId) return db.prepare(`SELECT ${CONTACT_COLS} FROM contacts WHERE project_id = ? AND deleted_at IS NULL ORDER BY name`).all(projectId);
  return db.prepare(`SELECT ${CONTACT_COLS} FROM contacts WHERE deleted_at IS NULL ORDER BY name`).all();
}

function updateContact(id, p) {
  const fields = [];
  const vals = [];
  if (p.name !== undefined) { fields.push('name = ?'); vals.push(p.name); }
  if (p.role !== undefined) { fields.push('role = ?'); vals.push(p.role); }
  if (p.email !== undefined) { fields.push('email = ?'); vals.push(p.email); }
  if (p.phone !== undefined) { fields.push('phone = ?'); vals.push(p.phone); }
  if (p.company !== undefined) { fields.push('company = ?'); vals.push(p.company); }
  if (p.notes !== undefined) { fields.push('notes = ?'); vals.push(p.notes); }
  if (p.projectId !== undefined) { fields.push('project_id = ?'); vals.push(p.projectId); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${CONTACT_COLS} FROM contacts WHERE id = ?`).get(id);
}

function deleteContact(id) {
  db.prepare('UPDATE contacts SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Environments ═══════════════════════ */

const ENV_COLS = `id, name, url, env_type AS envType, status, description, project_id AS projectId, created_at AS createdAt`;

function createEnvironment(p) {
  const info = db.prepare('INSERT INTO environments (name, url, env_type, status, description, project_id, created_at) VALUES (?,?,?,?,?,?,?)').run(
    p.name, p.url || '', p.envType || 'Dev', p.status || 'Attivo', p.description || '', p.projectId || null, nowIso()
  );
  return db.prepare(`SELECT ${ENV_COLS} FROM environments WHERE id = ?`).get(info.lastInsertRowid);
}

function listEnvironments(projectId = null) {
  if (projectId) return db.prepare(`SELECT ${ENV_COLS} FROM environments WHERE project_id = ? AND deleted_at IS NULL ORDER BY name`).all(projectId);
  return db.prepare(`SELECT ${ENV_COLS} FROM environments WHERE deleted_at IS NULL ORDER BY name`).all();
}

function updateEnvironment(id, p) {
  const fields = [];
  const vals = [];
  if (p.name !== undefined) { fields.push('name = ?'); vals.push(p.name); }
  if (p.url !== undefined) { fields.push('url = ?'); vals.push(p.url); }
  if (p.envType !== undefined) { fields.push('env_type = ?'); vals.push(p.envType); }
  if (p.status !== undefined) { fields.push('status = ?'); vals.push(p.status); }
  if (p.description !== undefined) { fields.push('description = ?'); vals.push(p.description); }
  if (p.projectId !== undefined) { fields.push('project_id = ?'); vals.push(p.projectId); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE environments SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${ENV_COLS} FROM environments WHERE id = ?`).get(id);
}

function deleteEnvironment(id) {
  db.prepare('UPDATE environments SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Retrospectives ═══════════════════════ */

const RETRO_COLS = `id, week_start AS weekStart, went_well AS wentWell, to_improve AS toImprove, actions, created_at AS createdAt`;

function createRetrospective(p) {
  const info = db.prepare('INSERT INTO retrospectives (week_start, went_well, to_improve, actions, created_at) VALUES (?,?,?,?,?)').run(
    p.weekStart, p.wentWell || '', p.toImprove || '', p.actions || '', nowIso()
  );
  return db.prepare(`SELECT ${RETRO_COLS} FROM retrospectives WHERE id = ?`).get(info.lastInsertRowid);
}

function listRetrospectives() {
  return db.prepare(`SELECT ${RETRO_COLS} FROM retrospectives WHERE deleted_at IS NULL ORDER BY week_start DESC`).all();
}

function updateRetrospective(id, p) {
  const fields = [];
  const vals = [];
  if (p.wentWell !== undefined) { fields.push('went_well = ?'); vals.push(p.wentWell); }
  if (p.toImprove !== undefined) { fields.push('to_improve = ?'); vals.push(p.toImprove); }
  if (p.actions !== undefined) { fields.push('actions = ?'); vals.push(p.actions); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE retrospectives SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${RETRO_COLS} FROM retrospectives WHERE id = ?`).get(id);
}

function deleteRetrospective(id) {
  db.prepare('UPDATE retrospectives SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Bugs ═══════════════════════ */

const BUG_COLS = `id, title, description, severity, status, steps_to_reproduce AS stepsToReproduce, solution, project_id AS projectId, created_at AS createdAt`;

function createBug(p) {
  const info = db.prepare('INSERT INTO bugs (title, description, severity, status, steps_to_reproduce, solution, project_id, created_at) VALUES (?,?,?,?,?,?,?,?)').run(
    p.title, p.description || '', p.severity || 'Medium', p.status || 'Aperto', p.stepsToReproduce || '', p.solution || '', p.projectId || null, nowIso()
  );
  return db.prepare(`SELECT ${BUG_COLS} FROM bugs WHERE id = ?`).get(info.lastInsertRowid);
}

function listBugs(projectId = null, status = null) {
  let sql = `SELECT ${BUG_COLS} FROM bugs`;
  const params = [];
  const where = ['deleted_at IS NULL'];
  if (projectId) { where.push('project_id = ?'); params.push(projectId); }
  if (status) { where.push('status = ?'); params.push(status); }
  sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY CASE severity WHEN \'Critical\' THEN 1 WHEN \'High\' THEN 2 WHEN \'Medium\' THEN 3 ELSE 4 END, id DESC';
  return db.prepare(sql).all(...params);
}

function updateBug(id, p) {
  const fields = [];
  const vals = [];
  if (p.title !== undefined) { fields.push('title = ?'); vals.push(p.title); }
  if (p.description !== undefined) { fields.push('description = ?'); vals.push(p.description); }
  if (p.severity !== undefined) { fields.push('severity = ?'); vals.push(p.severity); }
  if (p.status !== undefined) { fields.push('status = ?'); vals.push(p.status); }
  if (p.stepsToReproduce !== undefined) { fields.push('steps_to_reproduce = ?'); vals.push(p.stepsToReproduce); }
  if (p.solution !== undefined) { fields.push('solution = ?'); vals.push(p.solution); }
  if (p.projectId !== undefined) { fields.push('project_id = ?'); vals.push(p.projectId); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE bugs SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${BUG_COLS} FROM bugs WHERE id = ?`).get(id);
}

function deleteBug(id) {
  db.prepare('UPDATE bugs SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Learning ═══════════════════════ */

const LEARNING_COLS = `id, title, category, url, progress, notes, completed, created_at AS createdAt`;

function createLearning(p) {
  const info = db.prepare('INSERT INTO learning (title, category, url, progress, notes, completed, created_at) VALUES (?,?,?,?,?,?,?)').run(
    p.title, p.category || 'Corso', p.url || '', p.progress || 0, p.notes || '', p.completed || 0, nowIso()
  );
  return db.prepare(`SELECT ${LEARNING_COLS} FROM learning WHERE id = ?`).get(info.lastInsertRowid);
}

function listLearning(category = null) {
  if (category) return db.prepare(`SELECT ${LEARNING_COLS} FROM learning WHERE category = ? AND deleted_at IS NULL ORDER BY created_at DESC`).all(category);
  return db.prepare(`SELECT ${LEARNING_COLS} FROM learning WHERE deleted_at IS NULL ORDER BY created_at DESC`).all();
}

function updateLearning(id, p) {
  const fields = [];
  const vals = [];
  if (p.title !== undefined) { fields.push('title = ?'); vals.push(p.title); }
  if (p.category !== undefined) { fields.push('category = ?'); vals.push(p.category); }
  if (p.url !== undefined) { fields.push('url = ?'); vals.push(p.url); }
  if (p.progress !== undefined) { fields.push('progress = ?'); vals.push(p.progress); }
  if (p.notes !== undefined) { fields.push('notes = ?'); vals.push(p.notes); }
  if (p.completed !== undefined) { fields.push('completed = ?'); vals.push(p.completed); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE learning SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${LEARNING_COLS} FROM learning WHERE id = ?`).get(id);
}

function deleteLearning(id) {
  db.prepare('UPDATE learning SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

/* ═══════════════════════ Checklists ═══════════════════════ */

const CHECKLIST_COLS = `id, title, description, project_id AS projectId, created_at AS createdAt`;
const CHECKLIST_ITEM_COLS = `id, checklist_id AS checklistId, text, is_done AS isDone, sort_order AS sortOrder`;

function createChecklist(p) {
  const info = db.prepare('INSERT INTO checklists (title, description, project_id, created_at) VALUES (?,?,?,?)').run(
    p.title, p.description || '', p.projectId || null, nowIso()
  );
  return db.prepare(`SELECT ${CHECKLIST_COLS} FROM checklists WHERE id = ?`).get(info.lastInsertRowid);
}

function listChecklists(projectId = null) {
  if (projectId) return db.prepare(`SELECT ${CHECKLIST_COLS} FROM checklists WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`).all(projectId);
  return db.prepare(`SELECT ${CHECKLIST_COLS} FROM checklists WHERE deleted_at IS NULL ORDER BY created_at DESC`).all();
}

function updateChecklist(id, p) {
  const fields = [];
  const vals = [];
  if (p.title !== undefined) { fields.push('title = ?'); vals.push(p.title); }
  if (p.description !== undefined) { fields.push('description = ?'); vals.push(p.description); }
  if (p.projectId !== undefined) { fields.push('project_id = ?'); vals.push(p.projectId || null); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE checklists SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${CHECKLIST_COLS} FROM checklists WHERE id = ?`).get(id);
}

function deleteChecklist(id) {
  db.prepare('DELETE FROM checklist_items WHERE checklist_id = ?').run(id);
  db.prepare('UPDATE checklists SET deleted_at = ? WHERE id = ?').run(nowIso(), id);
  return { ok: true };
}

function getChecklistItems(checklistId) {
  return db.prepare(`SELECT ${CHECKLIST_ITEM_COLS} FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order, id`).all(checklistId);
}

function addChecklistItem(p) {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM checklist_items WHERE checklist_id = ?').get(p.checklistId);
  const info = db.prepare('INSERT INTO checklist_items (checklist_id, text, is_done, sort_order) VALUES (?,?,0,?)').run(
    p.checklistId, p.text, (maxOrder?.m || 0) + 1
  );
  return db.prepare(`SELECT ${CHECKLIST_ITEM_COLS} FROM checklist_items WHERE id = ?`).get(info.lastInsertRowid);
}

function toggleChecklistItem(id) {
  db.prepare('UPDATE checklist_items SET is_done = CASE WHEN is_done = 0 THEN 1 ELSE 0 END WHERE id = ?').run(id);
  return db.prepare(`SELECT ${CHECKLIST_ITEM_COLS} FROM checklist_items WHERE id = ?`).get(id);
}

function updateChecklistItem(id, p) {
  const fields = [];
  const vals = [];
  if (p.text !== undefined) { fields.push('text = ?'); vals.push(p.text); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE checklist_items SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${CHECKLIST_ITEM_COLS} FROM checklist_items WHERE id = ?`).get(id);
}

function deleteChecklistItem(id) {
  db.prepare('DELETE FROM checklist_items WHERE id = ?').run(id);
  return { ok: true };
}

/* ═══════════════════════ FDHub — Repos ═══════════════════════ */

const REPO_COLS = `id, name, description, app_type AS appType, project_id AS projectId, created_at AS createdAt`;

function createFdhubRepo(p) {
  const info = db.prepare(
    'INSERT INTO fdhub_repos (name, description, app_type, project_id, created_at) VALUES (?,?,?,?,?)'
  ).run(p.name, p.description || '', p.appType || 'PowerApps', p.projectId || null, nowIso());
  return db.prepare(`SELECT ${REPO_COLS} FROM fdhub_repos WHERE id = ?`).get(info.lastInsertRowid);
}

function listFdhubRepos(projectId = null) {
  if (projectId) {
    return db.prepare(`SELECT ${REPO_COLS} FROM fdhub_repos WHERE project_id = ? ORDER BY name`).all(projectId);
  }
  return db.prepare(`SELECT ${REPO_COLS} FROM fdhub_repos ORDER BY name`).all();
}

function updateFdhubRepo(id, p) {
  const fields = [];
  const vals = [];
  if (p.name !== undefined) { fields.push('name = ?'); vals.push(p.name); }
  if (p.description !== undefined) { fields.push('description = ?'); vals.push(p.description); }
  if (p.appType !== undefined) { fields.push('app_type = ?'); vals.push(p.appType); }
  if (p.projectId !== undefined) { fields.push('project_id = ?'); vals.push(p.projectId || null); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE fdhub_repos SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  return db.prepare(`SELECT ${REPO_COLS} FROM fdhub_repos WHERE id = ?`).get(id);
}

function deleteFdhubRepo(id) {
  // Cancella anche i commit e rimuovi i file .msapp salvati
  const commits = db.prepare('SELECT file_path FROM fdhub_commits WHERE repo_id = ?').all(id);
  const fs = require('node:fs');
  for (const c of commits) {
    try { if (c.file_path && fs.existsSync(c.file_path)) fs.unlinkSync(c.file_path); } catch (_) {}
  }
  db.prepare('DELETE FROM fdhub_commits WHERE repo_id = ?').run(id);
  db.prepare('DELETE FROM fdhub_repos WHERE id = ?').run(id);
  return { ok: true };
}

/* ═══════════════════════ FDHub — Commits ═══════════════════════ */

const COMMIT_COLS = `id, repo_id AS repoId, message, tag, file_name AS fileName, file_path AS filePath,
  file_size AS fileSize, summary_json AS summaryJson, health_score AS healthScore,
  screen_count AS screenCount, control_count AS controlCount, formula_count AS formulaCount,
  datasource_count AS datasourceCount, issue_count AS issueCount, created_at AS createdAt`;

function createFdhubCommit(p) {
  const info = db.prepare(
    `INSERT INTO fdhub_commits (repo_id, message, tag, file_name, file_path, file_size,
      summary_json, health_score, screen_count, control_count, formula_count, datasource_count, issue_count, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    p.repoId, p.message, p.tag || '', p.fileName, p.filePath, p.fileSize || 0,
    p.summaryJson || '{}', p.healthScore || 0, p.screenCount || 0,
    p.controlCount || 0, p.formulaCount || 0, p.datasourceCount || 0, p.issueCount || 0,
    nowIso()
  );
  return db.prepare(`SELECT ${COMMIT_COLS} FROM fdhub_commits WHERE id = ?`).get(info.lastInsertRowid);
}

function listFdhubCommits(repoId) {
  return db.prepare(`SELECT ${COMMIT_COLS} FROM fdhub_commits WHERE repo_id = ? ORDER BY id DESC`).all(repoId);
}

function getFdhubCommit(id) {
  return db.prepare(`SELECT ${COMMIT_COLS} FROM fdhub_commits WHERE id = ?`).get(id) || null;
}

function deleteFdhubCommit(id) {
  const c = db.prepare('SELECT file_path FROM fdhub_commits WHERE id = ?').get(id);
  const fs = require('node:fs');
  if (c && c.file_path) { try { if (fs.existsSync(c.file_path)) fs.unlinkSync(c.file_path); } catch (_) {} }
  db.prepare('DELETE FROM fdhub_commits WHERE id = ?').run(id);
  return { ok: true };
}

function getFdhubRepoStats(repoId) {
  const total = db.prepare('SELECT COUNT(*) AS cnt FROM fdhub_commits WHERE repo_id = ?').get(repoId);
  const latest = db.prepare(`SELECT ${COMMIT_COLS} FROM fdhub_commits WHERE repo_id = ? ORDER BY id DESC LIMIT 1`).get(repoId);
  const first = db.prepare(`SELECT ${COMMIT_COLS} FROM fdhub_commits WHERE repo_id = ? ORDER BY id ASC LIMIT 1`).get(repoId);
  return { totalCommits: total?.cnt || 0, latestCommit: latest || null, firstCommit: first || null };
}

/* ═══════════════════════ Attachments ═══════════════════════ */

const ATTACH_COLS = `id, entity_type AS entityType, entity_id AS entityId, file_name AS fileName,
  file_path AS filePath, file_size AS fileSize, mime_type AS mimeType, created_at AS createdAt`;

function createAttachment(p) {
  const info = db.prepare(
    'INSERT INTO attachments (entity_type, entity_id, file_name, file_path, file_size, mime_type, created_at) VALUES (?,?,?,?,?,?,?)'
  ).run(p.entityType, p.entityId, p.fileName, p.filePath, p.fileSize || 0, p.mimeType || '', nowIso());
  return db.prepare(`SELECT ${ATTACH_COLS} FROM attachments WHERE id = ?`).get(info.lastInsertRowid);
}

function listAttachments(entityType, entityId) {
  return db.prepare(`SELECT ${ATTACH_COLS} FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY id DESC`).all(entityType, entityId);
}

function deleteAttachment(id) {
  const a = db.prepare('SELECT file_path FROM attachments WHERE id = ?').get(id);
  const fs = require('node:fs');
  if (a && a.file_path) { try { if (fs.existsSync(a.file_path)) fs.unlinkSync(a.file_path); } catch (_) {} }
  db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  return { ok: true };
}

/* ═══════════════════════ Batch Tag Loading (N+1 fix) ═══════════════════════ */

function getAllTaskTags(taskIds) {
  if (!taskIds || taskIds.length === 0) return {};
  const placeholders = taskIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT tt.task_id AS taskId, t.id, t.name, t.color
     FROM task_tags tt JOIN tags t ON t.id = tt.tag_id
     WHERE tt.task_id IN (${placeholders}) AND t.deleted_at IS NULL
     ORDER BY t.name`
  ).all(...taskIds);
  const map = {};
  for (const tid of taskIds) map[tid] = [];
  for (const row of rows) {
    if (map[row.taskId]) map[row.taskId].push({ id: row.id, name: row.name, color: row.color });
  }
  return map;
}

/* ═══════════════════════ Recurring Tasks ═══════════════════════ */

function generateRecurringTasks(dateStr) {
  const date = dateStr || localDateString();
  // Trova task ricorrenti che devono essere generati per la data specificata
  // Per ogni task con ricorrenza, verifica se esiste già un figlio per quella data
  const recurring = db.prepare(
    `SELECT ${TASK_COLS} FROM tasks WHERE recurrence IS NOT NULL AND recurrence != '' AND deleted_at IS NULL AND status != 'Done'`
  ).all();

  const created = [];
  for (const task of recurring) {
    const shouldCreate = shouldCreateRecurrence(task, date);
    if (!shouldCreate) continue;

    // Verifica che non esista già un task figlio per questa data
    const exists = db.prepare(
      'SELECT id FROM tasks WHERE recurrence_parent_id = ? AND scheduled_date = ? AND deleted_at IS NULL'
    ).get(task.id, date);
    if (exists) continue;

    const info = db.prepare(
      `INSERT INTO tasks (title, description, planned_minutes, priority, status, scheduled_date, project_id, recurrence_parent_id, created_at)
       VALUES (?, ?, ?, ?, 'Todo', ?, ?, ?, ?)`
    ).run(task.title, task.description || '', task.plannedMinutes, task.priority, date, task.projectId || null, task.id, nowIso());
    const newTask = db.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ?`).get(info.lastInsertRowid);
    created.push(newTask);
  }
  return created;
}

function shouldCreateRecurrence(task, dateStr) {
  const taskDate = new Date(task.scheduledDate + 'T00:00:00');
  const targetDate = new Date(dateStr + 'T00:00:00');
  if (targetDate <= taskDate) return false;

  switch (task.recurrence) {
    case 'daily':
      return true;
    case 'weekly': {
      return taskDate.getDay() === targetDate.getDay();
    }
    case 'monthly': {
      return taskDate.getDate() === targetDate.getDate();
    }
    default:
      return false;
  }
}

/* ═══════════════════════ Trash (Cestino) ═══════════════════════ */

function getTrashItems() {
  const tasks = db.prepare(`SELECT ${TASK_COLS}, 'task' AS entityType, deleted_at AS deletedAt FROM tasks WHERE deleted_at IS NOT NULL`).all();
  const notes = db.prepare(`SELECT ${NOTE_COLS}, 'note' AS entityType, deleted_at AS deletedAt FROM notes WHERE deleted_at IS NOT NULL`).all();
  const changes = db.prepare(`SELECT ${CHANGE_COLS}, 'change' AS entityType, deleted_at AS deletedAt FROM change_entries WHERE deleted_at IS NOT NULL`).all();
  const bugs = db.prepare(`SELECT ${BUG_COLS}, 'bug' AS entityType, deleted_at AS deletedAt FROM bugs WHERE deleted_at IS NOT NULL`).all();
  const snippets = db.prepare(`SELECT ${SNIPPET_COLS}, 'snippet' AS entityType, deleted_at AS deletedAt FROM snippets WHERE deleted_at IS NOT NULL`).all();
  const bookmarks = db.prepare(`SELECT ${BOOKMARK_COLS}, 'bookmark' AS entityType, deleted_at AS deletedAt FROM bookmarks WHERE deleted_at IS NOT NULL`).all();
  const contacts = db.prepare(`SELECT ${CONTACT_COLS}, 'contact' AS entityType, deleted_at AS deletedAt FROM contacts WHERE deleted_at IS NOT NULL`).all();
  const environments = db.prepare(`SELECT ${ENV_COLS}, 'environment' AS entityType, deleted_at AS deletedAt FROM environments WHERE deleted_at IS NOT NULL`).all();
  const goals = db.prepare(`SELECT ${GOAL_COLS}, 'goal' AS entityType, deleted_at AS deletedAt FROM daily_goals WHERE deleted_at IS NOT NULL`).all();
  const projects = db.prepare(`SELECT ${PROJECT_COLS}, 'project' AS entityType, deleted_at AS deletedAt FROM projects WHERE deleted_at IS NOT NULL`).all();
  const retros = db.prepare(`SELECT ${RETRO_COLS}, 'retrospective' AS entityType, deleted_at AS deletedAt FROM retrospectives WHERE deleted_at IS NOT NULL`).all();
  const learning = db.prepare(`SELECT ${LEARNING_COLS}, 'learning' AS entityType, deleted_at AS deletedAt FROM learning WHERE deleted_at IS NOT NULL`).all();
  const checklists = db.prepare(`SELECT ${CHECKLIST_COLS}, 'checklist' AS entityType, deleted_at AS deletedAt FROM checklists WHERE deleted_at IS NOT NULL`).all();

  return [...tasks, ...notes, ...changes, ...bugs, ...snippets, ...bookmarks, ...contacts,
          ...environments, ...goals, ...projects, ...retros, ...learning, ...checklists]
    .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
}

function restoreItem(entityType, id) {
  const tableMap = {
    task: 'tasks', note: 'notes', change: 'change_entries', bug: 'bugs',
    snippet: 'snippets', bookmark: 'bookmarks', contact: 'contacts',
    environment: 'environments', goal: 'daily_goals', project: 'projects',
    retrospective: 'retrospectives', learning: 'learning', checklist: 'checklists',
  };
  const table = tableMap[entityType];
  if (!table) return { ok: false, error: 'Tipo entità non valido' };
  db.prepare(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`).run(id);
  return { ok: true };
}

function permanentDeleteItem(entityType, id) {
  const tableMap = {
    task: 'tasks', note: 'notes', change: 'change_entries', bug: 'bugs',
    snippet: 'snippets', bookmark: 'bookmarks', contact: 'contacts',
    environment: 'environments', goal: 'daily_goals', project: 'projects',
    retrospective: 'retrospectives', learning: 'learning', checklist: 'checklists',
  };
  const table = tableMap[entityType];
  if (!table) return { ok: false, error: 'Tipo entità non valido' };
  if (entityType === 'task') {
    db.prepare('UPDATE change_entries SET task_id = NULL WHERE task_id = ?').run(id);
    db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
    db.prepare('DELETE FROM work_sessions WHERE task_id = ?').run(id);
  }
  if (entityType === 'checklist') {
    db.prepare('DELETE FROM checklist_items WHERE checklist_id = ?').run(id);
  }
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  return { ok: true };
}

function emptyTrash() {
  const tables = ['tasks', 'notes', 'change_entries', 'bugs', 'snippets', 'bookmarks',
                   'contacts', 'environments', 'daily_goals', 'projects', 'retrospectives',
                   'learning', 'checklists'];
  // Before deleting, clean up dependencies
  const deletedTasks = db.prepare('SELECT id FROM tasks WHERE deleted_at IS NOT NULL').all();
  for (const t of deletedTasks) {
    db.prepare('UPDATE change_entries SET task_id = NULL WHERE task_id = ?').run(t.id);
    db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(t.id);
    db.prepare('DELETE FROM work_sessions WHERE task_id = ?').run(t.id);
  }
  const deletedChecklists = db.prepare('SELECT id FROM checklists WHERE deleted_at IS NOT NULL').all();
  for (const cl of deletedChecklists) {
    db.prepare('DELETE FROM checklist_items WHERE checklist_id = ?').run(cl.id);
  }
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`).run();
  }
  return { ok: true };
}

/* ═══════════════════════ Full Export (JSON) ═══════════════════════ */

function exportFullJson() {
  const data = {
    exportDate: nowIso(),
    version: 3,
    tasks: db.prepare(`SELECT * FROM tasks WHERE deleted_at IS NULL`).all(),
    workSessions: db.prepare(`SELECT * FROM work_sessions`).all(),
    changeEntries: db.prepare(`SELECT * FROM change_entries WHERE deleted_at IS NULL`).all(),
    notes: db.prepare(`SELECT * FROM notes WHERE deleted_at IS NULL`).all(),
    dailyGoals: db.prepare(`SELECT * FROM daily_goals WHERE deleted_at IS NULL`).all(),
    projects: db.prepare(`SELECT * FROM projects WHERE deleted_at IS NULL`).all(),
    tags: db.prepare(`SELECT * FROM tags WHERE deleted_at IS NULL`).all(),
    taskTags: db.prepare(`SELECT * FROM task_tags`).all(),
    taskTemplates: db.prepare(`SELECT * FROM task_templates`).all(),
    snippets: db.prepare(`SELECT * FROM snippets WHERE deleted_at IS NULL`).all(),
    bookmarks: db.prepare(`SELECT * FROM bookmarks WHERE deleted_at IS NULL`).all(),
    contacts: db.prepare(`SELECT * FROM contacts WHERE deleted_at IS NULL`).all(),
    environments: db.prepare(`SELECT * FROM environments WHERE deleted_at IS NULL`).all(),
    retrospectives: db.prepare(`SELECT * FROM retrospectives WHERE deleted_at IS NULL`).all(),
    bugs: db.prepare(`SELECT * FROM bugs WHERE deleted_at IS NULL`).all(),
    learning: db.prepare(`SELECT * FROM learning WHERE deleted_at IS NULL`).all(),
    checklists: db.prepare(`SELECT * FROM checklists WHERE deleted_at IS NULL`).all(),
    checklistItems: db.prepare(`SELECT * FROM checklist_items`).all(),
    fdhubRepos: db.prepare(`SELECT * FROM fdhub_repos WHERE deleted_at IS NULL`).all(),
    fdhubCommits: db.prepare(`SELECT * FROM fdhub_commits`).all(),
  };
  return JSON.stringify(data, null, 2);
}

/* ═══════════════════════ Reset All Data ═══════════════════════ */

function resetAllData() {
  db.exec(`
    DELETE FROM attachments;
    DELETE FROM fdhub_commits;
    DELETE FROM fdhub_repos;
    DELETE FROM checklist_items;
    DELETE FROM checklists;
    DELETE FROM learning;
    DELETE FROM bugs;
    DELETE FROM retrospectives;
    DELETE FROM environments;
    DELETE FROM contacts;
    DELETE FROM task_tags;
    DELETE FROM work_sessions;
    DELETE FROM change_entries;
    DELETE FROM notes;
    DELETE FROM daily_goals;
    DELETE FROM task_templates;
    DELETE FROM snippets;
    DELETE FROM bookmarks;
    DELETE FROM tasks;
    DELETE FROM tags;
    DELETE FROM projects;
  `);
  return { ok: true };
}

/* ═══════════════════════ Exports ═══════════════════════ */

const repo = {
  listTasks, createTask, updateTask, deleteTask, setTaskStatus, duplicateTaskToDate,
  restoreTask, permanentDeleteTask,
  getActiveSession, startSession, stopSession, listSessions,
  addChange, listChanges, updateChange, deleteChange,
  createNote, listNotes, togglePinNote, deleteNote, updateNote,
  createGoal, listGoals, toggleGoal, updateGoal, deleteGoal,
  getWeekStats, searchAll, getActiveDays, getDaySummary, exportCsv,
  createProject, listProjects, updateProject, deleteProject, getProjectStats,
  createTag, listTags, updateTag, deleteTag, addTagToTask, removeTagFromTask, getTaskTags,
  getAllTaskTags,
  createTemplate, listTemplates, deleteTemplate, createTaskFromTemplate,
  createSnippet, listSnippets, updateSnippet, toggleSnippetFav, deleteSnippet,
  createBookmark, listBookmarks, updateBookmark, deleteBookmark,
  getBacklog, rescheduleTask,
  getStreak, getTimeBudget,
  resetAllData,
  createContact, listContacts, updateContact, deleteContact,
  createEnvironment, listEnvironments, updateEnvironment, deleteEnvironment,
  createRetrospective, listRetrospectives, updateRetrospective, deleteRetrospective,
  createBug, listBugs, updateBug, deleteBug,
  createLearning, listLearning, updateLearning, deleteLearning,
  createChecklist, listChecklists, updateChecklist, deleteChecklist, getChecklistItems, addChecklistItem, toggleChecklistItem, updateChecklistItem, deleteChecklistItem,
  createFdhubRepo, listFdhubRepos, updateFdhubRepo, deleteFdhubRepo,
  createFdhubCommit, listFdhubCommits, getFdhubCommit, deleteFdhubCommit, getFdhubRepoStats,
  createAttachment, listAttachments, deleteAttachment,
  generateRecurringTasks,
  getTrashItems, restoreItem, permanentDeleteItem, emptyTrash,
  exportFullJson,
};

function closeDb() {
  if (db) { try { db.close(); } catch {} db = null; }
}

function getDbPath() {
  return currentDbPath;
}

module.exports = { initDb, closeDb, getDbPath, repo };
