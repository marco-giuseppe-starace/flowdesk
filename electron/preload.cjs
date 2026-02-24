const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flowdesk', {
  /* Tasks */
  listTasks: (date) => ipcRenderer.invoke('tasks:list', date),
  createTask: (p) => ipcRenderer.invoke('tasks:create', p),
  updateTask: (id, p) => ipcRenderer.invoke('tasks:update', id, p),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  setTaskStatus: (id, s) => ipcRenderer.invoke('tasks:setStatus', id, s),
  duplicateTask: (id, date) => ipcRenderer.invoke('tasks:duplicate', id, date),

  /* Sessions */
  startSession: (taskId) => ipcRenderer.invoke('sessions:start', taskId),
  stopSession: (note) => ipcRenderer.invoke('sessions:stop', note),
  getActiveSession: () => ipcRenderer.invoke('sessions:active'),
  listSessions: (day) => ipcRenderer.invoke('sessions:list', day),

  /* Changes */
  addChange: (p) => ipcRenderer.invoke('changes:add', p),
  listChanges: (day) => ipcRenderer.invoke('changes:list', day),
  updateChange: (id, p) => ipcRenderer.invoke('changes:update', id, p),
  deleteChange: (id) => ipcRenderer.invoke('changes:delete', id),

  /* Notes */
  createNote: (p) => ipcRenderer.invoke('notes:create', p),
  listNotes: (day) => ipcRenderer.invoke('notes:list', day),
  togglePinNote: (id) => ipcRenderer.invoke('notes:togglePin', id),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),

  /* Goals */
  createGoal: (p) => ipcRenderer.invoke('goals:create', p),
  listGoals: (day) => ipcRenderer.invoke('goals:list', day),
  toggleGoal: (id) => ipcRenderer.invoke('goals:toggle', id),
  updateGoal: (id, p) => ipcRenderer.invoke('goals:update', id, p),
  deleteGoal: (id) => ipcRenderer.invoke('goals:delete', id),

  /* Stats / Search / History / Export */
  getWeekStats: (start, end) => ipcRenderer.invoke('stats:week', start, end),
  searchAll: (query) => ipcRenderer.invoke('search:all', query),
  getActiveDays: (start, end) => ipcRenderer.invoke('history:activeDays', start, end),
  getDaySummary: (day) => ipcRenderer.invoke('history:daySummary', day),
  exportCsv: (start, end) => ipcRenderer.invoke('export:csv', start, end),

  /* Projects */
  createProject: (p) => ipcRenderer.invoke('projects:create', p),
  listProjects: (inclArchived) => ipcRenderer.invoke('projects:list', inclArchived),
  updateProject: (id, p) => ipcRenderer.invoke('projects:update', id, p),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
  getProjectStats: (id) => ipcRenderer.invoke('projects:stats', id),

  /* Tags */
  createTag: (p) => ipcRenderer.invoke('tags:create', p),
  listTags: () => ipcRenderer.invoke('tags:list'),
  updateTag: (id, p) => ipcRenderer.invoke('tags:update', id, p),
  deleteTag: (id) => ipcRenderer.invoke('tags:delete', id),
  addTagToTask: (taskId, tagId) => ipcRenderer.invoke('tags:addToTask', taskId, tagId),
  removeTagFromTask: (taskId, tagId) => ipcRenderer.invoke('tags:removeFromTask', taskId, tagId),
  getTaskTags: (taskId) => ipcRenderer.invoke('tags:getForTask', taskId),

  /* Templates */
  createTemplate: (p) => ipcRenderer.invoke('templates:create', p),
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  deleteTemplate: (id) => ipcRenderer.invoke('templates:delete', id),
  createTaskFromTemplate: (tplId, date) => ipcRenderer.invoke('templates:createTask', tplId, date),

  /* Notes update */
  updateNote: (id, p) => ipcRenderer.invoke('notes:update', id, p),

  /* Snippets */
  createSnippet: (p) => ipcRenderer.invoke('snippets:create', p),
  listSnippets: (lang) => ipcRenderer.invoke('snippets:list', lang),
  updateSnippet: (id, p) => ipcRenderer.invoke('snippets:update', id, p),
  toggleSnippetFav: (id) => ipcRenderer.invoke('snippets:toggleFav', id),
  deleteSnippet: (id) => ipcRenderer.invoke('snippets:delete', id),

  /* Bookmarks */
  createBookmark: (p) => ipcRenderer.invoke('bookmarks:create', p),
  listBookmarks: (cat) => ipcRenderer.invoke('bookmarks:list', cat),
  updateBookmark: (id, p) => ipcRenderer.invoke('bookmarks:update', id, p),
  deleteBookmark: (id) => ipcRenderer.invoke('bookmarks:delete', id),

  /* Backlog */
  getBacklog: () => ipcRenderer.invoke('backlog:list'),
  rescheduleTask: (id, date) => ipcRenderer.invoke('backlog:reschedule', id, date),

  /* Streak & Time Budget */
  getStreak: () => ipcRenderer.invoke('streak:get'),
  getTimeBudget: (date) => ipcRenderer.invoke('timeBudget:get', date),

  /* Reset */
  resetAllData: () => ipcRenderer.invoke('data:resetAll'),

  /* Batch Tag Loading */
  getAllTaskTags: (taskIds) => ipcRenderer.invoke('tags:getAllForTasks', taskIds),

  /* Recurring Tasks */
  generateRecurringTasks: (date) => ipcRenderer.invoke('tasks:generateRecurring', date),

  /* Trash */
  getTrashItems: () => ipcRenderer.invoke('trash:list'),
  restoreTrashItem: (entityType, id) => ipcRenderer.invoke('trash:restore', entityType, id),
  permanentDeleteTrashItem: (entityType, id) => ipcRenderer.invoke('trash:permanentDelete', entityType, id),
  emptyTrash: () => ipcRenderer.invoke('trash:empty'),

  /* Full JSON Export */
  exportFullJson: () => ipcRenderer.invoke('export:fullJson'),

  /* Contacts */
  createContact: (p) => ipcRenderer.invoke('contacts:create', p),
  listContacts: (projectId) => ipcRenderer.invoke('contacts:list', projectId),
  updateContact: (id, p) => ipcRenderer.invoke('contacts:update', id, p),
  deleteContact: (id) => ipcRenderer.invoke('contacts:delete', id),

  /* Environments */
  createEnvironment: (p) => ipcRenderer.invoke('envs:create', p),
  listEnvironments: (projectId) => ipcRenderer.invoke('envs:list', projectId),
  updateEnvironment: (id, p) => ipcRenderer.invoke('envs:update', id, p),
  deleteEnvironment: (id) => ipcRenderer.invoke('envs:delete', id),

  /* Retrospectives */
  createRetrospective: (p) => ipcRenderer.invoke('retros:create', p),
  listRetrospectives: () => ipcRenderer.invoke('retros:list'),
  updateRetrospective: (id, p) => ipcRenderer.invoke('retros:update', id, p),
  deleteRetrospective: (id) => ipcRenderer.invoke('retros:delete', id),

  /* Bugs */
  createBug: (p) => ipcRenderer.invoke('bugs:create', p),
  listBugs: (projectId, status) => ipcRenderer.invoke('bugs:list', projectId, status),
  updateBug: (id, p) => ipcRenderer.invoke('bugs:update', id, p),
  deleteBug: (id) => ipcRenderer.invoke('bugs:delete', id),

  /* Learning */
  createLearning: (p) => ipcRenderer.invoke('learning:create', p),
  listLearning: (cat) => ipcRenderer.invoke('learning:list', cat),
  updateLearning: (id, p) => ipcRenderer.invoke('learning:update', id, p),
  deleteLearning: (id) => ipcRenderer.invoke('learning:delete', id),

  /* Checklists */
  createChecklist: (p) => ipcRenderer.invoke('checklists:create', p),
  listChecklists: (projectId) => ipcRenderer.invoke('checklists:list', projectId),
  updateChecklist: (id, p) => ipcRenderer.invoke('checklists:update', id, p),
  deleteChecklist: (id) => ipcRenderer.invoke('checklists:delete', id),
  getChecklistItems: (checklistId) => ipcRenderer.invoke('checklists:items', checklistId),
  addChecklistItem: (p) => ipcRenderer.invoke('checklists:addItem', p),
  toggleChecklistItem: (id) => ipcRenderer.invoke('checklists:toggleItem', id),
  updateChecklistItem: (id, p) => ipcRenderer.invoke('checklists:updateItem', id, p),
  deleteChecklistItem: (id) => ipcRenderer.invoke('checklists:deleteItem', id),

  /* Notifications */
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),

  /* FDHub — Repos */
  fdhubCreateRepo: (p) => ipcRenderer.invoke('fdhub:createRepo', p),
  fdhubListRepos: (projectId) => ipcRenderer.invoke('fdhub:listRepos', projectId),
  fdhubUpdateRepo: (id, p) => ipcRenderer.invoke('fdhub:updateRepo', id, p),
  fdhubDeleteRepo: (id) => ipcRenderer.invoke('fdhub:deleteRepo', id),
  fdhubRepoStats: (id) => ipcRenderer.invoke('fdhub:repoStats', id),

  /* FDHub — Commits */
  fdhubCommit: (repoId, message, tag) => ipcRenderer.invoke('fdhub:commit', repoId, message, tag),
  fdhubListCommits: (repoId) => ipcRenderer.invoke('fdhub:listCommits', repoId),
  fdhubGetCommit: (id) => ipcRenderer.invoke('fdhub:getCommit', id),
  fdhubDeleteCommit: (id) => ipcRenderer.invoke('fdhub:deleteCommit', id),
  fdhubExportCommit: (id) => ipcRenderer.invoke('fdhub:exportCommit', id),
  fdhubDiffCommits: (idA, idB) => ipcRenderer.invoke('fdhub:diffCommits', idA, idB),

  /* Attachments */
  addAttachments: (entityType, entityId) => ipcRenderer.invoke('attachments:add', entityType, entityId),
  listAttachments: (entityType, entityId) => ipcRenderer.invoke('attachments:list', entityType, entityId),
  deleteAttachment: (id) => ipcRenderer.invoke('attachments:delete', id),
  openAttachment: (filePath) => ipcRenderer.invoke('attachments:open', filePath),

  /* App info */
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  /* Database management */
  getDbPath: () => ipcRenderer.invoke('db:getPath'),
  getDbFolder: () => ipcRenderer.invoke('db:getFolder'),
  dbExistedAtStartup: () => ipcRenderer.invoke('db:existedAtStartup'),
  changeDbFolder: () => ipcRenderer.invoke('db:changeFolder'),
  migrateToOneDrive: () => ipcRenderer.invoke('db:migrateOneDrive'),
  exportDb: () => ipcRenderer.invoke('db:export'),
  importDb: () => ipcRenderer.invoke('db:import'),
  onDbFolderChanged: (cb) => ipcRenderer.on('db-folder-changed', (_e, folder) => cb(folder)),

  /* Power Apps Analyzer */
  msappOpenFile: () => ipcRenderer.invoke('msapp:openFile'),
  msappParseBuffer: (buf) => ipcRenderer.invoke('msapp:parseBuffer', Array.from(buf)),
  msappParseFilePath: (filePath) => ipcRenderer.invoke('msapp:parseFilePath', filePath),
  msappDiff: (idA, idB) => ipcRenderer.invoke('msapp:diff', idA, idB),
  msappOpenSecondFile: () => ipcRenderer.invoke('msapp:openSecondFile'),
  analyzerExportPdf: (analysisData) => ipcRenderer.invoke('analyzer:exportPdf', analysisData),
  reportExportPdf: (htmlContent) => ipcRenderer.invoke('report:exportPdf', htmlContent),

  /* SharePoint */
  spGetConfig: () => ipcRenderer.invoke('sp:getConfig'),
  spSaveConfig: (cfg) => ipcRenderer.invoke('sp:saveConfig', cfg),
  spConnect: () => ipcRenderer.invoke('sp:connect'),
  spDisconnect: () => ipcRenderer.invoke('sp:disconnect'),
  spIsConnected: () => ipcRenderer.invoke('sp:isConnected'),
  spGetUser: () => ipcRenderer.invoke('sp:getUser'),
  spSearchSites: (query) => ipcRenderer.invoke('sp:searchSites', query),
  spGetSiteId: (siteUrl) => ipcRenderer.invoke('sp:getSiteId', siteUrl),
  spGetLists: (siteId) => ipcRenderer.invoke('sp:getLists', siteId),
  spGetListItems: (siteId, listId, top, skip) => ipcRenderer.invoke('sp:getListItems', siteId, listId, top, skip),
  spGetListColumns: (siteId, listId) => ipcRenderer.invoke('sp:getListColumns', siteId, listId),
  spCreateListItem: (siteId, listId, fields) => ipcRenderer.invoke('sp:createListItem', siteId, listId, fields),
  spUpdateListItem: (siteId, listId, itemId, fields) => ipcRenderer.invoke('sp:updateListItem', siteId, listId, itemId, fields),
  spDeleteListItem: (siteId, listId, itemId) => ipcRenderer.invoke('sp:deleteListItem', siteId, listId, itemId),
  spGetDrives: (siteId) => ipcRenderer.invoke('sp:getDrives', siteId),
  spGetDriveItems: (siteId, driveId, folderId) => ipcRenderer.invoke('sp:getDriveItems', siteId, driveId, folderId),
  spDownloadFile: (siteId, driveId, itemId, fileName) => ipcRenderer.invoke('sp:downloadFile', siteId, driveId, itemId, fileName),
  spUploadFile: (siteId, driveId, folderId) => ipcRenderer.invoke('sp:uploadFile', siteId, driveId, folderId),
  spDeleteItem: (siteId, driveId, itemId) => ipcRenderer.invoke('sp:deleteItem', siteId, driveId, itemId),
  spCreateFolder: (siteId, driveId, folderId, folderName) => ipcRenderer.invoke('sp:createFolder', siteId, driveId, folderId, folderName),

  /* Update checker */
  getUpdateState: () => ipcRenderer.invoke('app:getUpdateState'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('app:quitAndInstallUpdate'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  openInAppBrowser: (url, title) => ipcRenderer.invoke('app:openInAppBrowser', url, title),
  hubOpenTab: (url, title) => ipcRenderer.invoke('app:hubOpenTab', url, title),
  hubActivateTab: (tabId) => ipcRenderer.invoke('app:hubActivateTab', tabId),
  hubCloseTab: (tabId) => ipcRenderer.invoke('app:hubCloseTab', tabId),
  hubListTabs: () => ipcRenderer.invoke('app:hubListTabs'),
  hubFocusWindow: () => ipcRenderer.invoke('app:hubFocusWindow'),

  /* Menu events */
  onNavigate: (cb) => ipcRenderer.on('navigate', (_e, view) => cb(view)),
  onHubTabsChanged: (cb) => ipcRenderer.on('hub:tabsChanged', (_e, payload) => cb(payload)),
  onUpdateStatus: (cb) => ipcRenderer.on('app:update-status', (_e, payload) => cb(payload)),
  onToggleDark: (cb) => ipcRenderer.on('toggle-dark', () => cb()),
  onOpenCmdPalette: (cb) => ipcRenderer.on('open-cmd-palette', () => cb()),
});
