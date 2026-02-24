const { app, BrowserWindow, ipcMain, Notification, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { initDb, closeDb, getDbPath, repo } = require('./db.cjs');
const { parseMsapp, diffApps } = require('./msapp-parser.cjs');
const msal = require('@azure/msal-node');
const crypto = require('node:crypto');

const isDev = !app.isPackaged;

/* ═══ In-memory cache of parsed apps for diff ═══ */
const parsedAppsCache = new Map(); // id -> parsed result

/* ═══ SharePoint — MSAL Auth + Graph API ═══ */
let msalApp = null;
let spTokenCache = null; // { accessToken, expiresOn, account }
let spConfig = null; // { clientId, tenantId, siteUrl }

function getSpConfigPath() { return path.join(app.getPath('userData'), 'sp-config.json'); }
function loadSpConfig() {
  try { spConfig = JSON.parse(fs.readFileSync(getSpConfigPath(), 'utf-8')); return spConfig; } catch { spConfig = null; return null; }
}
function saveSpConfig(cfg) {
  spConfig = cfg;
  fs.writeFileSync(getSpConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
}

function initMsal(clientId, tenantId) {
  msalApp = new msal.PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    cache: { cachePlugin: undefined },
  });
  return msalApp;
}

async function spAcquireTokenInteractive(scopes) {
  if (!msalApp) throw new Error('MSAL non inizializzato. Configura Client ID e Tenant ID.');

  // Try silent first if we have a cached account
  if (spTokenCache && spTokenCache.account) {
    try {
      const silentResult = await msalApp.acquireTokenSilent({
        scopes,
        account: spTokenCache.account,
      });
      spTokenCache = { accessToken: silentResult.accessToken, expiresOn: silentResult.expiresOn, account: silentResult.account };
      return silentResult.accessToken;
    } catch { /* silent failed, go interactive */ }
  }

  // Interactive: open a BrowserWindow for login
  const authCodeUrlParams = {
    scopes,
    redirectUri: 'http://localhost:59823/redirect',
  };
  // Generate PKCE
  const verifier = msal.CryptoProvider ? undefined : undefined;
  const cryptoProvider = new msal.CryptoProvider();
  const { verifier: codeVerifier, challenge: codeChallenge } = await cryptoProvider.generatePkceCodes();
  authCodeUrlParams.codeChallenge = codeChallenge;
  authCodeUrlParams.codeChallengeMethod = 'S256';

  const authUrl = await msalApp.getAuthCodeUrl(authCodeUrlParams);

  return new Promise((resolve, reject) => {
    // Start a tiny HTTP server to capture the redirect
    const http = require('node:http');
    const server = http.createServer();
    let settled = false;

    server.listen(59823, '127.0.0.1', () => {
      const loginWin = new BrowserWindow({
        width: 500, height: 700,
        autoHideMenuBar: true,
        title: 'Microsoft Login — SharePoint',
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      loginWin.loadURL(authUrl);

      loginWin.on('closed', () => {
        if (!settled) {
          settled = true;
          try { server.close(); } catch {}
          reject(new Error('Login annullato dall\'utente.'));
        }
      });

      server.on('request', async (req, res) => {
        if (settled) { res.end(); return; }
        const url = new URL(req.url, 'http://localhost:59823');
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          settled = true;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h2>Errore di autenticazione</h2><p>Puoi chiudere questa finestra.</p></body></html>');
          loginWin.close();
          server.close();
          reject(new Error(url.searchParams.get('error_description') || error));
          return;
        }

        if (code) {
          settled = true;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h2>Autenticazione riuscita!</h2><p>Puoi chiudere questa finestra.</p><script>setTimeout(()=>window.close(),1500)</script></body></html>');
          loginWin.close();
          server.close();

          try {
            const tokenResult = await msalApp.acquireTokenByCode({
              code,
              scopes,
              redirectUri: 'http://localhost:59823/redirect',
              codeVerifier,
            });
            spTokenCache = { accessToken: tokenResult.accessToken, expiresOn: tokenResult.expiresOn, account: tokenResult.account };
            resolve(tokenResult.accessToken);
          } catch (err) {
            reject(err);
          }
        }
      });
    });
  });
}

const SP_SCOPES = ['https://graph.microsoft.com/Sites.ReadWrite.All', 'https://graph.microsoft.com/Files.ReadWrite.All', 'User.Read'];

async function spFetch(endpoint, options = {}) {
  const token = await spAcquireTokenInteractive(SP_SCOPES);
  const url = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com/v1.0${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return { ok: true };
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Graph API ${res.status}: ${errBody}`);
  }
  return res.json();
}

/** Extract siteId from a SharePoint site URL like https://contoso.sharepoint.com/sites/MySite */
async function spResolveSiteId(siteUrl) {
  const u = new URL(siteUrl);
  const hostname = u.hostname; // contoso.sharepoint.com
  const sitePath = u.pathname.replace(/\/$/, ''); // /sites/MySite
  const data = await spFetch(`/sites/${hostname}:${sitePath}`);
  return data.id;
}

/* ═══ OneDrive detection ═══ */
function detectOneDriveFolders() {
  const folders = [];
  const home = app.getPath('home');
  // Percorsi standard di OneDrive su Windows
  const candidates = [
    path.join(home, 'OneDrive'),
    path.join(home, 'OneDrive - Personal'),
  ];
  // Percorsi da variabili ambiente (evita chiamate shell/registro che possono
  // essere segnalate dagli endpoint security tools).
  const envCandidates = [
    process.env.OneDrive,
    process.env.OneDriveCommercial,
    process.env.OneDriveConsumer,
  ].filter(Boolean);
  for (const p of envCandidates) {
    if (!candidates.includes(p)) candidates.push(p);
  }
  // Cerca anche cartelle OneDrive aziendali (OneDrive - <NomeAzienda>)
  try {
    const entries = fs.readdirSync(home, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name.startsWith('OneDrive')) {
        candidates.push(path.join(home, e.name));
      }
    }
  } catch (_) {}
  // Filtra solo quelli che esistono davvero
  for (const c of [...new Set(candidates)]) {
    try { if (fs.existsSync(c) && fs.statSync(c).isDirectory()) folders.push(c); } catch (_) {}
  }
  return folders;
}

/* ═══ Config persistente (salva cartella DB scelta dall'utente) ═══ */
function configPath() { return path.join(app.getPath('userData'), 'flowdesk-config.json'); }
function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf-8')); } catch { return {}; }
}
function writeConfig(cfg) { fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf-8'); }

function isFirstRun() {
  try { fs.accessSync(configPath(), fs.constants.F_OK); return false; } catch { return true; }
}

/**
 * Se il config è stato perso (es. disinstallazione/aggiornamento) ma il DB
 * esiste ancora da qualche parte, prova a recuperarlo automaticamente.
 * Cerca prima in userData, poi nelle cartelle comuni (Desktop, Documenti, ecc.).
 * Se non trova nulla, chiede all'utente di indicare la cartella.
 */
async function recoverExistingDb() {
  // 1. Cerca nella cartella userData (default)
  const defaultFolder = app.getPath('userData');
  const defaultDbPath = path.join(defaultFolder, 'flowdesk.db');
  if (fs.existsSync(defaultDbPath)) {
    console.log('[FlowDesk] Config mancante ma database trovato in userData — recupero automatico');
    writeConfig({ dbFolder: defaultFolder });
    return defaultFolder;
  }

  // 2. Cerca in cartelle comuni dove l'utente potrebbe aver salvato il DB
  const commonPaths = [
    app.getPath('desktop'),
    app.getPath('documents'),
    app.getPath('home'),
    path.join(app.getPath('documents'), 'FlowDesk'),
    path.join(app.getPath('desktop'), 'FlowDesk'),
  ];
  // Aggiungi anche le root di tutti i drive su Windows
  if (process.platform === 'win32') {
    for (const letter of 'DEFGHIJKLMNOPQRSTUVWXYZ') {
      commonPaths.push(`${letter}:\\`);
      commonPaths.push(`${letter}:\\FlowDesk`);
    }
  }
  for (const folder of commonPaths) {
    try {
      const candidate = path.join(folder, 'flowdesk.db');
      if (fs.existsSync(candidate)) {
        console.log(`[FlowDesk] Database trovato in: ${folder}`);
        const { response } = await dialog.showMessageBox({
          type: 'info',
          title: 'FlowDesk — Database trovato',
          message: 'Database esistente trovato!',
          detail: `È stato trovato un database FlowDesk in:\n${folder}\n\nVuoi usare questo database o sceglierne un altro?`,
          buttons: ['Usa questo', 'Scegli altra cartella...'],
          defaultId: 0,
          cancelId: 1,
          noLink: true,
        });
        if (response === 0) {
          writeConfig({ dbFolder: folder });
          return folder;
        }
        break; // L'utente vuole scegliere manualmente
      }
    } catch (_) { /* cartella non accessibile, ignora */ }
  }

  // 3. Chiedi all'utente se ha un DB esistente da recuperare
  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: 'FlowDesk — Configurazione',
    message: 'Hai già un database FlowDesk?',
    detail: 'Se hai usato FlowDesk in precedenza e hai salvato il database in una cartella personalizzata, puoi indicarla ora per recuperare i tuoi dati.\n\nAltrimenti scegli "Nuova installazione" per ricominciare.',
    buttons: ['Cerca il mio database...', 'Nuova installazione'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (response === 0) {
    const result = await dialog.showOpenDialog({
      title: 'Seleziona la cartella che contiene flowdesk.db',
      properties: ['openDirectory'],
      buttonLabel: 'Seleziona',
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const chosenFolder = result.filePaths[0];
      const chosenDb = path.join(chosenFolder, 'flowdesk.db');
      if (fs.existsSync(chosenDb)) {
        console.log(`[FlowDesk] Database recuperato dall'utente: ${chosenFolder}`);
        writeConfig({ dbFolder: chosenFolder });
        return chosenFolder;
      } else {
        await dialog.showMessageBox({
          type: 'warning',
          title: 'Database non trovato',
          message: 'Nessun file flowdesk.db trovato nella cartella selezionata.',
          detail: 'Verrà avviata una nuova installazione. Potrai comunque importare un database in seguito dal menu Database > Importa.',
        });
      }
    }
  }

  return null; // Nessun DB recuperato — procedi con prima configurazione
}

function resolveDbFolder() {
  const cfg = readConfig();
  return cfg.dbFolder || app.getPath('userData');
}

async function askDbFolderOnFirstRun() {
  const oneDriveFolders = detectOneDriveFolders();
  const hasOneDrive = oneDriveFolders.length > 0;

  const buttons = ['Scegli cartella...'];
  if (hasOneDrive) buttons.push('Salva su OneDrive');
  buttons.push('Usa predefinita');

  let detail = 'Scegli dove salvare il database dell\'applicazione.\n\n• "Scegli cartella" per selezionare una posizione personalizzata (es. chiavetta USB, cartella condivisa).\n• "Usa predefinita" per salvare nella cartella dati dell\'app.';
  if (hasOneDrive) {
    detail += '\n• "Salva su OneDrive" per sincronizzare i dati con il cloud — i tuoi dati saranno salvati in OneDrive/FlowDesk.';
  }

  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: 'FlowDesk — Prima configurazione',
    message: 'Benvenuto in FlowDesk!',
    detail,
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true,
  });

  let folder = app.getPath('userData');

  if (response === 0) {
    // Scegli cartella
    const result = await dialog.showOpenDialog({
      title: 'Seleziona la cartella per il database FlowDesk',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Seleziona',
    });
    if (!result.canceled && result.filePaths.length > 0) {
      folder = result.filePaths[0];
    }
  } else if (hasOneDrive && response === 1) {
    // Salva su OneDrive
    let oneDriveBase = oneDriveFolders[0];
    // Se ci sono più cartelle OneDrive, fai scegliere
    if (oneDriveFolders.length > 1) {
      const { response: odIdx } = await dialog.showMessageBox({
        type: 'question',
        title: 'FlowDesk — Scegli cartella OneDrive',
        message: 'Quale cartella OneDrive vuoi usare?',
        buttons: oneDriveFolders.map(f => path.basename(f)),
        defaultId: 0,
        noLink: true,
      });
      oneDriveBase = oneDriveFolders[odIdx] || oneDriveFolders[0];
    }
    folder = path.join(oneDriveBase, 'FlowDesk');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    console.log(`[FlowDesk] Database salvato su OneDrive: ${folder}`);
  }
  // else: Usa predefinita (folder già impostato)

  writeConfig({ ...readConfig(), dbFolder: folder });
  return folder;
}

function getWin() {
  return BrowserWindow.getAllWindows()[0] || null;
}

function sendNav(viewName) {
  const win = getWin();
  if (win) win.webContents.send('navigate', viewName);
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+1', click: () => sendNav('dashboard') },
        { label: 'Obiettivi', accelerator: 'CmdOrCtrl+2', click: () => sendNav('goals') },
        { label: 'Progetti', accelerator: 'CmdOrCtrl+3', click: () => sendNav('projects') },
        { label: 'Ambienti', accelerator: 'CmdOrCtrl+4', click: () => sendNav('environments') },
        { label: 'Contatti', accelerator: 'CmdOrCtrl+5', click: () => sendNav('contacts') },
        { type: 'separator' },
        { label: 'Esci', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Database',
      submenu: [
        { label: 'Cambia cartella database...', click: () => changeDbFolder() },
        { label: 'Migra su OneDrive...', click: () => migrateToOneDrive() },
        { label: 'Esporta database...', click: () => exportDb() },
        { label: 'Importa database...', click: () => importDb() },
        { type: 'separator' },
        { label: 'Apri cartella database', click: () => { shell.openPath(path.dirname(getDbPath())); } },
      ],
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo', label: 'Annulla' },
        { role: 'redo', label: 'Ripristina' },
        { type: 'separator' },
        { role: 'cut', label: 'Taglia' },
        { role: 'copy', label: 'Copia' },
        { role: 'paste', label: 'Incolla' },
        { role: 'selectAll', label: 'Seleziona tutto' },
      ],
    },
    {
      label: 'Navigazione',
      submenu: [
        { label: 'Attività', accelerator: 'CmdOrCtrl+6', click: () => sendNav('tasks') },
        { label: 'Backlog', click: () => sendNav('backlog') },
        { label: 'Timer', accelerator: 'CmdOrCtrl+T', click: () => sendNav('timer') },
        { label: 'Registro Modifiche', accelerator: 'CmdOrCtrl+R', click: () => sendNav('changes') },
        { label: 'Bug Tracker', click: () => sendNav('bugs') },
        { label: 'Checklist', click: () => sendNav('checklists') },
        { type: 'separator' },
        { label: 'Appunti', accelerator: 'CmdOrCtrl+N', click: () => sendNav('notes') },
        { label: 'Snippets', accelerator: 'CmdOrCtrl+S', click: () => sendNav('snippets') },
        { label: 'Link utili', accelerator: 'CmdOrCtrl+L', click: () => sendNav('bookmarks') },
        { label: 'Formazione', click: () => sendNav('learning') },
        { type: 'separator' },
        { label: 'Power Apps Analyzer', accelerator: 'CmdOrCtrl+P', click: () => sendNav('analyzer') },
        { label: 'FDHub', accelerator: 'CmdOrCtrl+H', click: () => sendNav('fdhub') },
        { label: 'AI Hub', accelerator: 'CmdOrCtrl+I', click: () => sendNav('aihub') },
        { type: 'separator' },
        { label: 'Retrospettive', click: () => sendNav('retros') },
        { label: 'Storico', click: () => sendNav('history') },
        { label: 'Report', click: () => sendNav('report') },
        { type: 'separator' },
        { label: 'Ricerca', accelerator: 'CmdOrCtrl+F', click: () => sendNav('search') },
        { label: 'Guida', accelerator: 'F1', click: () => sendNav('guide') },
      ],
    },
    {
      label: 'Visualizza',
      submenu: [
        { label: 'Tema chiaro/scuro', accelerator: 'CmdOrCtrl+D', click: () => { const win = getWin(); if (win) win.webContents.send('toggle-dark'); } },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom predefinito' },
        { role: 'zoomIn', label: 'Ingrandisci' },
        { role: 'zoomOut', label: 'Riduci' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Schermo intero' },
      ],
    },
    {
      label: 'Finestra',
      submenu: [
        { role: 'minimize', label: 'Minimizza' },
        { role: 'close', label: 'Chiudi' },
        { type: 'separator' },
        { role: 'reload', label: 'Ricarica' },
        ...(isDev ? [{ role: 'toggleDevTools', label: 'DevTools' }] : []),
      ],
    },
    {
      label: 'Aiuto',
      submenu: [
        { label: 'Guida all\'uso', accelerator: 'F1', click: () => sendNav('guide') },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+K', click: () => { const win = getWin(); if (win) win.webContents.send('open-cmd-palette'); } },
        { type: 'separator' },
        { label: 'Informazioni su FlowDesk', click: () => { const { dialog } = require('electron'); dialog.showMessageBox({ type: 'info', title: 'FlowDesk', message: `FlowDesk v${app.getVersion()} — Power Platform Tracker`, detail: 'Applicazione di produttività per tracciare attività, tempo e modifiche su progetti Power Platform.' }); } },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  const win = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1080,
    minHeight: 760,
    icon: iconPath,
    backgroundColor: '#f1f5f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function registerIpcHandlers() {
  /* Tasks */
  ipcMain.handle('tasks:list', (_, date) => repo.listTasks(date));
  ipcMain.handle('tasks:create', (_, p) => repo.createTask(p));
  ipcMain.handle('tasks:update', (_, id, p) => repo.updateTask(id, p));
  ipcMain.handle('tasks:delete', (_, id) => repo.deleteTask(id));
  ipcMain.handle('tasks:setStatus', (_, id, s) => repo.setTaskStatus(id, s));
  ipcMain.handle('tasks:duplicate', (_, id, date) => repo.duplicateTaskToDate(id, date));

  /* Sessions */
  ipcMain.handle('sessions:start', (_, taskId) => repo.startSession(taskId));
  ipcMain.handle('sessions:stop', (_, note) => repo.stopSession(note));
  ipcMain.handle('sessions:active', () => repo.getActiveSession());
  ipcMain.handle('sessions:list', (_, day) => repo.listSessions(day));

  /* Changes */
  ipcMain.handle('changes:add', (_, p) => repo.addChange(p));
  ipcMain.handle('changes:list', (_, day) => repo.listChanges(day));
  ipcMain.handle('changes:update', (_, id, p) => repo.updateChange(id, p));
  ipcMain.handle('changes:delete', (_, id) => repo.deleteChange(id));

  /* Notes */
  ipcMain.handle('notes:create', (_, p) => repo.createNote(p));
  ipcMain.handle('notes:list', (_, day) => repo.listNotes(day));
  ipcMain.handle('notes:togglePin', (_, id) => repo.togglePinNote(id));
  ipcMain.handle('notes:delete', (_, id) => repo.deleteNote(id));

  /* Goals */
  ipcMain.handle('goals:create', (_, p) => repo.createGoal(p));
  ipcMain.handle('goals:list', (_, day) => repo.listGoals(day));
  ipcMain.handle('goals:toggle', (_, id) => repo.toggleGoal(id));
  ipcMain.handle('goals:update', (_, id, p) => repo.updateGoal(id, p));
  ipcMain.handle('goals:delete', (_, id) => repo.deleteGoal(id));

  /* Stats / Search / History / Export */
  ipcMain.handle('stats:week', (_, start, end) => repo.getWeekStats(start, end));
  ipcMain.handle('search:all', (_, query) => repo.searchAll(query));
  ipcMain.handle('history:activeDays', (_, start, end) => repo.getActiveDays(start, end));
  ipcMain.handle('history:daySummary', (_, day) => repo.getDaySummary(day));
  ipcMain.handle('export:csv', (_, start, end) => repo.exportCsv(start, end));

  /* Projects */
  ipcMain.handle('projects:create', (_, p) => repo.createProject(p));
  ipcMain.handle('projects:list', (_, inclArchived) => repo.listProjects(inclArchived));
  ipcMain.handle('projects:update', (_, id, p) => repo.updateProject(id, p));
  ipcMain.handle('projects:delete', (_, id) => repo.deleteProject(id));
  ipcMain.handle('projects:stats', (_, id) => repo.getProjectStats(id));

  /* Tags */
  ipcMain.handle('tags:create', (_, p) => repo.createTag(p));
  ipcMain.handle('tags:list', () => repo.listTags());
  ipcMain.handle('tags:update', (_, id, p) => repo.updateTag(id, p));
  ipcMain.handle('tags:delete', (_, id) => repo.deleteTag(id));
  ipcMain.handle('tags:addToTask', (_, taskId, tagId) => repo.addTagToTask(taskId, tagId));
  ipcMain.handle('tags:removeFromTask', (_, taskId, tagId) => repo.removeTagFromTask(taskId, tagId));
  ipcMain.handle('tags:getForTask', (_, taskId) => repo.getTaskTags(taskId));

  /* Templates */
  ipcMain.handle('templates:create', (_, p) => repo.createTemplate(p));
  ipcMain.handle('templates:list', () => repo.listTemplates());
  ipcMain.handle('templates:delete', (_, id) => repo.deleteTemplate(id));
  ipcMain.handle('templates:createTask', (_, tplId, date) => repo.createTaskFromTemplate(tplId, date));

  /* Notes update */
  ipcMain.handle('notes:update', (_, id, p) => repo.updateNote(id, p));

  /* Snippets */
  ipcMain.handle('snippets:create', (_, p) => repo.createSnippet(p));
  ipcMain.handle('snippets:list', (_, lang) => repo.listSnippets(lang));
  ipcMain.handle('snippets:update', (_, id, p) => repo.updateSnippet(id, p));
  ipcMain.handle('snippets:toggleFav', (_, id) => repo.toggleSnippetFav(id));
  ipcMain.handle('snippets:delete', (_, id) => repo.deleteSnippet(id));

  /* Bookmarks */
  ipcMain.handle('bookmarks:create', (_, p) => repo.createBookmark(p));
  ipcMain.handle('bookmarks:list', (_, cat) => repo.listBookmarks(cat));
  ipcMain.handle('bookmarks:update', (_, id, p) => repo.updateBookmark(id, p));
  ipcMain.handle('bookmarks:delete', (_, id) => repo.deleteBookmark(id));

  /* Backlog */
  ipcMain.handle('backlog:list', () => repo.getBacklog());
  ipcMain.handle('backlog:reschedule', (_, id, date) => repo.rescheduleTask(id, date));

  /* Streak & Time Budget */
  ipcMain.handle('streak:get', () => repo.getStreak());
  ipcMain.handle('timeBudget:get', (_, date) => repo.getTimeBudget(date));

  /* Reset */
  ipcMain.handle('data:resetAll', () => repo.resetAllData());

  /* Batch Tag Loading */
  ipcMain.handle('tags:getAllForTasks', (_, taskIds) => repo.getAllTaskTags(taskIds));

  /* Recurring Tasks */
  ipcMain.handle('tasks:generateRecurring', (_, date) => repo.generateRecurringTasks(date));

  /* Trash */
  ipcMain.handle('trash:list', () => repo.getTrashItems());
  ipcMain.handle('trash:restore', (_, entityType, id) => repo.restoreItem(entityType, id));
  ipcMain.handle('trash:permanentDelete', (_, entityType, id) => repo.permanentDeleteItem(entityType, id));
  ipcMain.handle('trash:empty', () => repo.emptyTrash());

  /* Full JSON Export */
  ipcMain.handle('export:fullJson', async () => {
    const win = getWin();
    const result = await dialog.showSaveDialog(win, {
      title: 'Esporta tutti i dati (JSON)',
      defaultPath: path.join(app.getPath('desktop'), `flowdesk-export-${new Date().toISOString().slice(0,10)}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };
    try {
      const json = repo.exportFullJson();
      fs.writeFileSync(result.filePath, json, 'utf-8');
      return { ok: true, path: result.filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  /* Contacts */
  ipcMain.handle('contacts:create', (_, p) => repo.createContact(p));
  ipcMain.handle('contacts:list', (_, projectId) => repo.listContacts(projectId));
  ipcMain.handle('contacts:update', (_, id, p) => repo.updateContact(id, p));
  ipcMain.handle('contacts:delete', (_, id) => repo.deleteContact(id));

  /* Environments */
  ipcMain.handle('envs:create', (_, p) => repo.createEnvironment(p));
  ipcMain.handle('envs:list', (_, projectId) => repo.listEnvironments(projectId));
  ipcMain.handle('envs:update', (_, id, p) => repo.updateEnvironment(id, p));
  ipcMain.handle('envs:delete', (_, id) => repo.deleteEnvironment(id));

  /* Retrospectives */
  ipcMain.handle('retros:create', (_, p) => repo.createRetrospective(p));
  ipcMain.handle('retros:list', () => repo.listRetrospectives());
  ipcMain.handle('retros:update', (_, id, p) => repo.updateRetrospective(id, p));
  ipcMain.handle('retros:delete', (_, id) => repo.deleteRetrospective(id));

  /* Bugs */
  ipcMain.handle('bugs:create', (_, p) => repo.createBug(p));
  ipcMain.handle('bugs:list', (_, projectId, status) => repo.listBugs(projectId, status));
  ipcMain.handle('bugs:update', (_, id, p) => repo.updateBug(id, p));
  ipcMain.handle('bugs:delete', (_, id) => repo.deleteBug(id));

  /* Learning */
  ipcMain.handle('learning:create', (_, p) => repo.createLearning(p));
  ipcMain.handle('learning:list', (_, cat) => repo.listLearning(cat));
  ipcMain.handle('learning:update', (_, id, p) => repo.updateLearning(id, p));
  ipcMain.handle('learning:delete', (_, id) => repo.deleteLearning(id));

  /* Checklists */
  ipcMain.handle('checklists:create', (_, p) => repo.createChecklist(p));
  ipcMain.handle('checklists:list', (_, projectId) => repo.listChecklists(projectId));
  ipcMain.handle('checklists:update', (_, id, p) => repo.updateChecklist(id, p));
  ipcMain.handle('checklists:delete', (_, id) => repo.deleteChecklist(id));
  ipcMain.handle('checklists:items', (_, checklistId) => repo.getChecklistItems(checklistId));
  ipcMain.handle('checklists:addItem', (_, p) => repo.addChecklistItem(p));
  ipcMain.handle('checklists:toggleItem', (_, id) => repo.toggleChecklistItem(id));
  ipcMain.handle('checklists:updateItem', (_, id, p) => repo.updateChecklistItem(id, p));
  ipcMain.handle('checklists:deleteItem', (_, id) => repo.deleteChecklistItem(id));

  /* ═══ FDHub — Repos ═══ */
  ipcMain.handle('fdhub:createRepo', (_, p) => repo.createFdhubRepo(p));
  ipcMain.handle('fdhub:listRepos', (_, projectId) => repo.listFdhubRepos(projectId));
  ipcMain.handle('fdhub:updateRepo', (_, id, p) => repo.updateFdhubRepo(id, p));
  ipcMain.handle('fdhub:deleteRepo', (_, id) => repo.deleteFdhubRepo(id));
  ipcMain.handle('fdhub:repoStats', (_, id) => repo.getFdhubRepoStats(id));

  /* ═══ FDHub — Commits ═══ */
  ipcMain.handle('fdhub:listCommits', (_, repoId) => repo.listFdhubCommits(repoId));
  ipcMain.handle('fdhub:getCommit', (_, id) => repo.getFdhubCommit(id));
  ipcMain.handle('fdhub:deleteCommit', (_, id) => repo.deleteFdhubCommit(id));

  // Commit con upload file .msapp — apre il file dialog, copia il file nella cartella fdhub, analizza e salva
  ipcMain.handle('fdhub:commit', async (_, repoId, message, tag) => {
    const win = getWin();
    const result = await dialog.showOpenDialog(win, {
      title: 'Seleziona il file .msapp da committare',
      filters: [{ name: 'Power Apps Package', extensions: ['msapp'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;

    const srcPath = result.filePaths[0];
    const fileName = path.basename(srcPath);
    const fileStats = fs.statSync(srcPath);

    // Crea cartella fdhub/<repoId>/ nella cartella del DB
    const dbFolder = path.dirname(getDbPath());
    const repoDir = path.join(dbFolder, 'fdhub', String(repoId));
    if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });

    // Nome file con timestamp per unicità
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const destName = `${ts}_${fileName}`;
    const destPath = path.join(repoDir, destName);
    fs.copyFileSync(srcPath, destPath);

    // Analizza il file con il parser
    let summaryJson = '{}';
    let healthScore = 0, screenCount = 0, controlCount = 0, formulaCount = 0, datasourceCount = 0, issueCount = 0;
    try {
      const buffer = fs.readFileSync(destPath);
      const parsed = await parseMsapp(buffer);
      if (parsed && parsed.summary) {
        const s = parsed.summary;
        screenCount = s.screenCount || 0;
        controlCount = s.totalControls || 0;
        formulaCount = s.totalFormulas || 0;
        datasourceCount = s.dataSourceCount || 0;
        issueCount = s.issueCount || 0;
        summaryJson = JSON.stringify(s);
      }
      if (parsed && parsed.healthScore) {
        healthScore = parsed.healthScore.overall || 0;
      }
    } catch (parseErr) {
      console.warn('[FDHub] Parsing .msapp fallito:', parseErr.message);
    }

    return repo.createFdhubCommit({
      repoId, message, tag,
      fileName, filePath: destPath, fileSize: fileStats.size,
      summaryJson, healthScore, screenCount, controlCount, formulaCount, datasourceCount, issueCount,
    });
  });

  // Esporta (scarica) il file .msapp di un commit
  ipcMain.handle('fdhub:exportCommit', async (_, commitId) => {
    const commit = repo.getFdhubCommit(commitId);
    if (!commit) return { ok: false, error: 'Commit non trovato.' };
    if (!fs.existsSync(commit.filePath)) return { ok: false, error: 'File .msapp non trovato su disco.' };
    const win = getWin();
    const result = await dialog.showSaveDialog(win, {
      title: 'Salva .msapp',
      defaultPath: commit.fileName,
      filters: [{ name: 'Power Apps Package', extensions: ['msapp'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };
    fs.copyFileSync(commit.filePath, result.filePath);
    return { ok: true, path: result.filePath };
  });

  // Diff tra due commit
  ipcMain.handle('fdhub:diffCommits', async (_, commitIdA, commitIdB) => {
    const cA = repo.getFdhubCommit(commitIdA);
    const cB = repo.getFdhubCommit(commitIdB);
    if (!cA || !cB) return { error: 'Commit non trovati.' };
    if (!fs.existsSync(cA.filePath) || !fs.existsSync(cB.filePath)) return { error: 'File .msapp non trovati su disco.' };
    try {
      const bufA = fs.readFileSync(cA.filePath);
      const bufB = fs.readFileSync(cB.filePath);
      const parsedA = await parseMsapp(bufA);
      const parsedB = await parseMsapp(bufB);
      return diffApps(parsedA, parsedB);
    } catch (err) {
      return { error: `Errore diff: ${err.message}` };
    }
  });

  /* ═══ Attachments ═══ */
  ipcMain.handle('attachments:list', (_, entityType, entityId) => repo.listAttachments(entityType, entityId));
  ipcMain.handle('attachments:delete', (_, id) => repo.deleteAttachment(id));

  ipcMain.handle('attachments:add', async (_, entityType, entityId) => {
    const win = getWin();
    const result = await dialog.showOpenDialog(win, {
      title: 'Seleziona file da allegare',
      properties: ['openFile', 'multiSelections'],
    });
    if (result.canceled || !result.filePaths.length) return [];

    const dbFolder = path.dirname(getDbPath());
    const attachDir = path.join(dbFolder, 'attachments', entityType, String(entityId));
    if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });

    const created = [];
    for (const srcPath of result.filePaths) {
      const fileName = path.basename(srcPath);
      const fileStats = fs.statSync(srcPath);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const destName = `${ts}_${fileName}`;
      const destPath = path.join(attachDir, destName);
      fs.copyFileSync(srcPath, destPath);

      const ext = path.extname(fileName).toLowerCase();
      const mimeMap = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.txt': 'text/plain', '.csv': 'text/csv', '.zip': 'application/zip', '.msapp': 'application/x-msapp' };
      const mimeType = mimeMap[ext] || 'application/octet-stream';

      const att = repo.createAttachment({ entityType, entityId, fileName, filePath: destPath, fileSize: fileStats.size, mimeType });
      created.push(att);
    }
    return created;
  });

  ipcMain.handle('attachments:open', (_, filePath) => {
    // Security: validate that the path is within the DB folder or attachments directory
    const dbFolder = path.dirname(getDbPath());
    const resolved = path.resolve(filePath);
    const isInDbFolder = resolved.startsWith(path.resolve(dbFolder));
    const isInAppData = resolved.startsWith(path.resolve(app.getPath('userData')));
    if (!isInDbFolder && !isInAppData) {
      return { ok: false, error: 'Accesso negato: percorso file non valido' };
    }
    if (fs.existsSync(filePath)) {
      shell.openPath(filePath);
      return { ok: true };
    }
    return { ok: false, error: 'File non trovato' };
  });

  /* Notifications */
  ipcMain.handle('notify', (_, title, body) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
    return { ok: true };
  });

  /* Database path info */
  ipcMain.handle('db:getPath', () => getDbPath());
  ipcMain.handle('db:getFolder', () => path.dirname(getDbPath()));

  /* App info */
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('db:changeFolder', async () => changeDbFolder());
  ipcMain.handle('db:migrateOneDrive', async () => migrateToOneDrive());
  ipcMain.handle('db:export', async () => exportDb());
  ipcMain.handle('db:import', async () => importDb());

  /* ═══ Power Apps Analyzer ═══ */
  ipcMain.handle('msapp:openFile', async () => {
    const win = getWin();
    const result = await dialog.showOpenDialog(win, {
      title: 'Seleziona file Power App (.msapp)',
      filters: [{ name: 'Power Apps Package', extensions: ['msapp'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    const parsed = await parseMsapp(buffer);
    parsed.filePath = filePath;
    parsed.fileName = path.basename(filePath);
    // Cache for later diff
    const cacheId = Date.now().toString();
    parsed._cacheId = cacheId;
    parsedAppsCache.set(cacheId, parsed);
    return parsed;
  });

  ipcMain.handle('msapp:parseBuffer', async (_, bufferArray) => {
    const buffer = Buffer.from(bufferArray);
    const parsed = await parseMsapp(buffer);
    const cacheId = Date.now().toString();
    parsed._cacheId = cacheId;
    parsedAppsCache.set(cacheId, parsed);
    return parsed;
  });

  ipcMain.handle('msapp:diff', async (_, cacheIdA, cacheIdB) => {
    const appA = parsedAppsCache.get(cacheIdA);
    const appB = parsedAppsCache.get(cacheIdB);
    if (!appA || !appB) return { error: 'App non trovate in cache. Reimportale.' };
    return diffApps(appA, appB);
  });

  ipcMain.handle('msapp:openSecondFile', async () => {
    const win = getWin();
    const result = await dialog.showOpenDialog(win, {
      title: 'Seleziona seconda versione (.msapp) per confronto',
      filters: [{ name: 'Power Apps Package', extensions: ['msapp'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const buffer = fs.readFileSync(result.filePaths[0]);
    const parsed = await parseMsapp(buffer);
    parsed.filePath = result.filePaths[0];
    parsed.fileName = path.basename(result.filePaths[0]);
    const cacheId = Date.now().toString();
    parsed._cacheId = cacheId;
    parsedAppsCache.set(cacheId, parsed);
    return parsed;
  });

  /* ═══ Analyzer — Export PDF Documentation ═══ */
  ipcMain.handle('analyzer:exportPdf', async (_, analysisJson) => {
    const win = getWin();
    const d = typeof analysisJson === 'string' ? JSON.parse(analysisJson) : analysisJson;
    const s = d.summary || {};
    const hs = d.healthScore || {};
    const scores = hs.scores || {};
    const grade = hs.grade || 'N/A';
    const gradeColors = { A: '#16a34a', B: '#65a30d', C: '#ca8a04', D: '#ea580c', E: '#dc2626', F: '#991b1b' };
    const gradeColor = gradeColors[grade] || '#6b7280';
    const sevColors = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a' };
    const appName = d.appName || d.fileName || 'Power App';
    const dateStr = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

    // Build HTML
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px 50px; font-size: 11pt; line-height: 1.5; }
      h1 { font-size: 24pt; color: #1e40af; margin-bottom: 6px; }
      h2 { font-size: 14pt; color: #1e40af; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #dbeafe; }
      h3 { font-size: 12pt; color: #334155; margin: 16px 0 8px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1e40af; }
      .header-left { flex: 1; }
      .header-right { text-align: right; color: #64748b; font-size: 10pt; }
      .subtitle { color: #64748b; font-size: 12pt; }
      .grade-box { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 12px; font-size: 32pt; font-weight: bold; color: white; background: ${gradeColor}; margin-right: 16px; }
      .score-row { display: flex; align-items: center; margin-bottom: 16px; }
      .score-detail { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; }
      .score-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
      .score-item strong { display: block; font-size: 16pt; color: #1e40af; }
      .score-item span { color: #64748b; font-size: 9pt; }
      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
      .kpi { background: #f1f5f9; border-radius: 8px; padding: 14px; text-align: center; }
      .kpi .num { font-size: 20pt; font-weight: bold; color: #1e40af; }
      .kpi .lbl { font-size: 9pt; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 10pt; }
      th { background: #1e40af; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }
      td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
      .sev { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 9pt; font-weight: 600; }
      .bar-container { background: #e2e8f0; border-radius: 4px; height: 10px; width: 100%; }
      .bar-fill { height: 10px; border-radius: 4px; }
      .page-break { page-break-before: always; }
      .issue-section { margin: 6px 0; }
      .formula-code { font-family: 'Cascadia Code', 'Consolas', monospace; font-size: 9pt; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; word-break: break-all; display: block; margin-top: 4px; color: #334155; border: 1px solid #e2e8f0; }
      .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9pt; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    </style></head><body>`;

    // Header
    html += `<div class="header">
      <div class="header-left">
        <h1>Documentazione App</h1>
        <div class="subtitle">${appName}</div>
      </div>
      <div class="header-right">
        <div>Generata il ${dateStr}</div>
        <div>FlowDesk — Power Apps Analyzer</div>
        ${d.modifiedAt ? `<div>Ultima modifica: ${new Date(d.modifiedAt).toLocaleDateString('it-IT')}</div>` : ''}
      </div>
    </div>`;

    // Health Score Section
    html += `<h2>1. Health Score</h2>
    <div class="score-row">
      <div class="grade-box">${grade}</div>
      <div><strong style="font-size:16pt">${hs.overall || 0}/100</strong><br><span style="color:#64748b">Punteggio complessivo dell'applicazione</span></div>
    </div>
    <div class="score-detail">
      <div class="score-item"><strong>${scores.performance || 0}</strong><span>Performance</span></div>
      <div class="score-item"><strong>${scores.delegation || 0}</strong><span>Delegazione</span></div>
      <div class="score-item"><strong>${scores.maintainability || 0}</strong><span>Manutenibilità</span></div>
      <div class="score-item"><strong>${scores.security || 0}</strong><span>Sicurezza</span></div>
      <div class="score-item"><strong>${scores.accessibility || 0}</strong><span>Accessibilità</span></div>
      <div class="score-item"><strong>${scores.architecture || 0}</strong><span>Architettura</span></div>
    </div>`;

    // Overview KPIs
    html += `<h2>2. Panoramica</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="num">${s.screenCount || 0}</div><div class="lbl">Schermate</div></div>
      <div class="kpi"><div class="num">${s.totalControls || 0}</div><div class="lbl">Controlli</div></div>
      <div class="kpi"><div class="num">${s.totalFormulas || 0}</div><div class="lbl">Formule</div></div>
      <div class="kpi"><div class="num">${s.dataSourceCount || 0}</div><div class="lbl">Data Source</div></div>
      <div class="kpi"><div class="num">${s.dataOpCount || 0}</div><div class="lbl">Operazioni Dati</div></div>
      <div class="kpi"><div class="num">${s.flowCallCount || 0}</div><div class="lbl">Chiamate Flow</div></div>
      <div class="kpi"><div class="num">${s.globalVarCount || 0}</div><div class="lbl">Variabili Globali</div></div>
      <div class="kpi"><div class="num">${s.contextVarCount || 0}</div><div class="lbl">Variabili Contesto</div></div>
    </div>
    <div class="two-col">
      <div>
        <h3>Operazioni Dati</h3>
        <table><tr><th>Operazione</th><th style="text-align:right">Conteggio</th></tr>
        <tr><td>Patch()</td><td style="text-align:right">${s.patchCount || 0}</td></tr>
        <tr><td>SubmitForm()</td><td style="text-align:right">${s.submitFormCount || 0}</td></tr>
        <tr><td>Remove() / RemoveIf()</td><td style="text-align:right">${s.removeCount || 0}</td></tr>
        <tr><td>Collect() / ClearCollect()</td><td style="text-align:right">${s.collectCount || 0}</td></tr>
        </table>
      </div>
      <div>
        <h3>Navigazione</h3>
        <table><tr><th>Metrica</th><th style="text-align:right">Valore</th></tr>
        <tr><td>Navigazioni totali</td><td style="text-align:right">${s.navigationCount || 0}</td></tr>
        <tr><td>Schermate orfane</td><td style="text-align:right">${(d.orphanScreens || []).length}</td></tr>
        <tr><td>Flow collegati</td><td style="text-align:right">${(s.uniqueFlows || []).length}</td></tr>
        <tr><td>Tabelle in scrittura</td><td style="text-align:right">${(s.uniqueTablesWritten || []).length}</td></tr>
        </table>
      </div>
    </div>`;

    // Screens
    const screens = d.screens || [];
    const screenStats = s.screenStats || [];
    if (screens.length > 0) {
      html += `<h2 class="page-break">3. Schermate (${screens.length})</h2>
      <table><tr><th>Schermata</th><th style="text-align:right">Controlli</th><th style="text-align:right">Formule</th><th style="text-align:right">Op. Dati</th><th style="text-align:right">Navigazioni</th><th style="text-align:right">Issues</th></tr>`;
      for (const sc of screens) {
        const st = screenStats.find(x => x.name === sc.name) || {};
        html += `<tr><td><strong>${sc.name}</strong></td><td style="text-align:right">${sc.controlCount}</td><td style="text-align:right">${st.formulaCount || 0}</td><td style="text-align:right">${st.dataOpCount || 0}</td><td style="text-align:right">${st.navigationCount || 0}</td><td style="text-align:right">${st.issueCount || 0}</td></tr>`;
      }
      html += `</table>`;
    }

    // Data Sources
    const dataSources = d.dataSources || [];
    if (dataSources.length > 0) {
      html += `<h2>4. Data Source (${dataSources.length})</h2>
      <table><tr><th>Nome</th><th>Tipo</th><th>Tabella</th><th>Connettore</th></tr>`;
      for (const ds of dataSources) {
        html += `<tr><td><strong>${ds.name}</strong></td><td>${ds.type || '—'}</td><td>${ds.tableName || '—'}</td><td>${ds.connectorId || '—'}</td></tr>`;
      }
      html += `</table>`;
    }

    // Dependency Matrix
    const depMatrix = d.dependencyMatrix || [];
    if (depMatrix.length > 0) {
      html += `<h2>5. Matrice Dipendenze Screen ↔ DataSource</h2>
      <table><tr><th>Schermata</th><th>DataSource</th><th style="text-align:right">Letture</th><th style="text-align:right">Scritture</th><th>Operazioni</th></tr>`;
      for (const dep of depMatrix) {
        for (const dss of (dep.dataSources || [])) {
          html += `<tr><td>${dep.screen}</td><td>${dss.name}</td><td style="text-align:right">${dss.readCount}</td><td style="text-align:right">${dss.writeCount}</td><td>${(dss.operations || []).join(', ')}</td></tr>`;
        }
      }
      html += `</table>`;
    }

    // Variables
    const variables = d.variables || [];
    if (variables.length > 0) {
      html += `<h2>6. Variabili (${variables.length})</h2>
      <table><tr><th>Nome</th><th>Tipo</th><th>Definita in</th></tr>`;
      for (const v of variables) {
        const defs = (v.setIn || []).map(s => `${s.screen} → ${s.control}.${s.property}`).join(', ');
        html += `<tr><td><strong>${v.name}</strong></td><td>${v.type}</td><td>${defs || '—'}</td></tr>`;
      }
      html += `</table>`;
    }

    // Navigation Map
    const navs = d.navigations || [];
    if (navs.length > 0) {
      html += `<h2>7. Mappa Navigazione (${navs.length})</h2>
      <table><tr><th>Da</th><th>A</th><th>Controllo</th><th>Proprietà</th></tr>`;
      for (const n of navs) {
        html += `<tr><td>${n.from}</td><td>${n.to}</td><td>${n.control}</td><td>${n.property}</td></tr>`;
      }
      html += `</table>`;
    }

    // Issues
    const issues = d.issues || [];
    if (issues.length > 0) {
      html += `<h2 class="page-break">8. Problemi e Raccomandazioni (${issues.length})</h2>`;
      const sevOrder = ['critical', 'high', 'medium', 'low'];
      for (const sev of sevOrder) {
        const sevIssues = issues.filter(i => i.severity === sev);
        if (sevIssues.length === 0) continue;
        const sevLabel = { critical: 'Critici', high: 'Alti', medium: 'Medi', low: 'Bassi' }[sev];
        html += `<h3>${sevLabel} (${sevIssues.length})</h3>`;
        for (const issue of sevIssues) {
          html += `<div class="issue-section" style="margin-bottom:12px;padding:10px;border-left:4px solid ${sevColors[sev]};background:#fafafa;border-radius:0 6px 6px 0;">
            <strong>${issue.title}</strong><br>
            <span style="color:#64748b;font-size:9pt">${issue.screen || ''} ${issue.control ? '→ ' + issue.control : ''} ${issue.property ? '.' + issue.property : ''} | ${issue.category || ''}</span><br>
            <span>${issue.description || ''}</span>
            ${issue.fix ? '<br><em style="color:#16a34a">Soluzione: ' + issue.fix + '</em>' : ''}
            ${issue.formulaSnippet ? '<code class="formula-code">' + issue.formulaSnippet.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>' : ''}
          </div>`;
        }
      }
    }

    // Formula Complexity
    const fc = d.formulaComplexity;
    if (fc) {
      html += `<h2>9. Complessità Formule</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="num">${(fc.avgScore || 0).toFixed(1)}</div><div class="lbl">Complessità Media</div></div>
        <div class="kpi"><div class="num">${fc.maxScore || 0}</div><div class="lbl">Complessità Max</div></div>
        <div class="kpi"><div class="num">${fc.distribution?.simple || 0}</div><div class="lbl">Semplici</div></div>
        <div class="kpi"><div class="num">${fc.distribution?.complex || 0}</div><div class="lbl">Complesse</div></div>
      </div>`;
      if (fc.topComplex && fc.topComplex.length > 0) {
        html += `<h3>Formule più complesse</h3><table><tr><th>Schermata</th><th>Controllo</th><th>Proprietà</th><th style="text-align:right">Score</th><th style="text-align:right">Profondità</th><th style="text-align:right">Funzioni</th></tr>`;
        for (const f of fc.topComplex.slice(0, 15)) {
          html += `<tr><td>${f.screen}</td><td>${f.control}</td><td>${f.property}</td><td style="text-align:right"><strong>${f.score}</strong></td><td style="text-align:right">${f.nestingDepth}</td><td style="text-align:right">${f.functionCount}</td></tr>`;
        }
        html += `</table>`;
      }
    }

    // Flow Calls
    const flowCalls = d.flowCalls || [];
    if (flowCalls.length > 0) {
      html += `<h2>10. Flussi Power Automate Collegati (${flowCalls.length})</h2>
      <table><tr><th>Flow</th><th>Schermata</th><th>Controllo</th><th>Proprietà</th></tr>`;
      for (const fc of flowCalls) {
        html += `<tr><td><strong>${fc.flowName}</strong></td><td>${fc.screen}</td><td>${fc.control}</td><td>${fc.property}</td></tr>`;
      }
      html += `</table>`;
    }

    // Footer
    html += `<div class="footer">Documentazione generata automaticamente da <strong>FlowDesk</strong> — Power Apps Analyzer v${app.getVersion()}</div>`;
    html += `</body></html>`;

    // Generate PDF using hidden BrowserWindow
    const pdfWin = new BrowserWindow({ show: false, width: 800, height: 600, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    try {
      await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdfBuffer = await pdfWin.webContents.printToPDF({
        printBackground: true,
        marginsType: 0,
        pageSize: 'A4',
        landscape: false,
      });

      const safeName = (d.appName || d.fileName || 'PowerApp').replace(/[^a-zA-Z0-9_\-. ]/g, '_');
      const result = await dialog.showSaveDialog(win, {
        title: 'Salva documentazione PDF',
        defaultPath: `${safeName} — Documentazione.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (result.canceled || !result.filePath) return { ok: false };

      fs.writeFileSync(result.filePath, pdfBuffer);
      shell.openPath(result.filePath);
      return { ok: true, path: result.filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      pdfWin.close();
    }
  });

  /* ═══ SharePoint ═══ */
  // Load saved config on startup
  loadSpConfig();
  if (spConfig && spConfig.clientId && spConfig.tenantId) {
    try { initMsal(spConfig.clientId, spConfig.tenantId); } catch {}
  }

  ipcMain.handle('sp:getConfig', () => {
    return spConfig || null;
  });

  ipcMain.handle('sp:saveConfig', (_, cfg) => {
    saveSpConfig(cfg);
    initMsal(cfg.clientId, cfg.tenantId);
    spTokenCache = null; // force new login
    return { ok: true };
  });

  ipcMain.handle('sp:connect', async () => {
    if (!spConfig) throw new Error('Configurazione SharePoint mancante.');
    if (!msalApp) initMsal(spConfig.clientId, spConfig.tenantId);
    const token = await spAcquireTokenInteractive(SP_SCOPES);
    // Get user info
    const me = await spFetch('/me');
    return { ok: true, user: { name: me.displayName, email: me.mail || me.userPrincipalName } };
  });

  ipcMain.handle('sp:disconnect', () => {
    spTokenCache = null;
    return { ok: true };
  });

  ipcMain.handle('sp:isConnected', () => {
    return !!(spTokenCache && spTokenCache.accessToken);
  });

  ipcMain.handle('sp:getUser', async () => {
    if (!spTokenCache) return null;
    try {
      const me = await spFetch('/me');
      return { name: me.displayName, email: me.mail || me.userPrincipalName };
    } catch { return null; }
  });

  // ── Sites ──
  ipcMain.handle('sp:searchSites', async (_, query) => {
    const data = await spFetch(`/sites?search=${encodeURIComponent(query)}`);
    return (data.value || []).map(s => ({ id: s.id, name: s.displayName, url: s.webUrl, description: s.description }));
  });

  ipcMain.handle('sp:getSiteId', async (_, siteUrl) => {
    return await spResolveSiteId(siteUrl);
  });

  // ── Lists ──
  ipcMain.handle('sp:getLists', async (_, siteId) => {
    const data = await spFetch(`/sites/${siteId}/lists?$top=100&$select=id,displayName,description,lastModifiedDateTime,list`);
    return (data.value || []).map(l => ({
      id: l.id, name: l.displayName, description: l.description || '',
      template: l.list?.template || '', lastModified: l.lastModifiedDateTime,
      hidden: l.list?.hidden || false,
    })).filter(l => !l.hidden);
  });

  ipcMain.handle('sp:getListItems', async (_, siteId, listId, top, skip) => {
    const t = top || 50;
    const s = skip || 0;
    const data = await spFetch(`/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=${t}&$skip=${s}`);
    return {
      items: (data.value || []).map(i => ({ id: i.id, fields: i.fields || {}, createdAt: i.createdDateTime, modifiedAt: i.lastModifiedDateTime })),
      hasMore: !!(data['@odata.nextLink']),
    };
  });

  ipcMain.handle('sp:getListColumns', async (_, siteId, listId) => {
    const data = await spFetch(`/sites/${siteId}/lists/${listId}/columns?$top=100`);
    return (data.value || []).filter(c => !c.readOnly && c.name !== 'ContentType' && c.name !== 'Attachments')
      .map(c => ({ name: c.name, displayName: c.displayName, type: c.text ? 'text' : c.number ? 'number' : c.dateTime ? 'dateTime' : c.boolean ? 'boolean' : c.choice ? 'choice' : c.lookup ? 'lookup' : 'other', required: c.required || false, choices: c.choice?.choices || [] }));
  });

  ipcMain.handle('sp:createListItem', async (_, siteId, listId, fields) => {
    const data = await spFetch(`/sites/${siteId}/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });
    return { id: data.id, fields: data.fields || fields };
  });

  ipcMain.handle('sp:updateListItem', async (_, siteId, listId, itemId, fields) => {
    await spFetch(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
    return { ok: true };
  });

  ipcMain.handle('sp:deleteListItem', async (_, siteId, listId, itemId) => {
    await spFetch(`/sites/${siteId}/lists/${listId}/items/${itemId}`, { method: 'DELETE' });
    return { ok: true };
  });

  // ── Documents (Drive) ──
  ipcMain.handle('sp:getDrives', async (_, siteId) => {
    const data = await spFetch(`/sites/${siteId}/drives`);
    return (data.value || []).map(d => ({ id: d.id, name: d.name, description: d.description || '', webUrl: d.webUrl, totalSize: d.quota?.total || 0, usedSize: d.quota?.used || 0 }));
  });

  ipcMain.handle('sp:getDriveItems', async (_, siteId, driveId, folderId) => {
    const ep = folderId
      ? `/sites/${siteId}/drives/${driveId}/items/${folderId}/children?$top=200`
      : `/sites/${siteId}/drives/${driveId}/root/children?$top=200`;
    const data = await spFetch(ep);
    return (data.value || []).map(i => ({
      id: i.id, name: i.name, isFolder: !!i.folder,
      size: i.size || 0, mimeType: i.file?.mimeType || '',
      webUrl: i.webUrl, downloadUrl: i['@microsoft.graph.downloadUrl'] || '',
      lastModified: i.lastModifiedDateTime,
      childCount: i.folder?.childCount || 0,
      createdBy: i.createdBy?.user?.displayName || '',
    }));
  });

  ipcMain.handle('sp:downloadFile', async (_, siteId, driveId, itemId, fileName) => {
    const win = getWin();
    const result = await dialog.showSaveDialog(win, {
      title: 'Salva file da SharePoint',
      defaultPath: fileName,
    });
    if (result.canceled || !result.filePath) return { ok: false };

    const token = await spAcquireTokenInteractive(SP_SCOPES);
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${itemId}/content`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Download fallito: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(result.filePath, buffer);
    shell.openPath(result.filePath);
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle('sp:uploadFile', async (_, siteId, driveId, folderId) => {
    const win = getWin();
    const fileResult = await dialog.showOpenDialog(win, {
      title: 'Seleziona file da caricare su SharePoint',
      properties: ['openFile'],
    });
    if (fileResult.canceled || !fileResult.filePaths[0]) return null;

    const filePath = fileResult.filePaths[0];
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const token = await spAcquireTokenInteractive(SP_SCOPES);

    const ep = folderId
      ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}:/${encodeURIComponent(fileName)}:/content`
      : `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${encodeURIComponent(fileName)}:/content`;

    const res = await fetch(ep, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Upload fallito: ${res.status} — ${errBody}`);
    }
    const data = await res.json();
    return { ok: true, id: data.id, name: data.name, webUrl: data.webUrl, size: data.size };
  });

  ipcMain.handle('sp:deleteItem', async (_, siteId, driveId, itemId) => {
    await spFetch(`/sites/${siteId}/drives/${driveId}/items/${itemId}`, { method: 'DELETE' });
    return { ok: true };
  });

  ipcMain.handle('sp:createFolder', async (_, siteId, driveId, folderId, folderName) => {
    const ep = folderId
      ? `/sites/${siteId}/drives/${driveId}/items/${folderId}/children`
      : `/sites/${siteId}/drives/${driveId}/root/children`;
    const data = await spFetch(ep, {
      method: 'POST',
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    });
    return { ok: true, id: data.id, name: data.name };
  });

  /* ═══ Report — Export PDF ═══ */
  ipcMain.handle('report:exportPdf', async (_, htmlContent) => {
    const win = getWin();
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px 50px; font-size: 11pt; line-height: 1.5; }
      h1 { font-size: 22pt; color: #1e40af; margin-bottom: 4px; }
      h2 { font-size: 13pt; color: #1e40af; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #dbeafe; }
      .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1e40af; display: flex; justify-content: space-between; align-items: flex-start; }
      .header-left { flex: 1; }
      .header-right { text-align: right; color: #64748b; font-size: 10pt; }
      .subtitle { color: #64748b; font-size: 12pt; }
      .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
      .kpi { background: #f1f5f9; border-radius: 8px; padding: 12px; text-align: center; }
      .kpi .num { font-size: 18pt; font-weight: bold; color: #1e40af; }
      .kpi .lbl { font-size: 9pt; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 10pt; }
      th { background: #1e40af; color: white; padding: 7px 10px; text-align: left; font-weight: 600; }
      td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
      .done { color: #16a34a; } .doing { color: #ca8a04; } .todo { color: #64748b; }
      .high { background: #fef2f2; color: #dc2626; } .medium { background: #fefce8; color: #ca8a04; } .low { background: #f0fdf4; color: #16a34a; }
      .test-pass { color: #16a34a; } .test-fail { color: #dc2626; } .test-na { color: #64748b; }
      .note-block { background: #f8fafc; padding: 10px; margin: 6px 0; border-left: 3px solid #3b82f6; border-radius: 0 6px 6px 0; }
      .session-time { font-family: 'Consolas', monospace; }
      .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9pt; }
      .bar-bg { background: #e2e8f0; border-radius: 4px; height: 8px; width: 100%; }
      .bar-fill { height: 8px; border-radius: 4px; background: #3b82f6; }
    </style></head><body>${htmlContent}</body></html>`;

    const pdfWin = new BrowserWindow({ show: false, width: 800, height: 600, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    try {
      await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));
      await new Promise(resolve => setTimeout(resolve, 500));
      const pdfBuffer = await pdfWin.webContents.printToPDF({ printBackground: true, marginsType: 0, pageSize: 'A4', landscape: false });

      const dateStr = new Date().toISOString().slice(0, 10);
      const result = await dialog.showSaveDialog(win, {
        title: 'Salva Report PDF',
        defaultPath: `FlowDesk Report ${dateStr}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (result.canceled || !result.filePath) return { ok: false };

      fs.writeFileSync(result.filePath, pdfBuffer);
      shell.openPath(result.filePath);
      return { ok: true, path: result.filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      pdfWin.close();
    }
  });
}

/* ═══ Cambia cartella database ═══ */
async function migrateToOneDrive() {
  const win = getWin();
  const oneDriveFolders = detectOneDriveFolders();
  if (oneDriveFolders.length === 0) {
    dialog.showMessageBox(win, { type: 'warning', title: 'OneDrive non trovato', message: 'Nessuna cartella OneDrive rilevata sul sistema.', detail: 'Assicurati che OneDrive sia installato e sincronizzato.' });
    return { ok: false };
  }
  let oneDriveBase = oneDriveFolders[0];
  if (oneDriveFolders.length > 1) {
    const { response: odIdx } = await dialog.showMessageBox(win, {
      type: 'question',
      title: 'FlowDesk — Scegli OneDrive',
      message: 'Quale cartella OneDrive vuoi usare?',
      buttons: oneDriveFolders.map(f => path.basename(f)),
      defaultId: 0,
      noLink: true,
    });
    oneDriveBase = oneDriveFolders[odIdx] || oneDriveFolders[0];
  }
  const newFolder = path.join(oneDriveBase, 'FlowDesk');
  const currentFolder = path.dirname(getDbPath());
  if (path.resolve(newFolder) === path.resolve(currentFolder)) {
    dialog.showMessageBox(win, { type: 'info', title: 'Già su OneDrive', message: 'Il database è già salvato nella cartella OneDrive.' });
    return { ok: false };
  }
  const confirm = await dialog.showMessageBox(win, {
    type: 'question',
    title: 'Migrazione su OneDrive',
    message: 'Spostare il database su OneDrive?',
    detail: `Il database verrà copiato da:\n${currentFolder}\n\na:\n${newFolder}\n\nI dati saranno sincronizzati automaticamente con il cloud.`,
    buttons: ['Annulla', 'Migra su OneDrive'],
    defaultId: 1,
    cancelId: 0,
    noLink: true,
  });
  if (confirm.response !== 1) return { ok: false };
  if (!fs.existsSync(newFolder)) fs.mkdirSync(newFolder, { recursive: true });
  // Usa la stessa logica di changeDbFolder per copiare
  return await doMoveDb(newFolder);
}

async function doMoveDb(newFolder) {
  const win = getWin();
  const oldDbPath = getDbPath();
  const newDbPath = path.join(newFolder, 'flowdesk.db');
  if (oldDbPath !== newDbPath) {
    closeDb();
    try {
      fs.copyFileSync(oldDbPath, newDbPath);
      if (fs.existsSync(oldDbPath + '-wal')) fs.copyFileSync(oldDbPath + '-wal', newDbPath + '-wal');
      if (fs.existsSync(oldDbPath + '-shm')) fs.copyFileSync(oldDbPath + '-shm', newDbPath + '-shm');
      // Copia anche cartelle allegati e fdhub se esistono
      const oldBase = path.dirname(oldDbPath);
      for (const sub of ['fdhub', 'attachments']) {
        const oldSub = path.join(oldBase, sub);
        const newSub = path.join(newFolder, sub);
        if (fs.existsSync(oldSub)) {
          copyDirRecursive(oldSub, newSub);
        }
      }
    } catch (err) {
      initDb(path.dirname(oldDbPath));
      dialog.showErrorBox('Errore', `Impossibile copiare il database: ${err.message}`);
      return { ok: false };
    }
    writeConfig({ ...readConfig(), dbFolder: newFolder });
    initDb(newFolder);
    if (win) win.webContents.send('db-folder-changed', newFolder);
  }
  return { ok: true, folder: newFolder };
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

async function changeDbFolder() {
  const win = getWin();
  const result = await dialog.showOpenDialog(win, {
    title: 'Scegli la cartella per il database',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: path.dirname(getDbPath()),
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const newFolder = result.filePaths[0];
  return await doMoveDb(newFolder);
}

/* ═══ Esporta database ═══ */
async function exportDb() {
  const win = getWin();
  const result = await dialog.showSaveDialog(win, {
    title: 'Esporta database FlowDesk',
    defaultPath: path.join(app.getPath('desktop'), 'flowdesk-backup.db'),
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false };
  try {
    fs.copyFileSync(getDbPath(), result.filePath);
    dialog.showMessageBox(win, { type: 'info', title: 'Esportazione completata', message: `Database esportato in:\n${result.filePath}` });
    return { ok: true, path: result.filePath };
  } catch (err) {
    dialog.showErrorBox('Errore', `Impossibile esportare: ${err.message}`);
    return { ok: false };
  }
}

/* ═══ Importa database ═══ */
async function importDb() {
  const win = getWin();
  const result = await dialog.showOpenDialog(win, {
    title: 'Importa database FlowDesk',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const confirm = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Conferma importazione',
    message: 'Sovrascrivere il database attuale?',
    detail: 'Il database corrente verrà sostituito con quello importato. Questa operazione non è reversibile.',
    buttons: ['Annulla', 'Importa'],
    defaultId: 0,
    cancelId: 0,
  });
  if (confirm.response !== 1) return { ok: false };
  try {
    closeDb();
    const destPath = getDbPath();
    fs.copyFileSync(result.filePaths[0], destPath);
    // Rimuovi WAL/SHM vecchi
    try { fs.unlinkSync(destPath + '-wal'); } catch {}
    try { fs.unlinkSync(destPath + '-shm'); } catch {}
    initDb(path.dirname(destPath));
    if (win) win.webContents.reload();
    return { ok: true };
  } catch (err) {
    dialog.showErrorBox('Errore', `Impossibile importare: ${err.message}`);
    return { ok: false };
  }
}

/* ═══════ Update Checker ═══════ */
const GITHUB_REPO = 'marco-giuseppe-starace/flowdesk';

ipcMain.handle('app:checkForUpdates', async () => {
  const https = require('https');
  const currentVersion = app.getVersion();
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: { 'User-Agent': `FlowDesk/${currentVersion}` },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 404) return resolve({ upToDate: true, currentVersion, latestVersion: currentVersion, message: 'Nessuna release trovata su GitHub.' });
          const json = JSON.parse(data);
          const latestTag = (json.tag_name || '').replace(/^v/, '');
          const upToDate = latestTag === currentVersion || !latestTag;
          const asset = (json.assets || []).find(a => a.name && a.name.endsWith('.exe'));
          resolve({
            upToDate,
            currentVersion,
            latestVersion: latestTag || currentVersion,
            releaseUrl: json.html_url || `https://github.com/${GITHUB_REPO}/releases`,
            downloadUrl: asset ? asset.browser_download_url : null,
            releaseName: json.name || '',
            publishedAt: json.published_at || '',
            body: json.body || '',
          });
        } catch {
          resolve({ upToDate: true, currentVersion, latestVersion: currentVersion, error: 'Impossibile leggere la risposta di GitHub.' });
        }
      });
    }).on('error', (err) => {
      resolve({ upToDate: true, currentVersion, latestVersion: currentVersion, error: `Errore di rete: ${err.message}` });
    });
  });
});

ipcMain.handle('app:openExternal', (_, url) => {
  shell.openExternal(url);
});

ipcMain.handle('app:openInAppBrowser', async (_, url, title = 'FlowDesk AI Hub') => {
  try {
    const target = String(url || '').trim();
    if (!/^https?:\/\//i.test(target)) return { ok: false, error: 'URL non valida' };

    const parent = getWin();
    const aiWin = new BrowserWindow({
      width: 1320,
      height: 860,
      minWidth: 980,
      minHeight: 700,
      parent: parent || undefined,
      autoHideMenuBar: true,
      title,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    aiWin.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
      shell.openExternal(popupUrl);
      return { action: 'deny' };
    });

    await aiWin.loadURL(target);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Impossibile aprire la finestra AI' };
  }
});

app.whenReady().then(async () => {
  let dbFolder;
  if (isFirstRun()) {
    // Prima di chiedere la cartella, controlla se esiste già un DB da recuperare
    const recovered = await recoverExistingDb();
    if (recovered) {
      dbFolder = recovered;
    } else {
      dbFolder = await askDbFolderOnFirstRun();
    }
  } else {
    dbFolder = resolveDbFolder();
    // Verifica che il DB esista ancora nella cartella configurata
    const configuredDbPath = path.join(dbFolder, 'flowdesk.db');
    if (!fs.existsSync(configuredDbPath)) {
      // Prova a recuperare cercando in varie posizioni
      const recovered = await recoverExistingDb();
      if (recovered) {
        dbFolder = recovered;
      } else {
        // Nessun DB trovato — chiedi dove crearne uno nuovo
        dbFolder = await askDbFolderOnFirstRun();
      }
    }
  }
  initDb(dbFolder);
  buildMenu();
  registerIpcHandlers();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
