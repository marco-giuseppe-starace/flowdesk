import './App.css';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

/* ═══════════════════════ Types ═══════════════════════ */

type TaskStatus = 'Todo' | 'Doing' | 'Done';
type Priority = 'High' | 'Medium' | 'Low';
type Tool = 'PowerApps' | 'PowerAutomate' | 'PowerBI' | 'Teams' | 'Outlook' | 'OneNote' | 'SharePoint' | 'Excel' | 'Altro';
type ChangeType = 'Nuova funzionalità' | 'Correzione bug' | 'Modifica' | 'Configurazione' | 'Report' | 'UI/UX' | 'Integrazione' | 'Altro';
type NoteCategory = 'Riunione' | 'Call' | 'Idea' | 'Promemoria' | 'Problema' | 'Generale';
type SnippetLang = 'PowerFx' | 'DAX' | 'M' | 'JSON' | 'SQL' | 'JavaScript' | 'TypeScript' | 'HTML' | 'CSS' | 'Altro';
type BookmarkCat = 'Ambiente' | 'Documentazione' | 'Repository' | 'SharePoint' | 'API' | 'Altro';
type EnvType = 'Dev' | 'Test' | 'Prod' | 'Sandbox';
type EnvStatus = 'Attivo' | 'Inattivo' | 'Manutenzione';
type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
type BugStatus = 'Aperto' | 'In corso' | 'Risolto' | 'Chiuso';
type LearningCategory = 'Corso' | 'Certificazione' | 'Articolo' | 'Video' | 'Libro' | 'Altro';
type ViewName = 'dashboard' | 'tasks' | 'timer' | 'changes' | 'notes' | 'goals' | 'projects' | 'search' | 'history' | 'report' | 'snippets' | 'bookmarks' | 'backlog' | 'guide' | 'contacts' | 'environments' | 'retros' | 'bugs' | 'learning' | 'checklists' | 'appimpact' | 'analyzer' | 'fdhub' | 'aihub' | 'm365hub' | 'sharepoint' | 'updates' | 'trash';
type RecurrenceType = 'daily' | 'weekly' | 'monthly';
type TrashItem = { id: number; entityType: string; title: string; deletedAt: string };
type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; type: ToastType; message: string };

type UpdateInfo = {
  upToDate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
  downloadUrl?: string;
  releaseName?: string;
  publishedAt?: string;
  body?: string;
  error?: string;
  message?: string;
};

type Task = { id: number; title: string; description: string; plannedMinutes: number; priority: Priority; status: TaskStatus; scheduledDate: string; createdAt: string; projectId?: number | null; recurrence?: RecurrenceType | null; recurrenceParentId?: number | null };
type Session = { id: number; taskId: number; taskTitle: string; startedAt: string; endedAt?: string; durationMinutes?: number; note?: string };
type ChangeEntry = { id: number; taskId?: number; tool: Tool; artifact: string; changeType: ChangeType; summary: string; beforeText?: string; afterText?: string; testResult: string; workDate: string; createdAt: string; projectId?: number | null };
type Note = { id: number; category: NoteCategory; title: string; content: string; pinned: number; workDate: string; createdAt: string };
type Goal = { id: number; text: string; isDone: number; sortOrder: number; workDate: string; createdAt: string };
type Project = { id: number; name: string; color: string; description: string; isArchived: number; createdAt: string };
type Tag = { id: number; name: string; color: string };
type Template = { id: number; title: string; description: string; plannedMinutes: number; priority: Priority; tool: string; projectId?: number | null; createdAt: string };
type Snippet = { id: number; title: string; language: SnippetLang; code: string; description: string; isFavorite: number; createdAt: string };
type Bookmark = { id: number; title: string; url: string; category: BookmarkCat; description: string; projectId?: number | null; createdAt: string };
type TimeBudgetItem = { taskId: number; title: string; plannedMinutes: number; actualMinutes: number };
type TimeBudget = { tasks: TimeBudgetItem[]; totalPlanned: number; totalActual: number };
type Streak = { current: number; longest: number };
type ProjectStats = { taskStats: { status: string; count: number }[]; totalMinutes: number; changeCount: number };
type DayTime = { day: string; totalMinutes: number; sessionCount: number };
type ToolCount = { tool: string; count: number };
type StatusCount = { status: string; count: number };
type ChangeTypeCount = { changeType: string; count: number };
type WeekStats = { dailyTime: DayTime[]; toolUsage: ToolCount[]; taskStats: StatusCount[]; changeTypes: ChangeTypeCount[]; totalMinutes: number; goalStats: { total: number; done: number } };
type DaySummary = { day: string; tasks: Task[]; sessions: Session[]; changes: ChangeEntry[]; notes: Note[]; goals: Goal[]; totalMinutes: number; tasksDone: number; tasksTotal: number; goalsDone: number; goalsTotal: number };
type SearchResult = { tasks: Task[]; changes: ChangeEntry[]; notes: Note[] };

type Contact = { id: number; name: string; role: string; email: string; phone: string; company: string; notes: string; projectId?: number | null; createdAt: string };
type Environment = { id: number; name: string; url: string; envType: EnvType; status: EnvStatus; description: string; projectId?: number | null; createdAt: string };
type Retrospective = { id: number; weekStart: string; wentWell: string; toImprove: string; actions: string; createdAt: string };
type Bug = { id: number; title: string; description: string; severity: BugSeverity; status: BugStatus; stepsToReproduce: string; solution: string; projectId?: number | null; createdAt: string };
type LearningItem = { id: number; title: string; category: LearningCategory; url: string; progress: number; notes: string; completed: number; createdAt: string };
type Checklist = { id: number; title: string; description: string; projectId?: number | null; createdAt: string };
type ChecklistItem = { id: number; checklistId: number; text: string; isDone: number; sortOrder: number };

type FdhubRepo = { id: number; name: string; description: string; appType: string; projectId?: number | null; createdAt: string };
type FdhubCommit = { id: number; repoId: number; message: string; tag: string; fileName: string; filePath: string; fileSize: number; summaryJson: string; healthScore: number; screenCount: number; controlCount: number; formulaCount: number; datasourceCount: number; issueCount: number; createdAt: string };
type FdhubRepoStats = { totalCommits: number; latestCommit: FdhubCommit | null; firstCommit: FdhubCommit | null };
type Attachment = { id: number; entityType: string; entityId: number; fileName: string; filePath: string; fileSize: number; mimeType: string; createdAt: string };

/* ═══ SharePoint types ═══ */
type SpConfig = { clientId: string; tenantId: string; siteUrl: string };
type SpUser = { name: string; email: string };
type SpSite = { id: string; name: string; url: string; description: string };
type SpList = { id: string; name: string; description: string; template: string; lastModified: string; hidden: boolean };
type SpListItem = { id: string; fields: Record<string, unknown>; createdAt: string; modifiedAt: string };
type SpColumn = { name: string; displayName: string; type: string; required: boolean; choices: string[] };
type SpDrive = { id: string; name: string; description: string; webUrl: string; totalSize: number; usedSize: number };
type SpDriveItem = { id: string; name: string; isFolder: boolean; size: number; mimeType: string; webUrl: string; downloadUrl: string; lastModified: string; childCount: number; createdBy: string };
type SpTab = 'lists' | 'documents' | 'config';
type AiProvider = { id: string; name: string; description: string; vendor: string; url: string };
type HubTab = { id: string; title: string; url: string };

/* ═══ Power Apps Analyzer types ═══ */
type MsappFormulaComplexity = { length: number; nestingDepth: number; functionCount: number; uniqueFunctions: number; ifCount: number; semicolonCount?: number; score: number };
type MsappFormula = { screen: string; control: string; controlType: string; controlPath: string; property: string; formula: string; complexity?: MsappFormulaComplexity };
type MsappDataOp = { screen: string; control: string; controlPath: string; property: string; operation: string; target: string; fullExpression: string; formula: string };
type MsappFlowCall = { screen: string; control: string; controlPath: string; property: string; flowName: string; fullExpression: string; formula: string };
type MsappNavigation = { from: string; to: string; control: string; controlPath: string; property: string };
type MsappVariable = { type: string; name: string; setIn: { screen: string; control: string; property: string }[] };
type MsappDataSource = { name: string; type: string; tableName: string; connectorId: string; datasetName?: string; raw?: unknown };
type MsappConnection = { id: string; connectorId: string; displayName: string; connectionParamsJson?: string };
type MsappScreen = { name: string; fileName: string; controlCount: number; controls: MsappControlNode[] };
type MsappControlNode = { name: string; type: string; depth: number; ruleCount: number; children: MsappControlNode[] };
type MsappComponent = { name: string; description: string; version?: string };
type MsappScreenMap = { screen: string; navigatesTo: string[]; navigatesFrom: string[] };
type MsappDsUsage = { dataSourceName: string; usedIn: { screen: string; control: string; property: string }[] };
type MsappIssue = { id: string; severity: 'critical' | 'high' | 'medium' | 'low'; category: string; title: string; description: string; fix?: string; screen: string; control: string; controlPath?: string; property: string; formulaSnippet?: string; foundValues?: string[] };
type MsappControlLayout = { name: string; type: string; templateId?: string; screen: string; path: string; x: string; y: string; width: string; height: string; fill: string; color: string; borderColor?: string; visible: string; isLocked: boolean; children: MsappControlLayout[] };
type MsappHealthScore = { overall: number; grade: string; scores: { performance: number; delegation: number; maintainability: number; security: number; accessibility: number; architecture: number } };
type MsappFormulaComplexityAgg = { avgScore: number; maxScore: number; topComplex: { screen: string; control: string; property: string; formula: string; score: number; nestingDepth: number; functionCount: number; length: number }[]; distribution: { simple: number; moderate: number; complex: number; veryComplex: number } };
type MsappDepMatrix = { screen: string; dataSources: { name: string; readCount: number; writeCount: number; operations: string[] }[] };
type MsappScreenStat = { name: string; controlCount: number; formulaCount: number; dataOpCount: number; navigationCount: number; issueCount: number; complexFormulas: number };
type MsappSummary = { screenCount: number; totalControls: number; totalFormulas: number; dataOpCount: number; flowCallCount: number; dataSourceCount: number; connectionCount: number; componentCount: number; navigationCount: number; globalVarCount: number; contextVarCount: number; patchCount: number; submitFormCount: number; removeCount: number; collectCount: number; uniqueFlows: string[]; uniqueTablesWritten: string[]; issueCount?: number; criticalIssues?: number; highIssues?: number; mediumIssues?: number; lowIssues?: number; orphanScreenCount?: number; unusedDsCount?: number; unusedVarCount?: number; avgFormulaComplexity?: number; maxFormulaComplexity?: number; screenStats?: MsappScreenStat[] };
type MsappParsed = {
  _cacheId?: string; filePath?: string; fileName?: string;
  appName: string; appVersion: string; appId: string; createdAt: string; modifiedAt: string; publisher: string;
  screens: MsappScreen[]; dataSources: MsappDataSource[]; connections: MsappConnection[]; components: MsappComponent[];
  formulas: MsappFormula[]; dataOps: MsappDataOp[]; flowCalls: MsappFlowCall[]; navigations: MsappNavigation[];
  variables: MsappVariable[]; summary: MsappSummary; dataSourceUsage: MsappDsUsage[]; screenMap: MsappScreenMap[]; errors: string[];
  issues: MsappIssue[]; screenLayouts: MsappControlLayout[]; formulaComplexity: MsappFormulaComplexityAgg;
  orphanScreens: string[]; unusedDataSources: string[]; unusedVariables: { type: string; name: string; definedIn: { screen: string; control: string; property: string }[] }[];
  healthScore: MsappHealthScore; dependencyMatrix: MsappDepMatrix[];
};
type MsappDiff = {
  screensAdded: string[]; screensRemoved: string[];
  screensModified: { name: string; controlsBefore: number; controlsAfter: number; formulasBefore: number; formulasAfter: number }[];
  formulasAdded: MsappFormula[]; formulasRemoved: MsappFormula[]; formulasChanged: { before: MsappFormula; after: MsappFormula }[];
  dataOpsAdded: MsappDataOp[]; dataOpsRemoved: MsappDataOp[];
  dataSourcesAdded: string[]; dataSourcesRemoved: string[];
  summaryA: MsappSummary; summaryB: MsappSummary;
  error?: string;
};
type AnalyzerTab = 'overview' | 'health' | 'issues' | 'screens' | 'dataops' | 'flows' | 'datasources' | 'variables' | 'navigation' | 'formulas' | 'dependencies' | 'layout' | 'diff';

type FlowdeskApi = {
  listTasks: (date?: string, projectId?: number | null) => Promise<Task[]>;
  createTask: (p: { title: string; description?: string; plannedMinutes: number; priority: Priority; scheduledDate: string; projectId?: number | null }) => Promise<Task>;
  updateTask: (id: number, p: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<{ ok: boolean }>;
  setTaskStatus: (id: number, status: TaskStatus) => Promise<Task>;
  duplicateTask: (id: number, date: string) => Promise<Task | null>;
  startSession: (taskId: number) => Promise<Session>;
  stopSession: (note: string) => Promise<Session | null>;
  getActiveSession: () => Promise<Session | null>;
  listSessions: (day: string) => Promise<Session[]>;
  addChange: (p: { taskId?: number; tool: Tool; artifact: string; changeType: ChangeType; summary: string; beforeText?: string; afterText?: string; testResult: string; workDate: string; projectId?: number | null }) => Promise<ChangeEntry>;
  listChanges: (day: string) => Promise<ChangeEntry[]>;
  updateChange: (id: number, p: Partial<ChangeEntry>) => Promise<ChangeEntry>;
  deleteChange: (id: number) => Promise<{ ok: boolean }>;
  createNote: (p: { category: NoteCategory; title: string; content?: string; workDate: string }) => Promise<Note>;
  listNotes: (day: string) => Promise<Note[]>;
  togglePinNote: (id: number) => Promise<Note>;
  deleteNote: (id: number) => Promise<{ ok: boolean }>;
  updateNote: (id: number, p: Partial<Note>) => Promise<Note>;
  createGoal: (p: { text: string; workDate: string }) => Promise<Goal>;
  listGoals: (day: string) => Promise<Goal[]>;
  toggleGoal: (id: number) => Promise<Goal>;
  updateGoal: (id: number, p: { text: string }) => Promise<Goal>;
  deleteGoal: (id: number) => Promise<{ ok: boolean }>;
  getWeekStats: (start: string, end: string) => Promise<WeekStats>;
  searchAll: (query: string) => Promise<SearchResult>;
  getActiveDays: (start: string, end: string) => Promise<string[]>;
  getDaySummary: (day: string) => Promise<DaySummary>;
  exportCsv: (start: string, end: string) => Promise<{ sessionsCsv: string; changesCsv: string }>;
  createProject: (p: { name: string; color?: string; description?: string }) => Promise<Project>;
  listProjects: (inclArchived?: boolean) => Promise<Project[]>;
  updateProject: (id: number, p: Partial<Project>) => Promise<Project>;
  deleteProject: (id: number) => Promise<{ ok: boolean }>;
  getProjectStats: (id: number) => Promise<ProjectStats>;
  createTag: (p: { name: string; color?: string }) => Promise<Tag>;
  listTags: () => Promise<Tag[]>;
  updateTag: (id: number, p: { name?: string; color?: string }) => Promise<Tag>;
  deleteTag: (id: number) => Promise<{ ok: boolean }>;
  addTagToTask: (taskId: number, tagId: number) => Promise<Tag[]>;
  removeTagFromTask: (taskId: number, tagId: number) => Promise<Tag[]>;
  getTaskTags: (taskId: number) => Promise<Tag[]>;
  createTemplate: (p: { title: string; description?: string; plannedMinutes?: number; priority?: Priority; tool?: string; projectId?: number | null }) => Promise<Template>;
  listTemplates: () => Promise<Template[]>;
  deleteTemplate: (id: number) => Promise<{ ok: boolean }>;
  createTaskFromTemplate: (tplId: number, date: string) => Promise<Task | null>;
  notify: (title: string, body: string) => Promise<{ ok: boolean }>;
  createSnippet: (p: { title: string; language?: SnippetLang; code?: string; description?: string }) => Promise<Snippet>;
  listSnippets: (lang?: SnippetLang | null) => Promise<Snippet[]>;
  updateSnippet: (id: number, p: Partial<Snippet>) => Promise<Snippet>;
  toggleSnippetFav: (id: number) => Promise<Snippet>;
  deleteSnippet: (id: number) => Promise<{ ok: boolean }>;
  createBookmark: (p: { title: string; url: string; category?: BookmarkCat; description?: string; projectId?: number | null }) => Promise<Bookmark>;
  listBookmarks: (cat?: BookmarkCat | null) => Promise<Bookmark[]>;
  updateBookmark: (id: number, p: Partial<Bookmark>) => Promise<Bookmark>;
  deleteBookmark: (id: number) => Promise<{ ok: boolean }>;
  getBacklog: () => Promise<Task[]>;
  rescheduleTask: (id: number, date: string) => Promise<Task>;
  getStreak: () => Promise<Streak>;
  getTimeBudget: (date?: string) => Promise<TimeBudget>;
  resetAllData: () => Promise<{ ok: boolean }>;
  onNavigate: (cb: (view: string) => void) => void;
  onToggleDark: (cb: () => void) => void;
  onOpenCmdPalette: (cb: () => void) => void;
  createContact: (p: { name: string; role?: string; email?: string; phone?: string; company?: string; notes?: string; projectId?: number | null }) => Promise<Contact>;
  listContacts: (projectId?: number | null) => Promise<Contact[]>;
  updateContact: (id: number, p: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: number) => Promise<{ ok: boolean }>;
  createEnvironment: (p: { name: string; url?: string; envType?: EnvType; status?: EnvStatus; description?: string; projectId?: number | null }) => Promise<Environment>;
  listEnvironments: (projectId?: number | null) => Promise<Environment[]>;
  updateEnvironment: (id: number, p: Partial<Environment>) => Promise<Environment>;
  deleteEnvironment: (id: number) => Promise<{ ok: boolean }>;
  createRetrospective: (p: { weekStart: string; wentWell?: string; toImprove?: string; actions?: string }) => Promise<Retrospective>;
  listRetrospectives: () => Promise<Retrospective[]>;
  updateRetrospective: (id: number, p: Partial<Retrospective>) => Promise<Retrospective>;
  deleteRetrospective: (id: number) => Promise<{ ok: boolean }>;
  createBug: (p: { title: string; description?: string; severity?: BugSeverity; status?: BugStatus; stepsToReproduce?: string; solution?: string; projectId?: number | null }) => Promise<Bug>;
  listBugs: (projectId?: number | null, status?: BugStatus | null) => Promise<Bug[]>;
  updateBug: (id: number, p: Partial<Bug>) => Promise<Bug>;
  deleteBug: (id: number) => Promise<{ ok: boolean }>;
  createLearning: (p: { title: string; category?: LearningCategory; url?: string; progress?: number; notes?: string }) => Promise<LearningItem>;
  listLearning: (cat?: LearningCategory | null) => Promise<LearningItem[]>;
  updateLearning: (id: number, p: Partial<LearningItem>) => Promise<LearningItem>;
  deleteLearning: (id: number) => Promise<{ ok: boolean }>;
  createChecklist: (p: { title: string; description?: string; projectId?: number | null }) => Promise<Checklist>;
  listChecklists: (projectId?: number | null) => Promise<Checklist[]>;
  updateChecklist: (id: number, p: Partial<Checklist>) => Promise<Checklist>;
  deleteChecklist: (id: number) => Promise<{ ok: boolean }>;
  getChecklistItems: (checklistId: number) => Promise<ChecklistItem[]>;
  addChecklistItem: (p: { checklistId: number; text: string }) => Promise<ChecklistItem>;
  toggleChecklistItem: (id: number) => Promise<ChecklistItem>;
  updateChecklistItem: (id: number, p: { text: string }) => Promise<ChecklistItem>;
  deleteChecklistItem: (id: number) => Promise<{ ok: boolean }>;
  /* Power Apps Analyzer */
  msappOpenFile: () => Promise<MsappParsed | null>;
  msappParseBuffer: (buf: number[]) => Promise<MsappParsed>;
  msappDiff: (idA: string, idB: string) => Promise<MsappDiff>;
  msappOpenSecondFile: () => Promise<MsappParsed | null>;
  analyzerExportPdf: (data: MsappParsed) => Promise<{ ok: boolean; path?: string; error?: string }>;
  reportExportPdf: (html: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  getAppVersion: () => Promise<string>;
  /* FDHub */
  fdhubCreateRepo: (p: { name: string; description?: string; appType?: string; projectId?: number | null }) => Promise<FdhubRepo>;
  fdhubListRepos: (projectId?: number | null) => Promise<FdhubRepo[]>;
  fdhubUpdateRepo: (id: number, p: Partial<FdhubRepo>) => Promise<FdhubRepo>;
  fdhubDeleteRepo: (id: number) => Promise<{ ok: boolean }>;
  fdhubRepoStats: (id: number) => Promise<FdhubRepoStats>;
  fdhubCommit: (repoId: number, message: string, tag?: string) => Promise<FdhubCommit | null>;
  fdhubListCommits: (repoId: number) => Promise<FdhubCommit[]>;
  fdhubGetCommit: (id: number) => Promise<FdhubCommit | null>;
  fdhubDeleteCommit: (id: number) => Promise<{ ok: boolean }>;
  fdhubExportCommit: (id: number) => Promise<{ ok: boolean; path?: string; error?: string }>;
  fdhubDiffCommits: (idA: number, idB: number) => Promise<MsappDiff>;
  /* Attachments */
  addAttachments: (entityType: string, entityId: number) => Promise<Attachment[]>;
  listAttachments: (entityType: string, entityId: number) => Promise<Attachment[]>;
  deleteAttachment: (id: number) => Promise<{ ok: boolean }>;
  openAttachment: (filePath: string) => Promise<{ ok: boolean }>;
  /* SharePoint */
  spGetConfig: () => Promise<SpConfig | null>;
  spSaveConfig: (cfg: SpConfig) => Promise<{ ok: boolean }>;
  spConnect: () => Promise<{ ok: boolean; user: SpUser }>;
  spDisconnect: () => Promise<{ ok: boolean }>;
  spIsConnected: () => Promise<boolean>;
  spGetUser: () => Promise<SpUser | null>;
  spSearchSites: (query: string) => Promise<SpSite[]>;
  spGetSiteId: (siteUrl: string) => Promise<string>;
  spGetLists: (siteId: string) => Promise<SpList[]>;
  spGetListItems: (siteId: string, listId: string, top?: number, skip?: number) => Promise<{ items: SpListItem[]; hasMore: boolean }>;
  spGetListColumns: (siteId: string, listId: string) => Promise<SpColumn[]>;
  spCreateListItem: (siteId: string, listId: string, fields: Record<string, unknown>) => Promise<{ id: string; fields: Record<string, unknown> }>;
  spUpdateListItem: (siteId: string, listId: string, itemId: string, fields: Record<string, unknown>) => Promise<{ ok: boolean }>;
  spDeleteListItem: (siteId: string, listId: string, itemId: string) => Promise<{ ok: boolean }>;
  spGetDrives: (siteId: string) => Promise<SpDrive[]>;
  spGetDriveItems: (siteId: string, driveId: string, folderId?: string) => Promise<SpDriveItem[]>;
  spDownloadFile: (siteId: string, driveId: string, itemId: string, fileName: string) => Promise<{ ok: boolean; path?: string }>;
  spUploadFile: (siteId: string, driveId: string, folderId?: string) => Promise<{ ok: boolean; id?: string; name?: string; webUrl?: string; size?: number } | null>;
  spDeleteItem: (siteId: string, driveId: string, itemId: string) => Promise<{ ok: boolean }>;
  spCreateFolder: (siteId: string, driveId: string, folderId: string | undefined, folderName: string) => Promise<{ ok: boolean; id?: string; name?: string }>;
  /* Update checker */
  checkForUpdates: () => Promise<UpdateInfo>;
  openExternal: (url: string) => Promise<void>;
  openInAppBrowser: (url: string, title?: string) => Promise<{ ok: boolean; error?: string }>;
  hubOpenTab: (url: string, title?: string) => Promise<{ ok: boolean; tabId?: string; error?: string }>;
  hubActivateTab: (tabId: string) => Promise<{ ok: boolean; tabId?: string; error?: string }>;
  hubCloseTab: (tabId: string) => Promise<{ ok: boolean; error?: string }>;
  hubListTabs: () => Promise<{ tabs: HubTab[]; activeTabId: string | null }>;
  hubFocusWindow: () => Promise<{ ok: boolean }>;
  /* Batch tags */
  getAllTaskTags: (taskIds: number[]) => Promise<Record<number, Tag[]>>;
  /* Recurring tasks */
  generateRecurringTasks: (date: string) => Promise<{ generated: number }>;
  /* Trash / Cestino */
  getTrashItems: () => Promise<TrashItem[]>;
  restoreTrashItem: (entityType: string, id: number) => Promise<{ ok: boolean; error?: string }>;
  permanentDeleteTrashItem: (entityType: string, id: number) => Promise<{ ok: boolean; error?: string }>;
  emptyTrash: () => Promise<{ ok: boolean }>;
  /* Full JSON export */
  exportFullJson: () => Promise<{ ok: boolean; path?: string }>;
  onHubTabsChanged: (cb: (payload: { tabs: HubTab[]; activeTabId: string | null }) => void) => void;
};

declare global { interface Window { flowdesk?: FlowdeskApi } }

/* ═══════════════════════ Constants ═══════════════════════ */

const TOOLS: Tool[] = ['PowerApps', 'PowerAutomate', 'PowerBI', 'Teams', 'Outlook', 'OneNote', 'SharePoint', 'Excel', 'Altro'];
const CHANGE_TYPES: ChangeType[] = ['Nuova funzionalità', 'Correzione bug', 'Modifica', 'Configurazione', 'Report', 'UI/UX', 'Integrazione', 'Altro'];
const NOTE_CATS: NoteCategory[] = ['Riunione', 'Call', 'Idea', 'Promemoria', 'Problema', 'Generale'];
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
const PRI_LABEL: Record<Priority, string> = { High: 'Alta', Medium: 'Media', Low: 'Bassa' };
const STATUS_LABEL: Record<TaskStatus, string> = { Todo: 'Da fare', Doing: 'In corso', Done: 'Fatto' };
const TOOL_LABEL: Record<Tool, string> = { PowerApps: 'Power Apps', PowerAutomate: 'Power Automate', PowerBI: 'Power BI', Teams: 'Teams', Outlook: 'Outlook', OneNote: 'OneNote', SharePoint: 'SharePoint', Excel: 'Excel', Altro: 'Altro' };
const SNIPPET_LANGS: SnippetLang[] = ['PowerFx', 'DAX', 'M', 'JSON', 'SQL', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Altro'];
const BOOKMARK_CATS: BookmarkCat[] = ['Ambiente', 'Documentazione', 'Repository', 'SharePoint', 'API', 'Altro'];
const ENV_TYPES: EnvType[] = ['Dev', 'Test', 'Prod', 'Sandbox'];
const ENV_STATUSES: EnvStatus[] = ['Attivo', 'Inattivo', 'Manutenzione'];
const BUG_SEVERITIES: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const BUG_STATUSES: BugStatus[] = ['Aperto', 'In corso', 'Risolto', 'Chiuso'];
const LEARNING_CATS: LearningCategory[] = ['Corso', 'Certificazione', 'Articolo', 'Video', 'Libro', 'Altro'];
const SEV_LABEL: Record<BugSeverity, string> = { Critical: 'Critico', High: 'Alto', Medium: 'Medio', Low: 'Basso' };

const NAV: { id: ViewName; icon: string; label: string }[] = [
  // ── Pianificazione ──
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { id: 'goals', icon: 'flag', label: 'Obiettivi' },
  { id: 'projects', icon: 'folder', label: 'Progetti' },
  { id: 'environments', icon: 'cloud', label: 'Ambienti' },
  { id: 'contacts', icon: 'contacts', label: 'Contatti' },
  // ── Esecuzione ──
  { id: 'tasks', icon: 'task_alt', label: 'Attività' },
  { id: 'backlog', icon: 'inventory_2', label: 'Backlog' },
  { id: 'timer', icon: 'timer', label: 'Timer' },
  { id: 'changes', icon: 'assignment', label: 'Registro' },
  { id: 'bugs', icon: 'bug_report', label: 'Bug Tracker' },
  { id: 'checklists', icon: 'checklist', label: 'Checklist' },
  // ── Conoscenza ──
  { id: 'notes', icon: 'edit_note', label: 'Appunti' },
  { id: 'snippets', icon: 'code', label: 'Snippets' },
  { id: 'bookmarks', icon: 'bookmark', label: 'Link utili' },
  { id: 'learning', icon: 'school', label: 'Formazione' },
  // ── Analisi ──
  { id: 'appimpact', icon: 'insights', label: 'App Impact' },
  { id: 'analyzer', icon: 'analytics', label: 'App Analyzer' },
  { id: 'fdhub', icon: 'hub', label: 'FDHub' },
  { id: 'aihub', icon: 'smart_toy', label: 'AI Hub' },
  { id: 'm365hub', icon: 'apartment', label: 'M365 Hub' },
  { id: 'sharepoint', icon: 'share', label: 'SharePoint' },
  // ── Revisione ──
  { id: 'retros', icon: 'psychology', label: 'Retrospettive' },
  { id: 'history', icon: 'calendar_month', label: 'Storico' },
  { id: 'report', icon: 'description', label: 'Report' },
  // ── Utility ──
  { id: 'search', icon: 'search', label: 'Ricerca' },
  { id: 'trash', icon: 'delete', label: 'Cestino' },
  { id: 'updates', icon: 'system_update', label: 'Aggiornamenti' },
  { id: 'guide', icon: 'help', label: 'Guida' },
];

const AI_PROVIDERS: AiProvider[] = [
  { id: 'chatgpt', name: 'ChatGPT', description: 'Assistente generale, coding e analisi.', vendor: 'OpenAI', url: 'https://chat.openai.com/' },
  { id: 'copilot', name: 'Copilot', description: 'Assistente Microsoft con focus produttivita.', vendor: 'Microsoft', url: 'https://copilot.microsoft.com/' },
  { id: 'gemini', name: 'Gemini', description: 'Modello multimodale Google.', vendor: 'Google', url: 'https://gemini.google.com/app' },
  { id: 'claude', name: 'Claude', description: 'Analisi testo lunga e reasoning.', vendor: 'Anthropic', url: 'https://claude.ai/' },
  { id: 'perplexity', name: 'Perplexity', description: 'Risposte con ricerca web.', vendor: 'Perplexity', url: 'https://www.perplexity.ai/' },
  { id: 'grok', name: 'Grok', description: 'Assistente AI di xAI.', vendor: 'xAI', url: 'https://grok.com/' },
  { id: 'mistral', name: 'Le Chat', description: 'Chat AI di Mistral.', vendor: 'Mistral', url: 'https://chat.mistral.ai/' },
  { id: 'meta-ai', name: 'Meta AI', description: 'Assistente AI Meta.', vendor: 'Meta', url: 'https://www.meta.ai/' },
  { id: 'poe', name: 'Poe', description: 'Hub multi-modello.', vendor: 'Quora', url: 'https://poe.com/' },
  { id: 'you', name: 'You.com', description: 'Ricerca + chat AI.', vendor: 'You.com', url: 'https://you.com/' },
];

const M365_APPS: AiProvider[] = [
  { id: 'm365-home', name: 'Microsoft 365', description: 'Home del workspace Microsoft 365.', vendor: 'Microsoft', url: 'https://www.office.com/' },
  { id: 'outlook', name: 'Outlook', description: 'Email e calendario.', vendor: 'Microsoft', url: 'https://outlook.office.com/' },
  { id: 'teams', name: 'Teams', description: 'Chat, call e collaborazione.', vendor: 'Microsoft', url: 'https://teams.microsoft.com/' },
  { id: 'onedrive', name: 'OneDrive', description: 'Documenti cloud.', vendor: 'Microsoft', url: 'https://onedrive.live.com/' },
  { id: 'sharepoint-web', name: 'SharePoint Web', description: 'Siti e document libraries.', vendor: 'Microsoft', url: 'https://www.microsoft365.com/launch/sharepoint' },
  { id: 'planner', name: 'Planner', description: 'Piani e task board.', vendor: 'Microsoft', url: 'https://planner.cloud.microsoft/' },
  { id: 'todo', name: 'To Do', description: 'Task personali.', vendor: 'Microsoft', url: 'https://to-do.office.com/' },
  { id: 'loop', name: 'Loop', description: 'Workspace collaborativi.', vendor: 'Microsoft', url: 'https://loop.microsoft.com/' },
  { id: 'forms', name: 'Forms', description: 'Form e sondaggi.', vendor: 'Microsoft', url: 'https://forms.office.com/' },
  { id: 'powerapps', name: 'Power Apps', description: 'App low-code.', vendor: 'Microsoft', url: 'https://make.powerapps.com/' },
  { id: 'powerautomate', name: 'Power Automate', description: 'Workflow e automazioni.', vendor: 'Microsoft', url: 'https://make.powerautomate.com/' },
  { id: 'powerbi', name: 'Power BI', description: 'Dashboard e analytics.', vendor: 'Microsoft', url: 'https://app.powerbi.com/' },
];

/* ═══════════════════════ Helpers ═══════════════════════ */

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtMin(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function elapsed(startedAt: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

function dateLong(iso: string) {
  const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const [y, m, d] = iso.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return `${days[dt.getDay()]} ${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function toolCls(tool: string) { return tool.toLowerCase().replace(/\s+/g, ''); }

function weekRange(offset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const dayOfWeek = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(mon), end: fmt(sun) };
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function nextDay(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const TAG_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4'];
const PROJECT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#64748b'];

function mi(name: string) { return <span className="material-symbols-outlined">{name}</span>; }

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════ App ═══════════════════════ */

function App() {
  const api = window.flowdesk;

  const [view, setView] = useState<ViewName>('dashboard');
  const [today] = useState(todayStr());

  /* ── Core data ── */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  /* ── Task form ── */
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskMin, setTaskMin] = useState(60);
  const [taskPri, setTaskPri] = useState<Priority>('Medium');

  /* ── Stop note ── */
  const [stopNote, setStopNote] = useState('');

  /* ── Change form ── */
  const [chgTool, setChgTool] = useState<Tool>('PowerApps');
  const [chgType, setChgType] = useState<ChangeType>('Modifica');
  const [chgArtifact, setChgArtifact] = useState('');
  const [chgSummary, setChgSummary] = useState('');
  const [chgBefore, setChgBefore] = useState('');
  const [chgAfter, setChgAfter] = useState('');
  const [chgTest, setChgTest] = useState('Non testato');
  const [chgTaskId, setChgTaskId] = useState<number | ''>('');

  /* ── Note form ── */
  const [noteCat, setNoteCat] = useState<NoteCategory>('Generale');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  /* ── Goal form ── */
  const [goalText, setGoalText] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editingGoalText, setEditingGoalText] = useState('');

  /* ── Projects ── */
  const [projects, setProjects] = useState<Project[]>([]);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projColor, setProjColor] = useState(PROJECT_COLORS[0]);
  const [selectedProjId, setSelectedProjId] = useState<number | null>(null);
  const [projStats, setProjStats] = useState<ProjectStats | null>(null);
  const [editingProjId, setEditingProjId] = useState<number | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjColor, setEditProjColor] = useState('');

  /* ── Tags ── */
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);
  const [taskTagsMap, setTaskTagsMap] = useState<Record<number, Tag[]>>({});
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  /* ── Templates ── */
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplTitle, setTplTitle] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplMin, setTplMin] = useState(60);
  const [tplPri, setTplPri] = useState<Priority>('Medium');
  const [tplTool, setTplTool] = useState('');
  const [tplProjId, setTplProjId] = useState<number | ''>('');

  /* ── Task project selector ── */
  const [taskProjId, setTaskProjId] = useState<number | ''>('');
  const [chgProjId, setChgProjId] = useState<number | ''>('');

  /* ── Dark mode ── */
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('fd-dark') === '1');

  /* ── Edit modals ── */
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editNote, setEditNote] = useState<Note | null>(null);

  /* ── Snippets ── */
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snipTitle, setSnipTitle] = useState('');
  const [snipLang, setSnipLang] = useState<SnippetLang>('PowerFx');
  const [snipCode, setSnipCode] = useState('');
  const [snipDesc, setSnipDesc] = useState('');
  const [snipFilter, setSnipFilter] = useState<SnippetLang | ''>('');
  const [editSnippet, setEditSnippet] = useState<Snippet | null>(null);
  const [snipCopied, setSnipCopied] = useState<number | null>(null);

  /* ── Bookmarks ── */
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bmTitle, setBmTitle] = useState('');
  const [bmUrl, setBmUrl] = useState('');
  const [bmCat, setBmCat] = useState<BookmarkCat>('Altro');
  const [bmDesc, setBmDesc] = useState('');
  const [bmProjId, setBmProjId] = useState<number | ''>('');
  const [bmFilter, setBmFilter] = useState<BookmarkCat | ''>('');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  /* ── Backlog ── */
  const [backlog, setBacklog] = useState<Task[]>([]);

  /* ── Streak & Time Budget ── */
  const [streak, setStreak] = useState<Streak>({ current: 0, longest: 0 });
  const [timeBudget, setTimeBudget] = useState<TimeBudget | null>(null);

  /* ── Contacts ── */
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ctName, setCtName] = useState('');
  const [ctRole, setCtRole] = useState('');
  const [ctEmail, setCtEmail] = useState('');
  const [ctPhone, setCtPhone] = useState('');
  const [ctCompany, setCtCompany] = useState('');
  const [ctNotes, setCtNotes] = useState('');
  const [ctProjId, setCtProjId] = useState<number | ''>('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  /* ── Environments ── */
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [envName, setEnvName] = useState('');
  const [envUrl, setEnvUrl] = useState('');
  const [envType, setEnvType] = useState<EnvType>('Dev');
  const [envStatus, setEnvStatus] = useState<EnvStatus>('Attivo');
  const [envDesc, setEnvDesc] = useState('');
  const [envProjId, setEnvProjId] = useState<number | ''>('');
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

  /* ── Retrospectives ── */
  const [retros, setRetros] = useState<Retrospective[]>([]);
  const [retroWell, setRetroWell] = useState('');
  const [retroImprove, setRetroImprove] = useState('');
  const [retroActions, setRetroActions] = useState('');
  const [editRetro, setEditRetro] = useState<Retrospective | null>(null);

  /* ── Bugs ── */
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugSeverity, setBugSeverity] = useState<BugSeverity>('Medium');
  const [bugSteps, setBugSteps] = useState('');
  const [bugProjId, setBugProjId] = useState<number | ''>('');
  const [bugFilter, setBugFilter] = useState<BugStatus | ''>('');
  const [editBug, setEditBug] = useState<Bug | null>(null);

  /* ── Learning ── */
  const [learningList, setLearningList] = useState<LearningItem[]>([]);
  const [learnTitle, setLearnTitle] = useState('');
  const [learnCat, setLearnCat] = useState<LearningCategory>('Corso');
  const [learnUrl, setLearnUrl] = useState('');
  const [learnNotes, setLearnNotes] = useState('');
  const [learnFilter, setLearnFilter] = useState<LearningCategory | ''>('');
  const [editLearn, setEditLearn] = useState<LearningItem | null>(null);

  /* ── Checklists ── */
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [clTitle, setClTitle] = useState('');
  const [clDesc, setClDesc] = useState('');
  const [clProjId, setClProjId] = useState<number | ''>('');
  const [selectedCl, setSelectedCl] = useState<number | null>(null);
  const [clItems, setClItems] = useState<ChecklistItem[]>([]);
  const [clNewItem, setClNewItem] = useState('');
  const [editingCl, setEditingCl] = useState<Checklist | null>(null);
  const [editingClItemId, setEditingClItemId] = useState<number | null>(null);
  const [editingClItemText, setEditingClItemText] = useState('');
  const [editingChangeId, setEditingChangeId] = useState<number | null>(null);
  const [editChange, setEditChange] = useState<Partial<ChangeEntry>>({});

  /* ── FDHub ── */
  const [fdhubRepos, setFdhubRepos] = useState<FdhubRepo[]>([]);
  const [fdhubRepoName, setFdhubRepoName] = useState('');
  const [fdhubRepoDesc, setFdhubRepoDesc] = useState('');
  const [fdhubRepoProjId, setFdhubRepoProjId] = useState<number | ''>('');
  const [fdhubSelectedRepo, setFdhubSelectedRepo] = useState<number | null>(null);
  const [fdhubCommits, setFdhubCommits] = useState<FdhubCommit[]>([]);
  const [fdhubCommitMsg, setFdhubCommitMsg] = useState('');
  const [fdhubCommitTag, setFdhubCommitTag] = useState('');
  const [fdhubRepoStats, setFdhubRepoStats] = useState<FdhubRepoStats | null>(null);
  const [fdhubDiffA, setFdhubDiffA] = useState<number | ''>('');
  const [fdhubDiffB, setFdhubDiffB] = useState<number | ''>('');
  const [fdhubDiffResult, setFdhubDiffResult] = useState<MsappDiff | null>(null);
  const [fdhubDiffLoading, setFdhubDiffLoading] = useState(false);
  const [fdhubCommitting, setFdhubCommitting] = useState(false);
  const [editingFdhubRepo, setEditingFdhubRepo] = useState<FdhubRepo | null>(null);

  /* ── Power Apps Analyzer ── */
  const [msappData, setMsappData] = useState<MsappParsed | null>(null);
  const [msappLoading, setMsappLoading] = useState(false);
  const [msappTab, setMsappTab] = useState<AnalyzerTab>('overview');
  const [msappSearch, setMsappSearch] = useState('');
  const [msappDiffData, setMsappDiffData] = useState<MsappDiff | null>(null);
  const [msappSecond, setMsappSecond] = useState<MsappParsed | null>(null);
  const [msappExpandedScreen, setMsappExpandedScreen] = useState<string | null>(null);
  const [msappExpandedFormula, setMsappExpandedFormula] = useState<number | null>(null);

  /* ── SharePoint ── */
  const [spTab, setSpTab] = useState<SpTab>('config');
  const [spCfg, setSpCfg] = useState<SpConfig>({ clientId: '', tenantId: '', siteUrl: '' });
  const [spConnected, setSpConnected] = useState(false);
  const [spUser, setSpUser] = useState<SpUser | null>(null);
  const [spLoading, setSpLoading] = useState(false);
  const [spError, setSpError] = useState('');
  const [spSiteId, setSpSiteId] = useState('');
  // Lists
  const [spLists, setSpLists] = useState<SpList[]>([]);
  const [spSelectedList, setSpSelectedList] = useState<SpList | null>(null);
  const [spListItems, setSpListItems] = useState<SpListItem[]>([]);
  const [spListColumns, setSpListColumns] = useState<SpColumn[]>([]);
  const [spNewItemFields, setSpNewItemFields] = useState<Record<string, string>>({});
  const [spEditItemId, setSpEditItemId] = useState<string | null>(null);
  const [spEditFields, setSpEditFields] = useState<Record<string, string>>({});
  // Documents
  const [spDrives, setSpDrives] = useState<SpDrive[]>([]);
  const [spSelectedDrive, setSpSelectedDrive] = useState<SpDrive | null>(null);
  const [spDriveItems, setSpDriveItems] = useState<SpDriveItem[]>([]);
  const [spFolderStack, setSpFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [spNewFolderName, setSpNewFolderName] = useState('');

  /* ── Update Checker ── */
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [aiProviderId, setAiProviderId] = useState(AI_PROVIDERS[0].id);
  const [m365AppId, setM365AppId] = useState(M365_APPS[0].id);
  const [hubTabs, setHubTabs] = useState<HubTab[]>([]);
  const [hubActiveTabId, setHubActiveTabId] = useState<string | null>(null);

  /* ── Reset Data ── */
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetDone, setResetDone] = useState(false);

  /* ── Command Palette ── */
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const cmdRef = useRef<HTMLInputElement>(null);

  /* ── App version ── */
  const [appVersion, setAppVersion] = useState('0.0.0');

  /* ── Attachments cache ── */
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, Attachment[]>>({});
  const confirmDelete = useCallback((message: string) => window.confirm(message), []);

  const loadAttachments = useCallback(async (entityType: string, entityId: number) => {
    if (!api) return;
    const key = `${entityType}:${entityId}`;
    const list = await api.listAttachments(entityType, entityId);
    setAttachmentsMap(prev => ({ ...prev, [key]: list }));
  }, [api]);

  const AttachmentSection = useCallback(({ entityType, entityId }: { entityType: string; entityId: number }) => {
    const key = `${entityType}:${entityId}`;
    const atts = attachmentsMap[key] || [];
    const loaded = key in attachmentsMap;
    return (
      <div className="attachments-section">
        {!loaded && <button className="btn-xs btn-ghost" onClick={() => loadAttachments(entityType, entityId)}>{mi('attach_file')} Allegati</button>}
        {loaded && (
          <>
            <div className="attachments-header">
              <span className="attachments-label">{mi('attach_file')} Allegati ({atts.length})</span>
              <button className="btn-xs btn-ghost" onClick={async () => {
                if (!api) return;
                await api.addAttachments(entityType, entityId);
                loadAttachments(entityType, entityId);
              }}>{mi('add')} Aggiungi</button>
            </div>
            {atts.length > 0 && (
              <div className="attachments-list">
                {atts.map(a => (
                  <div key={a.id} className="attachment-item">
                    <span className="attachment-icon">{mi(a.mimeType.startsWith('image/') ? 'image' : a.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'description')}</span>
                    <span className="attachment-name" title={a.fileName} onClick={() => api?.openAttachment(a.filePath)}>{a.fileName}</span>
                    <span className="attachment-size">{(a.fileSize / 1024).toFixed(0)} KB</span>
                    <button className="btn-icon btn-del btn-xs" onClick={async () => {
                      if (!confirmDelete('Eliminare questo allegato?')) return;
                      if (!api) return;
                      await api.deleteAttachment(a.id);
                      loadAttachments(entityType, entityId);
                    }}>{mi('close')}</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }, [api, attachmentsMap, confirmDelete, loadAttachments]);

  /* ── Pomodoro ── */
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoSec, setPomoSec] = useState(25 * 60);
  const [pomoPhase, setPomoPhase] = useState<'focus' | 'break'>('focus');
  const [pomoCycles, setPomoCycles] = useState(0);
  const pomoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Toast notifications ── */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  /* ── Trash / Cestino ── */
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);

  /* ── Drag-and-drop Kanban ── */
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  /* ── Recurring task form ── */
  const [taskRecurrence, setTaskRecurrence] = useState<RecurrenceType | ''>('');

  /* ── Stats ── */
  const [statsWeekOff, setStatsWeekOff] = useState(0);
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);

  /* ── Search ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  /* ── History ── */
  const [histYear, setHistYear] = useState(new Date().getFullYear());
  const [histMonth, setHistMonth] = useState(new Date().getMonth() + 1);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [histDay, setHistDay] = useState<string | null>(null);
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);

  /* ── Report ── */
  const [rptDate, setRptDate] = useState(today);
  const [rptTasks, setRptTasks] = useState<Task[]>([]);
  const [rptSessions, setRptSessions] = useState<Session[]>([]);
  const [rptChanges, setRptChanges] = useState<ChangeEntry[]>([]);
  const [rptNotes, setRptNotes] = useState<Note[]>([]);
  const [rptGoals, setRptGoals] = useState<Goal[]>([]);
  const [rptCopied, setRptCopied] = useState(false);

  /* ── Derived ── */
  const activeAiProvider = useMemo(() => AI_PROVIDERS.find(p => p.id === aiProviderId) || AI_PROVIDERS[0], [aiProviderId]);
  const activeM365App = useMemo(() => M365_APPS.find(p => p.id === m365AppId) || M365_APPS[0], [m365AppId]);
  const tasksDone = useMemo(() => tasks.filter(t => t.status === 'Done').length, [tasks]);
  const totalTracked = useMemo(() => sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0), [sessions]);
  const goalsDone = useMemo(() => goals.filter(g => g.isDone).length, [goals]);

  /* ══════════════════ Toast helper ══════════════════ */

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);


  /* ══════════════════ Data fetching ══════════════════ */

  const refreshAll = useCallback(async () => {
    if (!api) return;
    const [t, s, c, n, g, a, p, tg, tpl, snip, bm, bl, st, tb] = await Promise.all([
      api.listTasks(today), api.listSessions(today), api.listChanges(today), api.listNotes(today), api.listGoals(today), api.getActiveSession(),
      api.listProjects(), api.listTags(), api.listTemplates(),
      api.listSnippets(), api.listBookmarks(), api.getBacklog(), api.getStreak(), api.getTimeBudget(today),
    ]);
    setTasks(t); setSessions(s); setChanges(c); setNotes(n); setGoals(g); setActiveSession(a);
    setProjects(p); setTags(tg); setTemplates(tpl);
    setSnippets(snip); setBookmarks(bm); setBacklog(bl); setStreak(st); setTimeBudget(tb);
    // Batch load tags for all tasks (single query instead of N+1)
    if (t.length > 0) {
      try {
        const tagMap = await api.getAllTaskTags(t.map(task => task.id));
        setTaskTagsMap(tagMap);
      } catch {
        // Fallback to individual loading if batch not available
        const tagMap: Record<number, Tag[]> = {};
        await Promise.all(t.map(async (task) => {
          tagMap[task.id] = await api.getTaskTags(task.id);
        }));
        setTaskTagsMap(tagMap);
      }
    } else {
      setTaskTagsMap({});
    }
  }, [api, today]);

  useEffect(() => {
    void refreshAll();
    const id = setInterval(() => void refreshAll(), 15000);
    return () => clearInterval(id);
  }, [refreshAll]);

  // Generate recurring tasks on startup
  useEffect(() => {
    if (!api) return;
    void api.generateRecurringTasks(today).catch(() => {});
  }, [api, today]);

  // Menu bar events
  useEffect(() => {
    if (!api) return;
    api.onNavigate((v: string) => setView(v as ViewName));
    api.onHubTabsChanged((payload) => {
      setHubTabs(payload.tabs || []);
      setHubActiveTabId(payload.activeTabId || null);
    });
    api.onToggleDark(() => setDarkMode(d => !d));
    api.onOpenCmdPalette(() => setCmdOpen(true));
    api.getAppVersion().then(v => setAppVersion(v)).catch(() => {});
    api.hubListTabs().then((payload) => {
      setHubTabs(payload.tabs || []);
      setHubActiveTabId(payload.activeTabId || null);
    }).catch(() => {});
  }, [api]);

  // Active session ticker
  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => setActiveSession(prev => prev ? { ...prev } : null), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

  // Pomodoro ticker
  useEffect(() => {
    if (!pomoActive) { if (pomoRef.current) clearInterval(pomoRef.current); return; }
    pomoRef.current = setInterval(() => {
      setPomoSec(prev => {
        if (prev <= 1) {
          setPomoPhase(p => {
            if (p === 'focus') { setPomoCycles(c => c + 1); return 'break'; }
            return 'focus';
          });
          return pomoPhase === 'focus' ? 5 * 60 : 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (pomoRef.current) clearInterval(pomoRef.current); };
  }, [pomoActive, pomoPhase]);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('fd-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  // Pomodoro notification
  const prevPomoPhaseRef = useRef(pomoPhase);
  useEffect(() => {
    if (prevPomoPhaseRef.current !== pomoPhase && pomoActive && api) {
      if (pomoPhase === 'break') void api.notify('🍅 Pomodoro completato!', 'Tempo per una pausa di 5 minuti.');
      else void api.notify('⏱ Pausa finita!', 'Inizia un nuovo ciclo focus.');
    }
    prevPomoPhaseRef.current = pomoPhase;
  }, [pomoPhase, pomoActive, api]);

  // Load project stats
  useEffect(() => {
    if (view !== 'projects' || !api || !selectedProjId) { setProjStats(null); return; }
    void api.getProjectStats(selectedProjId).then(setProjStats);
  }, [view, selectedProjId, api]);

  // Load stats
  useEffect(() => {
    if ((view !== 'dashboard') || !api) return;
    const { start, end } = weekRange(statsWeekOff);
    void api.getWeekStats(start, end).then(setWeekStats);
  }, [view, statsWeekOff, api]);

  // Load history
  useEffect(() => {
    if (view !== 'history' || !api) return;
    const { start, end } = monthRange(histYear, histMonth);
    void api.getActiveDays(start, end).then(setActiveDays);
  }, [view, histYear, histMonth, api]);

  // Load history day summary
  useEffect(() => {
    if (!histDay || !api) return;
    void api.getDaySummary(histDay).then(setDaySummary);
  }, [histDay, api]);

  // Load report data
  useEffect(() => {
    if (view !== 'report' || !api) return;
    void (async () => {
      const [t, s, c, n, g] = await Promise.all([
        api.listTasks(rptDate), api.listSessions(rptDate), api.listChanges(rptDate), api.listNotes(rptDate), api.listGoals(rptDate),
      ]);
      setRptTasks(t); setRptSessions(s); setRptChanges(c); setRptNotes(n); setRptGoals(g);
    })();
  }, [view, rptDate, api]);

  // Keyboard shortcut: Ctrl+K → Command Palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        setCmdQuery('');
      }
      if (e.key === 'Escape' && cmdOpen) {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen]);

  // Focus command palette input when opened
  useEffect(() => {
    if (cmdOpen && cmdRef.current) cmdRef.current.focus();
  }, [cmdOpen]);

  // Reload snippets when filter changes
  useEffect(() => {
    if (view !== 'snippets' || !api) return;
    void api.listSnippets(snipFilter || null).then(setSnippets);
  }, [view, snipFilter, api]);

  // Reload bookmarks when filter changes
  useEffect(() => {
    if (view !== 'bookmarks' || !api) return;
    void api.listBookmarks(bmFilter || null).then(setBookmarks);
  }, [view, bmFilter, api]);

  // Reload backlog when view changes
  useEffect(() => {
    if (view !== 'backlog' || !api) return;
    void api.getBacklog().then(setBacklog);
  }, [view, api]);

  // Load contacts
  useEffect(() => {
    if (view !== 'contacts' || !api) return;
    void api.listContacts().then(setContacts);
  }, [view, api]);

  // Load environments
  useEffect(() => {
    if (view !== 'environments' || !api) return;
    void api.listEnvironments().then(setEnvironments);
  }, [view, api]);

  // Load retrospectives
  useEffect(() => {
    if (view !== 'retros' || !api) return;
    void api.listRetrospectives().then(setRetros);
  }, [view, api]);

  // Load bugs
  useEffect(() => {
    if (view !== 'bugs' || !api) return;
    void api.listBugs(null, bugFilter || null).then(setBugs);
  }, [view, bugFilter, api]);

  // Load learning
  useEffect(() => {
    if (view !== 'learning' || !api) return;
    void api.listLearning(learnFilter || null).then(setLearningList);
  }, [view, learnFilter, api]);

  // Load checklists
  useEffect(() => {
    if (view !== 'checklists' || !api) return;
    void api.listChecklists().then(setChecklists);
  }, [view, api]);

  // Load checklist items
  useEffect(() => {
    if (!selectedCl || !api) return;
    void api.getChecklistItems(selectedCl).then(setClItems);
  }, [selectedCl, api]);

  // Load FDHub repos
  useEffect(() => {
    if (view !== 'fdhub' || !api) return;
    void api.fdhubListRepos().then(setFdhubRepos);
  }, [view, api]);

  // Load trash when entering trash view
  useEffect(() => {
    if (view !== 'trash' || !api) return;
    void loadTrash();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, api]);

  /* ══════════════════ Handlers ══════════════════ */

  async function onCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!api || !taskTitle.trim()) return;
    try {
      await api.createTask({ title: taskTitle.trim(), description: taskDesc.trim(), plannedMinutes: Math.max(5, taskMin), priority: taskPri, scheduledDate: today, projectId: taskProjId === '' ? null : Number(taskProjId) });
      setTaskTitle(''); setTaskDesc(''); setTaskMin(60); setTaskPri('Medium'); setTaskProjId(''); setTaskRecurrence('');
      showToast('success', 'Attività creata');
      await refreshAll();
    } catch (err) { showToast('error', 'Errore nella creazione attività'); }
  }

  async function cycleStatus(task: Task) { if (!api) return; try { const next: TaskStatus = task.status === 'Todo' ? 'Doing' : task.status === 'Doing' ? 'Done' : 'Todo'; await api.setTaskStatus(task.id, next); await refreshAll(); } catch { showToast('error', 'Errore aggiornamento stato'); } }
  async function delTask(id: number) { if (!api) return; if (!confirmDelete('Spostare questa attivit� nel cestino?')) return; try { await api.deleteTask(id); showToast('info', 'Attivit� spostata nel cestino'); await refreshAll(); } catch { showToast('error', 'Errore eliminazione attivit�'); } }
  async function dupTask(id: number) { if (!api) return; try { await api.duplicateTask(id, nextDay(today)); showToast('success', 'Attività duplicata per domani'); await refreshAll(); } catch { showToast('error', 'Errore duplicazione attività'); } }

  async function startTimer(taskId: number) { if (!api || activeSession) return; try { await api.startSession(taskId); await refreshAll(); } catch { showToast('error', 'Errore avvio timer'); } }
  async function stopTimer() { if (!api) return; try { await api.stopSession(stopNote); setStopNote(''); showToast('success', 'Sessione salvata'); await refreshAll(); } catch { showToast('error', 'Errore arresto timer'); } }

  async function onAddChange(e: FormEvent) {
    e.preventDefault();
    if (!api || !chgArtifact.trim() || !chgSummary.trim()) return;
    try {
      await api.addChange({ taskId: chgTaskId === '' ? undefined : Number(chgTaskId), tool: chgTool, artifact: chgArtifact.trim(), changeType: chgType, summary: chgSummary.trim(), beforeText: chgBefore.trim(), afterText: chgAfter.trim(), testResult: chgTest.trim() || 'Non testato', workDate: today, projectId: chgProjId === '' ? null : Number(chgProjId) });
      setChgArtifact(''); setChgSummary(''); setChgBefore(''); setChgAfter(''); setChgTest('Non testato'); setChgTaskId(''); setChgProjId('');
      showToast('success', 'Modifica registrata');
      await refreshAll();
    } catch { showToast('error', 'Errore registrazione modifica'); }
  }
  async function delChange(id: number) { if (!api) return; if (!confirmDelete('Eliminare questa modifica?')) return; try { await api.deleteChange(id); showToast('info', 'Modifica eliminata'); await refreshAll(); } catch { showToast('error', 'Errore eliminazione modifica'); } }
  function startEditChange(c: ChangeEntry) { setEditingChangeId(c.id); setEditChange({ tool: c.tool, artifact: c.artifact, changeType: c.changeType, summary: c.summary, beforeText: c.beforeText, afterText: c.afterText, testResult: c.testResult }); }
  function cancelEditChange() { setEditingChangeId(null); setEditChange({}); }
  async function saveEditChange(id: number) {
    if (!api) return;
    try { await api.updateChange(id, editChange); cancelEditChange(); await refreshAll(); } catch { showToast('error', 'Errore salvataggio modifica'); }
  }

  async function onCreateNote(e: FormEvent) {
    e.preventDefault();
    if (!api || !noteTitle.trim()) return;
    try {
      await api.createNote({ category: noteCat, title: noteTitle.trim(), content: noteContent.trim(), workDate: today });
      setNoteTitle(''); setNoteContent(''); setNoteCat('Generale');
      showToast('success', 'Appunto creato');
      await refreshAll();
    } catch { showToast('error', 'Errore creazione appunto'); }
  }
  async function togglePin(id: number) { if (!api) return; try { await api.togglePinNote(id); await refreshAll(); } catch { showToast('error', 'Errore pin appunto'); } }
  async function delNote(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo appunto?')) return; try { await api.deleteNote(id); showToast('info', 'Appunto eliminato'); await refreshAll(); } catch { showToast('error', 'Errore eliminazione appunto'); } }

  async function onCreateGoal(e: FormEvent) {
    e.preventDefault();
    if (!api || !goalText.trim()) return;
    try {
      await api.createGoal({ text: goalText.trim(), workDate: today });
      setGoalText('');
      showToast('success', 'Obiettivo aggiunto');
      await refreshAll();
    } catch { showToast('error', 'Errore creazione obiettivo'); }
  }
  async function toggleGoal(id: number) { if (!api) return; try { await api.toggleGoal(id); await refreshAll(); } catch { showToast('error', 'Errore aggiornamento obiettivo'); } }
  async function delGoal(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo obiettivo?')) return; try { await api.deleteGoal(id); await refreshAll(); } catch { showToast('error', 'Errore eliminazione obiettivo'); } }
  function startEditGoal(g: Goal) { setEditingGoalId(g.id); setEditingGoalText(g.text); }
  function cancelEditGoal() { setEditingGoalId(null); setEditingGoalText(''); }
  async function saveEditGoal(id: number) {
    if (!api || !editingGoalText.trim()) return;
    try { await api.updateGoal(id, { text: editingGoalText.trim() }); setEditingGoalId(null); setEditingGoalText(''); await refreshAll(); } catch { showToast('error', 'Errore salvataggio obiettivo'); }
  }

  function startPomodoro() { setPomoActive(true); setPomoSec(25 * 60); setPomoPhase('focus'); }
  function stopPomodoro() { setPomoActive(false); setPomoSec(25 * 60); setPomoPhase('focus'); }
  function pomoLabel() { const m = Math.floor(pomoSec / 60); const s = pomoSec % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }

  /* ── Project handlers ── */
  async function onCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!api || !projName.trim()) return;
    try { await api.createProject({ name: projName.trim(), color: projColor, description: projDesc.trim() }); setProjName(''); setProjDesc(''); setProjColor(PROJECT_COLORS[0]); showToast('success', 'Progetto creato'); await refreshAll(); } catch { showToast('error', 'Errore creazione progetto'); }
  }
  async function archiveProject(id: number) { if (!api) return; try { await api.updateProject(id, { isArchived: 1 } as any); if (selectedProjId === id) { setSelectedProjId(null); setProjStats(null); } showToast('info', 'Progetto archiviato'); await refreshAll(); } catch { showToast('error', 'Errore archiviazione progetto'); } }
  async function delProject(id: number) { if (!api) return; if (!confirmDelete('Spostare questo progetto nel cestino?')) return; try { await api.deleteProject(id); if (selectedProjId === id) { setSelectedProjId(null); setProjStats(null); } showToast('info', 'Progetto spostato nel cestino'); await refreshAll(); } catch { showToast('error', 'Errore eliminazione progetto'); } }
  function startEditProject(p: Project) { setEditingProjId(p.id); setEditProjName(p.name); setEditProjDesc(p.description || ''); setEditProjColor(p.color); }
  function cancelEditProject() { setEditingProjId(null); setEditProjName(''); setEditProjDesc(''); setEditProjColor(''); }
  async function saveEditProject(id: number) {
    if (!api || !editProjName.trim()) return;
    try { await api.updateProject(id, { name: editProjName.trim(), description: editProjDesc.trim(), color: editProjColor }); cancelEditProject(); await refreshAll(); } catch { showToast('error', 'Errore salvataggio progetto'); }
  }

  /* ── Tag handlers ── */
  async function onCreateTag(e: FormEvent) {
    e.preventDefault();
    if (!api || !tagName.trim()) return;
    try { await api.createTag({ name: tagName.trim(), color: tagColor }); setTagName(''); setTagColor(TAG_COLORS[0]); showToast('success', 'Tag creato'); await refreshAll(); } catch { showToast('error', 'Errore creazione tag'); }
  }
  async function delTag(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo tag?')) return; try { await api.deleteTag(id); showToast('info', 'Tag eliminato'); await refreshAll(); } catch { showToast('error', 'Errore eliminazione tag'); } }
  function startEditTag(t: Tag) { setEditingTagId(t.id); setEditTagName(t.name); setEditTagColor(t.color); }
  function cancelEditTag() { setEditingTagId(null); setEditTagName(''); setEditTagColor(''); }
  async function saveEditTag(id: number) {
    if (!api || !editTagName.trim()) return;
    try { await api.updateTag(id, { name: editTagName.trim(), color: editTagColor }); cancelEditTag(); await refreshAll(); } catch { showToast('error', 'Errore salvataggio tag'); }
  }
  async function addTag(taskId: number, tagId: number) { if (!api) return; try { const updated = await api.addTagToTask(taskId, tagId); setTaskTagsMap(m => ({ ...m, [taskId]: updated })); } catch { showToast('error', 'Errore aggiunta tag'); } }
  async function removeTag(taskId: number, tagId: number) { if (!api) return; if (!confirmDelete('Rimuovere questo tag dall\'attivit�?')) return; try { const updated = await api.removeTagFromTask(taskId, tagId); setTaskTagsMap(m => ({ ...m, [taskId]: updated })); } catch { showToast('error', 'Errore rimozione tag'); } }

  /* ── Template handlers ── */
  async function onCreateTemplate(e: FormEvent) {
    e.preventDefault();
    if (!api || !tplTitle.trim()) return;
    try { await api.createTemplate({ title: tplTitle.trim(), description: tplDesc.trim(), plannedMinutes: Math.max(5, tplMin), priority: tplPri, tool: tplTool || undefined, projectId: tplProjId === '' ? null : Number(tplProjId) }); setTplTitle(''); setTplDesc(''); setTplMin(60); setTplPri('Medium'); setTplTool(''); setTplProjId(''); showToast('success', 'Template creato'); await refreshAll(); } catch { showToast('error', 'Errore creazione template'); }
  }
  async function delTemplate(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo template?')) return; try { await api.deleteTemplate(id); showToast('info', 'Template eliminato'); await refreshAll(); } catch { showToast('error', 'Errore eliminazione template'); } }
  async function useTemplate(tplId: number) { if (!api) return; try { await api.createTaskFromTemplate(tplId, today); showToast('success', 'Attività creata da template'); await refreshAll(); } catch { showToast('error', 'Errore uso template'); } }

  /* ── Edit handlers ── */
  async function onSaveEditTask() {
    if (!api || !editTask) return;
    try { await api.updateTask(editTask.id, { title: editTask.title, description: editTask.description, plannedMinutes: editTask.plannedMinutes, priority: editTask.priority, projectId: editTask.projectId }); setEditTask(null); showToast('success', 'Attività aggiornata'); await refreshAll(); } catch { showToast('error', 'Errore salvataggio attività'); }
  }
  async function onSaveEditNote() {
    if (!api || !editNote) return;
    try { await api.updateNote(editNote.id, { title: editNote.title, content: editNote.content, category: editNote.category }); setEditNote(null); await refreshAll(); } catch { showToast('error', 'Errore salvataggio appunto'); }
  }

  async function doSearch(e: FormEvent) {
    e.preventDefault();
    if (!api || !searchQuery.trim()) return;
    try { const r = await api.searchAll(searchQuery.trim()); setSearchResult(r); } catch { showToast('error', 'Errore nella ricerca'); }
  }

  async function doExport() {
    if (!api) return;
    try {
      const { start, end } = weekRange(statsWeekOff);
      const { sessionsCsv, changesCsv } = await api.exportCsv(start, end);
      downloadFile(sessionsCsv, `flowdesk_sessioni_${start}_${end}.csv`);
      setTimeout(() => downloadFile(changesCsv, `flowdesk_modifiche_${start}_${end}.csv`), 200);
      showToast('success', 'Export CSV completato');
    } catch { showToast('error', 'Errore export CSV'); }
  }

  async function doExportFullJson() {
    if (!api) return;
    try { const r = await api.exportFullJson(); if (r.ok) showToast('success', 'Export JSON completato'); } catch { showToast('error', 'Errore export JSON'); }
  }

  /* ── Snippet handlers ── */
  async function onCreateSnippet(e: FormEvent) {
    e.preventDefault();
    if (!api || !snipTitle.trim() || !snipCode.trim()) return;
    try { await api.createSnippet({ title: snipTitle.trim(), language: snipLang, code: snipCode.trim(), description: snipDesc.trim() }); setSnipTitle(''); setSnipCode(''); setSnipDesc(''); setSnipLang('PowerFx'); showToast('success', 'Snippet creato'); await refreshAll(); if (snipFilter) void api.listSnippets(snipFilter).then(setSnippets); } catch { showToast('error', 'Errore creazione snippet'); }
  }
  async function delSnippet(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo snippet?')) return; try { await api.deleteSnippet(id); showToast('info', 'Snippet eliminato'); await refreshAll(); if (snipFilter) void api.listSnippets(snipFilter).then(setSnippets); } catch { showToast('error', 'Errore eliminazione snippet'); } }
  async function toggleSnipFav(id: number) { if (!api) return; try { await api.toggleSnippetFav(id); await refreshAll(); if (snipFilter) void api.listSnippets(snipFilter).then(setSnippets); } catch { showToast('error', 'Errore aggiornamento snippet'); } }
  async function copySnippetCode(code: string, id: number) { await navigator.clipboard.writeText(code); setSnipCopied(id); setTimeout(() => setSnipCopied(null), 1500); }
  async function onSaveEditSnippet() {
    if (!api || !editSnippet) return;
    await api.updateSnippet(editSnippet.id, { title: editSnippet.title, language: editSnippet.language, code: editSnippet.code, description: editSnippet.description });
    setEditSnippet(null);
    await refreshAll();
    if (snipFilter) void api.listSnippets(snipFilter).then(setSnippets);
  }

  /* ── Bookmark handlers ── */
  async function onCreateBookmark(e: FormEvent) {
    e.preventDefault();
    if (!api || !bmTitle.trim() || !bmUrl.trim()) return;
    try { await api.createBookmark({ title: bmTitle.trim(), url: bmUrl.trim(), category: bmCat, description: bmDesc.trim(), projectId: bmProjId === '' ? null : Number(bmProjId) }); setBmTitle(''); setBmUrl(''); setBmDesc(''); setBmCat('Altro'); setBmProjId(''); showToast('success', 'Link salvato'); await refreshAll(); if (bmFilter) void api.listBookmarks(bmFilter).then(setBookmarks); } catch { showToast('error', 'Errore creazione link'); }
  }
  async function delBookmark(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo link?')) return; try { await api.deleteBookmark(id); showToast('info', 'Link eliminato'); await refreshAll(); if (bmFilter) void api.listBookmarks(bmFilter).then(setBookmarks); } catch { showToast('error', 'Errore eliminazione link'); } }
  function startEditBookmark(b: Bookmark) { setEditingBookmark({ ...b }); }
  function cancelEditBookmark() { setEditingBookmark(null); }
  async function saveEditBookmark() {
    if (!api || !editingBookmark) return;
    try { await api.updateBookmark(editingBookmark.id, { title: editingBookmark.title, url: editingBookmark.url, category: editingBookmark.category, description: editingBookmark.description, projectId: editingBookmark.projectId }); setEditingBookmark(null); await refreshAll(); if (bmFilter) void api.listBookmarks(bmFilter).then(setBookmarks); } catch { showToast('error', 'Errore salvataggio link'); }
  }

  /* ── Backlog handlers ── */
  async function rescheduleToToday(id: number) { if (!api) return; try { await api.rescheduleTask(id, today); showToast('success', 'Attività spostata a oggi'); await refreshAll(); void api.getBacklog().then(setBacklog); } catch { showToast('error', 'Errore ripianificazione'); } }

  /* ── Contacts handlers ── */
  async function onCreateContact(e: FormEvent) {
    e.preventDefault();
    if (!api || !ctName.trim()) return;
    try { await api.createContact({ name: ctName.trim(), role: ctRole.trim(), email: ctEmail.trim(), phone: ctPhone.trim(), company: ctCompany.trim(), notes: ctNotes.trim(), projectId: ctProjId === '' ? null : Number(ctProjId) }); setCtName(''); setCtRole(''); setCtEmail(''); setCtPhone(''); setCtCompany(''); setCtNotes(''); setCtProjId(''); showToast('success', 'Contatto creato'); void api.listContacts().then(setContacts); } catch { showToast('error', 'Errore creazione contatto'); }
  }
  async function delContact(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo contatto?')) return; try { await api.deleteContact(id); showToast('info', 'Contatto eliminato'); void api.listContacts().then(setContacts); } catch { showToast('error', 'Errore eliminazione contatto'); } }
  function startEditContact(c: Contact) { setEditingContact({ ...c }); }
  function cancelEditContact() { setEditingContact(null); }
  async function saveEditContact() {
    if (!api || !editingContact || !editingContact.name.trim()) return;
    try { await api.updateContact(editingContact.id, { name: editingContact.name.trim(), role: editingContact.role, email: editingContact.email, phone: editingContact.phone, company: editingContact.company, notes: editingContact.notes, projectId: editingContact.projectId }); setEditingContact(null); void api.listContacts().then(setContacts); } catch { showToast('error', 'Errore salvataggio contatto'); }
  }

  /* ── Environments handlers ── */
  async function onCreateEnv(e: FormEvent) {
    e.preventDefault();
    if (!api || !envName.trim()) return;
    try { await api.createEnvironment({ name: envName.trim(), url: envUrl.trim(), envType, status: envStatus, description: envDesc.trim(), projectId: envProjId === '' ? null : Number(envProjId) }); setEnvName(''); setEnvUrl(''); setEnvType('Dev'); setEnvStatus('Attivo'); setEnvDesc(''); setEnvProjId(''); showToast('success', 'Ambiente creato'); void api.listEnvironments().then(setEnvironments); } catch { showToast('error', 'Errore creazione ambiente'); }
  }
  async function delEnv(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo ambiente?')) return; try { await api.deleteEnvironment(id); showToast('info', 'Ambiente eliminato'); void api.listEnvironments().then(setEnvironments); } catch { showToast('error', 'Errore eliminazione ambiente'); } }
  async function updateEnvStatus(id: number, s: EnvStatus) { if (!api) return; try { await api.updateEnvironment(id, { status: s }); void api.listEnvironments().then(setEnvironments); } catch { showToast('error', 'Errore aggiornamento stato'); } }
  function startEditEnv(env: Environment) { setEditingEnv({ ...env }); }
  function cancelEditEnv() { setEditingEnv(null); }
  async function saveEditEnv() {
    if (!api || !editingEnv || !editingEnv.name.trim()) return;
    try { await api.updateEnvironment(editingEnv.id, { name: editingEnv.name.trim(), url: editingEnv.url, envType: editingEnv.envType, status: editingEnv.status, description: editingEnv.description, projectId: editingEnv.projectId }); setEditingEnv(null); void api.listEnvironments().then(setEnvironments); } catch { showToast('error', 'Errore salvataggio ambiente'); }
  }

  /* ── Retrospectives handlers ── */
  function currentWeekStart() {
    const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
  }
  async function onCreateRetro(e: FormEvent) {
    e.preventDefault();
    if (!api || (!retroWell.trim() && !retroImprove.trim() && !retroActions.trim())) return;
    try { await api.createRetrospective({ weekStart: currentWeekStart(), wentWell: retroWell.trim(), toImprove: retroImprove.trim(), actions: retroActions.trim() }); setRetroWell(''); setRetroImprove(''); setRetroActions(''); showToast('success', 'Retrospettiva creata'); void api.listRetrospectives().then(setRetros); } catch { showToast('error', 'Errore creazione retrospettiva'); }
  }
  async function onSaveEditRetro() {
    if (!api || !editRetro) return;
    try { await api.updateRetrospective(editRetro.id, { wentWell: editRetro.wentWell, toImprove: editRetro.toImprove, actions: editRetro.actions }); setEditRetro(null); void api.listRetrospectives().then(setRetros); } catch { showToast('error', 'Errore salvataggio retrospettiva'); }
  }
  async function delRetro(id: number) { if (!api) return; if (!confirmDelete('Eliminare questa retrospettiva?')) return; try { await api.deleteRetrospective(id); showToast('info', 'Retrospettiva eliminata'); void api.listRetrospectives().then(setRetros); } catch { showToast('error', 'Errore eliminazione retrospettiva'); } }

  /* ── Bugs handlers ── */
  async function onCreateBug(e: FormEvent) {
    e.preventDefault();
    if (!api || !bugTitle.trim()) return;
    try { await api.createBug({ title: bugTitle.trim(), description: bugDesc.trim(), severity: bugSeverity, stepsToReproduce: bugSteps.trim(), projectId: bugProjId === '' ? null : Number(bugProjId) }); setBugTitle(''); setBugDesc(''); setBugSeverity('Medium'); setBugSteps(''); setBugProjId(''); showToast('success', 'Bug registrato'); void api.listBugs(null, bugFilter || null).then(setBugs); } catch { showToast('error', 'Errore creazione bug'); }
  }
  async function updateBugStatus(id: number, s: BugStatus) { if (!api) return; try { await api.updateBug(id, { status: s }); void api.listBugs(null, bugFilter || null).then(setBugs); } catch { showToast('error', 'Errore aggiornamento stato bug'); } }
  async function onSaveEditBug() {
    if (!api || !editBug) return;
    try { await api.updateBug(editBug.id, { title: editBug.title, description: editBug.description, severity: editBug.severity, status: editBug.status, stepsToReproduce: editBug.stepsToReproduce, solution: editBug.solution, projectId: editBug.projectId }); setEditBug(null); void api.listBugs(null, bugFilter || null).then(setBugs); } catch { showToast('error', 'Errore salvataggio bug'); }
  }
  async function delBug(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo bug?')) return; try { await api.deleteBug(id); showToast('info', 'Bug eliminato'); void api.listBugs(null, bugFilter || null).then(setBugs); } catch { showToast('error', 'Errore eliminazione bug'); } }

  /* ── Learning handlers ── */
  async function onCreateLearn(e: FormEvent) {
    e.preventDefault();
    if (!api || !learnTitle.trim()) return;
    try { await api.createLearning({ title: learnTitle.trim(), category: learnCat, url: learnUrl.trim(), notes: learnNotes.trim() }); setLearnTitle(''); setLearnCat('Corso'); setLearnUrl(''); setLearnNotes(''); showToast('success', 'Elemento formazione aggiunto'); void api.listLearning(learnFilter || null).then(setLearningList); } catch { showToast('error', 'Errore creazione formazione'); }
  }
  async function updateLearnProgress(id: number, progress: number) { if (!api) return; try { await api.updateLearning(id, { progress, completed: progress >= 100 ? 1 : 0 }); void api.listLearning(learnFilter || null).then(setLearningList); } catch { showToast('error', 'Errore aggiornamento progresso'); } }
  async function onSaveEditLearn() {
    if (!api || !editLearn) return;
    try { await api.updateLearning(editLearn.id, { title: editLearn.title, category: editLearn.category, url: editLearn.url, notes: editLearn.notes, progress: editLearn.progress, completed: editLearn.progress >= 100 ? 1 : 0 }); setEditLearn(null); void api.listLearning(learnFilter || null).then(setLearningList); } catch { showToast('error', 'Errore salvataggio formazione'); }
  }
  async function delLearn(id: number) { if (!api) return; if (!confirmDelete('Eliminare questo elemento di formazione?')) return; try { await api.deleteLearning(id); showToast('info', 'Formazione eliminata'); void api.listLearning(learnFilter || null).then(setLearningList); } catch { showToast('error', 'Errore eliminazione formazione'); } }

  /* ── Checklists handlers ── */
  async function onCreateChecklist(e: FormEvent) {
    e.preventDefault();
    if (!api || !clTitle.trim()) return;
    try { await api.createChecklist({ title: clTitle.trim(), description: clDesc.trim(), projectId: clProjId === '' ? null : Number(clProjId) }); setClTitle(''); setClDesc(''); setClProjId(''); showToast('success', 'Checklist creata'); void api.listChecklists().then(setChecklists); } catch { showToast('error', 'Errore creazione checklist'); }
  }
  async function delChecklist(id: number) { if (!api) return; if (!confirmDelete('Eliminare questa checklist?')) return; try { await api.deleteChecklist(id); if (selectedCl === id) { setSelectedCl(null); setClItems([]); } showToast('info', 'Checklist eliminata'); void api.listChecklists().then(setChecklists); } catch { showToast('error', 'Errore eliminazione checklist'); } }
  async function onAddClItem(e: FormEvent) {
    e.preventDefault();
    if (!api || !selectedCl || !clNewItem.trim()) return;
    try { await api.addChecklistItem({ checklistId: selectedCl, text: clNewItem.trim() }); setClNewItem(''); void api.getChecklistItems(selectedCl).then(setClItems); } catch { showToast('error', 'Errore aggiunta elemento'); }
  }
  async function toggleClItem(id: number) { if (!api || !selectedCl) return; try { await api.toggleChecklistItem(id); void api.getChecklistItems(selectedCl).then(setClItems); } catch { showToast('error', 'Errore aggiornamento elemento'); } }
  async function delClItem(id: number) { if (!api || !selectedCl) return; if (!confirmDelete('Eliminare questo elemento della checklist?')) return; try { await api.deleteChecklistItem(id); void api.getChecklistItems(selectedCl).then(setClItems); } catch { showToast('error', 'Errore eliminazione elemento'); } }
  function startEditCl(cl: Checklist) { setEditingCl({ ...cl }); }
  function cancelEditCl() { setEditingCl(null); }
  async function saveEditCl() {
    if (!api || !editingCl || !editingCl.title.trim()) return;
    try { await api.updateChecklist(editingCl.id, { title: editingCl.title.trim(), description: editingCl.description, projectId: editingCl.projectId }); setEditingCl(null); void api.listChecklists().then(setChecklists); } catch { showToast('error', 'Errore salvataggio checklist'); }
  }
  function startEditClItem(item: ChecklistItem) { setEditingClItemId(item.id); setEditingClItemText(item.text); }
  function cancelEditClItem() { setEditingClItemId(null); setEditingClItemText(''); }
  async function saveEditClItem(id: number) {
    if (!api || !editingClItemText.trim() || !selectedCl) return;
    try { await api.updateChecklistItem(id, { text: editingClItemText.trim() }); setEditingClItemId(null); setEditingClItemText(''); void api.getChecklistItems(selectedCl).then(setClItems); } catch { showToast('error', 'Errore salvataggio elemento'); }
  }

  /* ── Trash / Cestino handlers ── */
  async function loadTrash() {
    if (!api) return;
    try {
      const items = await api.getTrashItems();
      const normalized = (items as Array<TrashItem & Record<string, unknown>>).map((item) => ({
        ...item,
        entityType: (item.entityType || item._entityType || '') as string,
        title: (item.title || item.name || item.text || item.summary || item.artifact || '(senza titolo)') as string,
      }));
      setTrashItems(normalized);
    } catch {
      showToast('error', 'Errore caricamento cestino');
    }
  }
  async function restoreTrashItem(entityType: string, id: number) {
    if (!api) return;
    try {
      const res = await api.restoreTrashItem(entityType, id);
      if (!res?.ok) { showToast('error', res?.error || 'Errore ripristino elemento'); return; }
      showToast('success', 'Elemento ripristinato');
      await loadTrash();
      await refreshAll();
    } catch {
      showToast('error', 'Errore ripristino elemento');
    }
  }
  async function permanentDeleteTrashItem(entityType: string, id: number) {
    if (!api) return;
    if (!confirmDelete('Eliminare definitivamente questo elemento? Questa azione non � reversibile.')) return;
    try {
      const res = await api.permanentDeleteTrashItem(entityType, id);
      if (!res?.ok) { showToast('error', res?.error || 'Errore eliminazione definitiva'); return; }
      showToast('info', 'Elemento eliminato definitivamente');
      await loadTrash();
    } catch {
      showToast('error', 'Errore eliminazione definitiva');
    }
  }
  async function emptyTrashAll() { if (!api) return; if (!confirmDelete('Svuotare completamente il cestino? Questa azione non � reversibile.')) return; try { await api.emptyTrash(); showToast('info', 'Cestino svuotato'); setTrashItems([]); } catch { showToast('error', 'Errore svuotamento cestino'); } }

  /* ── Drag-and-drop Kanban handlers ── */
  function onDragStartTask(e: React.DragEvent, taskId: number) {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOverCol(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  async function onDropCol(status: TaskStatus) {
    if (draggedTaskId === null || !api) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    if (task && task.status !== status) {
      try { await api.setTaskStatus(draggedTaskId, status); await refreshAll(); } catch { showToast('error', 'Errore spostamento attività'); }
    }
    setDraggedTaskId(null);
  }

  /* ── Command Palette ── */
  const cmdItems = useMemo(() => {
    const items: { icon: string; label: string; action: () => void }[] = [
      ...NAV.map(n => ({ icon: n.icon, label: `Vai a ${n.label}`, action: () => { setView(n.id); setCmdOpen(false); } })),
      { icon: 'add', label: 'Nuova attività', action: () => { setView('tasks'); setCmdOpen(false); } },
      { icon: 'timer', label: 'Apri Timer', action: () => { setView('timer'); setCmdOpen(false); } },
      { icon: 'search', label: 'Cerca...', action: () => { setView('search'); setCmdOpen(false); } },
      { icon: 'code', label: 'Nuovo snippet', action: () => { setView('snippets'); setCmdOpen(false); } },
      { icon: 'bookmark', label: 'Nuovo link', action: () => { setView('bookmarks'); setCmdOpen(false); } },
      { icon: 'description', label: 'Genera report', action: () => { setView('report'); setCmdOpen(false); } },
      { icon: 'dark_mode', label: darkMode ? 'Modalità chiara' : 'Modalità scura', action: () => { setDarkMode(d => !d); setCmdOpen(false); } },
    ];
    if (!cmdQuery.trim()) return items;
    const q = cmdQuery.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q));
  }, [cmdQuery, darkMode]);

  /* ── Report generation ── */
  function genReport() {
    const done = rptTasks.filter(t => t.status === 'Done').length;
    const totalMin = rptSessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);
    const gDone = rptGoals.filter(g => g.isDone).length;
    let t = `REPORT GIORNALIERO — ${dateLong(rptDate)}\n\n`;
    t += `RIEPILOGO\n`;
    t += `- Tempo tracciato: ${fmtMin(totalMin)}\n`;
    t += `- Attivita completate: ${done} su ${rptTasks.length}\n`;
    t += `- Obiettivi raggiunti: ${gDone} su ${rptGoals.length}\n`;
    t += `- Modifiche registrate: ${rptChanges.length}\n`;
    t += `- Appunti: ${rptNotes.length}\n`;

    if (rptGoals.length) {
      t += `\nOBIETTIVI\n`;
      rptGoals.forEach(g => { t += `[${g.isDone ? '✓' : '○'}] ${g.text}\n`; });
    }
    if (rptTasks.length) {
      t += `\nATTIVITA\n`;
      rptTasks.forEach(tk => {
        const icon = tk.status === 'Done' ? '✓' : tk.status === 'Doing' ? '→' : '○';
        const tMin = rptSessions.filter(s => s.taskId === tk.id).reduce((a, s) => a + (s.durationMinutes || 0), 0);
        t += `[${icon}] ${tk.title} (${PRI_LABEL[tk.priority]}) — ${tMin ? fmtMin(tMin) + ' tracciati' : 'non iniziato'}\n`;
      });
    }
    if (rptSessions.length) {
      t += `\nSESSIONI\n`;
      rptSessions.forEach(s => {
        const st = new Date(s.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const en = s.endedAt ? new Date(s.endedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'in corso';
        t += `${st}–${en} | ${s.taskTitle} (${s.durationMinutes || '?'}m)${s.note ? ' — ' + s.note : ''}\n`;
      });
    }
    if (rptChanges.length) {
      t += `\nMODIFICHE\n`;
      rptChanges.forEach(c => { t += `[${TOOL_LABEL[c.tool]}] ${c.artifact} → ${c.changeType}: ${c.summary}\n`; });
    }
    if (rptNotes.length) {
      t += `\nAPPUNTI\n`;
      rptNotes.forEach(n => { t += `[${n.category}] ${n.title}${n.content ? ' — ' + n.content : ''}\n`; });
    }
    return t.trim();
  }

  async function copyReport() {
    await navigator.clipboard.writeText(genReport());
    setRptCopied(true);
    setTimeout(() => setRptCopied(false), 2000);
  }

  async function openHubTab(url: string, title: string) {
    if (!api) return;
    const res = await api.hubOpenTab(url, title);
    if (!res?.ok) {
      showToast('error', `Impossibile aprire ${title}`);
      return;
    }
    await api.hubFocusWindow();
  }

  async function activateHubTab(tabId: string) {
    if (!api) return;
    await api.hubActivateTab(tabId);
  }

  async function closeHubTab(tabId: string) {
    if (!api) return;
    await api.hubCloseTab(tabId);
  }

  /* ═══ No API ═══ */
  if (!api) {
    return (
      <div className="no-api">
        <div className="no-api-box">
          <h1>FlowDesk</h1>
          <p>Power Platform Work Tracker</p>
          <p className="no-api-hint">Avvia in modalità desktop con <code>npm run dev</code></p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════ Render ═══════════════════════ */
  return (
    <div className="app-shell">

      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>FlowDesk</h1>
          <span>Power Platform Tracker</span>
        </div>
        {activeSession && (
          <div className="sidebar-timer" onClick={() => setView('timer')}>
            <span className="pulse-dot" />
            <div>
              <div className="sidebar-timer-task">{activeSession.taskTitle}</div>
              <div className="sidebar-timer-clock">{elapsed(activeSession.startedAt)}</div>
            </div>
          </div>
        )}
        {pomoActive && (
          <div className="sidebar-pomo" onClick={() => setView('timer')}>
            <span className={`pomo-dot ${pomoPhase}`} />
            <div>
              <div className="sidebar-timer-task">{pomoPhase === 'focus' ? 'Focus' : 'Pausa'}</div>
              <div className="sidebar-timer-clock">{pomoLabel()}</div>
            </div>
          </div>
        )}
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button key={n.id} className={`nav-item${view === n.id ? ' active' : ''}`} onClick={() => setView(n.id)}>
              <span className="nav-icon material-symbols-outlined">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <button className="dark-toggle" onClick={() => setDarkMode(d => !d)} title={darkMode ? 'Modalità chiara' : 'Modalità scura'}>
          {darkMode ? mi('light_mode') : mi('dark_mode')} {darkMode ? 'Chiaro' : 'Scuro'}
        </button>
        <div className="sidebar-footer">
          <div>{dateLong(today)}</div>
          <div className="sidebar-version">v{appVersion}</div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="main-area">
        <div className="main-scroll">

          {/* ═══════ DASHBOARD ═══════ */}
          {view === 'dashboard' && (
            <div className="view">
              <div className="view-header">
                <div>
                  <h2 className="view-title">{greeting()}!</h2>
                  <p className="view-sub">{dateLong(today)}</p>
                </div>
              </div>

              <div className="kpi-row kpi-5">
                <div className="kpi-card"><div className="kpi-icon ki-goals">{mi('flag')}</div><div><span className="kpi-value">{goalsDone}/{goals.length}</span><span className="kpi-label">Obiettivi</span></div></div>
                <div className="kpi-card"><div className="kpi-icon ki-tasks">{mi('task_alt')}</div><div><span className="kpi-value">{tasksDone}/{tasks.length}</span><span className="kpi-label">Attività</span></div></div>
                <div className="kpi-card"><div className="kpi-icon ki-time">{mi('timer')}</div><div><span className="kpi-value">{fmtMin(totalTracked)}</span><span className="kpi-label">Tempo</span></div></div>
                <div className="kpi-card"><div className="kpi-icon ki-changes">{mi('assignment')}</div><div><span className="kpi-value">{changes.length}</span><span className="kpi-label">Modifiche</span></div></div>
                <div className="kpi-card"><div className="kpi-icon ki-streak">{mi('local_fire_department')}</div><div><span className="kpi-value">{streak.current}</span><span className="kpi-label">Streak {streak.longest > 0 ? `(max ${streak.longest})` : ''}</span></div></div>
              </div>

              {activeSession && (
                <div className="timer-banner">
                  <div className="timer-info"><span className="pulse-dot" /><div><div className="timer-task-name">{activeSession.taskTitle}</div><div className="timer-display">{elapsed(activeSession.startedAt)}</div></div></div>
                  <div className="timer-actions">
                    <input className="timer-note-input" value={stopNote} onChange={e => setStopNote(e.target.value)} placeholder="Nota (opzionale)" />
                    <button className="btn-stop" onClick={stopTimer}>{mi('stop')} Ferma</button>
                  </div>
                </div>
              )}

              {/* Goals quick widget */}
              {goals.length > 0 && (
                <div className="card mb-20">
                  <div className="card-head"><h3>Obiettivi di oggi</h3><button className="btn-link" onClick={() => setView('goals')}>Gestisci {mi('arrow_forward')}</button></div>
                  {goals.map(g => (
                    <div key={g.id} className="goal-row" onClick={() => toggleGoal(g.id)}>
                      <span className={`goal-check${g.isDone ? ' done' : ''}`}>{g.isDone ? mi('check') : ''}</span>
                      <span className={`goal-text${g.isDone ? ' done' : ''}`}>{g.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Time Budget widget */}
              {timeBudget && timeBudget.tasks.length > 0 && (
                <div className="card mb-20">
                  <div className="card-head">
                    <h3>{mi('schedule')} Budget tempo</h3>
                    <span className="time-budget-summary">
                      {fmtMin(timeBudget.totalActual)} / {fmtMin(timeBudget.totalPlanned)}
                      {timeBudget.totalPlanned > 0 && <span className={`time-budget-pct ${timeBudget.totalActual > timeBudget.totalPlanned ? 'over' : ''}`}>
                        {' '}({Math.round((timeBudget.totalActual / timeBudget.totalPlanned) * 100)}%)
                      </span>}
                    </span>
                  </div>
                  <div className="time-budget-bar-outer">
                    <div className="time-budget-bar-fill" style={{ width: `${Math.min(100, timeBudget.totalPlanned > 0 ? (timeBudget.totalActual / timeBudget.totalPlanned) * 100 : 0)}%` }} />
                  </div>
                  <div className="time-budget-list">
                    {timeBudget.tasks.filter(t => t.plannedMinutes > 0).slice(0, 5).map(t => (
                      <div key={t.taskId} className="time-budget-row">
                        <span className="time-budget-task">{t.title}</span>
                        <div className="time-budget-mini-bar-outer">
                          <div className={`time-budget-mini-bar ${t.actualMinutes > t.plannedMinutes ? 'over' : ''}`} style={{ width: `${Math.min(100, t.plannedMinutes > 0 ? (t.actualMinutes / t.plannedMinutes) * 100 : 0)}%` }} />
                        </div>
                        <span className="time-budget-val">{fmtMin(t.actualMinutes)}/{fmtMin(t.plannedMinutes)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Backlog alert */}
              {backlog.length > 0 && (
                <div className="backlog-alert mb-20" onClick={() => setView('backlog')}>
                  {mi('warning')} <strong>{backlog.length}</strong> {backlog.length === 1 ? 'attività arretrata' : 'attività arretrate'} — <span className="backlog-alert-link">Gestisci backlog</span>
                </div>
              )}

              <div className="grid-2">
                <div className="card">
                  <div className="card-head"><h3>Attività di oggi</h3><button className="btn-link" onClick={() => setView('tasks')}>Vedi tutte {mi('arrow_forward')}</button></div>
                  {tasks.length === 0 && <p className="empty">Nessuna attività pianificata</p>}
                  {tasks.slice(0, 6).map(t => (
                    <div key={t.id} className="mini-task">
                      <div className="mini-task-left">
                        <span className={`badge badge-${t.status.toLowerCase()}`}>{STATUS_LABEL[t.status]}</span>
                        <span className="mini-task-title">{t.title}</span>
                      </div>
                      <span className={`badge badge-${t.priority.toLowerCase()}`}>{PRI_LABEL[t.priority]}</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-head"><h3>Ultime modifiche</h3><button className="btn-link" onClick={() => setView('changes')}>Vedi tutte {mi('arrow_forward')}</button></div>
                  {changes.length === 0 && <p className="empty">Nessuna modifica registrata</p>}
                  {changes.slice(0, 6).map(c => (
                    <div key={c.id} className="mini-change">
                      <span className={`badge badge-${toolCls(c.tool)}`}>{TOOL_LABEL[c.tool]}</span>
                      <span className="mini-change-text"><strong>{c.artifact}</strong> — {c.summary}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Statistiche settimanali ── */}
              <div className="stats-section mt-24">
                <div className="stats-section-header">
                  <h3>{mi('trending_up')} Statistiche settimanali</h3>
                  <div className="view-actions">
                    <button className="btn-secondary btn-sm" onClick={() => setStatsWeekOff(o => o - 1)}>← Prec.</button>
                    <button className="btn-secondary btn-sm" onClick={() => setStatsWeekOff(0)}>Questa</button>
                    <button className="btn-secondary btn-sm" onClick={() => setStatsWeekOff(o => o + 1)}>Succ. →</button>
                    <button className="btn-primary btn-sm" onClick={doExport}>{mi('download')} CSV</button>
                    <button className="btn-secondary btn-sm" onClick={doExportFullJson}>{mi('save')} Export JSON completo</button>
                  </div>
                </div>

                {weekStats && (
                  <>
                    <div className="kpi-row mb-20">
                      <div className="kpi-card"><div className="kpi-icon ki-time">{mi('timer')}</div><div><span className="kpi-value">{fmtMin(weekStats.totalMinutes)}</span><span className="kpi-label">Tempo settimana</span></div></div>
                      <div className="kpi-card"><div className="kpi-icon ki-tasks">{mi('task_alt')}</div><div><span className="kpi-value">{weekStats.taskStats.find(s => s.status === 'Done')?.count || 0}</span><span className="kpi-label">Completate</span></div></div>
                      <div className="kpi-card"><div className="kpi-icon ki-changes">{mi('assignment')}</div><div><span className="kpi-value">{weekStats.changeTypes.reduce((a, c) => a + c.count, 0)}</span><span className="kpi-label">Modifiche</span></div></div>
                      <div className="kpi-card"><div className="kpi-icon ki-goals">{mi('flag')}</div><div><span className="kpi-value">{weekStats.goalStats?.done || 0}/{weekStats.goalStats?.total || 0}</span><span className="kpi-label">Obiettivi sett.</span></div></div>
                    </div>

                    <div className="grid-2 mb-20">
                      <div className="card">
                        <h3>Tempo per giorno</h3>
                        <div className="bar-chart">
                          {(() => {
                            const { start } = weekRange(statsWeekOff);
                            const days: string[] = [];
                            const d = new Date(start + 'T00:00:00');
                            for (let i = 0; i < 7; i++) { days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); d.setDate(d.getDate() + 1); }
                            const maxMin = Math.max(1, ...weekStats.dailyTime.map(d => d.totalMinutes));
                            return days.map((day, i) => {
                              const dt = weekStats.dailyTime.find(d => d.day === day);
                              const min = dt?.totalMinutes || 0;
                              const pct = (min / maxMin) * 100;
                              return (
                                <div key={day} className="bar-col">
                                  <div className="bar-value">{min > 0 ? fmtMin(min) : ''}</div>
                                  <div className="bar-track"><div className="bar-fill" style={{ height: `${pct}%` }} /></div>
                                  <div className="bar-label">{WEEKDAY_SHORT[i]}</div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      <div className="card">
                        <h3>Strumenti utilizzati</h3>
                        {weekStats.toolUsage.length === 0 && <p className="empty">Nessun dato</p>}
                        {weekStats.toolUsage.map(t => {
                          const maxC = Math.max(1, ...weekStats.toolUsage.map(x => x.count));
                          return (
                            <div key={t.tool} className="hbar-row">
                              <span className={`badge badge-${toolCls(t.tool)}`}>{TOOL_LABEL[t.tool as Tool] || t.tool}</span>
                              <div className="hbar-track"><div className={`hbar-fill hbar-${toolCls(t.tool)}`} style={{ width: `${(t.count / maxC) * 100}%` }} /></div>
                              <span className="hbar-val">{t.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid-2">
                      <div className="card">
                        <h3>Stato attività</h3>
                        {weekStats.taskStats.length === 0 && <p className="empty">Nessun dato</p>}
                        {weekStats.taskStats.map(s => (
                          <div key={s.status} className="stat-row">
                            <span className={`badge badge-${s.status.toLowerCase()}`}>{STATUS_LABEL[s.status as TaskStatus] || s.status}</span>
                            <span className="stat-count">{s.count}</span>
                          </div>
                        ))}
                      </div>

                      <div className="card">
                        <h3>Tipi di modifica</h3>
                        {weekStats.changeTypes.length === 0 && <p className="empty">Nessun dato</p>}
                        {weekStats.changeTypes.map(c => (
                          <div key={c.changeType} className="stat-row">
                            <span className="badge badge-type">{c.changeType}</span>
                            <span className="stat-count">{c.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═══════ GOALS ═══════ */}
          {view === 'goals' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Obiettivi di oggi</h2><p className="view-sub">Definisci cosa vuoi raggiungere oggi</p></div>
                <div className="view-actions">
                  <div className="goal-progress">
                    <div className="goal-progress-bar" style={{ width: `${goals.length ? (goalsDone / goals.length) * 100 : 0}%` }} />
                  </div>
                  <span className="goal-progress-label">{goalsDone}/{goals.length}</span>
                </div>
              </div>

              <form className="card mb-20" onSubmit={onCreateGoal}>
                <div className="form-row">
                  <input className="fg-2" value={goalText} onChange={e => setGoalText(e.target.value)} placeholder="Nuovo obiettivo... (es: Completare il flow di approvazione)" required />
                  <button type="submit" className="btn-primary">+ Aggiungi</button>
                </div>
              </form>

              <div className="goals-list">
                {goals.length === 0 && <div className="empty-box"><span className="empty-icon">{mi('flag')}</span><p>Nessun obiettivo per oggi. Aggiungine uno!</p></div>}
                {goals.map(g => (
                  <div key={g.id} className={`goal-card${g.isDone ? ' done' : ''}`}>
                    {editingGoalId === g.id ? (
                      <form className="goal-card-edit" onSubmit={e => { e.preventDefault(); saveEditGoal(g.id); }} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <input autoFocus className="fg-2" value={editingGoalText} onChange={e => setEditingGoalText(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') cancelEditGoal(); }} />
                        <button type="submit" className="btn-icon" title="Salva">{mi('check')}</button>
                        <button type="button" className="btn-icon" onClick={cancelEditGoal} title="Annulla">{mi('close')}</button>
                      </form>
                    ) : (
                      <>
                        <div className="goal-card-left" onClick={() => toggleGoal(g.id)}>
                          <span className={`goal-check big${g.isDone ? ' done' : ''}`}>{g.isDone ? mi('check') : ''}</span>
                          <span className={`goal-card-text${g.isDone ? ' done' : ''}`}>{g.text}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => startEditGoal(g)} title="Modifica">{mi('edit')}</button>
                          <button className="btn-icon btn-del" onClick={() => delGoal(g.id)} title="Elimina">{mi('close')}</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ TASKS (Kanban) ═══════ */}

          {/* ═══════ PROJECTS ═══════ */}
          {view === 'projects' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Progetti</h2><p className="view-sub">Organizza il lavoro per progetto</p></div>
              </div>

              <div className="grid-2 align-start">
                {/* Left: project list + create */}
                <div>
                  <form className="card mb-20" onSubmit={onCreateProject}>
                    <h3>Nuovo progetto</h3>
                    <div className="form-row mb-12">
                      <input className="fg-2" value={projName} onChange={e => setProjName(e.target.value)} placeholder="Nome progetto" required />
                      <button type="submit" className="btn-primary">+ Crea</button>
                    </div>
                    <input className="full-w mb-12" value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Descrizione (opzionale)" />
                    <div className="color-picker">
                      {PROJECT_COLORS.map(c => (
                        <button type="button" key={c} className={`color-dot${projColor === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setProjColor(c)} />
                      ))}
                    </div>
                  </form>

                  <div className="card">
                    <h3>I tuoi progetti ({projects.filter(p => !p.isArchived).length})</h3>
                    {projects.filter(p => !p.isArchived).length === 0 && <div className="empty-box"><span className="empty-icon">{mi('folder')}</span><p>Nessun progetto. Creane uno!</p></div>}
                    {projects.filter(p => !p.isArchived).map(p => (
                      editingProjId === p.id ? (
                        <form key={p.id} className="project-row editing" onSubmit={e => { e.preventDefault(); saveEditProject(p.id); }} style={{ flexDirection: 'column', gap: 8, padding: 12 }}>
                          <div className="form-row mb-8">
                            <input className="fg-2" value={editProjName} onChange={e => setEditProjName(e.target.value)} placeholder="Nome progetto" autoFocus required />
                          </div>
                          <input className="full-w mb-8" value={editProjDesc} onChange={e => setEditProjDesc(e.target.value)} placeholder="Descrizione (opzionale)" />
                          <div className="color-picker compact mb-8">
                            {PROJECT_COLORS.map(c => (
                              <button type="button" key={c} className={`color-dot small${editProjColor === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setEditProjColor(c)} />
                            ))}
                          </div>
                          <div className="form-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                            <button type="button" className="btn-secondary btn-sm" onClick={cancelEditProject}>Annulla</button>
                            <button type="submit" className="btn-primary btn-sm">Salva</button>
                          </div>
                        </form>
                      ) : (
                        <div key={p.id} className={`project-row${selectedProjId === p.id ? ' selected' : ''}`} onClick={() => setSelectedProjId(selectedProjId === p.id ? null : p.id)}>
                          <span className="project-color-dot" style={{ background: p.color }} />
                          <div className="project-row-info">
                            <strong>{p.name}</strong>
                            {p.description && <span className="project-row-desc">{p.description}</span>}
                          </div>
                          <div className="project-row-btns">
                            <button className="btn-icon" onClick={ev => { ev.stopPropagation(); startEditProject(p); }} title="Modifica">{mi('edit')}</button>
                            <button className="btn-icon" onClick={ev => { ev.stopPropagation(); archiveProject(p.id); }} title="Archivia">{mi('archive')}</button>
                            <button className="btn-icon btn-del" onClick={ev => { ev.stopPropagation(); delProject(p.id); }} title="Elimina">{mi('close')}</button>
                          </div>
                        </div>
                      )
                    ))}

                    {projects.filter(p => p.isArchived).length > 0 && (
                      <>
                        <h4 className="mt-20">Archiviati</h4>
                        {projects.filter(p => p.isArchived).map(p => (
                          <div key={p.id} className="project-row archived" onClick={() => setSelectedProjId(selectedProjId === p.id ? null : p.id)}>
                            <span className="project-color-dot" style={{ background: p.color, opacity: 0.5 }} />
                            <div className="project-row-info"><strong>{p.name}</strong></div>
                            <button className="btn-icon btn-del" onClick={ev => { ev.stopPropagation(); delProject(p.id); }} title="Elimina">{mi('close')}</button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Right: selected project detail + stats */}
                <div>
                  {!selectedProjId && <div className="card"><div className="empty-box"><span className="empty-icon">{mi('folder')}</span><p>Seleziona un progetto per vedere le statistiche</p></div></div>}
                  {selectedProjId && (() => {
                    const proj = projects.find(p => p.id === selectedProjId);
                    if (!proj) return null;
                    return (
                      <div className="card">
                        <div className="project-detail-head">
                          <span className="project-color-dot big" style={{ background: proj.color }} />
                          <div>
                            <h3>{proj.name}</h3>
                            {proj.description && <p className="view-sub">{proj.description}</p>}
                          </div>
                        </div>

                        {projStats && (
                          <>
                            <div className="kpi-row kpi-3 mb-20 mt-20">
                              <div className="kpi-card small"><span className="kpi-value">{fmtMin(projStats.totalMinutes)}</span><span className="kpi-label">Tempo</span></div>
                              <div className="kpi-card small"><span className="kpi-value">{projStats.taskStats.reduce((a, s) => a + s.count, 0)}</span><span className="kpi-label">Attività</span></div>
                              <div className="kpi-card small"><span className="kpi-value">{projStats.changeCount}</span><span className="kpi-label">Modifiche</span></div>
                            </div>
                            {projStats.taskStats.length > 0 && (
                              <div>
                                <h4>Stato attività</h4>
                                {projStats.taskStats.map(s => (
                                  <div key={s.status} className="stat-row">
                                    <span className={`badge badge-${s.status.toLowerCase()}`}>{STATUS_LABEL[s.status as TaskStatus] || s.status}</span>
                                    <span className="stat-count">{s.count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Project tasks */}
                        <h4 className="mt-20">Attività recenti</h4>
                        {tasks.filter(t => t.projectId === selectedProjId).length === 0 && <p className="empty">Nessuna attività per oggi in questo progetto</p>}
                        {tasks.filter(t => t.projectId === selectedProjId).map(t => (
                          <div key={t.id} className="mini-task">
                            <div className="mini-task-left">
                              <span className={`badge badge-${t.status.toLowerCase()}`}>{STATUS_LABEL[t.status]}</span>
                              <span className="mini-task-title">{t.title}</span>
                            </div>
                            <span className={`badge badge-${t.priority.toLowerCase()}`}>{PRI_LABEL[t.priority]}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tag management section */}
              <div className="card mt-20">
                <h3>Gestione Tag</h3>
                <form className="form-row mb-12" onSubmit={onCreateTag}>
                  <input value={tagName} onChange={e => setTagName(e.target.value)} placeholder="Nome tag" required />
                  <div className="color-picker compact">
                    {TAG_COLORS.map(c => (
                      <button type="button" key={c} className={`color-dot small${tagColor === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setTagColor(c)} />
                    ))}
                  </div>
                  <button type="submit" className="btn-primary btn-sm">+ Tag</button>
                </form>
                <div className="tags-list">
                  {tags.length === 0 && <p className="empty">Nessun tag creato</p>}
                  {tags.map(t => (
                    editingTagId === t.id ? (
                      <form key={t.id} className="tag-edit-row" onSubmit={e => { e.preventDefault(); saveEditTag(t.id); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e293b', borderRadius: 8, padding: '4px 8px', marginRight: 8, marginBottom: 8 }}>
                        <input value={editTagName} onChange={e => setEditTagName(e.target.value)} style={{ width: 90, padding: '2px 6px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#f1f5f9', fontSize: 13 }} autoFocus required />
                        <div className="color-picker compact" style={{ display: 'inline-flex', gap: 3 }}>
                          {TAG_COLORS.map(c => (
                            <button type="button" key={c} className={`color-dot small${editTagColor === c ? ' active' : ''}`} style={{ background: c, width: 16, height: 16, borderRadius: '50%', border: editTagColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} onClick={() => setEditTagColor(c)} />
                          ))}
                        </div>
                        <button type="submit" className="btn-icon" title="Salva" style={{ color: '#22c55e' }}>{mi('check')}</button>
                        <button type="button" className="btn-icon" onClick={cancelEditTag} title="Annulla">{mi('close')}</button>
                      </form>
                    ) : (
                      <span key={t.id} className="tag-chip" style={{ background: t.color }}>
                        {t.name}
                        <button className="tag-chip-edit" onClick={() => startEditTag(t)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 4, padding: 0, fontSize: 14, opacity: 0.8 }}>{mi('edit')}</button>
                        <button className="tag-chip-remove" onClick={() => delTag(t.id)}>{mi('close')}</button>
                      </span>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ TASKS (Kanban) ═══════ */}
          {view === 'tasks' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Attività</h2><p className="view-sub">Pianifica e gestisci le attività di oggi</p></div>
              </div>

              <form className="card mb-20" onSubmit={onCreateTask}>
                <h3>Nuova attività</h3>
                <div className="form-row mb-12">
                  <input className="fg-2" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Cosa devi fare?" required />
                  <input type="number" className="fg-num" value={taskMin} min={5} onChange={e => setTaskMin(Number(e.target.value))} title="Minuti pianificati" />
                  <select value={taskPri} onChange={e => setTaskPri(e.target.value as Priority)}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{PRI_LABEL[p]}</option>)}
                  </select>
                  <select value={taskProjId} onChange={e => setTaskProjId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">— Nessun progetto —</option>
                    {projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={taskRecurrence} onChange={e => setTaskRecurrence(e.target.value as RecurrenceType | '')} title="Ricorrenza">
                    <option value="">— Nessuna ricorrenza —</option>
                    <option value="daily">Giornaliera</option>
                    <option value="weekly">Settimanale</option>
                    <option value="monthly">Mensile</option>
                  </select>
                  <button type="submit" className="btn-primary">+ Aggiungi</button>
                </div>
                <input className="full-w" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Descrizione (opzionale)" />
              </form>

              <div className="kanban">
                {(['Todo', 'Doing', 'Done'] as TaskStatus[]).map(status => {
                  const items = tasks.filter(t => t.status === status);
                  return (
                    <div key={status} className={`kanban-col${draggedTaskId !== null ? ' kanban-col-droppable' : ''}`}
                      onDragOver={onDragOverCol} onDrop={() => onDropCol(status)}>
                      <div className="kanban-head">
                        <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>
                        <span className="kanban-count">{items.length}</span>
                      </div>
                      {items.length === 0 && <p className="empty">Nessuna attività</p>}
                      {items.map(t => (
                        <div key={t.id} className={`task-card${draggedTaskId === t.id ? ' task-card-dragging' : ''}`}
                          draggable onDragStart={e => onDragStartTask(e, t.id)} onDragEnd={() => setDraggedTaskId(null)}>
                          <div className="task-card-top">
                            <span className="task-card-title">{t.title}</span>
                            <div className="task-card-btns">
                              <button className="btn-icon" onClick={() => setEditTask({ ...t })} title="Modifica">{mi('edit')}</button>
                              <button className="btn-icon" onClick={() => dupTask(t.id)} title="Duplica a domani">{mi('content_copy')}</button>
                              <button className="btn-icon btn-del" onClick={() => delTask(t.id)} title="Elimina">{mi('close')}</button>
                            </div>
                          </div>
                          {t.description && <p className="task-card-desc">{t.description}</p>}
                          <div className="task-card-meta">
                            <span className={`badge badge-${t.priority.toLowerCase()}`}>{PRI_LABEL[t.priority]}</span>
                            <span>{t.plannedMinutes} min</span>
                            {t.projectId && (() => { const proj = projects.find(p => p.id === t.projectId); return proj ? <span className="badge badge-project" style={{ background: proj.color }}>{proj.name}</span> : null; })()}
                            {t.recurrence && <span className="badge badge-recurrence" title={`Ricorrenza: ${t.recurrence}`}>{mi('repeat')} {t.recurrence === 'daily' ? 'Giorn.' : t.recurrence === 'weekly' ? 'Sett.' : 'Mens.'}</span>}
                          </div>
                          {/* Tags */}
                          <div className="task-tags-row">
                            {(taskTagsMap[t.id] || []).map(tag => (
                              <span key={tag.id} className="tag-chip small" style={{ background: tag.color }}>
                                {tag.name}
                                <button className="tag-chip-remove" onClick={() => removeTag(t.id, tag.id)}>{mi('close')}</button>
                              </span>
                            ))}
                            {tags.filter(tag => !(taskTagsMap[t.id] || []).some(tt => tt.id === tag.id)).length > 0 && (
                              <select className="tag-add-select" value="" onChange={e => { if (e.target.value) addTag(t.id, Number(e.target.value)); }}>
                                <option value="">+ tag</option>
                                {tags.filter(tag => !(taskTagsMap[t.id] || []).some(tt => tt.id === tag.id)).map(tag => (
                                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="task-card-actions">
                            <button className="btn-sm btn-secondary" onClick={() => cycleStatus(t)}>
                              {t.status === 'Todo' ? <>{mi('play_arrow')} Inizia</> : t.status === 'Doing' ? <>{mi('check')} Completa</> : <>{mi('replay')} Riapri</>}
                            </button>
                            {t.status !== 'Done' && (
                              <button className="btn-sm btn-primary" onClick={() => startTimer(t.id)} disabled={!!activeSession}>{mi('timer')} Timer</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Templates section */}
              <div className="card mt-20">
                <div className="card-head"><h3>{mi('description')} Template</h3></div>
                <form className="form-row mb-12" onSubmit={onCreateTemplate}>
                  <input className="fg-2" value={tplTitle} onChange={e => setTplTitle(e.target.value)} placeholder="Nome template" required />
                  <input type="number" className="fg-num" value={tplMin} min={5} onChange={e => setTplMin(Number(e.target.value))} title="Minuti" />
                  <select value={tplPri} onChange={e => setTplPri(e.target.value as Priority)}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{PRI_LABEL[p]}</option>)}
                  </select>
                  <select value={tplProjId} onChange={e => setTplProjId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">— Progetto —</option>
                    {projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button type="submit" className="btn-primary btn-sm">+ Template</button>
                </form>
                <div className="templates-grid">
                  {templates.length === 0 && <p className="empty">Nessun template. Creane uno per velocizzare la creazione attività.</p>}
                  {templates.map(tpl => (
                    <div key={tpl.id} className="template-card">
                      <div className="template-card-top">
                        <strong>{tpl.title}</strong>
                        <div>
                          <button className="btn-icon" onClick={() => useTemplate(tpl.id)} title="Usa template">{mi('play_arrow')}</button>
                          <button className="btn-icon btn-del" onClick={() => delTemplate(tpl.id)} title="Elimina">{mi('close')}</button>
                        </div>
                      </div>
                      <div className="template-card-meta">
                        <span className={`badge badge-${tpl.priority.toLowerCase()}`}>{PRI_LABEL[tpl.priority]}</span>
                        <span>{tpl.plannedMinutes} min</span>
                        {tpl.tool && <span className={`badge badge-${toolCls(tpl.tool)}`}>{TOOL_LABEL[tpl.tool as Tool] || tpl.tool}</span>}
                        {tpl.projectId && (() => { const proj = projects.find(p => p.id === tpl.projectId); return proj ? <span className="badge badge-project" style={{ background: proj.color }}>{proj.name}</span> : null; })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ TIMER + POMODORO ═══════ */}
          {view === 'timer' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Timer</h2><p className="view-sub">Traccia il tempo o usa il Pomodoro (25/5)</p></div>
              </div>

              {/* Info banner */}
              <div className="card mb-20" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>info</span>
                  <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text)' }}>Come funziona il Timer?</strong><br />
                    Seleziona un task dalla lista e premi <em>Avvia</em> per iniziare a tracciare il tempo di lavoro. Al termine, premi <em>Ferma sessione</em> e opzionalmente aggiungi una nota. Le sessioni vengono registrate e contribuiscono alle statistiche e al Report giornaliero.<br /><br />
                    <strong style={{ color: 'var(--text)' }}>Cos'è il Pomodoro?</strong><br />
                    La <strong>Tecnica del Pomodoro</strong> alterna cicli di <strong>25 minuti di lavoro concentrato</strong> a <strong>5 minuti di pausa</strong>. Riduce l'affaticamento mentale, elimina il multitasking e aumenta la produttività. Dopo 4 cicli è consigliata una pausa più lunga (15-30 min). Il badge nella sidebar mostra il tempo rimanente.
                  </div>
                </div>
              </div>

              {/* Pomodoro card */}
              <div className="card mb-20">
                <div className="card-head">
                  <h3>{mi('local_fire_department')} Pomodoro</h3>
                  <span className="badge badge-cat">Cicli completati: {pomoCycles}</span>
                </div>
                <div className="pomo-display">
                  <div className={`pomo-circle ${pomoPhase}`}>
                    <span className="pomo-time">{pomoLabel()}</span>
                    <span className="pomo-phase">{pomoPhase === 'focus' ? 'Focus' : 'Pausa'}</span>
                  </div>
                  <div className="pomo-actions">
                    {!pomoActive ? (
                      <button className="btn-success" onClick={startPomodoro}>{mi('play_arrow')} Avvia Pomodoro</button>
                    ) : (
                      <button className="btn-stop" onClick={stopPomodoro}>{mi('stop')} Interrompi</button>
                    )}
                  </div>
                </div>
              </div>

              {activeSession ? (
                <div className="timer-banner big mb-20">
                  <div className="timer-info"><span className="pulse-dot" /><div><div className="timer-task-name">{activeSession.taskTitle}</div><div className="timer-display big">{elapsed(activeSession.startedAt)}</div></div></div>
                  <div className="timer-actions">
                    <input className="timer-note-input" value={stopNote} onChange={e => setStopNote(e.target.value)} placeholder="Nota di chiusura (opzionale)" />
                    <button className="btn-stop" onClick={stopTimer}>{mi('stop')} Ferma sessione</button>
                  </div>
                </div>
              ) : (
                <div className="card mb-20">
                  <h3>Seleziona un'attività per iniziare</h3>
                  {tasks.filter(t => t.status !== 'Done').length === 0 && <p className="empty">Nessuna attività disponibile.</p>}
                  {tasks.filter(t => t.status !== 'Done').map(t => (
                    <div key={t.id} className="timer-pick">
                      <div>
                        <span className="timer-pick-title">{t.title}</span>
                        <span className="timer-pick-meta"><span className={`badge badge-${t.priority.toLowerCase()}`}>{PRI_LABEL[t.priority]}</span> {t.plannedMinutes} min</span>
                      </div>
                      <button className="btn-success btn-sm" onClick={() => startTimer(t.id)}>{mi('play_arrow')} Avvia</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <h3>Sessioni di oggi</h3>
                {sessions.length === 0 && <p className="empty">Nessuna sessione oggi</p>}
                {sessions.map(s => (
                  <div key={s.id} className="log-item">
                    <div className="log-head"><strong>{s.taskTitle}</strong><span className="log-dur">{s.durationMinutes ? fmtMin(s.durationMinutes) : 'In corso...'}</span></div>
                    <div className="log-body">
                      {new Date(s.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      {s.endedAt && ` – ${new Date(s.endedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
                      {s.note && <span className="log-note"> — {s.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ CHANGES ═══════ */}
          {view === 'changes' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Registro Modifiche</h2><p className="view-sub">Traccia ogni modifica su Power Platform e altri strumenti</p></div>
              </div>
              <div className="grid-2 align-start">
                <div className="card">
                  <h3>Nuova modifica</h3>
                  <form onSubmit={onAddChange}>
                    <div className="form-row mb-12">
                      <div className="form-group fg-1"><label>Strumento</label><select value={chgTool} onChange={e => setChgTool(e.target.value as Tool)}>{TOOLS.map(t => <option key={t} value={t}>{TOOL_LABEL[t]}</option>)}</select></div>
                      <div className="form-group fg-1"><label>Tipo</label><select value={chgType} onChange={e => setChgType(e.target.value as ChangeType)}>{CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    </div>
                    <div className="form-group"><label>Attività collegata (opzionale)</label><select value={chgTaskId} onChange={e => setChgTaskId(e.target.value === '' ? '' : Number(e.target.value))}><option value="">— Nessuna —</option>{tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
                    <div className="form-group"><label>Progetto (opzionale)</label><select value={chgProjId} onChange={e => setChgProjId(e.target.value === '' ? '' : Number(e.target.value))}><option value="">— Nessun progetto —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div className="form-group"><label>Oggetto</label><input value={chgArtifact} onChange={e => setChgArtifact(e.target.value)} placeholder="Es: App Gestione Ordini" required /></div>
                    <div className="form-group"><label>Descrizione modifica</label><textarea value={chgSummary} onChange={e => setChgSummary(e.target.value)} placeholder="Cosa hai fatto?" required /></div>
                    <div className="form-row mb-12">
                      <div className="form-group fg-1"><label>Prima (opzionale)</label><textarea className="small" value={chgBefore} onChange={e => setChgBefore(e.target.value)} placeholder="Com'era" /></div>
                      <div className="form-group fg-1"><label>Dopo (opzionale)</label><textarea className="small" value={chgAfter} onChange={e => setChgAfter(e.target.value)} placeholder="Com'è adesso" /></div>
                    </div>
                    <div className="form-group"><label>Esito test</label><input value={chgTest} onChange={e => setChgTest(e.target.value)} placeholder="Non testato" /></div>
                    <button type="submit" className="btn-primary full-w mt-16">Registra modifica</button>
                  </form>
                </div>
                <div className="card">
                  <h3>Modifiche di oggi ({changes.length})</h3>
                  {changes.length === 0 && <div className="empty-box"><span className="empty-icon">{mi('assignment')}</span><p>Nessuna modifica registrata oggi</p></div>}
                  {changes.map(c => (
                    <div key={c.id} className="log-item">
                      {editingChangeId === c.id ? (
                        <div className="log-body">
                          <div className="form-row mb-12">
                            <div className="form-group fg-1"><label>Strumento</label><select value={editChange.tool || c.tool} onChange={e => setEditChange(p => ({ ...p, tool: e.target.value as Tool }))}>{TOOLS.map(t => <option key={t} value={t}>{TOOL_LABEL[t]}</option>)}</select></div>
                            <div className="form-group fg-1"><label>Tipo</label><select value={editChange.changeType || c.changeType} onChange={e => setEditChange(p => ({ ...p, changeType: e.target.value as ChangeType }))}>{CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                          </div>
                          <div className="form-group"><label>Oggetto</label><input value={editChange.artifact ?? ''} onChange={e => setEditChange(p => ({ ...p, artifact: e.target.value }))} /></div>
                          <div className="form-group"><label>Descrizione</label><textarea value={editChange.summary ?? ''} onChange={e => setEditChange(p => ({ ...p, summary: e.target.value }))} /></div>
                          <div className="form-row mb-12">
                            <div className="form-group fg-1"><label>Prima</label><textarea className="small" value={editChange.beforeText ?? ''} onChange={e => setEditChange(p => ({ ...p, beforeText: e.target.value }))} /></div>
                            <div className="form-group fg-1"><label>Dopo</label><textarea className="small" value={editChange.afterText ?? ''} onChange={e => setEditChange(p => ({ ...p, afterText: e.target.value }))} /></div>
                          </div>
                          <div className="form-group"><label>Esito test</label><input value={editChange.testResult ?? ''} onChange={e => setEditChange(p => ({ ...p, testResult: e.target.value }))} /></div>
                          <div className="form-row mt-16"><button className="btn-primary btn-sm" onClick={() => saveEditChange(c.id)}>{mi('check')} Salva</button><button className="btn-secondary btn-sm" onClick={cancelEditChange}>Annulla</button></div>
                        </div>
                      ) : (
                        <>
                          <div className="log-head"><div className="log-badges"><span className={`badge badge-${toolCls(c.tool)}`}>{TOOL_LABEL[c.tool]}</span><span className="badge badge-type">{c.changeType}</span></div><div><button className="btn-icon" onClick={() => startEditChange(c)} title="Modifica">{mi('edit')}</button><button className="btn-icon btn-del" onClick={() => delChange(c.id)} title="Elimina">{mi('close')}</button></div></div>
                          <div className="log-body">
                            <strong>{c.artifact}</strong><p>{c.summary}</p>
                            {(c.beforeText || c.afterText) && <div className="before-after">{c.beforeText && <div className="ba-item ba-before"><span>Prima:</span> {c.beforeText}</div>}{c.afterText && <div className="ba-item ba-after"><span>Dopo:</span> {c.afterText}</div>}</div>}
                            <p className="test-result">Test: {c.testResult}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ NOTES ═══════ */}
          {view === 'notes' && (
            <div className="view">
              <div className="view-header"><div><h2 className="view-title">Appunti</h2><p className="view-sub">Riunioni, idee, promemoria e note rapide</p></div></div>
              <form className="card mb-20" onSubmit={onCreateNote}>
                <h3>Nuovo appunto</h3>
                <div className="form-row mb-12">
                  <div className="form-group"><label>Categoria</label><select value={noteCat} onChange={e => setNoteCat(e.target.value as NoteCategory)}>{NOTE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div className="form-group fg-2"><label>Titolo</label><input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Es: Call con il team marketing" required /></div>
                </div>
                <div className="form-group"><label>Contenuto (opzionale)</label><textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Dettagli, decisioni, azioni da fare..." /></div>
                <button type="submit" className="btn-primary mt-16">{mi('save')} Salva appunto</button>
              </form>
              <div className="notes-grid">
                {notes.length === 0 && <div className="empty-box full-w"><span className="empty-icon">{mi('edit_note')}</span><p>Nessun appunto per oggi</p></div>}
                {notes.map(n => (
                  <div key={n.id} className={`note-card${n.pinned ? ' pinned' : ''}`}>
                    <div className="note-head">
                      <span className="badge badge-cat">{n.category}</span>
                      <div className="note-actions">
                        <button className="btn-icon" onClick={() => setEditNote({ ...n })} title="Modifica">{mi('edit')}</button>
                        <button className="btn-icon" onClick={() => togglePin(n.id)} title={n.pinned ? 'Rimuovi pin' : 'Fissa'}>{n.pinned ? mi('push_pin') : mi('push_pin')}</button>
                        <button className="btn-icon btn-del" onClick={() => delNote(n.id)} title="Elimina">{mi('close')}</button>
                      </div>
                    </div>
                    <h4 className="note-title">{n.title}</h4>
                    {n.content && <p className="note-content">{n.content}</p>}
                    <p className="note-time">{new Date(n.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ HISTORY ═══════ */}
          {view === 'history' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Storico</h2><p className="view-sub">Naviga tra i giorni lavorati</p></div>
                <div className="view-actions">
                  <button className="btn-secondary btn-sm" onClick={() => { if (histMonth === 1) { setHistMonth(12); setHistYear(y => y - 1); } else setHistMonth(m => m - 1); }}>←</button>
                  <span className="hist-month-label">{['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'][histMonth - 1]} {histYear}</span>
                  <button className="btn-secondary btn-sm" onClick={() => { if (histMonth === 12) { setHistMonth(1); setHistYear(y => y + 1); } else setHistMonth(m => m + 1); }}>→</button>
                </div>
              </div>

              <div className="grid-2 align-start">
                {/* Calendar */}
                <div className="card history-calendar-card">
                  <div className="cal-grid">
                    {WEEKDAY_SHORT.map(d => <div key={d} className="cal-day-head">{d}</div>)}
                    {(() => {
                      const first = new Date(histYear, histMonth - 1, 1);
                      const lastDay = new Date(histYear, histMonth, 0).getDate();
                      const startPad = (first.getDay() + 6) % 7;
                      const cells: JSX.Element[] = [];
                      for (let i = 0; i < startPad; i++) cells.push(<div key={`pad-${i}`} className="cal-cell empty" />);
                      for (let d = 1; d <= lastDay; d++) {
                        const iso = `${histYear}-${String(histMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const hasData = activeDays.includes(iso);
                        const isToday = iso === today;
                        const isSelected = iso === histDay;
                        cells.push(
                          <div key={d} className={`cal-cell${hasData ? ' has-data' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`} onClick={() => hasData && setHistDay(iso)}>
                            {d}
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>

                {/* Day summary */}
                <div className="card">
                  {!histDay && <div className="empty-box"><span className="empty-icon">{mi('calendar_month')}</span><p>Seleziona un giorno dal calendario</p></div>}
                  {histDay && daySummary && (
                    <>
                      <h3>{dateLong(histDay)}</h3>
                      <div className="hist-kpis">
                        <span className="hist-kpi">{mi('timer')} {fmtMin(daySummary.totalMinutes)}</span>
                        <span className="hist-kpi">{mi('task_alt')} {daySummary.tasksDone}/{daySummary.tasksTotal}</span>
                        <span className="hist-kpi">{mi('flag')} {daySummary.goalsDone}/{daySummary.goalsTotal}</span>
                        <span className="hist-kpi">{mi('assignment')} {daySummary.changes.length}</span>
                        <span className="hist-kpi">{mi('edit_note')} {daySummary.notes.length}</span>
                      </div>
                      {daySummary.goals.length > 0 && <div className="hist-section"><h4>Obiettivi</h4>{daySummary.goals.map(g => <div key={g.id} className="hist-line">{g.isDone ? mi('check') : mi('radio_button_unchecked')} {g.text}</div>)}</div>}
                      {daySummary.tasks.length > 0 && <div className="hist-section"><h4>Attività</h4>{daySummary.tasks.map(t => <div key={t.id} className="hist-line"><span className={`badge badge-${t.status.toLowerCase()}`}>{STATUS_LABEL[t.status]}</span> {t.title}</div>)}</div>}
                      {daySummary.sessions.length > 0 && <div className="hist-section"><h4>Sessioni</h4>{daySummary.sessions.map(s => <div key={s.id} className="hist-line">{s.taskTitle} — {s.durationMinutes ? fmtMin(s.durationMinutes) : '?'}{s.note ? ` (${s.note})` : ''}</div>)}</div>}
                      {daySummary.changes.length > 0 && <div className="hist-section"><h4>Modifiche</h4>{daySummary.changes.map(c => <div key={c.id} className="hist-line"><span className={`badge badge-${toolCls(c.tool)}`}>{TOOL_LABEL[c.tool]}</span> {c.artifact} — {c.summary}</div>)}</div>}
                      {daySummary.notes.length > 0 && <div className="hist-section"><h4>Appunti</h4>{daySummary.notes.map(n => <div key={n.id} className="hist-line">[{n.category}] {n.title}{n.content ? ` — ${n.content}` : ''}</div>)}</div>}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ SEARCH ═══════ */}
          {view === 'search' && (
            <div className="view">
              <div className="view-header"><div><h2 className="view-title">Ricerca</h2><p className="view-sub">Cerca in attività, modifiche e appunti</p></div></div>

              <form className="card mb-20" onSubmit={doSearch}>
                <div className="form-row">
                  <input className="fg-2" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cerca..." required />
                  <button type="submit" className="btn-primary">{mi('search')} Cerca</button>
                </div>
              </form>

              {searchResult && (
                <div className="search-results">
                  {searchResult.tasks.length === 0 && searchResult.changes.length === 0 && searchResult.notes.length === 0 && (
                    <div className="empty-box"><span className="empty-icon">{mi('search')}</span><p>Nessun risultato per "{searchQuery}"</p></div>
                  )}

                  {searchResult.tasks.length > 0 && (
                    <div className="card mb-20">
                      <h3>Attività ({searchResult.tasks.length})</h3>
                      {searchResult.tasks.map(t => (
                        <div key={t.id} className="search-item">
                          <div className="search-item-head">
                            <span className={`badge badge-${t.status.toLowerCase()}`}>{STATUS_LABEL[t.status]}</span>
                            <strong>{t.title}</strong>
                          </div>
                          <span className="search-item-date">{t.scheduledDate}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResult.changes.length > 0 && (
                    <div className="card mb-20">
                      <h3>Modifiche ({searchResult.changes.length})</h3>
                      {searchResult.changes.map(c => (
                        <div key={c.id} className="search-item">
                          <div className="search-item-head">
                            <span className={`badge badge-${toolCls(c.tool)}`}>{TOOL_LABEL[c.tool]}</span>
                            <strong>{c.artifact}</strong> — {c.summary}
                          </div>
                          <span className="search-item-date">{c.workDate}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResult.notes.length > 0 && (
                    <div className="card mb-20">
                      <h3>Appunti ({searchResult.notes.length})</h3>
                      {searchResult.notes.map(n => (
                        <div key={n.id} className="search-item">
                          <div className="search-item-head">
                            <span className="badge badge-cat">{n.category}</span>
                            <strong>{n.title}</strong>{n.content && ` — ${n.content.slice(0, 80)}`}
                          </div>
                          <span className="search-item-date">{n.workDate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════ BACKLOG ═══════ */}
          {view === 'backlog' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Backlog</h2><p className="view-sub">Attività non completate da giorni precedenti</p></div>
                <div className="view-actions"><span className="badge badge-doing">{backlog.length} arretrate</span></div>
              </div>

              {backlog.length === 0 && <div className="card"><div className="empty-box"><span className="empty-icon">{mi('check_circle')}</span><p>Nessuna attività arretrata. Tutto in ordine!</p></div></div>}

              <div className="backlog-list">
                {backlog.map(t => {
                  const proj = t.projectId ? projects.find(p => p.id === t.projectId) : null;
                  return (
                    <div key={t.id} className="backlog-card">
                      <div className="backlog-card-top">
                        <div className="backlog-card-info">
                          <span className="backlog-card-title">{t.title}</span>
                          <div className="backlog-card-meta">
                            <span className={`badge badge-${t.status.toLowerCase()}`}>{STATUS_LABEL[t.status]}</span>
                            <span className={`badge badge-${t.priority.toLowerCase()}`}>{PRI_LABEL[t.priority]}</span>
                            <span className="backlog-date">{mi('event')} {t.scheduledDate}</span>
                            {proj && <span className="badge badge-project" style={{ background: proj.color }}>{proj.name}</span>}
                          </div>
                          {t.description && <p className="backlog-card-desc">{t.description}</p>}
                        </div>
                        <div className="backlog-card-actions">
                          <button className="btn-success btn-sm" onClick={() => rescheduleToToday(t.id)}>{mi('today')} Sposta a oggi</button>
                          <button className="btn-secondary btn-sm" onClick={() => cycleStatus(t)}>{mi('check')} Completa</button>
                          <button className="btn-icon btn-del" onClick={() => delTask(t.id)}>{mi('close')}</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════ SNIPPETS ═══════ */}
          {view === 'snippets' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Snippets</h2><p className="view-sub">Salva e riutilizza frammenti di codice, formule e espressioni</p></div>
                <div className="view-actions">
                  <select value={snipFilter} onChange={e => setSnipFilter(e.target.value as SnippetLang | '')}>
                    <option value="">Tutti i linguaggi</option>
                    {SNIPPET_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <form className="card mb-20" onSubmit={onCreateSnippet}>
                <h3>Nuovo snippet</h3>
                <div className="form-row mb-12">
                  <input className="fg-2" value={snipTitle} onChange={e => setSnipTitle(e.target.value)} placeholder="Nome snippet (es: Filtro deleghe)" required />
                  <select value={snipLang} onChange={e => setSnipLang(e.target.value as SnippetLang)}>
                    {SNIPPET_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <button type="submit" className="btn-primary">+ Salva</button>
                </div>
                <div className="form-group mb-12"><label>Codice</label><textarea className="snippet-code-input" value={snipCode} onChange={e => setSnipCode(e.target.value)} placeholder="Incolla qui il codice o la formula..." required /></div>
                <input className="full-w" value={snipDesc} onChange={e => setSnipDesc(e.target.value)} placeholder="Descrizione (opzionale)" />
              </form>

              <div className="snippets-grid">
                {snippets.length === 0 && <div className="card"><div className="empty-box"><span className="empty-icon">{mi('code')}</span><p>Nessuno snippet salvato. Aggiungi formule, espressioni o frammenti di codice!</p></div></div>}
                {snippets.map(s => (
                  <div key={s.id} className={`snippet-card${s.isFavorite ? ' fav' : ''}`}>
                    <div className="snippet-card-head">
                      <div>
                        <strong>{s.title}</strong>
                        <span className={`badge badge-snippet-lang lang-${s.language.toLowerCase()}`}>{s.language}</span>
                      </div>
                      <div className="snippet-card-btns">
                        <button className="btn-icon" onClick={() => toggleSnipFav(s.id)} title={s.isFavorite ? 'Rimuovi preferito' : 'Preferito'}>{s.isFavorite ? mi('star') : mi('star_outline')}</button>
                        <button className={`btn-icon${snipCopied === s.id ? ' copied' : ''}`} onClick={() => copySnippetCode(s.code, s.id)} title="Copia codice">{snipCopied === s.id ? mi('check') : mi('content_copy')}</button>
                        <button className="btn-icon" onClick={() => setEditSnippet({ ...s })} title="Modifica">{mi('edit')}</button>
                        <button className="btn-icon btn-del" onClick={() => delSnippet(s.id)} title="Elimina">{mi('close')}</button>
                      </div>
                    </div>
                    {s.description && <p className="snippet-desc">{s.description}</p>}
                    <pre className="snippet-code">{s.code}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ BOOKMARKS ═══════ */}
          {view === 'bookmarks' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Link utili</h2><p className="view-sub">Salva link ad ambienti, documentazione e risorse</p></div>
                <div className="view-actions">
                  <select value={bmFilter} onChange={e => setBmFilter(e.target.value as BookmarkCat | '')}>
                    <option value="">Tutte le categorie</option>
                    {BOOKMARK_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <form className="card mb-20" onSubmit={onCreateBookmark}>
                <h3>Nuovo link</h3>
                <div className="form-row mb-12">
                  <input className="fg-2" value={bmTitle} onChange={e => setBmTitle(e.target.value)} placeholder="Nome (es: Ambiente DEV)" required />
                  <select value={bmCat} onChange={e => setBmCat(e.target.value as BookmarkCat)}>
                    {BOOKMARK_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={bmProjId} onChange={e => setBmProjId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">— Progetto —</option>
                    {projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-row mb-12">
                  <input className="fg-2" value={bmUrl} onChange={e => setBmUrl(e.target.value)} placeholder="URL (es: https://make.powerapps.com/...)" required />
                  <button type="submit" className="btn-primary">+ Salva</button>
                </div>
                <input className="full-w" value={bmDesc} onChange={e => setBmDesc(e.target.value)} placeholder="Descrizione (opzionale)" />
              </form>

              <div className="bookmarks-grid">
                {bookmarks.length === 0 && <div className="card full-w"><div className="empty-box"><span className="empty-icon">{mi('bookmark')}</span><p>Nessun link salvato. Aggiungi link ad ambienti, documentazione e risorse!</p></div></div>}
                {(() => {
                  const grouped = new Map<string, Bookmark[]>();
                  bookmarks.forEach(b => { const k = b.category; if (!grouped.has(k)) grouped.set(k, []); grouped.get(k)!.push(b); });
                  return Array.from(grouped.entries()).map(([cat, items]) => (
                    <div key={cat} className="card mb-20">
                      <h3>{mi('folder')} {cat} ({items.length})</h3>
                      {items.map(b => {
                        const proj = b.projectId ? projects.find(p => p.id === b.projectId) : null;
                        return (
                          <div key={b.id} className="bookmark-row">
                            {editingBookmark && editingBookmark.id === b.id ? (
                              <div className="bookmark-row-info" style={{ width: '100%' }}>
                                <div className="form-row mb-12">
                                  <input className="fg-2" value={editingBookmark.title} onChange={e => setEditingBookmark(prev => prev ? { ...prev, title: e.target.value } : prev)} placeholder="Nome" />
                                  <select value={editingBookmark.category} onChange={e => setEditingBookmark(prev => prev ? { ...prev, category: e.target.value as BookmarkCat } : prev)}>
                                    {BOOKMARK_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                  <select value={editingBookmark.projectId ?? ''} onChange={e => setEditingBookmark(prev => prev ? { ...prev, projectId: e.target.value === '' ? null : Number(e.target.value) } : prev)}>
                                    <option value="">— Progetto —</option>
                                    {projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-row mb-12">
                                  <input className="fg-2" value={editingBookmark.url} onChange={e => setEditingBookmark(prev => prev ? { ...prev, url: e.target.value } : prev)} placeholder="URL" />
                                </div>
                                <input className="full-w mb-12" value={editingBookmark.description} onChange={e => setEditingBookmark(prev => prev ? { ...prev, description: e.target.value } : prev)} placeholder="Descrizione (opzionale)" />
                                <div className="form-row"><button className="btn-primary btn-sm" onClick={saveEditBookmark}>{mi('check')} Salva</button><button className="btn-secondary btn-sm" onClick={cancelEditBookmark}>Annulla</button></div>
                              </div>
                            ) : (
                              <>
                                <div className="bookmark-row-info">
                                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="bookmark-link">{mi('open_in_new')} {b.title}</a>
                                  {b.description && <span className="bookmark-desc">{b.description}</span>}
                                  {proj && <span className="badge badge-project" style={{ background: proj.color }}>{proj.name}</span>}
                                </div>
                                <div><button className="btn-icon" onClick={() => startEditBookmark(b)} title="Modifica">{mi('edit')}</button><button className="btn-icon btn-del" onClick={() => delBookmark(b.id)} title="Elimina">{mi('close')}</button></div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ═══════ CONTACTS ═══════ */}
          {view === 'contacts' && (
            <div className="view">
              <div className="view-header"><div><h2 className="view-title">Contatti</h2><p className="view-sub">Rubrica stakeholder e collaboratori</p></div></div>
              <form className="card mb-20" onSubmit={onCreateContact}>
                <h3>Nuovo contatto</h3>
                <div className="form-row mb-12">
                  <div className="form-group fg-2"><label>Nome</label><input value={ctName} onChange={e => setCtName(e.target.value)} placeholder="Nome e cognome" required /></div>
                  <div className="form-group fg-1"><label>Ruolo</label><input value={ctRole} onChange={e => setCtRole(e.target.value)} placeholder="Es: Project Manager" /></div>
                </div>
                <div className="form-row mb-12">
                  <div className="form-group fg-1"><label>Email</label><input type="email" value={ctEmail} onChange={e => setCtEmail(e.target.value)} placeholder="email@esempio.com" /></div>
                  <div className="form-group fg-1"><label>Telefono</label><input value={ctPhone} onChange={e => setCtPhone(e.target.value)} placeholder="+39 ..." /></div>
                  <div className="form-group fg-1"><label>Azienda</label><input value={ctCompany} onChange={e => setCtCompany(e.target.value)} placeholder="Nome azienda" /></div>
                </div>
                <div className="form-row mb-12">
                  <div className="form-group fg-2"><label>Note</label><input value={ctNotes} onChange={e => setCtNotes(e.target.value)} placeholder="Informazioni aggiuntive" /></div>
                  <div className="form-group fg-1"><label>Progetto</label><select value={ctProjId} onChange={e => setCtProjId(e.target.value === '' ? '' : Number(e.target.value))}><option value="">— Nessuno —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <button type="submit" className="btn-primary mt-16">{mi('person_add')} Aggiungi contatto</button>
              </form>
              <div className="contacts-grid">
                {contacts.length === 0 && <div className="empty-box full-w"><span className="empty-icon">{mi('contacts')}</span><p>Nessun contatto salvato</p></div>}
                {contacts.map(c => (
                  <div key={c.id} className="card contact-card">
                    {editingContact && editingContact.id === c.id ? (
                      <div>
                        <div className="form-row mb-12">
                          <div className="form-group fg-2"><label>Nome</label><input value={editingContact.name} onChange={e => setEditingContact(prev => prev ? { ...prev, name: e.target.value } : prev)} /></div>
                          <div className="form-group fg-1"><label>Ruolo</label><input value={editingContact.role} onChange={e => setEditingContact(prev => prev ? { ...prev, role: e.target.value } : prev)} /></div>
                        </div>
                        <div className="form-row mb-12">
                          <div className="form-group fg-1"><label>Email</label><input value={editingContact.email} onChange={e => setEditingContact(prev => prev ? { ...prev, email: e.target.value } : prev)} /></div>
                          <div className="form-group fg-1"><label>Telefono</label><input value={editingContact.phone} onChange={e => setEditingContact(prev => prev ? { ...prev, phone: e.target.value } : prev)} /></div>
                          <div className="form-group fg-1"><label>Azienda</label><input value={editingContact.company} onChange={e => setEditingContact(prev => prev ? { ...prev, company: e.target.value } : prev)} /></div>
                        </div>
                        <div className="form-row mb-12">
                          <div className="form-group fg-2"><label>Note</label><input value={editingContact.notes} onChange={e => setEditingContact(prev => prev ? { ...prev, notes: e.target.value } : prev)} /></div>
                          <div className="form-group fg-1"><label>Progetto</label><select value={editingContact.projectId ?? ''} onChange={e => setEditingContact(prev => prev ? { ...prev, projectId: e.target.value === '' ? null : Number(e.target.value) } : prev)}><option value="">— Nessuno —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        </div>
                        <AttachmentSection entityType="contact" entityId={editingContact.id} />
                        <div className="form-row"><button className="btn-primary btn-sm" onClick={saveEditContact}>{mi('check')} Salva</button><button className="btn-secondary btn-sm" onClick={cancelEditContact}>Annulla</button></div>
                      </div>
                    ) : (
                      <>
                        <div className="contact-head">
                          <div className="contact-avatar">{mi('person')}</div>
                          <div className="contact-info">
                            <strong>{c.name}</strong>
                            {c.role && <span className="badge badge-role">{c.role}</span>}
                          </div>
                          <div><button className="btn-icon" onClick={() => startEditContact(c)} title="Modifica">{mi('edit')}</button><button className="btn-icon btn-del" onClick={() => delContact(c.id)}>{mi('close')}</button></div>
                        </div>
                        {c.company && <p className="contact-detail">{mi('business')} {c.company}</p>}
                        {c.email && <p className="contact-detail">{mi('mail')} {c.email}</p>}
                        {c.phone && <p className="contact-detail">{mi('phone')} {c.phone}</p>}
                        {c.notes && <p className="contact-detail muted">{c.notes}</p>}
                        {c.projectId && projects.find(p => p.id === c.projectId) && <span className="badge badge-proj" style={{ borderColor: projects.find(p => p.id === c.projectId)!.color }}>{projects.find(p => p.id === c.projectId)!.name}</span>}
                        <AttachmentSection entityType="contact" entityId={c.id} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ ENVIRONMENTS ═══════ */}
          {view === 'environments' && (
            <div className="view">
              <div className="view-header"><div><h2 className="view-title">Ambienti</h2><p className="view-sub">Mappa dei tuoi ambienti Power Platform</p></div></div>
              <form className="card mb-20" onSubmit={onCreateEnv}>
                <h3>Nuovo ambiente</h3>
                <div className="form-row mb-12">
                  <div className="form-group fg-2"><label>Nome</label><input value={envName} onChange={e => setEnvName(e.target.value)} placeholder="Es: Contoso Dev" required /></div>
                  <div className="form-group fg-1"><label>Tipo</label><select value={envType} onChange={e => setEnvType(e.target.value as EnvType)}>{ENV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group fg-1"><label>Stato</label><select value={envStatus} onChange={e => setEnvStatus(e.target.value as EnvStatus)}>{ENV_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div className="form-row mb-12">
                  <div className="form-group fg-2"><label>URL</label><input value={envUrl} onChange={e => setEnvUrl(e.target.value)} placeholder="https://org.crm4.dynamics.com" /></div>
                  <div className="form-group fg-1"><label>Progetto</label><select value={envProjId} onChange={e => setEnvProjId(e.target.value === '' ? '' : Number(e.target.value))}><option value="">— Nessuno —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <div className="form-group"><label>Descrizione</label><input value={envDesc} onChange={e => setEnvDesc(e.target.value)} placeholder="Note sull'ambiente" /></div>
                <button type="submit" className="btn-primary mt-16">{mi('add_circle')} Aggiungi ambiente</button>
              </form>
              <div className="env-grid">
                {environments.length === 0 && <div className="empty-box full-w"><span className="empty-icon">{mi('cloud')}</span><p>Nessun ambiente configurato</p></div>}
                {environments.map(env => (
                  <div key={env.id} className={`card env-card env-${env.status.toLowerCase().replace('à', 'a')}`}>
                    {editingEnv && editingEnv.id === env.id ? (
                      <div>
                        <div className="form-row mb-12">
                          <div className="form-group fg-2"><label>Nome</label><input value={editingEnv.name} onChange={e => setEditingEnv(prev => prev ? { ...prev, name: e.target.value } : prev)} /></div>
                          <div className="form-group fg-1"><label>Tipo</label><select value={editingEnv.envType} onChange={e => setEditingEnv(prev => prev ? { ...prev, envType: e.target.value as EnvType } : prev)}>{ENV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                          <div className="form-group fg-1"><label>Stato</label><select value={editingEnv.status} onChange={e => setEditingEnv(prev => prev ? { ...prev, status: e.target.value as EnvStatus } : prev)}>{ENV_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        </div>
                        <div className="form-row mb-12">
                          <div className="form-group fg-2"><label>URL</label><input value={editingEnv.url} onChange={e => setEditingEnv(prev => prev ? { ...prev, url: e.target.value } : prev)} /></div>
                          <div className="form-group fg-1"><label>Progetto</label><select value={editingEnv.projectId ?? ''} onChange={e => setEditingEnv(prev => prev ? { ...prev, projectId: e.target.value === '' ? null : Number(e.target.value) } : prev)}><option value="">— Nessuno —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        </div>
                        <div className="form-group"><label>Descrizione</label><input value={editingEnv.description} onChange={e => setEditingEnv(prev => prev ? { ...prev, description: e.target.value } : prev)} /></div>
                        <AttachmentSection entityType="environment" entityId={editingEnv.id} />
                        <div className="form-row mt-16"><button className="btn-primary btn-sm" onClick={saveEditEnv}>{mi('check')} Salva</button><button className="btn-secondary btn-sm" onClick={cancelEditEnv}>Annulla</button></div>
                      </div>
                    ) : (
                      <>
                        <div className="env-head">
                          <div className="env-icon">{mi('cloud')}</div>
                          <div>
                            <strong>{env.name}</strong>
                            <div className="env-badges">
                              <span className={`badge badge-env-${env.envType.toLowerCase()}`}>{env.envType}</span>
                              <select className="env-status-select" value={env.status} onChange={e => updateEnvStatus(env.id, e.target.value as EnvStatus)}>{ENV_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                          </div>
                          <div><button className="btn-icon" onClick={() => startEditEnv(env)} title="Modifica">{mi('edit')}</button><button className="btn-icon btn-del" onClick={() => delEnv(env.id)}>{mi('close')}</button></div>
                        </div>
                        {env.url && <p className="env-url">{mi('link')} <a href={env.url} target="_blank" rel="noreferrer">{env.url}</a></p>}
                        {env.description && <p className="contact-detail muted">{env.description}</p>}
                        {env.projectId && projects.find(p => p.id === env.projectId) && <span className="badge badge-proj" style={{ borderColor: projects.find(p => p.id === env.projectId)!.color }}>{projects.find(p => p.id === env.projectId)!.name}</span>}
                        <AttachmentSection entityType="environment" entityId={env.id} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ RETROSPECTIVES ═══════ */}
          {view === 'retros' && (
            <div className="view">
              <div className="view-header"><div><h2 className="view-title">Retrospettive</h2><p className="view-sub">Rifletti sulla settimana per migliorare</p></div></div>
              <form className="card mb-20" onSubmit={onCreateRetro}>
                <h3>Nuova retrospettiva &mdash; Settimana del {currentWeekStart()}</h3>
                <div className="form-group"><label>{mi('thumb_up')} Cosa è andato bene</label><textarea value={retroWell} onChange={e => setRetroWell(e.target.value)} placeholder="Successi, risultati positivi, cose da mantenere..." rows={3} /></div>
                <div className="form-group"><label>{mi('construction')} Cosa migliorare</label><textarea value={retroImprove} onChange={e => setRetroImprove(e.target.value)} placeholder="Difficoltà, inefficienze, errori da evitare..." rows={3} /></div>
                <div className="form-group"><label>{mi('rocket_launch')} Azioni per la prossima settimana</label><textarea value={retroActions} onChange={e => setRetroActions(e.target.value)} placeholder="Obiettivi concreti, cambiamenti da implementare..." rows={3} /></div>
                <button type="submit" className="btn-primary mt-16">{mi('save')} Salva retrospettiva</button>
              </form>
              {retros.length === 0 && <div className="empty-box"><span className="empty-icon">{mi('psychology')}</span><p>Nessuna retrospettiva ancora</p></div>}
              {retros.map(r => (
                <div key={r.id} className="card retro-card mb-16">
                  <div className="retro-head">
                    <h3>Settimana del {dateLong(r.weekStart)}</h3>
                    <div>
                      <button className="btn-icon" onClick={() => setEditRetro({ ...r })} title="Modifica">{mi('edit')}</button>
                      <button className="btn-icon btn-del" onClick={() => delRetro(r.id)} title="Elimina">{mi('close')}</button>
                    </div>
                  </div>
                  {r.wentWell && <div className="retro-section retro-well"><strong>{mi('thumb_up')} Andato bene</strong><p>{r.wentWell}</p></div>}
                  {r.toImprove && <div className="retro-section retro-improve"><strong>{mi('construction')} Da migliorare</strong><p>{r.toImprove}</p></div>}
                  {r.actions && <div className="retro-section retro-actions"><strong>{mi('rocket_launch')} Azioni</strong><p>{r.actions}</p></div>}
                </div>
              ))}
            </div>
          )}

          {/* ═══════ BUGS ═══════ */}
          {view === 'bugs' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Bug Tracker</h2><p className="view-sub">Traccia e risolvi i problemi</p></div>
                <div className="view-actions">
                  <select value={bugFilter} onChange={e => setBugFilter(e.target.value as BugStatus | '')}><option value="">Tutti gli stati</option>{BUG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
              </div>
              <form className="card mb-20" onSubmit={onCreateBug}>
                <h3>Nuovo bug</h3>
                <div className="form-row mb-12">
                  <div className="form-group fg-2"><label>Titolo</label><input value={bugTitle} onChange={e => setBugTitle(e.target.value)} placeholder="Descrizione breve del bug" required /></div>
                  <div className="form-group fg-1"><label>Severità</label><select value={bugSeverity} onChange={e => setBugSeverity(e.target.value as BugSeverity)}>{BUG_SEVERITIES.map(s => <option key={s} value={s}>{SEV_LABEL[s]}</option>)}</select></div>
                  <div className="form-group fg-1"><label>Progetto</label><select value={bugProjId} onChange={e => setBugProjId(e.target.value === '' ? '' : Number(e.target.value))}><option value="">— Nessuno —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <div className="form-group"><label>Descrizione</label><textarea value={bugDesc} onChange={e => setBugDesc(e.target.value)} placeholder="Descrizione dettagliata del problema" /></div>
                <div className="form-group"><label>Passi per riprodurre</label><textarea value={bugSteps} onChange={e => setBugSteps(e.target.value)} placeholder="1. Vai a...\n2. Clicca su...\n3. Osserva che..." /></div>
                <button type="submit" className="btn-primary mt-16">{mi('bug_report')} Segnala bug</button>
              </form>
              {bugs.length === 0 && <div className="empty-box"><span className="empty-icon">{mi('bug_report')}</span><p>Nessun bug registrato</p></div>}
              {bugs.map(b => (
                <div key={b.id} className={`card bug-card mb-12 bug-${b.severity.toLowerCase()}`}>
                  <div className="bug-head">
                    <div className="bug-title-row">
                      <span className={`badge badge-sev-${b.severity.toLowerCase()}`}>{SEV_LABEL[b.severity]}</span>
                      <strong>{b.title}</strong>
                    </div>
                    <div className="bug-actions">
                      <select className="bug-status-select" value={b.status} onChange={e => updateBugStatus(b.id, e.target.value as BugStatus)}>{BUG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                      <button className="btn-icon" onClick={() => setEditBug({ ...b })} title="Modifica">{mi('edit')}</button>
                      <button className="btn-icon btn-del" onClick={() => delBug(b.id)} title="Elimina">{mi('close')}</button>
                    </div>
                  </div>
                  {b.description && <p className="bug-desc">{b.description}</p>}
                  {b.stepsToReproduce && <div className="bug-steps"><strong>Passi per riprodurre:</strong><pre>{b.stepsToReproduce}</pre></div>}
                  {b.solution && <div className="bug-solution"><strong>{mi('check_circle')} Soluzione:</strong><p>{b.solution}</p></div>}
                  {b.projectId && projects.find(p => p.id === b.projectId) && <span className="badge badge-proj" style={{ borderColor: projects.find(p => p.id === b.projectId)!.color }}>{projects.find(p => p.id === b.projectId)!.name}</span>}
                  <AttachmentSection entityType="bug" entityId={b.id} />
                </div>
              ))}
            </div>
          )}

          {/* ═══════ LEARNING ═══════ */}
          {view === 'learning' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Formazione</h2><p className="view-sub">Traccia la tua crescita professionale</p></div>
                <div className="view-actions">
                  <select value={learnFilter} onChange={e => setLearnFilter(e.target.value as LearningCategory | '')}><option value="">Tutte le categorie</option>{LEARNING_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
              </div>
              <form className="card mb-20" onSubmit={onCreateLearn}>
                <h3>Nuova risorsa</h3>
                <div className="form-row mb-12">
                  <div className="form-group fg-2"><label>Titolo</label><input value={learnTitle} onChange={e => setLearnTitle(e.target.value)} placeholder="Es: PL-400 Certification" required /></div>
                  <div className="form-group fg-1"><label>Categoria</label><select value={learnCat} onChange={e => setLearnCat(e.target.value as LearningCategory)}>{LEARNING_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>
                <div className="form-row mb-12">
                  <div className="form-group fg-2"><label>URL (opzionale)</label><input value={learnUrl} onChange={e => setLearnUrl(e.target.value)} placeholder="https://learn.microsoft.com/..." /></div>
                </div>
                <div className="form-group"><label>Note</label><input value={learnNotes} onChange={e => setLearnNotes(e.target.value)} placeholder="Appunti, capitoli, argomenti..." /></div>
                <button type="submit" className="btn-primary mt-16">{mi('add_circle')} Aggiungi risorsa</button>
              </form>
              {learningList.length === 0 && <div className="empty-box"><span className="empty-icon">{mi('school')}</span><p>Nessuna risorsa di formazione</p></div>}
              {learningList.map(l => (
                <div key={l.id} className={`card learn-card mb-12${l.completed ? ' learn-done' : ''}`}>
                  <div className="learn-head">
                    <div>
                      <span className="badge badge-learn-cat">{l.category}</span>
                      <strong>{l.title}</strong>
                    </div>
                    <div className="learn-actions">
                      <button className="btn-icon" onClick={() => setEditLearn({ ...l })} title="Modifica">{mi('edit')}</button>
                      <button className="btn-icon btn-del" onClick={() => delLearn(l.id)} title="Elimina">{mi('close')}</button>
                    </div>
                  </div>
                  {l.url && <p className="learn-url">{mi('link')} <a href={l.url} target="_blank" rel="noreferrer">{l.url}</a></p>}
                  {l.notes && <p className="contact-detail muted">{l.notes}</p>}
                  <div className="learn-progress">
                    <div className="learn-bar">
                      <div className="learn-bar-fill" style={{ width: `${Math.min(100, l.progress)}%` }} />
                    </div>
                    <input type="range" min={0} max={100} value={l.progress} onChange={e => updateLearnProgress(l.id, Number(e.target.value))} />
                    <span className="learn-pct">{l.progress}%</span>
                    {l.completed ? <span className="badge badge-done">Completato</span> : null}
                  </div>
                  <AttachmentSection entityType="learning" entityId={l.id} />
                </div>
              ))}
            </div>
          )}

          {/* ═══════ CHECKLISTS ═══════ */}
          {view === 'checklists' && (
            <div className="view">
              <div className="view-header"><div><h2 className="view-title">Checklist</h2><p className="view-sub">Liste riutilizzabili per procedure e deploy</p></div></div>
              <form className="card mb-20" onSubmit={onCreateChecklist}>
                <h3>Nuova checklist</h3>
                <div className="form-row mb-12">
                  <div className="form-group fg-2"><label>Titolo</label><input value={clTitle} onChange={e => setClTitle(e.target.value)} placeholder="Es: Procedura Deploy Produzione" required /></div>
                  <div className="form-group fg-1"><label>Progetto</label><select value={clProjId} onChange={e => setClProjId(e.target.value === '' ? '' : Number(e.target.value))}><option value="">— Nessuno —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <div className="form-group"><label>Descrizione (opzionale)</label><input value={clDesc} onChange={e => setClDesc(e.target.value)} placeholder="Quando usare questa checklist" /></div>
                <button type="submit" className="btn-primary mt-16">{mi('add_circle')} Crea checklist</button>
              </form>
              <div className="grid-2 align-start">
                <div className="card">
                  <h3>Le tue checklist ({checklists.length})</h3>
                  {checklists.length === 0 && <div className="empty-box"><span className="empty-icon">{mi('checklist')}</span><p>Nessuna checklist creata</p></div>}
                  {checklists.map(cl => (
                    <div key={cl.id} className={`cl-item${selectedCl === cl.id ? ' cl-selected' : ''}`} onClick={() => setSelectedCl(cl.id)}>
                      {editingCl && editingCl.id === cl.id ? (
                        <div onClick={e => e.stopPropagation()}>
                          <div className="form-group mb-12"><label>Titolo</label><input value={editingCl.title} onChange={e => setEditingCl(prev => prev ? { ...prev, title: e.target.value } : prev)} /></div>
                          <div className="form-group mb-12"><label>Descrizione</label><input value={editingCl.description} onChange={e => setEditingCl(prev => prev ? { ...prev, description: e.target.value } : prev)} /></div>
                          <div className="form-group mb-12"><label>Progetto</label><select value={editingCl.projectId ?? ''} onChange={e => setEditingCl(prev => prev ? { ...prev, projectId: e.target.value === '' ? null : Number(e.target.value) } : prev)}><option value="">— Nessuno —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                          <div className="form-row"><button className="btn-primary btn-sm" onClick={saveEditCl}>{mi('check')} Salva</button><button className="btn-secondary btn-sm" onClick={cancelEditCl}>Annulla</button></div>
                        </div>
                      ) : (
                        <>
                          <div className="cl-item-head">
                            <strong>{cl.title}</strong>
                            <div><button className="btn-icon" onClick={e => { e.stopPropagation(); startEditCl(cl); }} title="Modifica">{mi('edit')}</button><button className="btn-icon btn-del" onClick={e => { e.stopPropagation(); delChecklist(cl.id); }}>{mi('close')}</button></div>
                          </div>
                          {cl.description && <p className="cl-item-desc">{cl.description}</p>}
                          {cl.projectId && projects.find(p => p.id === cl.projectId) && <span className="badge badge-proj" style={{ borderColor: projects.find(p => p.id === cl.projectId)!.color }}>{projects.find(p => p.id === cl.projectId)!.name}</span>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="card">
                  {!selectedCl && <div className="empty-box"><span className="empty-icon">{mi('checklist')}</span><p>Seleziona una checklist</p></div>}
                  {selectedCl && (() => {
                    const cl = checklists.find(c => c.id === selectedCl);
                    const done = clItems.filter(i => i.isDone).length;
                    return (
                      <>
                        <h3>{cl?.title || 'Checklist'}</h3>
                        <p className="cl-progress-label">{done}/{clItems.length} completati</p>
                        <div className="learn-bar mb-12"><div className="learn-bar-fill" style={{ width: clItems.length ? `${(done / clItems.length) * 100}%` : '0%' }} /></div>
                        <form className="cl-add-form" onSubmit={onAddClItem}>
                          <input value={clNewItem} onChange={e => setClNewItem(e.target.value)} placeholder="Aggiungi step..." />
                          <button type="submit" className="btn-primary btn-sm">{mi('add')}</button>
                        </form>
                        <div className="cl-items-list">
                          {clItems.map(item => (
                            <div key={item.id} className={`cl-check-item${item.isDone ? ' cl-checked' : ''}`}>
                              <button className="cl-check-btn" onClick={() => toggleClItem(item.id)}>{item.isDone ? mi('check_box') : mi('check_box_outline_blank')}</button>
                              {editingClItemId === item.id ? (
                                <>
                                  <input className="fg-1" value={editingClItemText} onChange={e => setEditingClItemText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditClItem(item.id); if (e.key === 'Escape') cancelEditClItem(); }} autoFocus />
                                  <button className="btn-icon" onClick={() => saveEditClItem(item.id)} title="Salva">{mi('check')}</button>
                                  <button className="btn-icon" onClick={cancelEditClItem} title="Annulla">{mi('close')}</button>
                                </>
                              ) : (
                                <>
                                  <span className="cl-check-text">{item.text}</span>
                                  <button className="btn-icon cl-del-btn" onClick={() => startEditClItem(item)} title="Modifica">{mi('edit')}</button>
                                  <button className="btn-icon btn-del cl-del-btn" onClick={() => delClItem(item.id)}>{mi('close')}</button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ APP IMPACT ═══════ */}
          {view === 'appimpact' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">App Impact</h2><p className="view-sub">Command center per impatto, rischio e readiness della tua Canvas App</p></div>
                <div className="view-actions">
                  {msappData && <button className="btn-secondary" onClick={() => setView('analyzer')}>{mi('analytics')} Apri App Analyzer</button>}
                  {msappData && <button className="btn-secondary" onClick={() => { setMsappTab('diff'); setView('analyzer'); }}>{mi('compare')} Diff intelligente</button>}
                  {msappData && <button className="btn-secondary" onClick={async () => {
                    if (!api || !msappData) return;
                    await api.analyzerExportPdf(msappData);
                  }}>{mi('picture_as_pdf')} Doc tecnica</button>}
                  <button className="btn-primary" onClick={async () => {
                    if (!api) return;
                    setMsappLoading(true);
                    try {
                      const res = await api.msappOpenFile();
                      if (res) { setMsappData(res); setMsappTab('overview'); setMsappDiffData(null); setMsappSecond(null); }
                    } finally { setMsappLoading(false); }
                  }}>{mi('upload_file')} Importa .msapp</button>
                </div>
              </div>

              {msappLoading && <div className="card mb-20 ta-c"><p className="muted">{mi('hourglass_empty')} Analisi in corso...</p></div>}

              {!msappData && !msappLoading && (
                <div className="card">
                  <h3 className="mb-12">App Impact Blueprint</h3>
                  <p className="muted mb-12">Carica un file <code>.msapp</code> per attivare i 10 moduli: Impact Map, Delegation Guardian, Performance Autopilot, Security Scanner, ALM Readiness, Auto-Documentation, Diff intelligente, Fix Pack, Knowledge Graph e Pre-Production Gate.</p>
                  <p className="muted">Dopo l'import vedrai subito KPI, rischi prioritari e azioni operative.</p>
                </div>
              )}

              {msappData && !msappLoading && (() => {
                const d = msappData;
                const s = d.summary;
                const issueTotal = s.issueCount || d.issues.length || 0;
                const critical = s.criticalIssues || d.issues.filter(i => i.severity === 'critical').length;
                const high = s.highIssues || d.issues.filter(i => i.severity === 'high').length;
                const medium = s.mediumIssues || d.issues.filter(i => i.severity === 'medium').length;
                const low = s.lowIssues || d.issues.filter(i => i.severity === 'low').length;
                const delegationIssues = d.issues.filter(i => i.category.toLowerCase().includes('deleg') || i.title.toLowerCase().includes('deleg')).length;
                const performanceIssues = d.issues.filter(i => i.category.toLowerCase().includes('perform') || i.title.toLowerCase().includes('onstart') || i.title.toLowerCase().includes('onvisible')).length;
                const securityIssues = d.issues.filter(i => i.category.toLowerCase().includes('security') || i.title.toLowerCase().includes('secret') || i.title.toLowerCase().includes('token')).length;
                const onStartVisibleCount = d.formulas.filter(f => f.property === 'OnStart' || f.property === 'OnVisible').length;
                const riskyRecordLossEst = delegationIssues * 500;
                const almScore = Math.round((((d.healthScore?.scores.architecture || 0) + (d.healthScore?.scores.maintainability || 0) + (d.healthScore?.scores.security || 0) + (d.healthScore?.scores.delegation || 0)) / 4) || 0);
                const topDeps = [...(d.dependencyMatrix || [])].sort((a, b) => b.dataSources.length - a.dataSources.length).slice(0, 3);
                const topIssueCats = Object.entries(d.issues.reduce<Record<string, number>>((acc, it) => { acc[it.category] = (acc[it.category] || 0) + 1; return acc; }, {}))
                  .sort((a, b) => b[1] - a[1]).slice(0, 4);
                const readyForGate = critical === 0 && high <= 2 && (d.healthScore?.overall || 0) >= 75;

                return (
                  <>
                    <div className="kpi-row kpi-5">
                      <div className="kpi-card"><div className="kpi-icon ki-time">{mi('monitoring')}</div><div><span className="kpi-value">{d.healthScore?.overall ?? 0}</span><span className="kpi-label">Health Score</span></div></div>
                      <div className="kpi-card"><div className="kpi-icon ki-changes">{mi('warning')}</div><div><span className="kpi-value">{issueTotal}</span><span className="kpi-label">Issue totali</span></div></div>
                      <div className="kpi-card"><div className="kpi-icon ki-goals">{mi('dns')}</div><div><span className="kpi-value">{s.dataSourceCount}</span><span className="kpi-label">Data source</span></div></div>
                      <div className="kpi-card"><div className="kpi-icon ki-tasks">{mi('functions')}</div><div><span className="kpi-value">{s.totalFormulas}</span><span className="kpi-label">Formule</span></div></div>
                      <div className="kpi-card"><div className="kpi-icon ki-streak">{mi('account_tree')}</div><div><span className="kpi-value">{s.navigationCount}</span><span className="kpi-label">Navigazioni</span></div></div>
                    </div>

                    <div className="impact-grid">
                      <div className="card impact-card">
                        <h3>1) Impact Map</h3>
                        <p className="muted">Screen → Control → Formula → DataSource → Flow con blast radius per cambiamenti.</p>
                        <div className="az-tag-list">
                          <span className="badge">{s.screenCount} screen</span>
                          <span className="badge">{s.totalControls} control</span>
                          <span className="badge">{s.totalFormulas} formule</span>
                          <span className="badge">{s.dataSourceCount} datasource</span>
                          <span className="badge">{s.flowCallCount} flow</span>
                        </div>
                        {topDeps.length > 0 && <p className="muted mt-8">Punti fragili: {topDeps.map(t => `${t.screen} (${t.dataSources.length})`).join(', ')}</p>}
                        <button className="btn-link" onClick={() => { setMsappTab('dependencies'); setView('analyzer'); }}>{mi('open_in_new')} Apri mappa dipendenze</button>
                      </div>

                      <div className="card impact-card">
                        <h3>2) Delegation Guardian</h3>
                        <p className="muted">Trova non delegabili, propone rewrite e stima rischio perdita record.</p>
                        <p><strong>{delegationIssues}</strong> issue delegazione · Stima rischio: <strong>~{riskyRecordLossEst.toLocaleString('it-IT')} record</strong></p>
                        <button className="btn-link" onClick={() => { setMsappTab('issues'); setView('analyzer'); }}>{mi('open_in_new')} Vedi problemi delegazione</button>
                      </div>

                      <div className="card impact-card">
                        <h3>3) Performance Autopilot</h3>
                        <p className="muted">Bottleneck su OnStart/OnVisible, formule complesse e schermate pesanti.</p>
                        <p><strong>{performanceIssues}</strong> issue performance · <strong>{onStartVisibleCount}</strong> formule OnStart/OnVisible</p>
                        <button className="btn-link" onClick={() => { setMsappTab('health'); setView('analyzer'); }}>{mi('open_in_new')} Apri health/performance</button>
                      </div>

                      <div className="card impact-card">
                        <h3>4) Security & Compliance Scanner</h3>
                        <p className="muted">Rilevamento segreti hardcoded, URL sensibili e connettori rischiosi.</p>
                        <p><strong>{securityIssues}</strong> issue sicurezza · Critici <strong>{critical}</strong> · Alti <strong>{high}</strong></p>
                        <button className="btn-link" onClick={() => { setMsappTab('issues'); setView('analyzer'); }}>{mi('open_in_new')} Apri remediation</button>
                      </div>

                      <div className="card impact-card">
                        <h3>5) ALM Readiness Score</h3>
                        <p className="muted">Prontezza Dev/Test/Prod su naming, governance, architettura e qualità.</p>
                        <p>ALM score: <strong>{almScore}/100</strong> · Grade app: <strong>{d.healthScore?.grade || 'N/A'}</strong></p>
                        <button className="btn-link" onClick={() => { setMsappTab('health'); setView('analyzer'); }}>{mi('open_in_new')} Vedi piano miglioramento</button>
                      </div>

                      <div className="card impact-card">
                        <h3>6) Auto-Documentation</h3>
                        <p className="muted">Documentazione tecnica aggiornata, flussi e handover pack.</p>
                        <p>Genera PDF pronto per team, cliente o audit.</p>
                        <button className="btn-link" onClick={async () => { if (!api || !msappData) return; await api.analyzerExportPdf(msappData); }}>{mi('picture_as_pdf')} Genera documentazione</button>
                      </div>

                      <div className="card impact-card">
                        <h3>7) Diff intelligente</h3>
                        <p className="muted">Confronto reale tra due versioni: cambi ad alto rischio e regression checklist.</p>
                        <p>Confronto strutturale su formule, operazioni dati e schermate.</p>
                        <button className="btn-link" onClick={() => { setMsappTab('diff'); setView('analyzer'); }}>{mi('compare')} Apri confronto versioni</button>
                      </div>

                      <div className="card impact-card">
                        <h3>8) Fix Pack assistito</h3>
                        <p className="muted">Piano patch ordinato con approvazione manuale (human-in-the-loop).</p>
                        <p>Priorità: Critici {critical} · Alti {high} · Medi {medium} · Bassi {low}</p>
                        <button className="btn-link" onClick={() => { setMsappTab('issues'); setView('analyzer'); }}>{mi('assignment')} Apri piano fix</button>
                      </div>

                      <div className="card impact-card">
                        <h3>9) Knowledge Graph di team</h3>
                        <p className="muted">Pattern ricorrenti ed errori frequenti per creare memoria tecnica aziendale.</p>
                        {topIssueCats.length > 0 ? <p>Pattern attuali: {topIssueCats.map(([cat, count]) => `${cat} (${count})`).join(' · ')}</p> : <p>Nessun pattern disponibile.</p>}
                        <button className="btn-link" onClick={() => setView('fdhub')}>{mi('hub')} Collega a FDHub</button>
                      </div>

                      <div className="card impact-card">
                        <h3>10) Pre-Production Gate</h3>
                        <p className="muted">Quality gate prima del rilascio con blocco automatico se ci sono critical.</p>
                        <p>Gate status: <strong>{readyForGate ? 'PASS' : 'BLOCKED'}</strong></p>
                        {!readyForGate && <p className="muted">Richiesto: critical = 0, high ≤ 2, score ≥ 75</p>}
                        <button className="btn-link" onClick={() => { setMsappTab('health'); setView('analyzer'); }}>{mi('open_in_new')} Apri report executive</button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ═══════ POWER APPS ANALYZER ═══════ */}
          {view === 'analyzer' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Power Apps Analyzer</h2><p className="view-sub">Analizza in profondità le tue Canvas App (.msapp)</p></div>
                <div className="view-actions">
                  {msappData && <button className="btn-secondary" onClick={async () => {
                    if (!api || !msappData) return;
                    await api.analyzerExportPdf(msappData);
                  }}>{mi('picture_as_pdf')} Genera Documentazione PDF</button>}
                  <button className="btn-primary" onClick={async () => {
                    if (!api) return;
                    setMsappLoading(true);
                    try {
                      const res = await api.msappOpenFile();
                      if (res) { setMsappData(res); setMsappTab('overview'); setMsappDiffData(null); setMsappSecond(null); }
                    } finally { setMsappLoading(false); }
                  }}>{mi('upload_file')} Importa .msapp</button>
                </div>
              </div>

              {msappLoading && <div className="card mb-20 ta-c"><p className="muted">{mi('hourglass_empty')} Analisi in corso...</p></div>}

              {!msappData && !msappLoading && (
                <div className="analyzer-dropzone" onDragOver={e => { e.preventDefault(); e.stopPropagation(); }} onDrop={async e => {
                  e.preventDefault(); e.stopPropagation();
                  if (!api) return;
                  const file = e.dataTransfer.files[0];
                  if (!file || !file.name.endsWith('.msapp')) return;
                  setMsappLoading(true);
                  try {
                    const buf = await file.arrayBuffer();
                    const res = await api.msappParseBuffer(Array.from(new Uint8Array(buf)));
                    if (res) { res.fileName = file.name; setMsappData(res); setMsappTab('overview'); }
                  } finally { setMsappLoading(false); }
                }}>
                  <span className="analyzer-drop-icon">{mi('analytics')}</span>
                  <h3>Trascina qui un file .msapp</h3>
                  <p className="muted">oppure clicca "Importa .msapp" per selezionarlo</p>
                  <p className="muted mt-16" style={{ fontSize: 13 }}>Per esportare una Canvas App: Power Apps Studio → File → Salva con nome → Questo computer</p>
                </div>
              )}

              {msappData && !msappLoading && (() => {
                const d = msappData;
                const s = d.summary;
                const AZ_TABS: { id: AnalyzerTab; icon: string; label: string; count?: number }[] = [
                  { id: 'overview', icon: 'dashboard', label: 'Panoramica' },
                  { id: 'health', icon: 'monitor_heart', label: 'Health Score' },
                  { id: 'issues', icon: 'bug_report', label: 'Problemi', count: s.issueCount },
                  { id: 'screens', icon: 'phone_android', label: 'Schermate', count: s.screenCount },
                  { id: 'dataops', icon: 'edit_square', label: 'Operazioni Dati', count: s.dataOpCount },
                  { id: 'flows', icon: 'bolt', label: 'Flussi Collegati', count: s.flowCallCount },
                  { id: 'datasources', icon: 'storage', label: 'Data Source', count: s.dataSourceCount },
                  { id: 'variables', icon: 'data_object', label: 'Variabili', count: s.globalVarCount + s.contextVarCount },
                  { id: 'navigation', icon: 'route', label: 'Navigazione', count: s.navigationCount },
                  { id: 'dependencies', icon: 'hub', label: 'Dipendenze' },
                  { id: 'layout', icon: 'grid_view', label: 'Layout Schermate' },
                  { id: 'formulas', icon: 'function', label: 'Tutte le Formule', count: s.totalFormulas },
                  { id: 'diff', icon: 'compare', label: 'Confronta Versioni' },
                ];

                // filter helpers
                const q = msappSearch.toLowerCase();
                const filterFormulas = (arr: MsappFormula[]) => q ? arr.filter(f => f.formula.toLowerCase().includes(q) || f.control.toLowerCase().includes(q) || f.screen.toLowerCase().includes(q) || f.property.toLowerCase().includes(q)) : arr;
                const filterDataOps = (arr: MsappDataOp[]) => q ? arr.filter(f => f.operation.toLowerCase().includes(q) || f.target.toLowerCase().includes(q) || f.screen.toLowerCase().includes(q) || f.control.toLowerCase().includes(q)) : arr;

                return (
                  <>
                    {/* App bar */}
                    <div className="card mb-12 az-appbar">
                      <div className="az-appbar-info">
                        <strong>{d.fileName || d.appName || 'Power App'}</strong>
                        {d.appName && <span className="muted ml-8">{d.appName}</span>}
                        {d.modifiedAt && <span className="muted ml-8">• Modificata: {new Date(d.modifiedAt).toLocaleDateString('it-IT')}</span>}
                      </div>
                      <button className="btn-secondary btn-sm" onClick={() => { setMsappData(null); setMsappDiffData(null); setMsappSecond(null); setMsappSearch(''); setMsappTab('overview'); }}>{mi('close')} Chiudi</button>
                    </div>

                    {/* Tab bar */}
                    <div className="az-tabs mb-16">
                      {AZ_TABS.map(t => (
                        <button key={t.id} className={`az-tab${msappTab === t.id ? ' az-tab-active' : ''}`} onClick={() => setMsappTab(t.id)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>
                          {t.label}
                          {t.count !== undefined && t.count > 0 && <span className="az-tab-badge">{t.count}</span>}
                        </button>
                      ))}
                    </div>

                    {/* Search bar (not on overview/diff/health/layout) */}
                    {msappTab !== 'overview' && msappTab !== 'diff' && msappTab !== 'health' && msappTab !== 'layout' && (
                      <div className="az-search mb-16">
                        {mi('search')}
                        <input value={msappSearch} onChange={e => setMsappSearch(e.target.value)} placeholder="Cerca formule, controlli, datasource..." className="az-search-input" />
                        {msappSearch && <button className="btn-icon" onClick={() => setMsappSearch('')}>{mi('close')}</button>}
                      </div>
                    )}

                    {/* ═══ TAB: Overview (Enhanced) ═══ */}
                    {msappTab === 'overview' && (
                      <div className="az-overview">
                        {/* Health score banner */}
                        {d.healthScore && (
                          <div className={`card mb-20 az-health-banner az-grade-${d.healthScore.grade.toLowerCase()}`} onClick={() => setMsappTab('health')} style={{ cursor: 'pointer' }}>
                            <div className="az-health-banner-left">
                              <div className="az-health-grade">{d.healthScore.grade}</div>
                              <div className="az-health-score-num">{d.healthScore.overall}/100</div>
                            </div>
                            <div className="az-health-banner-right">
                              <h3>App Health Score</h3>
                              <p className="muted">Performance {d.healthScore.scores.performance} • Delegazione {d.healthScore.scores.delegation} • Manutenibilità {d.healthScore.scores.maintainability} • Sicurezza {d.healthScore.scores.security} • Accessibilità {d.healthScore.scores.accessibility} • Architettura {d.healthScore.scores.architecture}</p>
                              {(s.issueCount || 0) > 0 && <p className="mt-8">{mi('bug_report')} <strong>{s.issueCount} problemi trovati</strong> — {s.criticalIssues || 0} critici, {s.highIssues || 0} alti, {s.mediumIssues || 0} medi, {s.lowIssues || 0} bassi <span className="muted ml-8">Clicca per dettagli →</span></p>}
                            </div>
                          </div>
                        )}

                        <div className="grid-3 mb-20">
                          <div className="card az-stat-card">
                            <div className="az-stat-icon" style={{ background: '#e0f2fe' }}>{mi('phone_android')}</div>
                            <div><div className="az-stat-num">{s.screenCount}</div><div className="az-stat-label">Schermate</div></div>
                          </div>
                          <div className="card az-stat-card">
                            <div className="az-stat-icon" style={{ background: '#fef3c7' }}>{mi('widgets')}</div>
                            <div><div className="az-stat-num">{s.totalControls}</div><div className="az-stat-label">Controlli totali</div></div>
                          </div>
                          <div className="card az-stat-card">
                            <div className="az-stat-icon" style={{ background: '#dbeafe' }}>{mi('function')}</div>
                            <div><div className="az-stat-num">{s.totalFormulas}</div><div className="az-stat-label">Formule</div></div>
                          </div>
                          <div className="card az-stat-card">
                            <div className="az-stat-icon" style={{ background: '#fce7f3' }}>{mi('edit_square')}</div>
                            <div><div className="az-stat-num">{s.dataOpCount}</div><div className="az-stat-label">Operazioni Dati</div></div>
                          </div>
                          <div className="card az-stat-card">
                            <div className="az-stat-icon" style={{ background: '#d1fae5' }}>{mi('bolt')}</div>
                            <div><div className="az-stat-num">{s.flowCallCount}</div><div className="az-stat-label">Chiamate Flow</div></div>
                          </div>
                          <div className="card az-stat-card">
                            <div className="az-stat-icon" style={{ background: '#ede9fe' }}>{mi('storage')}</div>
                            <div><div className="az-stat-num">{s.dataSourceCount}</div><div className="az-stat-label">Data Source</div></div>
                          </div>
                        </div>

                        {/* Detail breakdown */}
                        <div className="grid-2 mb-20">
                          <div className="card">
                            <h4>{mi('edit_square')} Dettaglio Operazioni Dati</h4>
                            <table className="az-table">
                              <tbody>
                                <tr><td>Patch()</td><td className="ta-r"><strong>{s.patchCount}</strong></td></tr>
                                <tr><td>SubmitForm()</td><td className="ta-r"><strong>{s.submitFormCount}</strong></td></tr>
                                <tr><td>Remove() / RemoveIf()</td><td className="ta-r"><strong>{s.removeCount}</strong></td></tr>
                                <tr><td>Collect() / ClearCollect()</td><td className="ta-r"><strong>{s.collectCount}</strong></td></tr>
                              </tbody>
                            </table>
                          </div>
                          <div className="card">
                            <h4>{mi('data_object')} Variabili</h4>
                            <table className="az-table">
                              <tbody>
                                <tr><td>Variabili Globali (Set)</td><td className="ta-r"><strong>{s.globalVarCount}</strong></td></tr>
                                <tr><td>Variabili Context (UpdateContext)</td><td className="ta-r"><strong>{s.contextVarCount}</strong></td></tr>
                              </tbody>
                            </table>
                            {s.uniqueFlows.length > 0 && (
                              <>
                                <h4 className="mt-16">{mi('bolt')} Flussi Collegati</h4>
                                <div className="az-tag-list">{s.uniqueFlows.map((f, i) => <span key={i} className="badge badge-flow">{f}</span>)}</div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quick alerts */}
                        <div className="grid-3 mb-20">
                          {(s.orphanScreenCount || 0) > 0 && (
                            <div className="card az-alert-card az-alert-warn" onClick={() => setMsappTab('issues')}>
                              {mi('link_off')} <strong>{s.orphanScreenCount}</strong> schermate orfane
                            </div>
                          )}
                          {(s.unusedDsCount || 0) > 0 && (
                            <div className="card az-alert-card az-alert-warn" onClick={() => setMsappTab('issues')}>
                              {mi('delete_sweep')} <strong>{s.unusedDsCount}</strong> data source inutilizzate
                            </div>
                          )}
                          {(s.unusedVarCount || 0) > 0 && (
                            <div className="card az-alert-card az-alert-info" onClick={() => setMsappTab('issues')}>
                              {mi('code_off')} <strong>{s.unusedVarCount}</strong> variabili mai lette
                            </div>
                          )}
                        </div>

                        {/* Formula complexity overview */}
                        {d.formulaComplexity && (
                          <div className="card mb-20">
                            <h4>{mi('speed')} Complessità Formule</h4>
                            <div className="az-complexity-bars">
                              <div className="az-cbar"><div className="az-cbar-label">Semplici</div><div className="az-cbar-track"><div className="az-cbar-fill az-cbar-simple" style={{ width: `${Math.min(100, (d.formulaComplexity.distribution.simple / Math.max(1, s.totalFormulas)) * 100)}%` }} /></div><div className="az-cbar-num">{d.formulaComplexity.distribution.simple}</div></div>
                              <div className="az-cbar"><div className="az-cbar-label">Moderate</div><div className="az-cbar-track"><div className="az-cbar-fill az-cbar-moderate" style={{ width: `${Math.min(100, (d.formulaComplexity.distribution.moderate / Math.max(1, s.totalFormulas)) * 100)}%` }} /></div><div className="az-cbar-num">{d.formulaComplexity.distribution.moderate}</div></div>
                              <div className="az-cbar"><div className="az-cbar-label">Complesse</div><div className="az-cbar-track"><div className="az-cbar-fill az-cbar-complex" style={{ width: `${Math.min(100, (d.formulaComplexity.distribution.complex / Math.max(1, s.totalFormulas)) * 100)}%` }} /></div><div className="az-cbar-num">{d.formulaComplexity.distribution.complex}</div></div>
                              <div className="az-cbar"><div className="az-cbar-label">Molto Complesse</div><div className="az-cbar-track"><div className="az-cbar-fill az-cbar-verycomplex" style={{ width: `${Math.min(100, (d.formulaComplexity.distribution.veryComplex / Math.max(1, s.totalFormulas)) * 100)}%` }} /></div><div className="az-cbar-num">{d.formulaComplexity.distribution.veryComplex}</div></div>
                            </div>
                          </div>
                        )}

                        {/* Screen stats table */}
                        {s.screenStats && s.screenStats.length > 0 && (
                          <div className="card mb-20">
                            <h4>{mi('table_chart')} Riepilogo per Schermata</h4>
                            <div className="az-table-scroll">
                              <table className="az-table az-table-full">
                                <thead>
                                  <tr><th>Schermata</th><th className="ta-r">Controlli</th><th className="ta-r">Formule</th><th className="ta-r">Data Ops</th><th className="ta-r">Navigazioni</th><th className="ta-r">Problemi</th><th className="ta-r">Formule Complesse</th></tr>
                                </thead>
                                <tbody>
                                  {s.screenStats.filter((ss: MsappScreenStat) => ss.name !== 'App').map((ss: MsappScreenStat) => (
                                    <tr key={ss.name}>
                                      <td><strong>{ss.name}</strong></td>
                                      <td className="ta-r">{ss.controlCount}</td>
                                      <td className="ta-r">{ss.formulaCount}</td>
                                      <td className="ta-r">{ss.dataOpCount > 0 ? <span className="badge badge-op">{ss.dataOpCount}</span> : '0'}</td>
                                      <td className="ta-r">{ss.navigationCount}</td>
                                      <td className="ta-r">{ss.issueCount > 0 ? <span className="badge badge-issue-count">{ss.issueCount}</span> : '0'}</td>
                                      <td className="ta-r">{ss.complexFormulas > 0 ? <span className="badge badge-complex">{ss.complexFormulas}</span> : '0'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {s.uniqueTablesWritten.length > 0 && (
                          <div className="card mb-20">
                            <h4>{mi('table_chart')} Tabelle Scritte (Patch/Submit/Remove/Collect)</h4>
                            <div className="az-tag-list">{s.uniqueTablesWritten.map((t, i) => <span key={i} className="badge badge-table">{t}</span>)}</div>
                          </div>
                        )}

                        {d.errors.length > 0 && (
                          <div className="card mb-20 az-errors">
                            <h4>{mi('warning')} Errori di Parsing ({d.errors.length})</h4>
                            {d.errors.map((e, i) => <p key={i} className="muted">{e}</p>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ═══ TAB: Health Score ═══ */}
                    {msappTab === 'health' && d.healthScore && (
                      <div>
                        {/* Big score display */}
                        <div className={`card mb-20 az-health-hero az-grade-${d.healthScore.grade.toLowerCase()}`}>
                          <div className="az-health-hero-score">
                            <div className="az-health-hero-grade">{d.healthScore.grade}</div>
                            <div className="az-health-hero-num">{d.healthScore.overall}<span className="az-health-hero-max">/100</span></div>
                            <div className="az-health-hero-label">Health Score Complessivo</div>
                          </div>
                        </div>

                        {/* Radar-style category breakdown */}
                        <div className="grid-3 mb-20">
                          {Object.entries(d.healthScore.scores).map(([key, val]) => {
                            const labels: Record<string, string> = { performance: 'Performance', delegation: 'Delegazione', maintainability: 'Manutenibilità', security: 'Sicurezza', accessibility: 'Accessibilità', architecture: 'Architettura' };
                            const icons: Record<string, string> = { performance: 'speed', delegation: 'cloud_sync', maintainability: 'build', security: 'shield', accessibility: 'accessibility_new', architecture: 'account_tree' };
                            const v = val as number;
                            const color = v >= 80 ? '#22c55e' : v >= 60 ? '#eab308' : v >= 40 ? '#f97316' : '#ef4444';
                            return (
                              <div key={key} className="card az-health-cat">
                                <div className="az-health-cat-head">
                                  <span className="material-symbols-outlined" style={{ color, fontSize: 28 }}>{icons[key] || 'info'}</span>
                                  <div>
                                    <div className="az-health-cat-score" style={{ color }}>{v}</div>
                                    <div className="az-health-cat-label">{labels[key] || key}</div>
                                  </div>
                                </div>
                                <div className="az-health-bar-track"><div className="az-health-bar-fill" style={{ width: `${v}%`, background: color }} /></div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Recommendations */}
                        <div className="card mb-20">
                          <h4>{mi('lightbulb')} Raccomandazioni Prioritarie</h4>
                          <div className="az-recs">
                            {d.healthScore.scores.performance < 50 && (
                              <div className="az-rec az-rec-critical">
                                <span className="az-rec-icon">{mi('speed')}</span>
                                <div><strong>Performance Critiche</strong><p className="muted">L'app ha {d.issues?.filter((i: MsappIssue) => i.category === 'performance' && i.severity === 'critical').length || 0} anti-pattern critici e {d.issues?.filter((i: MsappIssue) => i.category === 'performance' && i.severity === 'high').length || 0} problemi alti. Controlla ForAll+Patch e ClearCollect in OnVisible.</p></div>
                              </div>
                            )}
                            {d.healthScore.scores.delegation < 60 && (
                              <div className="az-rec az-rec-high">
                                <span className="az-rec-icon">{mi('cloud_sync')}</span>
                                <div><strong>Problemi di Delegazione</strong><p className="muted">{d.issues?.filter((i: MsappIssue) => i.category === 'delegation').length || 0} formule non delegabili. Con più di 500/2000 record i dati saranno incompleti.</p></div>
                              </div>
                            )}
                            {d.healthScore.scores.accessibility < 50 && (
                              <div className="az-rec az-rec-medium">
                                <span className="az-rec-icon">{mi('accessibility_new')}</span>
                                <div><strong>Accessibilità Insufficiente</strong><p className="muted">{d.issues?.filter((i: MsappIssue) => i.category === 'accessibility').length || 0} controlli senza AccessibleLabel o Tooltip. Migliora l'esperienza per screen reader.</p></div>
                              </div>
                            )}
                            {d.orphanScreens && d.orphanScreens.length > 0 && (
                              <div className="az-rec az-rec-medium">
                                <span className="az-rec-icon">{mi('link_off')}</span>
                                <div><strong>Schermate Orfane</strong><p className="muted">{d.orphanScreens.join(', ')} — nessuna navigazione punta a queste schermate.</p></div>
                              </div>
                            )}
                            {d.unusedDataSources && d.unusedDataSources.length > 0 && (
                              <div className="az-rec az-rec-low">
                                <span className="az-rec-icon">{mi('delete_sweep')}</span>
                                <div><strong>Data Source Inutilizzate ({d.unusedDataSources.length})</strong><p className="muted">{d.unusedDataSources.join(', ')} — rimuovile per migliorare le performance di caricamento.</p></div>
                              </div>
                            )}
                            {d.unusedVariables && d.unusedVariables.length > 0 && (
                              <div className="az-rec az-rec-low">
                                <span className="az-rec-icon">{mi('code_off')}</span>
                                <div><strong>Variabili Mai Lette ({d.unusedVariables.length})</strong><p className="muted">{d.unusedVariables.map((v: { name: string }) => v.name).join(', ')}</p></div>
                              </div>
                            )}
                            {d.healthScore.overall >= 80 && (
                              <div className="az-rec az-rec-ok">
                                <span className="az-rec-icon">{mi('check_circle')}</span>
                                <div><strong>App in buona salute!</strong><p className="muted">Continua così. Monitora i pochi problemi residui per mantenere la qualità.</p></div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Top complex formulas */}
                        {d.formulaComplexity && d.formulaComplexity.topComplex.length > 0 && (
                          <div className="card mb-20">
                            <h4>{mi('whatshot')} Formule Più Complesse (Top 10)</h4>
                            <div className="az-top-complex">
                              {d.formulaComplexity.topComplex.slice(0, 10).map((f: { screen: string; control: string; property: string; formula: string; score: number; nestingDepth: number; functionCount: number; length: number }, i: number) => (
                                <div key={i} className="az-complex-row">
                                  <div className="az-complex-score">
                                    <span className={`az-cscore ${f.score > 50 ? 'az-cscore-crit' : f.score > 25 ? 'az-cscore-high' : 'az-cscore-med'}`}>{f.score}</span>
                                  </div>
                                  <div className="az-complex-info">
                                    <div><span className="badge badge-screen">{f.screen}</span> <strong>{f.control}</strong><span className="muted">.{f.property}</span></div>
                                    <div className="az-complex-metrics">
                                      <span>Lunghezza: {f.length}</span>
                                      <span>Nesting: {f.nestingDepth}</span>
                                      <span>Funzioni: {f.functionCount}</span>
                                    </div>
                                    <pre className="az-formula-code mt-8">{f.formula}</pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ═══ TAB: Issues ═══ */}
                    {msappTab === 'issues' && (
                      <div>
                        {(() => {
                          const allIssues = d.issues || [];
                          const filtered = q ? allIssues.filter((i: MsappIssue) => i.title.toLowerCase().includes(q) || i.screen.toLowerCase().includes(q) || i.control.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)) : allIssues;
                          const cats: Record<string, MsappIssue[]> = {};
                          for (const iss of filtered) { if (!cats[iss.category]) cats[iss.category] = []; cats[iss.category].push(iss); }
                          const catLabels: Record<string, { label: string; icon: string }> = {
                            performance: { label: 'Performance', icon: 'speed' },
                            delegation: { label: 'Delegazione', icon: 'cloud_sync' },
                            accessibility: { label: 'Accessibilità', icon: 'accessibility_new' },
                            naming: { label: 'Naming Convention', icon: 'label' },
                            security: { label: 'Sicurezza / Hardcoded', icon: 'shield' },
                            quality: { label: 'Qualità Codice', icon: 'code' },
                            hardcoded: { label: 'Valori Hardcoded', icon: 'pin' },
                          };
                          const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                          const sevColors: Record<string, string> = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#6b7280' };
                          const sevLabels: Record<string, string> = { critical: 'Critico', high: 'Alto', medium: 'Medio', low: 'Basso' };

                          return (
                            <>
                              {/* Summary badges */}
                              <div className="az-issue-summary mb-16">
                                <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>{mi('error')} {(d.summary.criticalIssues || 0)} Critici</span>
                                <span className="badge" style={{ background: '#ffedd5', color: '#ea580c' }}>{mi('warning')} {(d.summary.highIssues || 0)} Alti</span>
                                <span className="badge" style={{ background: '#fef3c7', color: '#d97706' }}>{mi('info')} {(d.summary.mediumIssues || 0)} Medi</span>
                                <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280' }}>{mi('help')} {(d.summary.lowIssues || 0)} Bassi</span>
                                <span className="muted ml-8">Totale: {filtered.length} problemi</span>
                              </div>

                              {Object.entries(cats).sort((a, b) => {
                                const maxSevA = Math.min(...a[1].map(i => sevOrder[i.severity as keyof typeof sevOrder] ?? 3));
                                const maxSevB = Math.min(...b[1].map(i => sevOrder[i.severity as keyof typeof sevOrder] ?? 3));
                                return maxSevA - maxSevB;
                              }).map(([cat, issues]) => {
                                const cl = catLabels[cat] || { label: cat, icon: 'info' };
                                return (
                                  <div key={cat} className="card mb-16">
                                    <h4><span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle' }}>{cl.icon}</span> {cl.label} ({issues.length})</h4>
                                    <div className="az-issues-list">
                                      {issues.sort((a, b) => (sevOrder[a.severity as keyof typeof sevOrder] ?? 3) - (sevOrder[b.severity as keyof typeof sevOrder] ?? 3)).slice(0, 50).map((iss, i) => (
                                        <div key={i} className={`az-issue-row az-issue-${iss.severity}`}>
                                          <div className="az-issue-sev" style={{ background: sevColors[iss.severity] || '#888' }}>{sevLabels[iss.severity] || iss.severity}</div>
                                          <div className="az-issue-body">
                                            <div className="az-issue-title">{iss.title}</div>
                                            <div className="az-issue-loc"><span className="badge badge-screen">{iss.screen}</span> {iss.control}{iss.property ? <span className="muted">.{iss.property}</span> : ''}</div>
                                            {iss.description && <p className="az-issue-desc">{iss.description}</p>}
                                            {iss.fix && <p className="az-issue-fix">{mi('lightbulb')} <em>{iss.fix}</em></p>}
                                            {iss.formulaSnippet && <pre className="az-formula-code mt-8">{iss.formulaSnippet}</pre>}
                                          </div>
                                        </div>
                                      ))}
                                      {issues.length > 50 && <p className="muted ta-c mt-8">...e altri {issues.length - 50} problemi in questa categoria</p>}
                                    </div>
                                  </div>
                                );
                              })}
                              {filtered.length === 0 && <div className="empty-box"><span className="empty-icon">{mi('check_circle')}</span><p>Nessun problema trovato! L'app è in ottima forma.</p></div>}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* ═══ TAB: Dependencies Matrix ═══ */}
                    {msappTab === 'dependencies' && (
                      <div>
                        <div className="card mb-16">
                          <h4>{mi('hub')} Matrice Dipendenze Schermata × Data Source</h4>
                          <p className="muted mb-12">R = letture, W = scritture. Celle colorate indicano operazioni di scrittura.</p>
                          <div className="az-table-scroll">
                            <table className="az-matrix">
                              <thead>
                                <tr>
                                  <th className="az-matrix-corner">Schermata</th>
                                  {d.dataSources.filter((ds: MsappDataSource) => {
                                    // Only show DS that are actually used
                                    return d.dependencyMatrix?.some((dm: MsappDepMatrix) => dm.dataSources.some(dd => dd.name === ds.name));
                                  }).map((ds: MsappDataSource) => <th key={ds.name} className="az-matrix-ds"><div className="az-matrix-ds-label">{ds.name}</div></th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {(d.dependencyMatrix || []).filter((dm: MsappDepMatrix) => dm.dataSources.length > 0).map((dm: MsappDepMatrix) => (
                                  <tr key={dm.screen}>
                                    <td className="az-matrix-screen"><strong>{dm.screen}</strong></td>
                                    {d.dataSources.filter((ds: MsappDataSource) => {
                                      return d.dependencyMatrix?.some((dm2: MsappDepMatrix) => dm2.dataSources.some(dd => dd.name === ds.name));
                                    }).map((ds: MsappDataSource) => {
                                      const dep = dm.dataSources.find(dd => dd.name === ds.name);
                                      if (!dep) return <td key={ds.name} className="az-matrix-cell az-matrix-empty" />;
                                      const hasWrite = dep.writeCount > 0;
                                      return (
                                        <td key={ds.name} className={`az-matrix-cell ${hasWrite ? 'az-matrix-write' : 'az-matrix-read'}`} title={`${dm.screen} → ${ds.name}: R${dep.readCount} W${dep.writeCount} ${dep.operations.join(',')}`}>
                                          <span className="az-matrix-r">R{dep.readCount}</span>
                                          {hasWrite && <span className="az-matrix-w">W{dep.writeCount}</span>}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Orphan screens */}
                        {d.orphanScreens && d.orphanScreens.length > 0 && (
                          <div className="card mb-16">
                            <h4>{mi('link_off')} Schermate Orfane ({d.orphanScreens.length})</h4>
                            <p className="muted mb-8">Queste schermate non hanno nessun Navigate() che punta a loro:</p>
                            <div className="az-tag-list">{d.orphanScreens.map((s: string, i: number) => <span key={i} className="badge badge-orphan">{s}</span>)}</div>
                          </div>
                        )}

                        {/* Unused data sources */}
                        {d.unusedDataSources && d.unusedDataSources.length > 0 && (
                          <div className="card mb-16">
                            <h4>{mi('delete_sweep')} Data Source Non Utilizzate ({d.unusedDataSources.length})</h4>
                            <p className="muted mb-8">Queste data source sono definite nell'app ma non compaiono in nessuna formula:</p>
                            <div className="az-tag-list">{d.unusedDataSources.map((s: string, i: number) => <span key={i} className="badge badge-unused">{s}</span>)}</div>
                          </div>
                        )}

                        {/* Unused variables */}
                        {d.unusedVariables && d.unusedVariables.length > 0 && (
                          <div className="card mb-16">
                            <h4>{mi('code_off')} Variabili Mai Lette ({d.unusedVariables.length})</h4>
                            <p className="muted mb-8">Queste variabili vengono impostate con Set/UpdateContext ma non lette in nessun'altra formula:</p>
                            {d.unusedVariables.map((v: { type: string; name: string; definedIn: { screen: string; control: string; property: string }[] }, i: number) => (
                              <div key={i} className="az-var-row">
                                <span className={`badge ${v.type === 'Global' ? 'badge-var-global' : 'badge-var-ctx'}`}>{v.name}</span>
                                <span className="badge ml-4">{v.type}</span>
                                <span className="muted ml-8">Definita in: {v.definedIn.map(d => d.screen + '.' + d.control).join(', ')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ═══ TAB: Screen Layout (Wireframe) ═══ */}
                    {msappTab === 'layout' && (
                      <div>
                        {(d.screenLayouts || []).filter((sl: MsappControlLayout) => sl.name !== 'App').map((sl: MsappControlLayout) => {
                          const isExpanded = msappExpandedScreen === sl.name;
                          const typeIcon = (t: string) => {
                            const map: Record<string, string> = { screen: 'phone_android', groupcontainer: 'view_column', button: 'smart_button', label: 'text_fields', textinput: 'edit_note', icon: 'add_reaction', image: 'image', gallery: 'view_list', form: 'dynamic_form', dropdown: 'arrow_drop_down', rectangle: 'rectangle', circle: 'circle', datepicker: 'event', toggle: 'toggle_on', checkbox: 'check_box', timer: 'timer', combobox: 'list_alt' };
                            return map[t.toLowerCase()] || 'widgets';
                          };
                          const renderLayoutNode = (node: MsappControlLayout, depth: number, key: string): JSX.Element => {
                            const indent = depth * 24;
                            const isContainer = node.children.length > 0;
                            const wLabel = node.width ? (node.width.length > 30 ? node.width.substring(0, 30) + '…' : node.width) : '';
                            const hLabel = node.height ? (node.height.length > 30 ? node.height.substring(0, 30) + '…' : node.height) : '';
                            return (
                              <div key={key}>
                                <div className={`az-layout-node ${isContainer ? 'az-layout-container' : ''} ${node.visible !== 'true' && node.visible !== '' ? 'az-layout-hidden' : ''}`} style={{ paddingLeft: indent + 8 }}>
                                  <span className="material-symbols-outlined az-layout-icon" style={{ fontSize: 16 }}>{typeIcon(node.type)}</span>
                                  <span className="az-layout-name">{node.name}</span>
                                  <span className="az-layout-type">{node.type}</span>
                                  {(wLabel || hLabel) && <span className="az-layout-dims">{wLabel}{wLabel && hLabel ? ' × ' : ''}{hLabel}</span>}
                                  {node.visible !== 'true' && node.visible !== '' && <span className="badge badge-hidden">Hidden</span>}
                                  {node.isLocked && <span className="material-symbols-outlined az-layout-lock" style={{ fontSize: 14 }}>lock</span>}
                                </div>
                                {node.children.map((ch, ci) => renderLayoutNode(ch, depth + 1, `${key}-${ci}`))}
                              </div>
                            );
                          };

                          return (
                            <div key={sl.name} className="card mb-12">
                              <div className="az-screen-head" onClick={() => setMsappExpandedScreen(isExpanded ? null : sl.name)}>
                                <div>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>{isExpanded ? 'expand_more' : 'chevron_right'}</span>
                                  <strong className="ml-8">{sl.name}</strong>
                                </div>
                                <span className="muted">{sl.children.length} controlli diretti</span>
                              </div>
                              {isExpanded && (
                                <div className="az-layout-tree">
                                  {sl.children.map((ch, ci) => renderLayoutNode(ch, 0, `layout-${ci}`))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ═══ TAB: Screens ═══ */}
                    {msappTab === 'screens' && (
                      <div>
                        {d.screens.filter(sc => !q || sc.name.toLowerCase().includes(q)).map(sc => (
                          <div key={sc.name} className="card mb-12">
                            <div className="az-screen-head" onClick={() => setMsappExpandedScreen(msappExpandedScreen === sc.name ? null : sc.name)}>
                              <div>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>{msappExpandedScreen === sc.name ? 'expand_more' : 'chevron_right'}</span>
                                <strong className="ml-8">{sc.name}</strong>
                              </div>
                              <div className="az-screen-badges">
                                <span className="badge">{sc.controlCount} controlli</span>
                                <span className="badge">{d.formulas.filter(f => f.screen === sc.name).length} formule</span>
                                <span className="badge badge-op">{d.dataOps.filter(o => o.screen === sc.name).length} operazioni dati</span>
                              </div>
                            </div>
                            {msappExpandedScreen === sc.name && (
                              <div className="az-screen-detail">
                                {/* Control tree */}
                                <h5 className="mb-8">Albero Controlli</h5>
                                <div className="az-tree">
                                  {sc.controls.map((node, ni) => {
                                    function renderNode(n: MsappControlNode, key: string): JSX.Element {
                                      return (
                                        <div key={key} className="az-tree-node" style={{ paddingLeft: n.depth * 20 }}>
                                          <span className="az-tree-type">{n.type || 'Screen'}</span>
                                          <span className="az-tree-name">{n.name}</span>
                                          {n.ruleCount > 0 && <span className="muted ml-8">({n.ruleCount} formule)</span>}
                                          {n.children.map((ch, ci) => renderNode(ch, `${key}-${ci}`))}
                                        </div>
                                      );
                                    }
                                    return renderNode(node, `node-${ni}`);
                                  })}
                                </div>
                                {/* Data ops in this screen */}
                                {d.dataOps.filter(o => o.screen === sc.name).length > 0 && (
                                  <>
                                    <h5 className="mt-16 mb-8">Operazioni Dati</h5>
                                    {d.dataOps.filter(o => o.screen === sc.name).map((op, oi) => (
                                      <div key={oi} className="az-op-row">
                                        <span className={`badge badge-op-${op.operation.toLowerCase()}`}>{op.operation}</span>
                                        <span className="az-op-target">{op.target}</span>
                                        <span className="muted">in {op.control}.{op.property}</span>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ═══ TAB: Data Ops ═══ */}
                    {msappTab === 'dataops' && (
                      <div>
                        {(() => {
                          const ops = filterDataOps(d.dataOps);
                          const grouped = new Map<string, MsappDataOp[]>();
                          for (const op of ops) {
                            const key = op.operation;
                            if (!grouped.has(key)) grouped.set(key, []);
                            grouped.get(key)!.push(op);
                          }
                          return [...grouped.entries()].map(([opName, items]) => (
                            <div key={opName} className="card mb-16">
                              <h4><span className={`badge badge-op-${opName.toLowerCase()}`}>{opName}</span> ({items.length} occorrenze)</h4>
                              <div className="az-op-list">
                                {items.map((op, i) => (
                                  <div key={i} className="az-op-detail" onClick={() => setMsappExpandedFormula(msappExpandedFormula === i ? null : i)}>
                                    <div className="az-op-detail-head">
                                      <span className="az-op-target">{op.target}</span>
                                      <span className="muted">{op.screen} → {op.control}.{op.property}</span>
                                    </div>
                                    {msappExpandedFormula === i && (
                                      <pre className="az-formula-code">{op.fullExpression}</pre>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                        {filterDataOps(d.dataOps).length === 0 && <div className="empty-box"><span className="empty-icon">{mi('edit_square')}</span><p>Nessuna operazione dati trovata</p></div>}
                      </div>
                    )}

                    {/* ═══ TAB: Flow Calls ═══ */}
                    {msappTab === 'flows' && (
                      <div>
                        {(() => {
                          const calls = q ? d.flowCalls.filter(f => f.flowName.toLowerCase().includes(q) || f.screen.toLowerCase().includes(q) || f.control.toLowerCase().includes(q)) : d.flowCalls;
                          const grouped = new Map<string, MsappFlowCall[]>();
                          for (const fc of calls) {
                            if (!grouped.has(fc.flowName)) grouped.set(fc.flowName, []);
                            grouped.get(fc.flowName)!.push(fc);
                          }
                          if (grouped.size === 0) return <div className="empty-box"><span className="empty-icon">{mi('bolt')}</span><p>Nessuna chiamata a Flow trovata</p><p className="muted">Cerca .Run() nelle formule della tua app</p></div>;
                          return [...grouped.entries()].map(([flowName, items]) => (
                            <div key={flowName} className="card mb-16">
                              <h4><span className="badge badge-flow">{mi('bolt')} {flowName}</span> — chiamato {items.length} volt{items.length === 1 ? 'a' : 'e'}</h4>
                              {items.map((fc, i) => (
                                <div key={i} className="az-flow-call">
                                  <div><strong>{fc.screen}</strong> → {fc.control}<span className="muted">.{fc.property}</span></div>
                                  <pre className="az-formula-code">{fc.fullExpression}</pre>
                                </div>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* ═══ TAB: Data Sources ═══ */}
                    {msappTab === 'datasources' && (
                      <div>
                        {d.dataSources.filter(ds => !q || ds.name.toLowerCase().includes(q) || ds.type.toLowerCase().includes(q)).map((ds, i) => {
                          const usage = d.dataSourceUsage.find(u => u.dataSourceName === ds.name);
                          return (
                            <div key={i} className="card mb-12">
                              <div className="az-ds-head">
                                <div>
                                  <strong>{ds.name}</strong>
                                  <span className="badge ml-8">{ds.type || 'Sconosciuto'}</span>
                                  {ds.tableName && ds.tableName !== ds.name && <span className="muted ml-8">Tabella: {ds.tableName}</span>}
                                </div>
                              </div>
                              {usage && usage.usedIn.length > 0 && (
                                <div className="az-ds-usage">
                                  <span className="muted">Referenziata in {usage.usedIn.length} formul{usage.usedIn.length === 1 ? 'a' : 'e'}:</span>
                                  <div className="az-ds-refs">
                                    {usage.usedIn.slice(0, 10).map((ref, ri) => (
                                      <span key={ri} className="az-ds-ref">{ref.screen} → {ref.control}.{ref.property}</span>
                                    ))}
                                    {usage.usedIn.length > 10 && <span className="muted">...e altre {usage.usedIn.length - 10}</span>}
                                  </div>
                                </div>
                              )}
                              {(!usage || usage.usedIn.length === 0) && <p className="muted" style={{ fontSize: 13 }}>⚠ DataSource non referenziata nelle formule (possibile inutilizzata)</p>}
                            </div>
                          );
                        })}
                        {d.dataSources.length === 0 && <div className="empty-box"><span className="empty-icon">{mi('storage')}</span><p>Nessuna data source trovata</p></div>}
                      </div>
                    )}

                    {/* ═══ TAB: Variables ═══ */}
                    {msappTab === 'variables' && (
                      <div>
                        {(() => {
                          const globalVars = d.variables.filter(v => v.type === 'Global' && (!q || v.name.toLowerCase().includes(q)));
                          const ctxVars = d.variables.filter(v => v.type === 'Context' && (!q || v.name.toLowerCase().includes(q)));
                          return (
                            <>
                              <div className="card mb-16">
                                <h4>{mi('public')} Variabili Globali ({globalVars.length})</h4>
                                {globalVars.length === 0 && <p className="muted">Nessuna variabile globale trovata</p>}
                                {globalVars.map((v, i) => (
                                  <div key={i} className="az-var-row">
                                    <span className="badge badge-var-global">{v.name}</span>
                                    <span className="muted">Set() in: {v.setIn.map((s, si) => <span key={si} className="az-var-loc">{s.screen} → {s.control}.{s.property}</span>)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="card mb-16">
                                <h4>{mi('lock')} Variabili Context ({ctxVars.length})</h4>
                                {ctxVars.length === 0 && <p className="muted">Nessuna variabile context trovata</p>}
                                {ctxVars.map((v, i) => (
                                  <div key={i} className="az-var-row">
                                    <span className="badge badge-var-ctx">{v.name}</span>
                                    <span className="muted">UpdateContext() in: {v.setIn.map((s, si) => <span key={si} className="az-var-loc">{s.screen} → {s.control}.{s.property}</span>)}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* ═══ TAB: Navigation ═══ */}
                    {msappTab === 'navigation' && (
                      <div>
                        <div className="card mb-16">
                          <h4>{mi('route')} Mappa Navigazione</h4>
                          <div className="az-nav-map">
                            {d.screenMap.map((sm, i) => (
                              <div key={i} className="az-nav-row">
                                <strong>{sm.screen}</strong>
                                {sm.navigatesTo.length > 0 && (
                                  <span className="az-nav-arrow">→ {sm.navigatesTo.map((to, ti) => <span key={ti} className="badge ml-4">{to}</span>)}</span>
                                )}
                                {sm.navigatesFrom.length > 0 && (
                                  <span className="az-nav-from">← da {sm.navigatesFrom.map((fr, fi) => <span key={fi} className="badge badge-muted ml-4">{fr}</span>)}</span>
                                )}
                                {sm.navigatesTo.length === 0 && sm.navigatesFrom.length === 0 && <span className="muted ml-8">(isolata)</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="card mb-16">
                          <h4>Dettaglio Navigazioni ({d.navigations.length})</h4>
                          {d.navigations.map((nav, i) => (
                            <div key={i} className="az-op-row">
                              <span className="badge">{nav.from}</span>
                              <span className="az-nav-arrow-icon">→</span>
                              <span className="badge">{nav.to}</span>
                              <span className="muted ml-8">({nav.control}.{nav.property})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ═══ TAB: All Formulas ═══ */}
                    {msappTab === 'formulas' && (
                      <div>
                        <p className="muted mb-12">Totale: {filterFormulas(d.formulas).length} formule{q ? ` (filtrate da ${d.formulas.length})` : ''}</p>
                        {filterFormulas(d.formulas).slice(0, 200).map((f, i) => (
                          <div key={i} className="az-formula-row" onClick={() => setMsappExpandedFormula(msappExpandedFormula === i ? null : i)}>
                            <div className="az-formula-head">
                              <span className="badge badge-screen">{f.screen}</span>
                              <span><strong>{f.control}</strong><span className="muted">.{f.property}</span></span>
                              {f.controlType && <span className="muted ml-8">[{f.controlType}]</span>}
                            </div>
                            {msappExpandedFormula === i && (
                              <pre className="az-formula-code">{f.formula}</pre>
                            )}
                          </div>
                        ))}
                        {filterFormulas(d.formulas).length > 200 && <p className="muted ta-c mt-16">Mostrate le prime 200 formule. Usa la ricerca per filtrare.</p>}
                      </div>
                    )}

                    {/* ═══ TAB: Diff ═══ */}
                    {msappTab === 'diff' && (
                      <div>
                        <div className="card mb-16">
                          <h4>{mi('compare')} Confronta Versioni</h4>
                          <p className="muted mb-12">Importa una seconda versione della stessa app per vedere le differenze.</p>
                          <div className="az-diff-bar">
                            <div className="az-diff-file">
                              <span className="badge badge-ver">VERSIONE A</span>
                              <strong>{d.fileName || d.appName}</strong>
                            </div>
                            <span className="az-diff-vs">vs</span>
                            <div className="az-diff-file">
                              <span className="badge badge-ver">VERSIONE B</span>
                              {msappSecond ? <strong>{msappSecond.fileName || msappSecond.appName}</strong> : <span className="muted">Non caricata</span>}
                            </div>
                          </div>
                          {!msappSecond && (
                            <button className="btn-primary mt-16" onClick={async () => {
                              if (!api) return;
                              setMsappLoading(true);
                              try {
                                const res = await api.msappOpenSecondFile();
                                if (res) {
                                  setMsappSecond(res);
                                  const diff = await api.msappDiff(d._cacheId || '', res._cacheId || '');
                                  setMsappDiffData(diff);
                                }
                              } finally { setMsappLoading(false); }
                            }}>{mi('upload_file')} Importa versione B</button>
                          )}
                        </div>

                        {msappDiffData && !msappDiffData.error && (() => {
                          const df = msappDiffData;
                          const totalChanges = df.screensAdded.length + df.screensRemoved.length + df.screensModified.length + df.formulasAdded.length + df.formulasRemoved.length + df.formulasChanged.length;
                          return (
                            <>
                              <div className="card mb-16 az-diff-summary">
                                <h4>{totalChanges === 0 ? `${mi('check_circle')} Nessuna differenza trovata` : `${mi('difference')} ${totalChanges} differenze trovate`}</h4>
                                <div className="grid-3 mt-12">
                                  <div className="az-diff-stat"><div className="az-diff-num green">{df.screensAdded.length}</div><div>Schermate aggiunte</div></div>
                                  <div className="az-diff-stat"><div className="az-diff-num red">{df.screensRemoved.length}</div><div>Schermate rimosse</div></div>
                                  <div className="az-diff-stat"><div className="az-diff-num orange">{df.screensModified.length}</div><div>Schermate modificate</div></div>
                                  <div className="az-diff-stat"><div className="az-diff-num green">{df.formulasAdded.length}</div><div>Formule aggiunte</div></div>
                                  <div className="az-diff-stat"><div className="az-diff-num red">{df.formulasRemoved.length}</div><div>Formule rimosse</div></div>
                                  <div className="az-diff-stat"><div className="az-diff-num orange">{df.formulasChanged.length}</div><div>Formule modificate</div></div>
                                </div>
                              </div>

                              {df.screensAdded.length > 0 && (
                                <div className="card mb-12">
                                  <h4 className="green">{mi('add_circle')} Schermate Aggiunte</h4>
                                  {df.screensAdded.map((s, i) => <div key={i} className="az-diff-item green">{s}</div>)}
                                </div>
                              )}
                              {df.screensRemoved.length > 0 && (
                                <div className="card mb-12">
                                  <h4 className="red">{mi('remove_circle')} Schermate Rimosse</h4>
                                  {df.screensRemoved.map((s, i) => <div key={i} className="az-diff-item red">{s}</div>)}
                                </div>
                              )}
                              {df.screensModified.length > 0 && (
                                <div className="card mb-12">
                                  <h4 className="orange">{mi('edit')} Schermate Modificate</h4>
                                  {df.screensModified.map((s, i) => (
                                    <div key={i} className="az-diff-item">
                                      <strong>{s.name}</strong>
                                      <span className="muted ml-8">Controlli: {s.controlsBefore} → {s.controlsAfter}</span>
                                      <span className="muted ml-8">Formule: {s.formulasBefore} → {s.formulasAfter}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {df.formulasChanged.length > 0 && (
                                <div className="card mb-12">
                                  <h4 className="orange">{mi('edit')} Formule Modificate ({df.formulasChanged.length})</h4>
                                  {df.formulasChanged.slice(0, 50).map((ch, i) => (
                                    <div key={i} className="az-diff-formula">
                                      <div className="az-diff-formula-head">
                                        <span className="badge badge-screen">{ch.after.screen}</span>
                                        <strong>{ch.after.control}</strong><span className="muted">.{ch.after.property}</span>
                                      </div>
                                      <div className="az-diff-code-pair">
                                        <pre className="az-diff-code az-diff-old">{ch.before.formula}</pre>
                                        <pre className="az-diff-code az-diff-new">{ch.after.formula}</pre>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {df.formulasAdded.length > 0 && (
                                <div className="card mb-12">
                                  <h4 className="green">{mi('add_circle')} Formule Aggiunte ({df.formulasAdded.length})</h4>
                                  {df.formulasAdded.slice(0, 30).map((f, i) => (
                                    <div key={i} className="az-diff-formula">
                                      <span className="badge badge-screen">{f.screen}</span> <strong>{f.control}</strong>.{f.property}
                                      <pre className="az-formula-code">{f.formula}</pre>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {df.formulasRemoved.length > 0 && (
                                <div className="card mb-12">
                                  <h4 className="red">{mi('remove_circle')} Formule Rimosse ({df.formulasRemoved.length})</h4>
                                  {df.formulasRemoved.slice(0, 30).map((f, i) => (
                                    <div key={i} className="az-diff-formula">
                                      <span className="badge badge-screen">{f.screen}</span> <strong>{f.control}</strong>.{f.property}
                                      <pre className="az-formula-code">{f.formula}</pre>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                        {msappDiffData?.error && <div className="card mb-12 az-errors"><p>{msappDiffData.error}</p></div>}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ═══════ REPORT ═══════ */}
          {view === 'guide' && (
            <div className="view guide-view">
              <div className="view-header">
                <div>
                  <h2 className="view-title">Guida all'uso</h2>
                  <p className="view-sub">Scopri come usare FlowDesk passo dopo passo</p>
                </div>
              </div>

              {/* Intro */}
              <div className="card guide-intro mb-20">
                <div className="guide-intro-icon">{mi('rocket_launch')}</div>
                <div>
                  <h3>Benvenuto in FlowDesk!</h3>
                  <p>FlowDesk è il tuo compagno di lavoro quotidiano per tracciare attività, tempo e modifiche su progetti Power Platform. Segui questi step nell'ordine suggerito per ottenere il massimo dall'app.</p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">1</div>
                <div className="guide-step-body">
                  <h3>Crea i tuoi Progetti</h3>
                  <p className="guide-step-where">{mi('folder')} Sezione: <strong>Progetti</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+3</strong></p>
                  <p>Il primo passo è creare i progetti su cui lavori. Ogni progetto ha un <strong>nome</strong>, un <strong>colore</strong> identificativo e una <strong>descrizione</strong> opzionale.</p>
                  <p>I progetti servono a raggruppare task, modifiche, segnalibri, contatti, ambienti, bug e repository FDHub sotto un'unica entità. Potrai poi filtrare e vedere le statistiche per progetto.</p>
                  <ul>
                    <li>Vai nella sezione <strong>Progetti</strong> dalla sidebar</li>
                    <li>Compila il form con nome, colore e descrizione</li>
                    <li>Premi <strong>"Crea Progetto"</strong></li>
                    <li>Puoi <strong>archiviare</strong> un progetto quando non è più attivo — non apparirà più nelle selezioni ma resterà nello storico</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">2</div>
                <div className="guide-step-body">
                  <h3>Configura gli Ambienti</h3>
                  <p className="guide-step-where">{mi('cloud')} Sezione: <strong>Ambienti</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+4</strong></p>
                  <p>Registra gli ambienti di sviluppo, test e produzione dei tuoi progetti Power Platform.</p>
                  <ul>
                    <li>Crea un ambiente con <strong>nome</strong>, <strong>tipo</strong> (Sviluppo, Test, UAT, Pre-Produzione, Produzione), <strong>URL</strong> e progetto</li>
                    <li>Cambia lo <strong>stato</strong> direttamente dalla card: Attivo, Manutenzione, Inattivo, Sospeso</li>
                    <li>Clicca <strong>modifica</strong> per aggiornare i dettagli inline</li>
                    <li>Puoi <strong>allegare file</strong> ad ogni ambiente (es. il file .msapp della versione corrente)</li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">3</div>
                <div className="guide-step-body">
                  <h3>Aggiungi i Contatti</h3>
                  <p className="guide-step-where">{mi('contacts')} Sezione: <strong>Contatti</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+5</strong></p>
                  <p>Crea una rubrica dei contatti professionali legati ai tuoi progetti.</p>
                  <ul>
                    <li>Inserisci <strong>nome</strong>, <strong>ruolo</strong>, <strong>email</strong>, <strong>telefono</strong>, <strong>azienda</strong>, note e progetto</li>
                    <li>Modifica tutti i campi direttamente nella card</li>
                    <li>Puoi <strong>allegare file</strong> ad ogni contatto (documenti, contratti, ecc.)</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">4</div>
                <div className="guide-step-body">
                  <h3>Definisci gli Obiettivi del Giorno</h3>
                  <p className="guide-step-where">{mi('flag')} Sezione: <strong>Obiettivi</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+2</strong></p>
                  <p>Ogni mattina, inizia definendo cosa vuoi raggiungere nella giornata. Gli obiettivi sono semplici frasi che descrivono il risultato atteso.</p>
                  <ul>
                    <li>Vai nella sezione <strong>Obiettivi</strong></li>
                    <li>Scrivi un obiettivo nel campo di testo (es. "Completare il flow di approvazione")</li>
                    <li>Premi <strong>"Aggiungi"</strong></li>
                    <li>Durante la giornata, spunta quelli completati</li>
                  </ul>
                  <p className="guide-tip">{mi('lightbulb')} <em>Consiglio: definire 3-5 obiettivi chiari aiuta a mantenere il focus.</em></p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">5</div>
                <div className="guide-step-body">
                  <h3>Crea le Attività (Task)</h3>
                  <p className="guide-step-where">{mi('task_alt')} Sezione: <strong>Attività</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+6</strong></p>
                  <p>Le attività vengono organizzate su una <strong>Kanban Board</strong> a 3 colonne: <strong>Da fare → In corso → Fatto</strong>.</p>
                  <ul>
                    <li>Compila: titolo, descrizione, minuti pianificati, priorità (Alta/Media/Bassa) e progetto</li>
                    <li>Premi <strong>"Crea Task"</strong> — il task appare nella colonna "Da fare"</li>
                    <li>Premi <strong>"Inizia"</strong> per spostarlo in "In corso", poi <strong>"Completa"</strong> quando hai finito</li>
                    <li>Usa <strong>"Duplica per domani"</strong> per attività ricorrenti</li>
                    <li>Associa <strong>Tag</strong> colorati per categorizzare i task</li>
                    <li>Salva un task come <strong>Template</strong> per riutilizzarlo velocemente</li>
                    <li>Apri il modale di modifica per aggiungere <strong>allegati</strong></li>
                  </ul>
                </div>
              </div>

              {/* Step 6 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">6</div>
                <div className="guide-step-body">
                  <h3>Traccia il Tempo con il Timer</h3>
                  <p className="guide-step-where">{mi('timer')} Sezione: <strong>Timer</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+T</strong></p>
                  <p>Mentre lavori su un task, usa il timer per misurare il tempo effettivo.</p>
                  <ul>
                    <li>Seleziona il task su cui stai lavorando</li>
                    <li>Premi <strong>"Avvia Sessione"</strong> — il cronometro parte e si vede anche nella sidebar</li>
                    <li>Quando finisci, premi <strong>"Ferma Sessione"</strong> e aggiungi una nota opzionale</li>
                  </ul>
                  <p>Il <strong>Pomodoro</strong> è integrato: cicli di 25 min di focus + 5 min di pausa, con notifiche di sistema. Il badge nella sidebar mostra il tempo rimanente.</p>
                </div>
              </div>

              {/* Step 7 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">7</div>
                <div className="guide-step-body">
                  <h3>Registra le Modifiche (Change Log)</h3>
                  <p className="guide-step-where">{mi('assignment')} Sezione: <strong>Registro</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+R</strong></p>
                  <p>Ogni volta che modifichi un artefatto Power Platform, documentalo nel registro. Questo è il cuore del tracciamento tecnico.</p>
                  <ul>
                    <li>Seleziona il <strong>Tool</strong> (Power Apps, Power Automate, Power BI, Dataverse, SharePoint, Power Pages, Altro)</li>
                    <li>Inserisci il nome dell'<strong>Artefatto</strong> (es. "Screen_Home", "Flow_Approvazioni")</li>
                    <li>Scegli il <strong>Tipo di modifica</strong> (Creazione, Modifica, Fix, Eliminazione, Configurazione, Deploy)</li>
                    <li>Scrivi un <strong>Riepilogo</strong> — opzionale: compila <strong>Prima/Dopo</strong></li>
                    <li>Seleziona l'<strong>Esito del test</strong> (Passato, Fallito, Non testato)</li>
                    <li>Premi <strong>"Registra Modifica"</strong></li>
                  </ul>
                </div>
              </div>

              {/* Step 8 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">8</div>
                <div className="guide-step-body">
                  <h3>Bug Tracker</h3>
                  <p className="guide-step-where">{mi('bug_report')} Sezione: <strong>Bug Tracker</strong></p>
                  <p>Traccia bug e issue con un sistema dedicato:</p>
                  <ul>
                    <li>Crea un bug con <strong>titolo</strong>, <strong>descrizione</strong>, <strong>severità</strong> (Critico, Alto, Medio, Basso), <strong>tool</strong>, <strong>artefatto</strong></li>
                    <li>Aggiungi i <strong>passi per riprodurre</strong> e la <strong>soluzione</strong></li>
                    <li>Ogni card è colorata in base alla severità</li>
                    <li>Cambia lo <strong>stato</strong> direttamente dalla card: Aperto → In Corso → Risolto → Chiuso</li>
                    <li><strong>Allegati</strong> visibili direttamente nella card (screenshot, log, ecc.)</li>
                    <li>Filtra per tool con il selettore in alto</li>
                  </ul>
                </div>
              </div>

              {/* Step 9 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">9</div>
                <div className="guide-step-body">
                  <h3>Prendi Appunti</h3>
                  <p className="guide-step-where">{mi('edit_note')} Sezione: <strong>Appunti</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+N</strong></p>
                  <p>Usa gli appunti per annotare informazioni da riunioni, call, idee, promemoria o problemi riscontrati.</p>
                  <ul>
                    <li>Scegli una <strong>Categoria</strong> (Riunione, Call, Idea, Promemoria, Problema, Generale)</li>
                    <li>Scrivi il titolo e il contenuto, poi premi <strong>"Crea Appunto"</strong></li>
                    <li>Puoi <strong>fissare</strong> (pin) gli appunti importanti per tenerli in cima</li>
                    <li>Aggiungi <strong>allegati</strong> dal modale di modifica</li>
                  </ul>
                </div>
              </div>

              {/* Step 10 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">10</div>
                <div className="guide-step-body">
                  <h3>Checklist</h3>
                  <p className="guide-step-where">{mi('checklist')} Sezione: <strong>Checklist</strong></p>
                  <p>Crea checklist riutilizzabili per procedure operative (deploy, test, onboarding, ecc.):</p>
                  <ul>
                    <li>Crea una checklist con <strong>nome</strong> e <strong>descrizione</strong></li>
                    <li>Aggiungi <strong>elementi</strong>, ognuno con la sua checkbox</li>
                    <li>La <strong>barra di progresso</strong> mostra la percentuale di completamento</li>
                  </ul>
                </div>
              </div>

              {/* Step 11 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">11</div>
                <div className="guide-step-body">
                  <h3>Salva Snippet e Link Utili</h3>
                  <p className="guide-step-where">{mi('code')} <strong>Snippets</strong> (Ctrl+S) &nbsp;|&nbsp; {mi('bookmark')} <strong>Link utili</strong> (Ctrl+L)</p>
                  <p>Costruisci la tua libreria personale di codice e link:</p>
                  <ul>
                    <li><strong>Snippets:</strong> salva frammenti PowerFx, DAX, M, JSON, SQL, JavaScript, TypeScript, HTML, CSS — copia con un click, segna i preferiti</li>
                    <li><strong>Link utili:</strong> salva URL di ambienti, documentazione, repository, SharePoint, API — organizzati per categoria e progetto</li>
                  </ul>
                </div>
              </div>

              {/* Step 12 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">12</div>
                <div className="guide-step-body">
                  <h3>Formazione</h3>
                  <p className="guide-step-where">{mi('school')} Sezione: <strong>Formazione</strong></p>
                  <p>Traccia la tua crescita professionale con risorse di apprendimento:</p>
                  <ul>
                    <li>Aggiungi risorse: <strong>Corso</strong>, <strong>Certificazione</strong>, <strong>Libro</strong>, <strong>Video</strong>, <strong>Workshop</strong>, <strong>Documentazione</strong></li>
                    <li>Usa lo <strong>slider di progresso</strong> (0-100%) per tracciare l'avanzamento</li>
                    <li>Aggiungi <strong>allegati</strong> (materiale, certificati) — visibili nella card e nel modale</li>
                    <li>Filtra per categoria con il selettore in alto</li>
                  </ul>
                </div>
              </div>

              {/* Step 13 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">13</div>
                <div className="guide-step-body">
                  <h3>Power Apps Analyzer</h3>
                  <p className="guide-step-where">{mi('analytics')} Sezione: <strong>Analyzer</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+P</strong></p>
                  <p>Analizza in profondità file <strong>.msapp</strong> (Power Apps Canvas):</p>
                  <ul>
                    <li>Clicca <strong>"Carica .msapp"</strong> per selezionare un file dal PC</li>
                    <li><strong>Health Score:</strong> punteggio A-F su Performance, Delegazione, Manutenibilità, Sicurezza, Accessibilità, Architettura</li>
                    <li><strong>Schermate:</strong> lista con conteggio controlli e formule per screen</li>
                    <li><strong>Formule:</strong> tutte le formule trovate, con ricerca</li>
                    <li><strong>DataSource:</strong> connettori e tabelle utilizzate</li>
                    <li><strong>Issues:</strong> problemi e raccomandazioni categorizzate per severità</li>
                    <li><strong>Matrice Dati:</strong> visualizzazione read/write per ogni data source</li>
                  </ul>
                </div>
              </div>

              {/* Step 14 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">14</div>
                <div className="guide-step-body">
                  <h3>FDHub — Version Control Locale</h3>
                  <p className="guide-step-where">{mi('hub')} Sezione: <strong>FDHub</strong> &nbsp;|&nbsp; Shortcut: <strong>Ctrl+H</strong></p>
                  <p>Un "GitHub locale" per le tue Power Apps — versiona, confronta e scarica i file .msapp:</p>
                  <ul>
                    <li><strong>Repository:</strong> crea repository con nome, descrizione e progetto associato</li>
                    <li><strong>Commit:</strong> scrivi un messaggio + tag opzionale (es. "v1.0"), poi clicca <strong>"Committa .msapp"</strong> per selezionare il file</li>
                    <li>Il file viene copiato e <strong>analizzato automaticamente</strong> (schermate, controlli, formule, health score, issues)</li>
                    <li><strong>KPI:</strong> numero commit, health score, schermate, controlli, issues dell'ultimo commit</li>
                    <li><strong>Confronta Commit:</strong> seleziona 2 commit per vedere schermate/formule/datasource aggiunti-rimossi-modificati</li>
                    <li><strong>Cronologia:</strong> grafo visivo con dot + linee stile Git, tag, health score colorato</li>
                    <li><strong>Scarica versione:</strong> pulsante download per esportare il file .msapp di qualsiasi commit</li>
                  </ul>
                </div>
              </div>

              {/* Step 15 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">15</div>
                <div className="guide-step-body">
                  <h3>Controlla il Backlog</h3>
                  <p className="guide-step-where">{mi('inventory_2')} Sezione: <strong>Backlog</strong></p>
                  <p>I task non completati entro la data programmata finiscono automaticamente nel <strong>Backlog</strong>.</p>
                  <ul>
                    <li>Controlla regolarmente il backlog</li>
                    <li>Per ogni task puoi: <strong>Riprogramma a oggi</strong> oppure <strong>Segna come completato</strong></li>
                    <li>Un avviso appare nella Dashboard quando hai task in arretrato</li>
                  </ul>
                </div>
              </div>

              {/* Step 16 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">16</div>
                <div className="guide-step-body">
                  <h3>Retrospettive</h3>
                  <p className="guide-step-where">{mi('psychology')} Sezione: <strong>Retrospettive</strong></p>
                  <p>A fine sprint o settimana, fai una retrospettiva:</p>
                  <ul>
                    <li>Compila: <strong>cosa è andato bene</strong>, <strong>cosa migliorare</strong>, <strong>azioni da intraprendere</strong></li>
                    <li>Tutte le retro sono elencate in ordine cronologico per consultazione futura</li>
                  </ul>
                </div>
              </div>

              {/* Step 17 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">17</div>
                <div className="guide-step-body">
                  <h3>Statistiche, Storico e Report</h3>
                  <p className="guide-step-where">{mi('trending_up')} <strong>Statistiche</strong> &nbsp;|&nbsp; {mi('calendar_month')} <strong>Storico</strong> &nbsp;|&nbsp; {mi('description')} <strong>Report</strong></p>
                  <p>Analizza il tuo lavoro e genera output condivisibili:</p>
                  <ul>
                    <li><strong>Statistiche:</strong> grafici settimanali — tempo giornaliero, uso tool, stato task, tipi di modifica, obiettivi. Puoi esportare in <strong>CSV</strong></li>
                    <li><strong>Storico:</strong> calendario mensile — clicca su un giorno per il riepilogo completo</li>
                    <li><strong>Report:</strong> genera un report strutturato della giornata e copialo con un click per condividerlo su Teams, email, ecc.</li>
                  </ul>
                </div>
              </div>

              {/* Step 18 */}
              <div className="card guide-step mb-16">
                <div className="guide-step-num">18</div>
                <div className="guide-step-body">
                  <h3>Allegati</h3>
                  <p className="guide-step-where">{mi('attach_file')} Disponibile in: Task, Note, Bug, Contatti, Ambienti, Formazione</p>
                  <p>Sistema universale di allegati per aggiungere file a qualsiasi entità:</p>
                  <ul>
                    <li>Clicca <strong>"Allegati"</strong> per espandere la sezione, poi il pulsante <strong>+</strong> per selezionare file dal PC</li>
                    <li>Clicca il <strong>nome del file</strong> per aprirlo con l'app predefinita del sistema</li>
                    <li>Ogni allegato mostra icona, nome e dimensione</li>
                    <li>I file sono salvati nella cartella del database — se usi <strong>OneDrive</strong>, vengono sincronizzati automaticamente</li>
                  </ul>
                </div>
              </div>

              {/* Tips */}
              <div className="card guide-tips">
                <h3>{mi('tips_and_updates')} Scorciatoie e Suggerimenti</h3>
                <div className="guide-tips-grid">
                  <div className="guide-tip-card">
                    <span className="guide-tip-icon">{mi('keyboard')}</span>
                    <strong>Ctrl+K</strong>
                    <p>Apri la Command Palette per navigare velocemente, cercare e cambiare tema</p>
                  </div>
                  <div className="guide-tip-card">
                    <span className="guide-tip-icon">{mi('dark_mode')}</span>
                    <strong>Ctrl+D — Dark Mode</strong>
                    <p>Attivalo dalla sidebar, dalla Command Palette o con Ctrl+D — la preferenza resta salvata</p>
                  </div>
                  <div className="guide-tip-card">
                    <span className="guide-tip-icon">{mi('cloud_sync')}</span>
                    <strong>OneDrive</strong>
                    <p>Salva il database su OneDrive per sincronizzare dati e allegati tra dispositivi. Usa: Database → Migra su OneDrive</p>
                  </div>
                  <div className="guide-tip-card">
                    <span className="guide-tip-icon">{mi('local_fire_department')}</span>
                    <strong>Streak</strong>
                    <p>Lavora ogni giorno per mantenere alta la streak di giorni consecutivi</p>
                  </div>
                  <div className="guide-tip-card">
                    <span className="guide-tip-icon">{mi('search')}</span>
                    <strong>Ctrl+F — Ricerca</strong>
                    <p>Cerca tra task, modifiche e note contemporaneamente dalla sezione Ricerca</p>
                  </div>
                  <div className="guide-tip-card">
                    <span className="guide-tip-icon">{mi('schedule')}</span>
                    <strong>Budget Temporale</strong>
                    <p>Confronta i minuti pianificati con quelli effettivi nella Dashboard</p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card guide-danger mt-24">
                <h3>{mi('warning')} Zona Pericolosa</h3>
                <p>Questa azione cancella <strong>permanentemente</strong> tutti i dati dell'applicazione: task, sessioni, modifiche, note, obiettivi, progetti, tag, template, snippet, segnalibri, contatti, ambienti, bug, checklist, formazione, retrospettive, repository FDHub e allegati.</p>
                <button className="btn-danger-lg" onClick={() => { setResetConfirmOpen(true); setResetConfirmText(''); setResetDone(false); }}>{mi('delete_forever')} Cancella tutti i dati</button>
              </div>

            </div>
          )}

          {view === 'report' && (() => {
            const rTotalMin = rptSessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);
            const rDoneTasks = rptTasks.filter(t => t.status === 'Done');
            const rGoalsDone = rptGoals.filter(g => g.isDone).length;
            const rTaskPct = rptTasks.length ? Math.round(rDoneTasks.length / rptTasks.length * 100) : 0;
            const rGoalPct = rptGoals.length ? Math.round(rGoalsDone / rptGoals.length * 100) : 0;

            // Build PDF-compatible HTML for export
            function buildReportHtml() {
              const dateStr = dateLong(rptDate);
              let h = `<div class="header"><div class="header-left"><h1>Report Giornaliero</h1><div class="subtitle">${dateStr}</div></div><div class="header-right"><div>FlowDesk v${appVersion}</div></div></div>`;
              h += `<div class="kpi-row"><div class="kpi"><div class="num">${rGoalsDone}/${rptGoals.length}</div><div class="lbl">Obiettivi</div></div><div class="kpi"><div class="num">${rDoneTasks.length}/${rptTasks.length}</div><div class="lbl">Attività completate</div></div><div class="kpi"><div class="num">${fmtMin(rTotalMin)}</div><div class="lbl">Tempo tracciato</div></div><div class="kpi"><div class="num">${rptChanges.length}</div><div class="lbl">Modifiche</div></div></div>`;
              if (rptGoals.length) {
                h += `<h2>Obiettivi</h2><table><tr><th style="width:40px">✓</th><th>Obiettivo</th></tr>`;
                rptGoals.forEach(g => { h += `<tr><td style="text-align:center">${g.isDone ? '✅' : '⬜'}</td><td>${g.text}</td></tr>`; });
                h += `</table>`;
              }
              if (rptTasks.length) {
                h += `<h2>Attività</h2><table><tr><th>Task</th><th>Stato</th><th>Priorità</th><th style="text-align:right">Tempo</th></tr>`;
                rptTasks.forEach(tk => {
                  const tMin = rptSessions.filter(s => s.taskId === tk.id).reduce((a, s) => a + (s.durationMinutes || 0), 0);
                  const stLbl = STATUS_LABEL[tk.status];
                  const stCls = tk.status === 'Done' ? 'done' : tk.status === 'Doing' ? 'doing' : 'todo';
                  h += `<tr><td>${tk.title}</td><td><span class="${stCls}">${stLbl}</span></td><td><span class="badge ${tk.priority.toLowerCase()}">${PRI_LABEL[tk.priority]}</span></td><td style="text-align:right">${tMin ? fmtMin(tMin) : '—'}</td></tr>`;
                });
                h += `</table>`;
              }
              if (rptSessions.length) {
                h += `<h2>Sessioni di Lavoro</h2><table><tr><th>Task</th><th>Inizio</th><th>Fine</th><th style="text-align:right">Durata</th><th>Note</th></tr>`;
                rptSessions.forEach(s => {
                  const st = new Date(s.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                  const en = s.endedAt ? new Date(s.endedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'in corso';
                  h += `<tr><td>${s.taskTitle}</td><td class="session-time">${st}</td><td class="session-time">${en}</td><td style="text-align:right">${s.durationMinutes || '?'}m</td><td>${s.note || '—'}</td></tr>`;
                });
                h += `</table>`;
              }
              if (rptChanges.length) {
                h += `<h2>Modifiche Registrate</h2><table><tr><th>Tool</th><th>Artefatto</th><th>Tipo</th><th>Riepilogo</th><th>Test</th></tr>`;
                rptChanges.forEach(c => {
                  const testCls = c.testResult === 'Passato' ? 'test-pass' : c.testResult === 'Fallito' ? 'test-fail' : 'test-na';
                  h += `<tr><td>${TOOL_LABEL[c.tool]}</td><td>${c.artifact}</td><td>${c.changeType}</td><td>${c.summary}</td><td class="${testCls}">${c.testResult}</td></tr>`;
                });
                h += `</table>`;
              }
              if (rptNotes.length) {
                h += `<h2>Appunti</h2>`;
                rptNotes.forEach(n => { h += `<div class="note-block"><strong>[${n.category}] ${n.title}</strong>${n.content ? '<br>' + n.content : ''}</div>`; });
              }
              h += `<div class="footer">Report generato con <strong>FlowDesk</strong> — ${dateStr}</div>`;
              return h;
            }

            return (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Report Giornaliero</h2><p className="view-sub">Resoconto professionale della giornata lavorativa</p></div>
                <div className="view-actions">
                  <input type="date" value={rptDate} onChange={e => setRptDate(e.target.value)} />
                  <button className="btn-secondary" onClick={async () => {
                    if (!api) return;
                    await api.reportExportPdf(buildReportHtml());
                  }}>{mi('picture_as_pdf')} Esporta PDF</button>
                  <button className={`btn-primary${rptCopied ? ' copied' : ''}`} onClick={copyReport}>{rptCopied ? <>{mi('check')} Copiato!</> : <>{mi('content_copy')} Copia testo</>}</button>
                </div>
              </div>

              {/* KPI Row */}
              <div className="kpi-row mb-20">
                <div className="kpi-card"><div className="kpi-icon ki-goals">{mi('flag')}</div><div><span className="kpi-value">{rGoalsDone}/{rptGoals.length}</span><span className="kpi-label">Obiettivi</span></div></div>
                <div className="kpi-card"><div className="kpi-icon ki-tasks">{mi('task_alt')}</div><div><span className="kpi-value">{rDoneTasks.length}/{rptTasks.length}</span><span className="kpi-label">Attività</span></div></div>
                <div className="kpi-card"><div className="kpi-icon ki-time">{mi('timer')}</div><div><span className="kpi-value">{fmtMin(rTotalMin)}</span><span className="kpi-label">Tempo tracciato</span></div></div>
                <div className="kpi-card"><div className="kpi-icon ki-changes">{mi('assignment')}</div><div><span className="kpi-value">{rptChanges.length}</span><span className="kpi-label">Modifiche</span></div></div>
              </div>

              {/* Progress Bars */}
              <div className="grid-2 mb-20">
                <div className="card">
                  <h4>{mi('flag')} Progresso Obiettivi</h4>
                  <div className="report-progress-bar">
                    <div className="report-progress-track"><div className="report-progress-fill" style={{ width: `${rGoalPct}%`, background: rGoalPct >= 80 ? '#16a34a' : rGoalPct >= 50 ? '#ca8a04' : '#ef4444' }} /></div>
                    <span className="report-progress-label">{rGoalPct}%</span>
                  </div>
                </div>
                <div className="card">
                  <h4>{mi('task_alt')} Progresso Attività</h4>
                  <div className="report-progress-bar">
                    <div className="report-progress-track"><div className="report-progress-fill" style={{ width: `${rTaskPct}%`, background: rTaskPct >= 80 ? '#16a34a' : rTaskPct >= 50 ? '#ca8a04' : '#ef4444' }} /></div>
                    <span className="report-progress-label">{rTaskPct}%</span>
                  </div>
                </div>
              </div>

              {/* Obiettivi */}
              {rptGoals.length > 0 && (
                <div className="card mb-16">
                  <h3 className="report-section-title">{mi('flag')} Obiettivi della Giornata</h3>
                  <div className="report-goals-list">
                    {rptGoals.map(g => (
                      <div key={g.id} className={`report-goal-item${g.isDone ? ' done' : ''}`}>
                        <span className="report-goal-check">{g.isDone ? mi('check_circle') : mi('radio_button_unchecked')}</span>
                        <span>{g.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attività — Tabella professionale */}
              {rptTasks.length > 0 && (
                <div className="card mb-16">
                  <h3 className="report-section-title">{mi('task_alt')} Attività ({rDoneTasks.length} completate su {rptTasks.length})</h3>
                  <table className="report-table">
                    <thead>
                      <tr><th>Attività</th><th>Stato</th><th>Priorità</th><th>Progetto</th><th style={{ textAlign: 'right' }}>Tempo</th></tr>
                    </thead>
                    <tbody>
                      {rptTasks.map(tk => {
                        const tMin = rptSessions.filter(s => s.taskId === tk.id).reduce((a, s) => a + (s.durationMinutes || 0), 0);
                        const proj = tk.projectId ? projects.find(p => p.id === tk.projectId) : null;
                        return (
                          <tr key={tk.id}>
                            <td><strong>{tk.title}</strong>{tk.description && <div className="report-task-desc">{tk.description}</div>}</td>
                            <td><span className={`badge badge-status-${tk.status.toLowerCase()}`}>{STATUS_LABEL[tk.status]}</span></td>
                            <td><span className={`badge badge-${tk.priority.toLowerCase()}`}>{PRI_LABEL[tk.priority]}</span></td>
                            <td>{proj ? <span className="tag-badge" style={{ background: proj.color }}>{proj.name}</span> : <span className="muted">—</span>}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{tMin ? fmtMin(tMin) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sessioni di lavoro */}
              {rptSessions.length > 0 && (
                <div className="card mb-16">
                  <h3 className="report-section-title">{mi('timer')} Sessioni di Lavoro ({rptSessions.length})</h3>
                  <table className="report-table">
                    <thead>
                      <tr><th>Task</th><th>Inizio</th><th>Fine</th><th style={{ textAlign: 'right' }}>Durata</th><th>Note</th></tr>
                    </thead>
                    <tbody>
                      {rptSessions.map(s => {
                        const st = new Date(s.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                        const en = s.endedAt ? new Date(s.endedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'in corso';
                        return (
                          <tr key={s.id}>
                            <td>{s.taskTitle}</td>
                            <td style={{ fontFamily: 'monospace' }}>{st}</td>
                            <td style={{ fontFamily: 'monospace' }}>{en}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{s.durationMinutes || '?'}m</td>
                            <td className="muted">{s.note || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 600 }}><td colSpan={3}>Totale</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtMin(rTotalMin)}</td><td /></tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Distribuzione tempo per task */}
              {rptTasks.length > 0 && rptSessions.length > 0 && (
                <div className="card mb-16">
                  <h3 className="report-section-title">{mi('pie_chart')} Distribuzione Tempo</h3>
                  <div className="report-time-bars">
                    {rptTasks.map(tk => {
                      const tMin = rptSessions.filter(s => s.taskId === tk.id).reduce((a, s) => a + (s.durationMinutes || 0), 0);
                      if (!tMin) return null;
                      const pct = Math.round(tMin / rTotalMin * 100);
                      const proj = tk.projectId ? projects.find(p => p.id === tk.projectId) : null;
                      return (
                        <div key={tk.id} className="report-time-bar-row">
                          <div className="report-time-bar-label">{tk.title}</div>
                          <div className="report-time-bar-track"><div className="report-time-bar-fill" style={{ width: `${pct}%`, background: proj?.color || '#3b82f6' }} /></div>
                          <div className="report-time-bar-value">{fmtMin(tMin)} ({pct}%)</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modifiche registrate — raggruppate per tool */}
              {rptChanges.length > 0 && (
                <div className="card mb-16">
                  <h3 className="report-section-title">{mi('assignment')} Modifiche Registrate ({rptChanges.length})</h3>
                  <table className="report-table">
                    <thead>
                      <tr><th>Tool</th><th>Artefatto</th><th>Tipo</th><th>Riepilogo</th><th>Test</th></tr>
                    </thead>
                    <tbody>
                      {rptChanges.map(c => (
                        <tr key={c.id}>
                          <td><span className={`badge badge-${toolCls(c.tool)}`}>{TOOL_LABEL[c.tool]}</span></td>
                          <td><strong>{c.artifact}</strong></td>
                          <td>{c.changeType}</td>
                          <td>{c.summary}</td>
                          <td><span className={`badge badge-test-${c.testResult === 'Passato' ? 'pass' : c.testResult === 'Fallito' ? 'fail' : 'na'}`}>{c.testResult}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Appunti */}
              {rptNotes.length > 0 && (
                <div className="card mb-16">
                  <h3 className="report-section-title">{mi('edit_note')} Appunti ({rptNotes.length})</h3>
                  <div className="report-notes-list">
                    {rptNotes.map(n => (
                      <div key={n.id} className="report-note-card">
                        <div className="report-note-header">
                          <span className={`badge badge-note-${n.category.toLowerCase()}`}>{n.category}</span>
                          <strong>{n.title}</strong>
                        </div>
                        {n.content && <div className="report-note-body">{n.content}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {rptTasks.length === 0 && rptGoals.length === 0 && rptChanges.length === 0 && rptNotes.length === 0 && rptSessions.length === 0 && (
                <div className="card ta-c" style={{ padding: '60px 20px' }}>
                  <div style={{ fontSize: 48, opacity: 0.3 }}>{mi('description')}</div>
                  <p className="muted mt-16">Nessun dato per questa giornata.</p>
                  <p className="muted">Seleziona una data diversa o inizia a registrare attività, modifiche e obiettivi.</p>
                </div>
              )}
            </div>
            );
          })()}

          {/* ═══════ FDHUB ═══════ */}
          {view === 'fdhub' && (
            <div className="view">
              <div className="view-header">
                <div>
                  <h2 className="view-title">{mi('hub')} FDHub</h2>
                  <p className="view-sub">Version control locale per le tue Power Apps — committa, confronta e traccia le versioni</p>
                </div>
              </div>

              <div className="fdhub-layout">
                {/* Repo list + create */}
                <div className="card fdhub-repos-panel">
                  <h3>{mi('folder')} Repository</h3>
                  <form className="form-row mb-12" onSubmit={async (e: FormEvent) => {
                    e.preventDefault();
                    if (!api || !fdhubRepoName.trim()) return;
                    await api.fdhubCreateRepo({ name: fdhubRepoName.trim(), description: fdhubRepoDesc, appType: 'PowerApps', projectId: fdhubRepoProjId || null });
                    setFdhubRepoName(''); setFdhubRepoDesc('');
                    setFdhubRepos(await api.fdhubListRepos());
                  }}>
                    <input className="fg-2" placeholder="Nome repository..." value={fdhubRepoName} onChange={e => setFdhubRepoName(e.target.value)} required />
                    <select className="fg-1" value={fdhubRepoProjId} onChange={e => setFdhubRepoProjId(e.target.value === '' ? '' : Number(e.target.value))}>
                      <option value="">— Progetto —</option>
                      {projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button className="btn-primary" type="submit">{mi('add')} Crea</button>
                  </form>

                  {fdhubRepos.length === 0 && <p className="text-muted">Nessun repository. Crea il primo!</p>}
                  <div className="fdhub-repo-list">
                    {fdhubRepos.map(r => (
                      <div key={r.id} className={`fdhub-repo-item${fdhubSelectedRepo === r.id ? ' active' : ''}`} onClick={async () => {
                        setFdhubSelectedRepo(r.id);
                        if (!api) return;
                        const [commits, stats] = await Promise.all([api.fdhubListCommits(r.id), api.fdhubRepoStats(r.id)]);
                        setFdhubCommits(commits); setFdhubRepoStats(stats);
                        setFdhubDiffResult(null); setFdhubDiffA(''); setFdhubDiffB('');
                      }}>
                        <div className="fdhub-repo-info">
                          <strong>{r.name}</strong>
                          {r.description && <span className="text-muted"> — {r.description}</span>}
                          {r.projectId && projects.find(p => p.id === r.projectId) && (
                            <span className="tag-badge" style={{ background: projects.find(p => p.id === r.projectId)?.color }}>{projects.find(p => p.id === r.projectId)?.name}</span>
                          )}
                        </div>
                        <div className="fdhub-repo-actions">
                          <button className="btn-icon" title="Modifica" onClick={e => { e.stopPropagation(); setEditingFdhubRepo(r); }}>{mi('edit')}</button>
                          <button className="btn-icon btn-del" title="Elimina" onClick={async e => {
                            e.stopPropagation();
                            if (!api || !confirm(`Eliminare il repository "${r.name}" e tutti i suoi commit?`)) return;
                            await api.fdhubDeleteRepo(r.id);
                            setFdhubRepos(await api.fdhubListRepos());
                            if (fdhubSelectedRepo === r.id) { setFdhubSelectedRepo(null); setFdhubCommits([]); setFdhubRepoStats(null); }
                          }}>{mi('delete')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commit area */}
                {fdhubSelectedRepo && (
                  <div className="fdhub-commit-panel">
                    {/* New commit form */}
                    <div className="card mb-16">
                      <h3>{mi('commit')} Nuovo Commit</h3>
                      <p className="text-muted mb-8">Seleziona un file .msapp — verrà copiato nel repository e analizzato automaticamente.</p>
                      <form className="form-row mb-8" onSubmit={async (e: FormEvent) => {
                        e.preventDefault();
                        if (!api || !fdhubCommitMsg.trim() || fdhubCommitting) return;
                        setFdhubCommitting(true);
                        try {
                          const commit = await api.fdhubCommit(fdhubSelectedRepo, fdhubCommitMsg.trim(), fdhubCommitTag.trim());
                          if (commit) {
                            setFdhubCommitMsg(''); setFdhubCommitTag('');
                            const [commits, stats] = await Promise.all([api.fdhubListCommits(fdhubSelectedRepo), api.fdhubRepoStats(fdhubSelectedRepo)]);
                            setFdhubCommits(commits); setFdhubRepoStats(stats);
                          }
                        } finally { setFdhubCommitting(false); }
                      }}>
                        <input className="fg-2" placeholder="Messaggio di commit..." value={fdhubCommitMsg} onChange={e => setFdhubCommitMsg(e.target.value)} required />
                        <input className="fg-1" placeholder="Tag (es. v1.0)" value={fdhubCommitTag} onChange={e => setFdhubCommitTag(e.target.value)} />
                        <button className="btn-primary" type="submit" disabled={fdhubCommitting}>{fdhubCommitting ? <>{mi('hourglass_empty')} Committing...</> : <>{mi('upload')} Committa .msapp</>}</button>
                      </form>
                    </div>

                    {/* Stats */}
                    {fdhubRepoStats && (
                      <div className="kpi-row mb-16">
                        <div className="kpi-card"><div className="kpi-icon ki-changes">{mi('commit')}</div><div><span className="kpi-value">{fdhubRepoStats.totalCommits}</span><span className="kpi-label">Commit</span></div></div>
                        {fdhubRepoStats.latestCommit && <>
                          <div className="kpi-card"><div className="kpi-icon ki-tasks">{mi('monitor_heart')}</div><div><span className="kpi-value">{fdhubRepoStats.latestCommit.healthScore}/100</span><span className="kpi-label">Health Score</span></div></div>
                          <div className="kpi-card"><div className="kpi-icon ki-goals">{mi('devices')}</div><div><span className="kpi-value">{fdhubRepoStats.latestCommit.screenCount}</span><span className="kpi-label">Schermate</span></div></div>
                          <div className="kpi-card"><div className="kpi-icon ki-time">{mi('widgets')}</div><div><span className="kpi-value">{fdhubRepoStats.latestCommit.controlCount}</span><span className="kpi-label">Controlli</span></div></div>
                          <div className="kpi-card"><div className="kpi-icon ki-streak">{mi('warning')}</div><div><span className="kpi-value">{fdhubRepoStats.latestCommit.issueCount}</span><span className="kpi-label">Issues</span></div></div>
                        </>}
                      </div>
                    )}

                    {/* Diff tool */}
                    {fdhubCommits.length >= 2 && (
                      <div className="card mb-16">
                        <h3>{mi('compare_arrows')} Confronta Commit</h3>
                        <div className="form-row mb-8">
                          <select className="fg-1" value={fdhubDiffA} onChange={e => setFdhubDiffA(e.target.value === '' ? '' : Number(e.target.value))}>
                            <option value="">— Commit A (vecchio) —</option>
                            {fdhubCommits.map(c => <option key={c.id} value={c.id}>#{c.id} {c.message}{c.tag ? ` [${c.tag}]` : ''}</option>)}
                          </select>
                          <select className="fg-1" value={fdhubDiffB} onChange={e => setFdhubDiffB(e.target.value === '' ? '' : Number(e.target.value))}>
                            <option value="">— Commit B (nuovo) —</option>
                            {fdhubCommits.map(c => <option key={c.id} value={c.id}>#{c.id} {c.message}{c.tag ? ` [${c.tag}]` : ''}</option>)}
                          </select>
                          <button className="btn-primary" disabled={fdhubDiffA === '' || fdhubDiffB === '' || fdhubDiffLoading} onClick={async () => {
                            if (!api || fdhubDiffA === '' || fdhubDiffB === '') return;
                            setFdhubDiffLoading(true);
                            try { const r = await api.fdhubDiffCommits(fdhubDiffA as number, fdhubDiffB as number); setFdhubDiffResult(r); } finally { setFdhubDiffLoading(false); }
                          }}>{fdhubDiffLoading ? <>{mi('hourglass_empty')} Analisi...</> : <>{mi('compare_arrows')} Confronta</>}</button>
                        </div>
                        {fdhubDiffResult && !fdhubDiffResult.error && (
                          <div className="fdhub-diff-summary">
                            <div className="fdhub-diff-row"><span className="badge bg-green">+{fdhubDiffResult.screensAdded?.length || 0} schermate</span> <span className="badge bg-red">-{fdhubDiffResult.screensRemoved?.length || 0} schermate</span> <span className="badge bg-blue">{fdhubDiffResult.screensModified?.length || 0} modificate</span></div>
                            <div className="fdhub-diff-row mt-8"><span className="badge bg-green">+{fdhubDiffResult.formulasAdded?.length || 0} formule</span> <span className="badge bg-red">-{fdhubDiffResult.formulasRemoved?.length || 0} formule</span> <span className="badge bg-blue">{fdhubDiffResult.formulasChanged?.length || 0} cambiate</span></div>
                            <div className="fdhub-diff-row mt-8"><span className="badge bg-green">+{fdhubDiffResult.dataSourcesAdded?.length || 0} datasource</span> <span className="badge bg-red">-{fdhubDiffResult.dataSourcesRemoved?.length || 0} datasource</span></div>
                          </div>
                        )}
                        {fdhubDiffResult?.error && <p className="text-err mt-8">{fdhubDiffResult.error}</p>}
                      </div>
                    )}

                    {/* Commit history */}
                    <div className="card">
                      <h3>{mi('history')} Cronologia Commit</h3>
                      {fdhubCommits.length === 0 && <p className="text-muted">Nessun commit ancora. Committa il tuo primo .msapp!</p>}
                      <div className="fdhub-commit-list">
                        {fdhubCommits.map((c, i) => (
                          <div key={c.id} className="fdhub-commit-item">
                            <div className="fdhub-commit-graph">
                              <div className={`fdhub-commit-dot${i === 0 ? ' latest' : ''}`} />
                              {i < fdhubCommits.length - 1 && <div className="fdhub-commit-line" />}
                            </div>
                            <div className="fdhub-commit-body">
                              <div className="fdhub-commit-head">
                                <strong>#{c.id}</strong> {c.message}
                                {c.tag && <span className="fdhub-tag">{c.tag}</span>}
                              </div>
                              <div className="fdhub-commit-meta">
                                <span>{mi('schedule')} {new Date(c.createdAt).toLocaleString('it-IT')}</span>
                                <span>{mi('description')} {c.fileName}</span>
                                <span>{mi('storage')} {(c.fileSize / 1024).toFixed(0)} KB</span>
                              </div>
                              <div className="fdhub-commit-stats">
                                <span title="Schermate">{mi('devices')} {c.screenCount}</span>
                                <span title="Controlli">{mi('widgets')} {c.controlCount}</span>
                                <span title="Formule">{mi('functions')} {c.formulaCount}</span>
                                <span title="DataSource">{mi('database')} {c.datasourceCount}</span>
                                <span title="Issues">{mi('warning')} {c.issueCount}</span>
                                <span title="Health" className={`fdhub-health ${c.healthScore >= 70 ? 'good' : c.healthScore >= 40 ? 'warn' : 'bad'}`}>{mi('monitor_heart')} {c.healthScore}/100</span>
                              </div>
                            </div>
                            <button className="btn-icon" title="Scarica .msapp" onClick={async () => {
                              if (!api) return;
                              const r = await api.fdhubExportCommit(c.id);
                              if (r.error) alert(r.error);
                            }}>{mi('download')}</button>
                            <button className="btn-icon btn-del" title="Elimina commit" onClick={async () => {
                              if (!api || !confirm('Eliminare questo commit?')) return;
                              await api.fdhubDeleteCommit(c.id);
                              const [commits, stats] = await Promise.all([api.fdhubListCommits(fdhubSelectedRepo!), api.fdhubRepoStats(fdhubSelectedRepo!)]);
                              setFdhubCommits(commits); setFdhubRepoStats(stats);
                            }}>{mi('delete')}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════ SHAREPOINT ═══════ */}
          {view === 'sharepoint' && (() => {
            const spLoadConfig = async () => {
              if (!api) return;
              const cfg = await api.spGetConfig();
              if (cfg) { setSpCfg(cfg); }
              const connected = await api.spIsConnected();
              setSpConnected(connected);
              if (connected) {
                const u = await api.spGetUser();
                if (u) setSpUser(u);
              }
            };
            const spDoConnect = async () => {
              if (!api) return;
              setSpLoading(true); setSpError('');
              try {
                if (!spCfg.clientId || !spCfg.tenantId) { setSpError('Inserisci Client ID e Tenant ID.'); setSpLoading(false); return; }
                await api.spSaveConfig(spCfg);
                const res = await api.spConnect();
                setSpConnected(true);
                setSpUser(res.user);
                if (spCfg.siteUrl) {
                  try {
                    const siteId = await api.spGetSiteId(spCfg.siteUrl);
                    setSpSiteId(siteId);
                  } catch (e: unknown) { setSpError('Sito non trovato: ' + ((e instanceof Error) ? e.message : String(e))); }
                }
                setSpTab('lists');
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spDoDisconnect = async () => {
              if (!api) return;
              await api.spDisconnect();
              setSpConnected(false); setSpUser(null); setSpSiteId(''); setSpLists([]); setSpDrives([]);
              setSpSelectedList(null); setSpSelectedDrive(null);
            };
            const spLoadLists = async () => {
              if (!api || !spSiteId) return;
              setSpLoading(true);
              try { setSpLists(await api.spGetLists(spSiteId)); } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spSelectList = async (list: SpList) => {
              if (!api || !spSiteId) return;
              setSpSelectedList(list); setSpLoading(true); setSpEditItemId(null);
              try {
                const [cols, data] = await Promise.all([
                  api.spGetListColumns(spSiteId, list.id),
                  api.spGetListItems(spSiteId, list.id),
                ]);
                setSpListColumns(cols);
                setSpListItems(data.items);
                const empty: Record<string, string> = {};
                cols.forEach(c => { empty[c.name] = ''; });
                setSpNewItemFields(empty);
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spAddItem = async (ev: FormEvent) => {
              ev.preventDefault();
              if (!api || !spSiteId || !spSelectedList) return;
              setSpLoading(true);
              try {
                const fields: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(spNewItemFields)) { if (v) fields[k] = v; }
                await api.spCreateListItem(spSiteId, spSelectedList.id, fields);
                const data = await api.spGetListItems(spSiteId, spSelectedList.id);
                setSpListItems(data.items);
                const empty: Record<string, string> = {};
                spListColumns.forEach(c => { empty[c.name] = ''; });
                setSpNewItemFields(empty);
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spSaveItem = async () => {
              if (!api || !spSiteId || !spSelectedList || !spEditItemId) return;
              setSpLoading(true);
              try {
                const fields: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(spEditFields)) { fields[k] = v; }
                await api.spUpdateListItem(spSiteId, spSelectedList.id, spEditItemId, fields);
                const data = await api.spGetListItems(spSiteId, spSelectedList.id);
                setSpListItems(data.items);
                setSpEditItemId(null);
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spRemoveItem = async (itemId: string) => {
              if (!api || !spSiteId || !spSelectedList) return;
              if (!confirm('Eliminare questo elemento?')) return;
              try {
                await api.spDeleteListItem(spSiteId, spSelectedList.id, itemId);
                setSpListItems(prev => prev.filter(i => i.id !== itemId));
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
            };
            const spLoadDrives = async () => {
              if (!api || !spSiteId) return;
              setSpLoading(true);
              try { setSpDrives(await api.spGetDrives(spSiteId)); } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spSelectDrive = async (drive: SpDrive) => {
              if (!api || !spSiteId) return;
              setSpSelectedDrive(drive); setSpFolderStack([]); setSpLoading(true);
              try { setSpDriveItems(await api.spGetDriveItems(spSiteId, drive.id)); } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spOpenFolder = async (item: SpDriveItem) => {
              if (!api || !spSiteId || !spSelectedDrive) return;
              setSpLoading(true);
              try {
                setSpFolderStack(prev => [...prev, { id: item.id, name: item.name }]);
                setSpDriveItems(await api.spGetDriveItems(spSiteId, spSelectedDrive.id, item.id));
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spGoBack = async () => {
              if (!api || !spSiteId || !spSelectedDrive) return;
              setSpLoading(true);
              try {
                const newStack = [...spFolderStack];
                newStack.pop();
                setSpFolderStack(newStack);
                const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : undefined;
                setSpDriveItems(await api.spGetDriveItems(spSiteId, spSelectedDrive.id, parentId));
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spDoUpload = async () => {
              if (!api || !spSiteId || !spSelectedDrive) return;
              setSpLoading(true);
              try {
                const folderId = spFolderStack.length > 0 ? spFolderStack[spFolderStack.length - 1].id : undefined;
                const res = await api.spUploadFile(spSiteId, spSelectedDrive.id, folderId);
                if (res && res.ok) {
                  setSpDriveItems(await api.spGetDriveItems(spSiteId, spSelectedDrive.id, folderId));
                }
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spDoCreateFolder = async () => {
              if (!api || !spSiteId || !spSelectedDrive || !spNewFolderName.trim()) return;
              setSpLoading(true);
              try {
                const folderId = spFolderStack.length > 0 ? spFolderStack[spFolderStack.length - 1].id : undefined;
                await api.spCreateFolder(spSiteId, spSelectedDrive.id, folderId, spNewFolderName.trim());
                setSpNewFolderName('');
                setSpDriveItems(await api.spGetDriveItems(spSiteId, spSelectedDrive.id, folderId));
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
              finally { setSpLoading(false); }
            };
            const spDoDeleteItem = async (itemId: string) => {
              if (!api || !spSiteId || !spSelectedDrive) return;
              if (!confirm('Eliminare questo file/cartella?')) return;
              try {
                await api.spDeleteItem(spSiteId, spSelectedDrive.id, itemId);
                setSpDriveItems(prev => prev.filter(i => i.id !== itemId));
              } catch (e: unknown) { setSpError((e instanceof Error) ? e.message : String(e)); }
            };
            const fmtBytes = (b: number) => {
              if (b < 1024) return b + ' B';
              if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
              if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
              return (b / 1073741824).toFixed(2) + ' GB';
            };

            return (
            <div className="view">
              <div className="view-header">
                <div>
                  <h2 className="view-title">{mi('share')} SharePoint</h2>
                  <p className="view-sub">Connettiti a SharePoint per gestire liste e documenti tramite Microsoft Graph API</p>
                </div>
                {spConnected && spUser && (
                  <div className="sp-user-badge">
                    {mi('person')} <strong>{spUser.name}</strong> <span className="muted">({spUser.email})</span>
                    <button className="btn-xs btn-ghost ml-12" onClick={spDoDisconnect}>{mi('logout')} Disconnetti</button>
                  </div>
                )}
              </div>

              {spError && <div className="alert alert-error mb-16">{mi('error')} {spError} <button className="btn-xs btn-ghost" onClick={() => setSpError('')}>{mi('close')}</button></div>}

              {/* Tabs */}
              <div className="sp-tabs mb-16">
                <button className={`sp-tab${spTab === 'config' ? ' active' : ''}`} onClick={() => setSpTab('config')}>{mi('settings')} Configurazione</button>
                <button className={`sp-tab${spTab === 'lists' ? ' active' : ''}`} disabled={!spConnected} onClick={() => { setSpTab('lists'); if (spSiteId && spLists.length === 0) spLoadLists(); }}>{mi('list')} Liste</button>
                <button className={`sp-tab${spTab === 'documents' ? ' active' : ''}`} disabled={!spConnected} onClick={() => { setSpTab('documents'); if (spSiteId && spDrives.length === 0) spLoadDrives(); }}>{mi('folder')} Documenti</button>
              </div>

              {/* Config Tab */}
              {spTab === 'config' && (
                <div className="card sp-config-card">
                  <h3 className="mb-12">{mi('key')} Configurazione Azure AD</h3>
                  <p className="muted mb-16">Inserisci i dati dell'App Registration creata su Azure Portal (Microsoft Entra ID).</p>
                  <div className="form-group">
                    <label>Client ID (Application ID)</label>
                    <input value={spCfg.clientId} onChange={e => setSpCfg({ ...spCfg, clientId: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  </div>
                  <div className="form-group">
                    <label>Tenant ID (Directory ID)</label>
                    <input value={spCfg.tenantId} onChange={e => setSpCfg({ ...spCfg, tenantId: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  </div>
                  <div className="form-group">
                    <label>SharePoint Site URL</label>
                    <input value={spCfg.siteUrl} onChange={e => setSpCfg({ ...spCfg, siteUrl: e.target.value })} placeholder="https://contoso.sharepoint.com/sites/MySite" />
                  </div>
                  <div className="form-row mt-16">
                    {!spConnected ? (
                      <button className="btn-primary" onClick={spDoConnect} disabled={spLoading}>
                        {spLoading ? mi('hourglass_empty') : mi('login')} {spLoading ? 'Connessione...' : 'Connetti a SharePoint'}
                      </button>
                    ) : (
                      <button className="btn-secondary" onClick={spDoDisconnect}>{mi('logout')} Disconnetti</button>
                    )}
                    <button className="btn-ghost" onClick={spLoadConfig}>{mi('refresh')} Ricarica config</button>
                  </div>

                  <div className="sp-help mt-20">
                    <h4>{mi('help')} Come configurare Azure</h4>
                    <ol className="sp-help-steps">
                      <li>Vai su <strong>portal.azure.com</strong> → Microsoft Entra ID → App registrations → <strong>New registration</strong></li>
                      <li>Nome: <code>FlowDesk</code>, Redirect URI: <strong>http://localhost:59823/redirect</strong> (tipo: Web)</li>
                      <li>Copia <strong>Application (client) ID</strong> e <strong>Directory (tenant) ID</strong> dalla pagina Overview</li>
                      <li>Vai su <strong>API permissions</strong> → Add a permission → Microsoft Graph → Delegated:</li>
                      <li className="sp-perm-list">
                        <code>Sites.ReadWrite.All</code>, <code>Files.ReadWrite.All</code>, <code>User.Read</code>
                      </li>
                      <li>Clicca <strong>Grant admin consent</strong> (richiede un admin del tenant)</li>
                      <li>In <strong>Authentication</strong> → abilita <strong>"Allow public client flows"</strong> → Yes</li>
                      <li>Incolla qui sopra i valori e l'URL del sito SharePoint, poi clicca <strong>Connetti</strong></li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Lists Tab */}
              {spTab === 'lists' && spConnected && (
                <div className="sp-lists-container">
                  {!spSelectedList ? (
                    <>
                      <div className="form-row mb-12">
                        <button className="btn-secondary" onClick={spLoadLists} disabled={spLoading}>{mi('refresh')} Aggiorna liste</button>
                      </div>
                      {spLoading && <p className="muted">{mi('hourglass_empty')} Caricamento...</p>}
                      <div className="sp-list-grid">
                        {spLists.map(l => (
                          <div key={l.id} className="sp-list-card" onClick={() => spSelectList(l)}>
                            <div className="sp-list-card-icon">{mi('list')}</div>
                            <div className="sp-list-card-body">
                              <strong>{l.name}</strong>
                              {l.description && <p className="muted small">{l.description}</p>}
                              <span className="muted small">{l.template} · {new Date(l.lastModified).toLocaleDateString('it-IT')}</span>
                            </div>
                            <span className="material-symbols-outlined sp-list-arrow">chevron_right</span>
                          </div>
                        ))}
                        {spLists.length === 0 && !spLoading && <p className="muted">Nessuna lista trovata. Verifica il Site URL e i permessi.</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-row mb-12 ai-c">
                        <button className="btn-ghost" onClick={() => { setSpSelectedList(null); setSpListItems([]); setSpListColumns([]); setSpEditItemId(null); }}>{mi('arrow_back')} Torna alle liste</button>
                        <h3 className="fg-1 ml-12">{mi('list')} {spSelectedList.name}</h3>
                        <button className="btn-xs btn-secondary" onClick={() => spSelectList(spSelectedList)}>{mi('refresh')}</button>
                      </div>

                      {/* Add item form */}
                      {spListColumns.length > 0 && (
                        <form className="card sp-add-form mb-16" onSubmit={spAddItem}>
                          <h4 className="mb-8">{mi('add')} Nuovo elemento</h4>
                          <div className="sp-field-grid">
                            {spListColumns.filter(c => c.name !== 'Title' || true).slice(0, 8).map(col => (
                              <div key={col.name} className="form-group">
                                <label>{col.displayName}{col.required && <span className="sp-req"> *</span>}</label>
                                {col.type === 'choice' ? (
                                  <select value={spNewItemFields[col.name] || ''} onChange={e => setSpNewItemFields({ ...spNewItemFields, [col.name]: e.target.value })}>
                                    <option value="">—</option>
                                    {col.choices.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                                  </select>
                                ) : (
                                  <input value={spNewItemFields[col.name] || ''} type={col.type === 'number' ? 'number' : col.type === 'dateTime' ? 'date' : 'text'}
                                    onChange={e => setSpNewItemFields({ ...spNewItemFields, [col.name]: e.target.value })} />
                                )}
                              </div>
                            ))}
                          </div>
                          <button className="btn-primary mt-8" type="submit" disabled={spLoading}>{mi('add')} Aggiungi</button>
                        </form>
                      )}

                      {/* Items table */}
                      {spLoading && <p className="muted">{mi('hourglass_empty')} Caricamento...</p>}
                      <div className="sp-items-table-wrap">
                        <table className="sp-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              {spListColumns.slice(0, 6).map(c => <th key={c.name}>{c.displayName}</th>)}
                              <th>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {spListItems.map(item => (
                              <tr key={item.id}>
                                <td className="mono">{item.id}</td>
                                {spListColumns.slice(0, 6).map(c => (
                                  <td key={c.name}>
                                    {spEditItemId === item.id ? (
                                      <input className="sp-inline-edit" value={spEditFields[c.name] || ''}
                                        onChange={e => setSpEditFields({ ...spEditFields, [c.name]: e.target.value })} />
                                    ) : (
                                      String(item.fields[c.name] ?? '—')
                                    )}
                                  </td>
                                ))}
                                <td className="sp-td-actions">
                                  {spEditItemId === item.id ? (
                                    <>
                                      <button className="btn-xs btn-primary" onClick={spSaveItem}>{mi('save')}</button>
                                      <button className="btn-xs btn-ghost" onClick={() => setSpEditItemId(null)}>{mi('close')}</button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="btn-xs btn-ghost" onClick={() => {
                                        setSpEditItemId(item.id);
                                        const f: Record<string, string> = {};
                                        spListColumns.forEach(c => { f[c.name] = String(item.fields[c.name] ?? ''); });
                                        setSpEditFields(f);
                                      }}>{mi('edit')}</button>
                                      <button className="btn-xs btn-del" onClick={() => spRemoveItem(item.id)}>{mi('delete')}</button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {spListItems.length === 0 && !spLoading && <tr><td className="muted ta-c" colSpan={spListColumns.length + 2}>Nessun elemento</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {spTab === 'documents' && spConnected && (
                <div className="sp-docs-container">
                  {!spSelectedDrive ? (
                    <>
                      <div className="form-row mb-12">
                        <button className="btn-secondary" onClick={spLoadDrives} disabled={spLoading}>{mi('refresh')} Aggiorna librerie</button>
                      </div>
                      {spLoading && <p className="muted">{mi('hourglass_empty')} Caricamento...</p>}
                      <div className="sp-list-grid">
                        {spDrives.map(d => (
                          <div key={d.id} className="sp-list-card" onClick={() => spSelectDrive(d)}>
                            <div className="sp-list-card-icon">{mi('folder')}</div>
                            <div className="sp-list-card-body">
                              <strong>{d.name}</strong>
                              {d.description && <p className="muted small">{d.description}</p>}
                              <span className="muted small">{fmtBytes(d.usedSize)} / {fmtBytes(d.totalSize)}</span>
                            </div>
                            <span className="material-symbols-outlined sp-list-arrow">chevron_right</span>
                          </div>
                        ))}
                        {spDrives.length === 0 && !spLoading && <p className="muted">Nessuna document library trovata.</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-row mb-12 ai-c">
                        <button className="btn-ghost" onClick={() => { setSpSelectedDrive(null); setSpDriveItems([]); setSpFolderStack([]); }}>{mi('arrow_back')} Librerie</button>
                        {spFolderStack.length > 0 && (
                          <button className="btn-ghost" onClick={spGoBack}>{mi('arrow_upward')} Su</button>
                        )}
                        <div className="sp-breadcrumb fg-1 ml-12">
                          <strong>{spSelectedDrive.name}</strong>
                          {spFolderStack.map((f, i) => <span key={i}> / {f.name}</span>)}
                        </div>
                        <button className="btn-xs btn-primary" onClick={spDoUpload}>{mi('upload_file')} Carica file</button>
                      </div>

                      {/* New folder */}
                      <div className="form-row mb-12">
                        <input className="sp-folder-input" value={spNewFolderName} onChange={e => setSpNewFolderName(e.target.value)} placeholder="Nuova cartella..." />
                        <button className="btn-xs btn-secondary" onClick={spDoCreateFolder} disabled={!spNewFolderName.trim()}>{mi('create_new_folder')} Crea</button>
                      </div>

                      {spLoading && <p className="muted">{mi('hourglass_empty')} Caricamento...</p>}

                      <div className="sp-file-list">
                        {spDriveItems.map(item => (
                          <div key={item.id} className={`sp-file-row${item.isFolder ? ' sp-folder-row' : ''}`}>
                            <span className="material-symbols-outlined sp-file-icon">{item.isFolder ? 'folder' : 'description'}</span>
                            <div className="sp-file-info fg-1" onClick={() => item.isFolder ? spOpenFolder(item) : undefined} style={item.isFolder ? { cursor: 'pointer' } : undefined}>
                              <strong>{item.name}</strong>
                              <span className="muted small">{item.isFolder ? `${item.childCount} elementi` : fmtBytes(item.size)} · {item.createdBy} · {new Date(item.lastModified).toLocaleDateString('it-IT')}</span>
                            </div>
                            <div className="sp-file-actions">
                              {!item.isFolder && (
                                <button className="btn-xs btn-ghost" onClick={() => api?.spDownloadFile(spSiteId, spSelectedDrive!.id, item.id, item.name)}>{mi('download')} Scarica</button>
                              )}
                              <button className="btn-xs btn-del" onClick={() => spDoDeleteItem(item.id)}>{mi('delete')}</button>
                            </div>
                          </div>
                        ))}
                        {spDriveItems.length === 0 && !spLoading && (
                          <div className="sp-empty">
                            <div style={{ fontSize: 48, opacity: 0.3 }}>{mi('folder_open')}</div>
                            <p className="muted mt-8">Cartella vuota</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            );
          })()}

          {/* ═══════ AI HUB ═══════ */}
          {view === 'aihub' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">{mi('smart_toy')} AI Hub</h2><p className="view-sub">Versione completa: tab condivise in una sola finestra interna, senza caos di popup</p></div>
              </div>

              <div className="card mb-20">
                <div className="form-row ai-c">
                  <div className="form-group fg-2">
                    <label>Provider selezionato</label>
                    <select value={activeAiProvider.id} onChange={e => setAiProviderId(e.target.value)}>
                      {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name} · {p.vendor}</option>)}
                    </select>
                  </div>
                  <button className="btn-primary" onClick={() => openHubTab(activeAiProvider.url, activeAiProvider.name)}>{mi('add')} Apri come tab</button>
                  <button className="btn-secondary" onClick={() => api?.openExternal(activeAiProvider.url)}>{mi('language')} Apri esterno</button>
                </div>
                <p className="view-sub" style={{ marginTop: 10 }}>
                  I provider AI che bloccano iframe non danno più pagina bianca: vengono aperti in una singola finestra interna con tab gestite da FlowDesk.
                </p>
              </div>

              <div className="card mb-20">
                <div className="hub-tabs-head">
                  <strong>{mi('tabs')} Tab aperte ({hubTabs.length})</strong>
                  <button className="btn-secondary" onClick={() => api?.hubFocusWindow()}>{mi('open_in_new')} Porta in primo piano</button>
                </div>
                <div className="hub-tabs-list">
                  {hubTabs.length === 0 && <p className="empty">Nessuna tab aperta</p>}
                  {hubTabs.map(t => (
                    <div key={t.id} className={`hub-tab-chip${hubActiveTabId === t.id ? ' active' : ''}`}>
                      <button className="hub-tab-main" onClick={() => activateHubTab(t.id)} title={t.url}>
                        <span className="hub-tab-title">{t.title}</span>
                      </button>
                      <button className="hub-tab-close" onClick={() => closeHubTab(t.id)} title="Chiudi tab">{mi('close')}</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="aihub-grid mb-20">
                {AI_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    className={`aihub-provider${p.id === activeAiProvider.id ? ' active' : ''}`}
                    onClick={() => setAiProviderId(p.id)}
                  >
                    <div className="aihub-provider-top">
                      <strong>{p.name}</strong>
                      <span className="badge">{p.vendor}</span>
                    </div>
                    <p>{p.description}</p>
                  </button>
                ))}
              </div>

              <div className="card aihub-frame-card">
                <div className="aihub-frame-head">
                  <div>
                    <strong>{activeAiProvider.name}</strong>
                    <p>{activeAiProvider.url}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={() => openHubTab(activeAiProvider.url, activeAiProvider.name)}>{mi('add')} Apri come tab</button>
                    <button className="btn-secondary" onClick={() => api?.openExternal(activeAiProvider.url)}>{mi('language')} Apri esterno</button>
                  </div>
                </div>
                <div className="aihub-frame-wrap aihub-empty">
                  <div className="empty-box">
                    <span className="empty-icon">{mi('smart_toy')}</span>
                    <p>Apri provider AI come tab e gestiscili qui senza aprire 10 finestre.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ MICROSOFT 365 HUB ═══════ */}
          {view === 'm365hub' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">{mi('apartment')} Microsoft 365 Hub</h2><p className="view-sub">Outlook, Teams, OneDrive, SharePoint e Power Platform nello stesso browser interno a tab</p></div>
              </div>

              <div className="card mb-20">
                <div className="form-row ai-c">
                  <div className="form-group fg-2">
                    <label>App Microsoft 365</label>
                    <select value={activeM365App.id} onChange={e => setM365AppId(e.target.value)}>
                      {M365_APPS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <button className="btn-primary" onClick={() => openHubTab(activeM365App.url, activeM365App.name)}>{mi('add')} Apri come tab</button>
                  <button className="btn-secondary" onClick={() => api?.openExternal(activeM365App.url)}>{mi('language')} Apri esterno</button>
                </div>
              </div>

              <div className="card mb-20">
                <div className="hub-tabs-head">
                  <strong>{mi('tabs')} Tab aperte ({hubTabs.length})</strong>
                  <button className="btn-secondary" onClick={() => api?.hubFocusWindow()}>{mi('open_in_new')} Porta in primo piano</button>
                </div>
                <div className="hub-tabs-list">
                  {hubTabs.length === 0 && <p className="empty">Nessuna tab aperta</p>}
                  {hubTabs.map(t => (
                    <div key={t.id} className={`hub-tab-chip${hubActiveTabId === t.id ? ' active' : ''}`}>
                      <button className="hub-tab-main" onClick={() => activateHubTab(t.id)} title={t.url}>
                        <span className="hub-tab-title">{t.title}</span>
                      </button>
                      <button className="hub-tab-close" onClick={() => closeHubTab(t.id)} title="Chiudi tab">{mi('close')}</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="aihub-grid mb-20">
                {M365_APPS.map(p => (
                  <button
                    key={p.id}
                    className={`aihub-provider${p.id === activeM365App.id ? ' active' : ''}`}
                    onClick={() => setM365AppId(p.id)}
                  >
                    <div className="aihub-provider-top">
                      <strong>{p.name}</strong>
                      <span className="badge">{p.vendor}</span>
                    </div>
                    <p>{p.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ UPDATES ═══════ */}
          {view === 'updates' && (() => {
            const doCheck = async () => {
              if (!api) return;
              setUpdateChecking(true);
              try {
                const info = await api.checkForUpdates();
                setUpdateInfo(info);
              } catch (err: unknown) {
                setUpdateInfo({ upToDate: true, currentVersion: 'N/A', latestVersion: 'N/A', error: String(err) });
              } finally {
                setUpdateChecking(false);
              }
            };

            return (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Aggiornamenti</h2><p className="view-sub">Verifica se è disponibile una nuova versione di FlowDesk</p></div>
              </div>

              {/* Current version card */}
              <div className="card mb-20">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)' }}>system_update</span>
                  <div>
                    <h3 style={{ margin: 0 }}>FlowDesk</h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                      Versione installata: <strong style={{ color: 'var(--text)' }}>v{appVersion || '...'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Check button */}
              <div className="card mb-20">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={doCheck} disabled={updateChecking}>
                    {mi(updateChecking ? 'hourglass_empty' : 'refresh')} {updateChecking ? 'Verifica in corso...' : 'Verifica aggiornamenti'}
                  </button>
                  <button className="btn-secondary" onClick={() => api?.openExternal(`https://github.com/marco-giuseppe-starace/flowdesk/releases`)}>
                    {mi('open_in_new')} Apri pagina Release su GitHub
                  </button>
                </div>
              </div>

              {/* Result */}
              {updateInfo && (
                <div className="card mb-20">
                  {updateInfo.error ? (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#e67e22', flexShrink: 0 }}>warning</span>
                      <div>
                        <strong>Impossibile verificare gli aggiornamenti</strong>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>{updateInfo.error}</p>
                        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Controlla la connessione internet e riprova, oppure visita direttamente la pagina delle release su GitHub.</p>
                      </div>
                    </div>
                  ) : updateInfo.upToDate ? (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#27ae60', flexShrink: 0 }}>check_circle</span>
                      <div>
                        <strong style={{ color: '#27ae60' }}>Sei aggiornato!</strong>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
                          FlowDesk <strong>v{updateInfo.currentVersion}</strong> è l'ultima versione disponibile.
                          {updateInfo.message && <><br />{updateInfo.message}</>}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--primary)', flexShrink: 0 }}>upgrade</span>
                        <div>
                          <strong style={{ color: 'var(--primary)' }}>Nuova versione disponibile!</strong>
                          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
                            La versione <strong style={{ color: 'var(--text)' }}>v{updateInfo.latestVersion}</strong> è disponibile. Tu hai la <strong>v{updateInfo.currentVersion}</strong>.
                          </p>
                          {updateInfo.releaseName && <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{updateInfo.releaseName}</p>}
                          {updateInfo.publishedAt && <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pubblicata il {new Date(updateInfo.publishedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                        </div>
                      </div>
                      {updateInfo.body && (
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.9rem', lineHeight: 1.6, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                          {updateInfo.body}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {updateInfo.downloadUrl && (
                          <button className="btn-success" onClick={() => api?.openExternal(updateInfo.downloadUrl!)}>
                            {mi('download')} Scarica FlowDesk v{updateInfo.latestVersion}
                          </button>
                        )}
                        {updateInfo.releaseUrl && (
                          <button className="btn-secondary" onClick={() => api?.openExternal(updateInfo.releaseUrl!)}>
                            {mi('open_in_new')} Vedi release su GitHub
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="card" style={{ border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>info</span>
                  <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text)' }}>Come aggiornare FlowDesk</strong><br />
                    1. Clicca <em>"Scarica"</em> o visita la pagina delle release<br />
                    2. Scarica il file <code>.exe</code> dell'ultima versione<br />
                    3. Chiudi FlowDesk<br />
                    4. Esegui l'installer — sovrascriverà la versione precedente mantenendo i tuoi dati<br />
                    5. Riavvia FlowDesk ✓
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ═══════ TRASH / CESTINO ═══════ */}
          {view === 'trash' && (
            <div className="view">
              <div className="view-header">
                <div><h2 className="view-title">Cestino</h2><p className="view-sub">Elementi eliminati — ripristina o elimina definitivamente</p></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" onClick={loadTrash}>{mi('refresh')} Aggiorna</button>
                  {trashItems.length > 0 && <button className="btn-danger" onClick={emptyTrashAll}>{mi('delete_forever')} Svuota cestino</button>}
                </div>
              </div>

              {trashItems.length === 0 && <div className="card"><p className="empty">{mi('check_circle')} Il cestino è vuoto</p></div>}

              {trashItems.length > 0 && (
                <div className="card">
                  <table className="fd-table">
                    <thead>
                      <tr><th>Tipo</th><th>Titolo</th><th>Eliminato il</th><th>Azioni</th></tr>
                    </thead>
                    <tbody>
                      {trashItems.map(item => (
                        <tr key={`${item.entityType}-${item.id}`}>
                          <td><span className="badge">{item.entityType}</span></td>
                          <td>{item.title}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(item.deletedAt).toLocaleString('it-IT')}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-sm btn-secondary" onClick={() => restoreTrashItem(item.entityType, item.id)}>{mi('restore')} Ripristina</button>
                              <button className="btn-sm btn-danger" onClick={() => permanentDeleteTrashItem(item.entityType, item.id)}>{mi('delete_forever')} Elimina</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ═══ Edit Task Modal ═══ */}
      {editTask && (() => { const et = editTask; return (
        <div className="edit-overlay" onClick={() => setEditTask(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-head"><h3>Modifica attività</h3><button className="btn-icon btn-del" onClick={() => setEditTask(null)}>{mi('close')}</button></div>
            <div className="form-group"><label>Titolo</label><input value={et.title} onChange={e => setEditTask({ ...et, title: e.target.value })} /></div>
            <div className="form-group"><label>Descrizione</label><textarea value={et.description} onChange={e => setEditTask({ ...et, description: e.target.value })} /></div>
            <div className="form-row mb-12">
              <div className="form-group fg-1"><label>Minuti</label><input type="number" min={5} value={et.plannedMinutes} onChange={e => setEditTask({ ...et, plannedMinutes: Number(e.target.value) })} /></div>
              <div className="form-group fg-1"><label>Priorità</label><select value={et.priority} onChange={e => setEditTask({ ...et, priority: e.target.value as Priority })}>{PRIORITIES.map(p => <option key={p} value={p}>{PRI_LABEL[p]}</option>)}</select></div>
              <div className="form-group fg-1"><label>Progetto</label><select value={et.projectId ?? ''} onChange={e => setEditTask({ ...et, projectId: e.target.value === '' ? null : Number(e.target.value) })}><option value="">— Nessuno —</option>{projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
            <AttachmentSection entityType="task" entityId={et.id} />
            <div className="form-row">
              <button className="btn-primary fg-1" onClick={onSaveEditTask}>{mi('save')} Salva</button>
              <button className="btn-secondary fg-1" onClick={() => setEditTask(null)}>Annulla</button>
            </div>
          </div>
        </div>
      ); })()}

      {/* ═══ Edit Note Modal ═══ */}
      {editNote && (() => { const en = editNote; return (
        <div className="edit-overlay" onClick={() => setEditNote(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-head"><h3>Modifica appunto</h3><button className="btn-icon btn-del" onClick={() => setEditNote(null)}>{mi('close')}</button></div>
            <div className="form-row mb-12">
              <div className="form-group fg-1"><label>Categoria</label><select value={en.category} onChange={e => setEditNote({ ...en, category: e.target.value as NoteCategory })}>{NOTE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-group fg-2"><label>Titolo</label><input value={en.title} onChange={e => setEditNote({ ...en, title: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Contenuto</label><textarea value={en.content} onChange={e => setEditNote({ ...en, content: e.target.value })} rows={5} /></div>
            <AttachmentSection entityType="note" entityId={en.id} />
            <div className="form-row mt-16">
              <button className="btn-primary fg-1" onClick={onSaveEditNote}>{mi('save')} Salva</button>
              <button className="btn-secondary fg-1" onClick={() => setEditNote(null)}>Annulla</button>
            </div>
          </div>
        </div>
      ); })()}

      {/* ═══ Edit Snippet Modal ═══ */}
      {editSnippet && (() => { const es = editSnippet; return (
        <div className="edit-overlay" onClick={() => setEditSnippet(null)}>
          <div className="edit-modal edit-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-head"><h3>Modifica snippet</h3><button className="btn-icon btn-del" onClick={() => setEditSnippet(null)}>{mi('close')}</button></div>
            <div className="form-row mb-12">
              <div className="form-group fg-2"><label>Titolo</label><input value={es.title} onChange={e => setEditSnippet({ ...es, title: e.target.value })} /></div>
              <div className="form-group fg-1"><label>Linguaggio</label><select value={es.language} onChange={e => setEditSnippet({ ...es, language: e.target.value as SnippetLang })}>{SNIPPET_LANGS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
            </div>
            <div className="form-group mb-12"><label>Codice</label><textarea className="snippet-code-input" value={es.code} onChange={e => setEditSnippet({ ...es, code: e.target.value })} rows={8} /></div>
            <div className="form-group mb-12"><label>Descrizione</label><input value={es.description} onChange={e => setEditSnippet({ ...es, description: e.target.value })} /></div>
            <div className="form-row">
              <button className="btn-primary fg-1" onClick={onSaveEditSnippet}>{mi('save')} Salva</button>
              <button className="btn-secondary fg-1" onClick={() => setEditSnippet(null)}>Annulla</button>
            </div>
          </div>
        </div>
      ); })()}

      {/* ═══ Reset Confirm Modal ═══ */}
      {resetConfirmOpen && (
        <div className="edit-overlay" onClick={() => setResetConfirmOpen(false)}>
          <div className="edit-modal reset-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-head"><h3>{mi('warning')} Conferma Reset</h3><button className="btn-icon btn-del" onClick={() => setResetConfirmOpen(false)}>{mi('close')}</button></div>
            {!resetDone ? (<>
              <div className="reset-warning">
                <span className="material-symbols-outlined reset-warning-icon">error</span>
                <p>Stai per cancellare <strong>TUTTI</strong> i dati dell'applicazione. Questa operazione è <strong>irreversibile</strong>.</p>
              </div>
              <div className="form-group">
                <label>Scrivi <strong>ELIMINA</strong> per confermare:</label>
                <input value={resetConfirmText} onChange={e => setResetConfirmText(e.target.value)} placeholder="Scrivi ELIMINA" autoFocus />
              </div>
              <div className="form-row">
                <button className="btn-danger-lg fg-1" disabled={resetConfirmText !== 'ELIMINA'} onClick={async () => { if (!api) return; await api.resetAllData(); setResetDone(true); await refreshAll(); }}>{mi('delete_forever')} Cancella tutto</button>
                <button className="btn-secondary fg-1" onClick={() => setResetConfirmOpen(false)}>Annulla</button>
              </div>
            </>) : (
              <div className="reset-done">
                <span className="material-symbols-outlined reset-done-icon">check_circle</span>
                <p>Tutti i dati sono stati cancellati con successo.</p>
                <button className="btn-primary" onClick={() => { setResetConfirmOpen(false); setView('dashboard'); }}>Torna alla Dashboard</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Edit Retrospective ═══ */}
      {editRetro && (
        <div className="edit-overlay" onClick={() => setEditRetro(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-head"><h3>{mi('edit')} Modifica retrospettiva</h3><button className="btn-icon btn-del" onClick={() => setEditRetro(null)}>{mi('close')}</button></div>
            <div className="form-group"><label>{mi('thumb_up')} Cosa è andato bene</label><textarea value={editRetro.wentWell} onChange={e => setEditRetro({ ...editRetro, wentWell: e.target.value })} rows={3} /></div>
            <div className="form-group"><label>{mi('construction')} Cosa migliorare</label><textarea value={editRetro.toImprove} onChange={e => setEditRetro({ ...editRetro, toImprove: e.target.value })} rows={3} /></div>
            <div className="form-group"><label>{mi('rocket_launch')} Azioni</label><textarea value={editRetro.actions} onChange={e => setEditRetro({ ...editRetro, actions: e.target.value })} rows={3} /></div>
            <div className="form-row mt-16"><button className="btn-primary fg-1" onClick={onSaveEditRetro}>{mi('save')} Salva</button><button className="btn-secondary fg-1" onClick={() => setEditRetro(null)}>Annulla</button></div>
          </div>
        </div>
      )}

      {/* ═══ Edit Bug ═══ */}
      {editBug && (
        <div className="edit-overlay" onClick={() => setEditBug(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-head"><h3>{mi('edit')} Modifica bug</h3><button className="btn-icon btn-del" onClick={() => setEditBug(null)}>{mi('close')}</button></div>
            <div className="form-group"><label>Titolo</label><input value={editBug.title} onChange={e => setEditBug({ ...editBug, title: e.target.value })} /></div>
            <div className="form-row mb-12">
              <div className="form-group fg-1"><label>Severità</label><select value={editBug.severity} onChange={e => setEditBug({ ...editBug, severity: e.target.value as BugSeverity })}>{BUG_SEVERITIES.map(s => <option key={s} value={s}>{SEV_LABEL[s]}</option>)}</select></div>
              <div className="form-group fg-1"><label>Stato</label><select value={editBug.status} onChange={e => setEditBug({ ...editBug, status: e.target.value as BugStatus })}>{BUG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="form-group"><label>Descrizione</label><textarea value={editBug.description || ''} onChange={e => setEditBug({ ...editBug, description: e.target.value })} /></div>
            <div className="form-group"><label>Passi per riprodurre</label><textarea value={editBug.stepsToReproduce || ''} onChange={e => setEditBug({ ...editBug, stepsToReproduce: e.target.value })} /></div>
            <div className="form-group"><label>Soluzione</label><textarea value={editBug.solution || ''} onChange={e => setEditBug({ ...editBug, solution: e.target.value })} placeholder="Descrivi la soluzione trovata..." /></div>
            <AttachmentSection entityType="bug" entityId={editBug.id} />
            <div className="form-row mt-16"><button className="btn-primary fg-1" onClick={onSaveEditBug}>{mi('save')} Salva</button><button className="btn-secondary fg-1" onClick={() => setEditBug(null)}>Annulla</button></div>
          </div>
        </div>
      )}

      {/* ═══ Edit Learning ═══ */}
      {editLearn && (
        <div className="edit-overlay" onClick={() => setEditLearn(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-head"><h3>{mi('edit')} Modifica risorsa</h3><button className="btn-icon btn-del" onClick={() => setEditLearn(null)}>{mi('close')}</button></div>
            <div className="form-group"><label>Titolo</label><input value={editLearn.title} onChange={e => setEditLearn({ ...editLearn, title: e.target.value })} /></div>
            <div className="form-row mb-12">
              <div className="form-group fg-1"><label>Categoria</label><select value={editLearn.category} onChange={e => setEditLearn({ ...editLearn, category: e.target.value as LearningCategory })}>{LEARNING_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-group fg-1"><label>Progresso</label><input type="number" min={0} max={100} value={editLearn.progress} onChange={e => setEditLearn({ ...editLearn, progress: Number(e.target.value), completed: Number(e.target.value) >= 100 ? 1 : 0 })} /></div>
            </div>
            <div className="form-group"><label>URL</label><input value={editLearn.url || ''} onChange={e => setEditLearn({ ...editLearn, url: e.target.value })} /></div>
            <div className="form-group"><label>Note</label><textarea value={editLearn.notes || ''} onChange={e => setEditLearn({ ...editLearn, notes: e.target.value })} /></div>
            <AttachmentSection entityType="learning" entityId={editLearn.id} />
            <div className="form-row mt-16"><button className="btn-primary fg-1" onClick={onSaveEditLearn}>{mi('save')} Salva</button><button className="btn-secondary fg-1" onClick={() => setEditLearn(null)}>Annulla</button></div>
          </div>
        </div>
      )}

      {/* ═══ Edit FDHub Repo Modal ═══ */}
      {editingFdhubRepo && (
        <div className="edit-overlay" onClick={() => setEditingFdhubRepo(null)}>
          <div className="edit-modal fdhub-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-head"><h3>{mi('edit')} Modifica Repository</h3><button className="btn-icon btn-del" onClick={() => setEditingFdhubRepo(null)}>{mi('close')}</button></div>
            <div className="form-group"><label>Nome</label><input value={editingFdhubRepo.name} onChange={e => setEditingFdhubRepo({ ...editingFdhubRepo, name: e.target.value })} /></div>
            <div className="form-group"><label>Descrizione</label><input value={editingFdhubRepo.description || ''} onChange={e => setEditingFdhubRepo({ ...editingFdhubRepo, description: e.target.value })} /></div>
            <div className="form-group"><label>Progetto</label>
              <select value={editingFdhubRepo.projectId ?? ''} onChange={e => setEditingFdhubRepo({ ...editingFdhubRepo, projectId: e.target.value === '' ? null : Number(e.target.value) })}>
                <option value="">— Nessuno —</option>
                {projects.filter(p => !p.isArchived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-row mt-16">
              <button className="btn-primary fg-1" onClick={async () => {
                if (!api || !editingFdhubRepo.name.trim()) return;
                await api.fdhubUpdateRepo(editingFdhubRepo.id, { name: editingFdhubRepo.name.trim(), description: editingFdhubRepo.description, projectId: editingFdhubRepo.projectId });
                setEditingFdhubRepo(null);
                setFdhubRepos(await api.fdhubListRepos());
              }}>{mi('save')} Salva</button>
              <button className="btn-secondary fg-1" onClick={() => setEditingFdhubRepo(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Command Palette (Ctrl+K) ═══ */}
      {cmdOpen && (
        <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
          <div className="cmd-palette" onClick={e => e.stopPropagation()}>
            <div className="cmd-input-row">
              {mi('search')}
              <input ref={cmdRef} className="cmd-input" value={cmdQuery} onChange={e => setCmdQuery(e.target.value)} placeholder="Cerca comando o naviga... (Esc per chiudere)" />
              <kbd className="cmd-kbd">Ctrl+K</kbd>
            </div>
            <div className="cmd-list">
              {cmdItems.map((item, i) => (
                <button key={i} className="cmd-item" onClick={item.action}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  {item.label}
                </button>
              ))}
              {cmdItems.length === 0 && <p className="cmd-empty">Nessun risultato</p>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Toast Notifications ═══ */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismissToast(t.id)}>
              <span className="material-symbols-outlined toast-icon">
                {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
              </span>
              <span className="toast-msg">{t.message}</span>
              <button className="toast-close" onClick={(e) => { e.stopPropagation(); dismissToast(t.id); }}>{mi('close')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;


