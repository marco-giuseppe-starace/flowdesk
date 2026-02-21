/**
 * msapp-parser.cjs — Deep parser for Power Apps .msapp files
 *
 * A .msapp file is a ZIP containing:
 *   Properties.json   — app metadata, connections, themes
 *   Header.json       — name, version, app URI
 *   DataSources.json  — all DataSources (Dataverse, SP, SQL, etc.)
 *   References/       — component references, PCF controls
 *   Controls/         — one JSON per screen with full control tree + formulas
 *   Connections/      — connection config per connector
 *   Entropy/          — ordering, volatile metadata
 *   ComponentSrc/     — component sources (if any)
 *
 * This parser extracts:
 *   1. App metadata (name, version, creation date, etc.)
 *   2. All screens with their control hierarchy
 *   3. Every formula across the app
 *   4. All data operations (Patch, SubmitForm, Remove, Collect, etc.)
 *   5. All flow invocations (.Run())
 *   6. All data sources and where they are referenced
 *   7. Connections between screens (Navigate calls)
 *   8. Variables (Set, UpdateContext, global collections)
 */

const JSZip = require('jszip');

/* ═══ Formula Extraction Patterns ═══ */

// Data-mutating operations
const DATA_OP_PATTERNS = [
  { op: 'Patch',        regex: /\bPatch\s*\(/gi },
  { op: 'SubmitForm',   regex: /\bSubmitForm\s*\(/gi },
  { op: 'Remove',       regex: /\bRemove\s*\(/gi },
  { op: 'RemoveIf',     regex: /\bRemoveIf\s*\(/gi },
  { op: 'UpdateIf',     regex: /\bUpdateIf\s*\(/gi },
  { op: 'Collect',      regex: /\bCollect\s*\(/gi },
  { op: 'ClearCollect', regex: /\bClearCollect\s*\(/gi },
  { op: 'Clear',        regex: /\bClear\s*\(/gi },
];

// Flow invocations
const FLOW_RUN_REGEX = /(\w[\w.']*?)\.Run\s*\(/gi;

// Navigation
const NAVIGATE_REGEX = /\bNavigate\s*\(\s*([^,)]+)/gi;
const BACK_REGEX = /\bBack\s*\(/gi;

// Variables
const SET_REGEX = /\bSet\s*\(\s*(\w+)/gi;
const UPDATE_CONTEXT_REGEX = /\bUpdateContext\s*\(\s*\{([^}]*)\}/gi;

// Data source references — find identifiers that match known datasource names
// (We'll do this dynamically once we know the datasource names)

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                    DEEP ANALYSIS ENGINE                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Performance Anti-Patterns ── */
const PERF_PATTERNS = [
  {
    id: 'forall-patch',
    severity: 'critical',
    category: 'performance',
    title: 'ForAll + Patch (N+1 scritture)',
    description: 'Stai usando ForAll per chiamare Patch singolarmente per ogni riga. Usa Patch con una tabella come secondo argomento per eseguire una singola operazione batch.',
    regex: /\bForAll\s*\([^)]*\bPatch\s*\(/gi,
    fix: 'Sostituisci ForAll(collection, Patch(table, ...)) con Patch(table, ForAll(collection, {...}))',
  },
  {
    id: 'lookup-in-gallery',
    severity: 'high',
    category: 'performance',
    title: 'LookUp in Items di Gallery',
    description: 'LookUp dentro la proprietà Items di una Gallery viene eseguito per ogni riga visibile. Usa AddColumns o ClearCollect in OnVisible.',
    regex: /\bLookUp\s*\(/gi,
    propertyFilter: /^Items$/i,
  },
  {
    id: 'nested-filter',
    severity: 'high',
    category: 'performance',
    title: 'Filter annidati',
    description: 'Filter dentro un altro Filter crea query inefficienti. Combina le condizioni in un unico Filter.',
    regex: /\bFilter\s*\([^)]*\bFilter\s*\(/gi,
    fix: 'Unisci le condizioni: Filter(table, cond1 && cond2)',
  },
  {
    id: 'first-filter',
    severity: 'medium',
    category: 'performance',
    title: 'First(Filter(...)) → usa LookUp',
    description: 'First(Filter(...)) scarica tutti i record filtrati e poi prende il primo. LookUp restituisce solo il primo match.',
    regex: /\bFirst\s*\(\s*Filter\s*\(/gi,
    fix: 'Sostituisci con LookUp(table, condizione)',
  },
  {
    id: 'countrows-filter',
    severity: 'medium',
    category: 'performance',
    title: 'CountRows(Filter(...)) → usa CountIf',
    description: 'CountRows(Filter(...)) crea la tabella filtrata e poi conta. CountIf è più efficiente e delegabile.',
    regex: /\bCountRows\s*\(\s*Filter\s*\(/gi,
    fix: 'Sostituisci con CountIf(table, condizione)',
  },
  {
    id: 'refresh-after-patch',
    severity: 'medium',
    category: 'performance',
    title: 'Refresh dopo ogni Patch',
    description: 'Refresh forza il ricaricamento completo della data source. Dopo Patch, i dati sono già aggiornati localmente.',
    regex: /\bPatch\s*\([^;]*;\s*Refresh\s*\(/gi,
    fix: 'Rimuovi Refresh() dopo Patch() — Power Apps aggiorna i dati locali automaticamente',
  },
  {
    id: 'collect-onvisible-large',
    severity: 'high',
    category: 'performance',
    title: 'ClearCollect in OnVisible',
    description: 'ClearCollect di tabelle in OnVisible rallenta il caricamento della schermata. Valuta se puoi delegare con Filter/LookUp direttamente.',
    regex: /\bClearCollect\s*\(/gi,
    propertyFilter: /^OnVisible$/i,
  },
  {
    id: 'multiple-set-sequence',
    severity: 'low',
    category: 'performance',
    title: 'Set multipli in sequenza',
    description: 'Più Set() consecutivi per variabili context dovrebbero usare un singolo UpdateContext({...}) per efficienza.',
    regex: /\bSet\s*\([^)]+\)\s*;\s*Set\s*\([^)]+\)\s*;\s*Set\s*\(/gi,
    fix: 'Raggruppa in UpdateContext({var1: val1, var2: val2, var3: val3})',
  },
];

/* ── Delegation Warning Patterns ── */
const DELEGATION_PATTERNS = [
  {
    id: 'search-in-filter',
    title: 'Search() in Filter — non delegabile',
    description: 'Search() non è delegabile. Con più di 500/2000 record, i risultati saranno incompleti.',
    regex: /\bFilter\s*\([^)]*\bSearch\s*\(/gi,
    fix: "Usa StartsWith o 'in' operator se supportato dal connettore",
  },
  {
    id: 'len-in-filter',
    title: 'Len/Left/Right/Mid in Filter — non delegabile',
    description: 'Funzioni di stringa come Len, Left, Right, Mid non sono delegabili in Filter.',
    regex: /\bFilter\s*\([^)]*\b(Len|Left|Right|Mid|Trim|Upper|Lower)\s*\(/gi,
  },
  {
    id: 'isblank-in-filter',
    title: 'IsBlank in Filter — non delegabile per alcuni connettori',
    description: 'IsBlank() non è delegabile con tutti i connettori. Usa il confronto diretto con Blank().',
    regex: /\bFilter\s*\([^)]*\bIsBlank\s*\(/gi,
    fix: 'Sostituisci IsBlank(campo) con campo = Blank()',
  },
  {
    id: 'not-in-filter',
    title: 'Not() in Filter — non delegabile con alcuni connettori',
    description: 'La funzione Not() non è sempre delegabile. Usa il confronto negativo diretto.',
    regex: /\bFilter\s*\([^)]*\bNot\s*\(/gi,
  },
  {
    id: 'or-in-filter',
    title: 'OR (||) in Filter — non delegabile con SharePoint',
    description: 'L\'operatore OR (||) non è delegabile con SharePoint. Dividilo in più Filter o usa AddColumns.',
    regex: /\bFilter\s*\([^)]*\|\|/gi,
  },
  {
    id: 'sort-complex',
    title: 'Sort con espressione complessa — non delegabile',
    description: 'Sort/SortByColumns con espressioni calcolate non è delegabile.',
    regex: /\bSort\s*\(\s*\w+\s*,\s*[^,)]*\(/gi,
  },
  {
    id: 'countrows-no-filter',
    title: 'CountRows su tabella intera — non delegabile',
    description: 'CountRows su una data source intera non è delegabile e limita i risultati a 500/2000.',
    regex: /\bCountRows\s*\(\s*[A-Z]\w+\s*\)/gi,
  },
  {
    id: 'distinct-not-delegable',
    title: 'Distinct — non delegabile',
    description: 'La funzione Distinct non è delegabile. Usa AddColumns + GroupBy o una Vista lato server.',
    regex: /\bDistinct\s*\(\s*[A-Z]/gi,
  },
];

/* ── Hardcoded / Security Patterns ── */
const HARDCODED_PATTERNS = [
  { id: 'hardcoded-url',      title: 'URL hardcoded',             regex: /https?:\/\/[^\s"')]+/gi,          category: 'security' },
  { id: 'hardcoded-email',    title: 'Email hardcoded',           regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, category: 'security' },
  { id: 'hardcoded-guid',     title: 'GUID hardcoded',            regex: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, category: 'security' },
  { id: 'hardcoded-ip',       title: 'Indirizzo IP hardcoded',    regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,          category: 'security' },
  { id: 'hardcoded-password', title: 'Possibile password hardcoded', regex: /["'](?:password|pwd|secret|apikey|api_key|token)["']\s*[,:=]/gi, category: 'security' },
];

/* ── Accessibility Patterns ── */
const INTERACTIVE_TEMPLATES = new Set([
  'button', 'icon', 'image', 'textInput', 'dropdown', 'combobox',
  'datepicker', 'slider', 'toggle', 'checkbox', 'radioButton',
  'listbox', 'rating', 'timer', 'microphone', 'camera', 'barcodescanner',
  'penInput', 'attachments', 'richTextEditor',
]);

/* ── Formula Complexity Analyzer ── */
function analyzeFormulaComplexity(formula) {
  if (!formula) return { length: 0, nestingDepth: 0, functionCount: 0, uniqueFunctions: 0, ifCount: 0, score: 0 };
  
  // Length
  const length = formula.length;
  
  // Max nesting depth
  let maxDepth = 0, depth = 0;
  for (const ch of formula) {
    if (ch === '(' || ch === '{') { depth++; if (depth > maxDepth) maxDepth = depth; }
    else if (ch === ')' || ch === '}') depth--;
  }
  
  // Count function calls
  const funcMatches = formula.match(/\b[A-Za-z_]\w*\s*\(/g) || [];
  const functionCount = funcMatches.length;
  const uniqueFuncs = new Set(funcMatches.map(f => f.replace(/\s*\($/, '').toLowerCase()));
  
  // If/Switch count (branching complexity)
  const ifCount = (formula.match(/\bIf\s*\(/gi) || []).length + (formula.match(/\bSwitch\s*\(/gi) || []).length;
  
  // Semicolons (statement count in multi-statement formulas)
  const semicolonCount = (formula.match(/;/g) || []).length;
  
  // Score: weighted combination
  const score = Math.round(
    (length > 200 ? 15 : length > 100 ? 8 : length > 50 ? 3 : 0) +
    (maxDepth > 5 ? 20 : maxDepth > 3 ? 10 : maxDepth > 1 ? 3 : 0) +
    (functionCount > 10 ? 15 : functionCount > 5 ? 8 : functionCount > 2 ? 3 : 0) +
    (ifCount > 3 ? 15 : ifCount > 1 ? 8 : ifCount > 0 ? 3 : 0) +
    (semicolonCount > 5 ? 10 : semicolonCount > 2 ? 5 : 0) +
    (uniqueFuncs.size > 8 ? 10 : uniqueFuncs.size > 4 ? 5 : 0)
  );
  
  return { length, nestingDepth: maxDepth, functionCount, uniqueFunctions: uniqueFuncs.size, ifCount, semicolonCount, score };
}

/* ── Deep Analysis: find all issues ── */
function analyzeFormula(formula, property, controlName, controlType, screenName, controlPath) {
  const issues = [];
  
  // Performance anti-patterns
  for (const pat of PERF_PATTERNS) {
    if (pat.propertyFilter && !pat.propertyFilter.test(property)) continue;
    pat.regex.lastIndex = 0;
    if (pat.regex.test(formula)) {
      issues.push({
        id: pat.id,
        severity: pat.severity || 'medium',
        category: pat.category || 'performance',
        title: pat.title,
        description: pat.description,
        fix: pat.fix || '',
        screen: screenName,
        control: controlName,
        controlPath: controlPath,
        property: property,
        formulaSnippet: formula.length > 300 ? formula.substring(0, 300) + '...' : formula,
      });
    }
  }
  
  // Delegation warnings
  for (const pat of DELEGATION_PATTERNS) {
    pat.regex.lastIndex = 0;
    if (pat.regex.test(formula)) {
      issues.push({
        id: pat.id,
        severity: 'high',
        category: 'delegation',
        title: pat.title,
        description: pat.description,
        fix: pat.fix || '',
        screen: screenName,
        control: controlName,
        controlPath: controlPath,
        property: property,
        formulaSnippet: formula.length > 300 ? formula.substring(0, 300) + '...' : formula,
      });
    }
  }
  
  // Hardcoded values
  for (const pat of HARDCODED_PATTERNS) {
    pat.regex.lastIndex = 0;
    const matches = formula.match(pat.regex);
    if (matches && matches.length > 0) {
      // Exclude obvious non-issues like "true"/"false"
      const meaningful = matches.filter(m => m.length > 5);
      if (meaningful.length > 0) {
        issues.push({
          id: pat.id,
          severity: 'low',
          category: pat.category || 'hardcoded',
          title: `${pat.title}: ${meaningful[0].substring(0, 60)}${meaningful[0].length > 60 ? '...' : ''}`,
          description: `Trovato ${meaningful.length} valore/i hardcoded. Considera di usare variabili di ambiente o parametri di configurazione.`,
          fix: 'Sposta i valori hardcoded in una tabella di configurazione o in variabili globali',
          screen: screenName,
          control: controlName,
          controlPath: controlPath,
          property: property,
          formulaSnippet: formula.length > 300 ? formula.substring(0, 300) + '...' : formula,
          foundValues: meaningful.slice(0, 5),
        });
      }
    }
  }
  
  return issues;
}

/* ── Extract control layout data ── */
function extractControlLayout(controlObj, screenName, parentPath) {
  const ctrl = {
    name: controlObj.Name || '(sconosciuto)',
    type: controlObj.Template?.Name || controlObj.Template?.ComponentType || controlObj.Type || '',
    templateId: controlObj.Template?.Id || '',
    screen: screenName,
    path: parentPath ? `${parentPath} > ${controlObj.Name || ''}` : (controlObj.Name || ''),
    x: '', y: '', width: '', height: '',
    fill: '', color: '', borderColor: '',
    visible: 'true',
    isLocked: !!controlObj.IsLocked,
    children: [],
  };
  
  const rules = controlObj.Rules || [];
  for (const rule of rules) {
    const prop = (rule.Property || '').toLowerCase();
    const val = rule.InvariantScript || '';
    if (prop === 'x') ctrl.x = val;
    else if (prop === 'y') ctrl.y = val;
    else if (prop === 'width') ctrl.width = val;
    else if (prop === 'height') ctrl.height = val;
    else if (prop === 'fill') ctrl.fill = val;
    else if (prop === 'color') ctrl.color = val;
    else if (prop === 'bordercolor') ctrl.borderColor = val;
    else if (prop === 'visible') ctrl.visible = val;
  }
  
  const children = controlObj.Children || [];
  if (Array.isArray(children)) {
    for (const ch of children) {
      if (typeof ch === 'object') {
        ctrl.children.push(extractControlLayout(ch, screenName, ctrl.path));
      }
    }
  }
  if (!Array.isArray(children) && children && children.Children) {
    for (const ch of children.Children) {
      ctrl.children.push(extractControlLayout(ch, screenName, ctrl.path));
    }
  }
  
  return ctrl;
}

/* ── Accessibility Checker ── */
function checkAccessibility(controlObj, screenName, controlPath, issues) {
  const ctrlName = controlObj.Name || '';
  const ctrlType = (controlObj.Template?.Name || '').toLowerCase();
  const rules = controlObj.Rules || [];
  const ruleProps = new Set(rules.map(r => (r.Property || '').toLowerCase()));
  
  // Check interactive controls for AccessibleLabel
  if (INTERACTIVE_TEMPLATES.has(ctrlType)) {
    if (!ruleProps.has('accessiblelabel')) {
      issues.push({
        id: 'missing-accessible-label',
        severity: 'medium',
        category: 'accessibility',
        title: `Manca AccessibleLabel su ${ctrlName}`,
        description: `Il controllo "${ctrlName}" (${ctrlType}) è interattivo ma non ha AccessibleLabel. Gli screen reader non potranno descriverlo.`,
        fix: 'Aggiungi la proprietà AccessibleLabel con un testo descrittivo',
        screen: screenName,
        control: ctrlName,
        controlPath: controlPath,
        property: 'AccessibleLabel',
        formulaSnippet: '',
      });
    }
    // Check for Tooltip
    if (!ruleProps.has('tooltip') && ctrlType !== 'textinput') {
      issues.push({
        id: 'missing-tooltip',
        severity: 'low',
        category: 'accessibility',
        title: `Manca Tooltip su ${ctrlName}`,
        description: `Il controllo interattivo "${ctrlName}" non ha Tooltip. Migliora l'UX aggiungendo un suggerimento.`,
        fix: 'Aggiungi la proprietà Tooltip',
        screen: screenName,
        control: ctrlName,
        controlPath: controlPath,
        property: 'Tooltip',
        formulaSnippet: '',
      });
    }
  }
  
  // Check for empty OnSelect on buttons/icons
  if ((ctrlType === 'button' || ctrlType === 'icon') && !ruleProps.has('onselect')) {
    issues.push({
      id: 'empty-onselect',
      severity: 'low',
      category: 'quality',
      title: `${ctrlName}: Button/Icon senza OnSelect`,
      description: `Il controllo "${ctrlName}" è un ${ctrlType} ma non ha OnSelect definito.`,
      fix: 'Aggiungi un\'azione OnSelect o valuta se il controllo è necessario',
      screen: screenName,
      control: ctrlName,
      controlPath: controlPath,
      property: 'OnSelect',
      formulaSnippet: '',
    });
  }
  
  // Check for Text controls with hardcoded text (should use localization)
  if (ctrlType === 'label') {
    const textRule = rules.find(r => r.Property === 'Text');
    if (textRule) {
      const textVal = textRule.InvariantScript || '';
      // Direct string literal (starts and ends with quotes)
      if (/^\s*"[^"]{20,}"/.test(textVal)) {
        issues.push({
          id: 'hardcoded-label-text',
          severity: 'low',
          category: 'quality',
          title: `Testo hardcoded in ${ctrlName}`,
          description: 'Questo label ha un testo lungo hardcoded. Per app multi-lingua, considera l\'uso di una tabella di traduzioni.',
          screen: screenName,
          control: ctrlName,
          controlPath: controlPath,
          property: 'Text',
          formulaSnippet: textVal.substring(0, 200),
        });
      }
    }
  }
  
  // Recurse
  const children = controlObj.Children || [];
  if (Array.isArray(children)) {
    for (const ch of children) {
      if (typeof ch === 'object') {
        const childName = ch.Name || '';
        checkAccessibility(ch, screenName, controlPath ? `${controlPath} > ${childName}` : childName, issues);
      }
    }
  }
}

/* ── Naming Convention Checker ── */
const NAMING_PREFIXES = {
  button: ['btn_', 'btn', 'Button'],
  label: ['lbl_', 'lbl', 'Label'],
  textInput: ['txt_', 'inp_', 'TextInput'],
  icon: ['ico_', 'icn_', 'Icon'],
  image: ['img_', 'Image'],
  gallery: ['gal_', 'Gallery'],
  form: ['frm_', 'Form'],
  dropdown: ['dd_', 'drp_', 'Dropdown'],
  combobox: ['cmb_', 'ComboBox'],
  datepicker: ['dp_', 'DatePicker'],
  rectangle: ['rect_', 'Rectangle'],
  timer: ['tmr_', 'Timer'],
  toggle: ['tgl_', 'Toggle'],
};

function checkNaming(controlObj, screenName, issues) {
  const ctrlName = controlObj.Name || '';
  const ctrlType = (controlObj.Template?.Name || '').toLowerCase();
  
  // Skip auto-generated default names (we only flag those too)
  const isDefaultName = /^[A-Za-z]+\d+(_\d+)?$/.test(ctrlName); // e.g. "Button1", "Label3_1"
  if (isDefaultName && ctrlType) {
    issues.push({
      id: 'default-control-name',
      severity: 'low',
      category: 'naming',
      title: `Nome di default: ${ctrlName}`,
      description: `"${ctrlName}" ha ancora il nome assegnato automaticamente da Power Apps. Rinominalo con un nome descrittivo (es. ${NAMING_PREFIXES[ctrlType] ? NAMING_PREFIXES[ctrlType][0] + 'NomeDescrittivo' : 'nomeDescrittivo'}).`,
      screen: screenName,
      control: ctrlName,
      property: '',
      formulaSnippet: '',
    });
  }
  
  // Recurse
  const children = controlObj.Children || [];
  if (Array.isArray(children)) {
    for (const ch of children) {
      if (typeof ch === 'object') checkNaming(ch, screenName, issues);
    }
  }
}

/* ── Compute App Health Score ── */
function computeHealthScore(result) {
  const s = result.summary;
  const issues = result.issues || [];
  
  // Category scores (0-100 each)
  const scores = {};
  
  // 1. Performance (based on perf issues)
  const perfIssues = issues.filter(i => i.category === 'performance');
  const critPerf = perfIssues.filter(i => i.severity === 'critical').length;
  const highPerf = perfIssues.filter(i => i.severity === 'high').length;
  const medPerf = perfIssues.filter(i => i.severity === 'medium').length;
  scores.performance = Math.max(0, 100 - critPerf * 25 - highPerf * 12 - medPerf * 5);
  
  // 2. Delegation (based on delegation issues)
  const delIssues = issues.filter(i => i.category === 'delegation');
  scores.delegation = Math.max(0, 100 - delIssues.length * 10);
  
  // 3. Maintainability (formula complexity, naming, variable usage)
  const avgComplexity = result.formulaComplexity?.avgScore || 0;
  const namingIssues = issues.filter(i => i.category === 'naming').length;
  const namingPenalty = Math.min(30, namingIssues * 0.5);
  const complexityPenalty = avgComplexity > 20 ? 30 : avgComplexity > 10 ? 15 : avgComplexity > 5 ? 5 : 0;
  scores.maintainability = Math.max(0, Math.round(100 - complexityPenalty - namingPenalty));
  
  // 4. Security (hardcoded values)
  const secIssues = issues.filter(i => i.category === 'security' || i.category === 'hardcoded');
  scores.security = Math.max(0, 100 - secIssues.length * 8);
  
  // 5. Accessibility
  const a11yIssues = issues.filter(i => i.category === 'accessibility');
  scores.accessibility = Math.max(0, 100 - a11yIssues.length * 3);
  
  // 6. Architecture (orphan screens, unused datasources, variable sprawl)
  const orphanScreens = result.orphanScreens?.length || 0;
  const unusedDS = result.unusedDataSources?.length || 0;
  const unusedVars = result.unusedVariables?.length || 0;
  scores.architecture = Math.max(0, 100 - orphanScreens * 10 - unusedDS * 8 - unusedVars * 3);
  
  // Overall weighted score
  const overall = Math.round(
    scores.performance * 0.25 +
    scores.delegation * 0.20 +
    scores.maintainability * 0.20 +
    scores.security * 0.10 +
    scores.accessibility * 0.10 +
    scores.architecture * 0.15
  );
  
  // Grade
  let grade = 'A';
  if (overall < 90) grade = 'A';
  if (overall < 80) grade = 'B';
  if (overall < 65) grade = 'C';
  if (overall < 50) grade = 'D';
  if (overall < 35) grade = 'F';
  
  return { overall, grade, scores };
}

/* ═══ Helper: extract balanced parentheses ═══ */
function extractCallExpression(formula, startIndex) {
  let depth = 0;
  let i = startIndex;
  // Find opening paren
  while (i < formula.length && formula[i] !== '(') i++;
  if (i >= formula.length) return formula.substring(startIndex);
  const begin = startIndex;
  for (; i < formula.length; i++) {
    if (formula[i] === '(') depth++;
    else if (formula[i] === ')') { depth--; if (depth === 0) return formula.substring(begin, i + 1); }
  }
  return formula.substring(begin); // unclosed
}

/* ═══ Helper: extract first argument of a function call ═══ */
function extractFirstArg(formula, matchIndex) {
  let i = matchIndex;
  while (i < formula.length && formula[i] !== '(') i++;
  i++; // skip opening paren
  // Skip whitespace
  while (i < formula.length && /\s/.test(formula[i])) i++;
  // Read until comma or closing paren, respecting nested parens
  let depth = 0;
  let start = i;
  for (; i < formula.length; i++) {
    if (formula[i] === '(' || formula[i] === '{') depth++;
    else if (formula[i] === ')' || formula[i] === '}') {
      if (depth === 0) break;
      depth--;
    } else if (formula[i] === ',' && depth === 0) break;
  }
  return formula.substring(start, i).trim();
}

/* ═══ Control tree walker ═══ */
function walkControls(controlObj, screenName, path, results) {
  if (!controlObj) return;

  const ctrlName = controlObj.Name || controlObj.ControlUniqueId || '(unknown)';
  const ctrlType = controlObj.Template?.ComponentType || controlObj.Template?.Name || controlObj.Type || '';
  const fullPath = path ? `${path} > ${ctrlName}` : ctrlName;

  // Extract rules (formulas)
  const rules = controlObj.Rules || [];
  for (const rule of rules) {
    const propName = rule.Property || rule.RuleProviderType || '';
    const formula = rule.InvariantScript || rule.Script || '';
    if (!formula || !formula.trim()) continue;

    results.formulas.push({
      screen: screenName,
      control: ctrlName,
      controlType: ctrlType,
      controlPath: fullPath,
      property: propName,
      formula: formula,
      complexity: analyzeFormulaComplexity(formula),
    });

    // === Data Operations ===
    for (const pat of DATA_OP_PATTERNS) {
      pat.regex.lastIndex = 0;
      let m;
      while ((m = pat.regex.exec(formula)) !== null) {
        const fullExpr = extractCallExpression(formula, m.index);
        const target = extractFirstArg(formula, m.index);
        results.dataOps.push({
          screen: screenName,
          control: ctrlName,
          controlPath: fullPath,
          property: propName,
          operation: pat.op,
          target: target,
          fullExpression: fullExpr.length > 500 ? fullExpr.substring(0, 500) + '...' : fullExpr,
          formula: formula,
        });
      }
    }

    // === Flow.Run() ===
    FLOW_RUN_REGEX.lastIndex = 0;
    let fm;
    while ((fm = FLOW_RUN_REGEX.exec(formula)) !== null) {
      const flowName = fm[1].replace(/^['"]|['"]$/g, '');
      const fullExpr = extractCallExpression(formula, fm.index);
      results.flowCalls.push({
        screen: screenName,
        control: ctrlName,
        controlPath: fullPath,
        property: propName,
        flowName: flowName,
        fullExpression: fullExpr.length > 500 ? fullExpr.substring(0, 500) + '...' : fullExpr,
        formula: formula,
      });
    }

    // === Navigate ===
    NAVIGATE_REGEX.lastIndex = 0;
    let nm;
    while ((nm = NAVIGATE_REGEX.exec(formula)) !== null) {
      const targetScreen = nm[1].trim().replace(/^['"]|['"]$/g, '');
      results.navigations.push({
        from: screenName,
        to: targetScreen,
        control: ctrlName,
        controlPath: fullPath,
        property: propName,
      });
    }
    BACK_REGEX.lastIndex = 0;
    if (BACK_REGEX.test(formula)) {
      results.navigations.push({
        from: screenName,
        to: '(Back)',
        control: ctrlName,
        controlPath: fullPath,
        property: propName,
      });
    }

    // === Variables ===
    SET_REGEX.lastIndex = 0;
    let sm;
    while ((sm = SET_REGEX.exec(formula)) !== null) {
      results.variables.push({
        screen: screenName,
        control: ctrlName,
        property: propName,
        type: 'Global',
        name: sm[1],
        formula: formula,
      });
    }
    UPDATE_CONTEXT_REGEX.lastIndex = 0;
    let um;
    while ((um = UPDATE_CONTEXT_REGEX.exec(formula)) !== null) {
      // Parse variable names from {varName: value, ...}
      const inner = um[1];
      const varMatches = inner.match(/(\w+)\s*:/g);
      if (varMatches) {
        for (const vm of varMatches) {
          results.variables.push({
            screen: screenName,
            control: ctrlName,
            property: propName,
            type: 'Context',
            name: vm.replace(/\s*:$/, ''),
            formula: formula,
          });
        }
      }
    }

    // === Deep Analysis: Performance + Delegation + Hardcoded + Quality ===
    const formulaIssues = analyzeFormula(formula, propName, ctrlName, ctrlType, screenName, fullPath);
    if (formulaIssues.length > 0) {
      results.issues.push(...formulaIssues);
    }
  }

  // Recurse into children
  const children = controlObj.Children || controlObj.ChildrenOrder || [];
  if (Array.isArray(children)) {
    for (const child of children) {
      if (typeof child === 'object') {
        walkControls(child, screenName, fullPath, results);
      }
    }
  }

  // Some formats nest children under .Children[].Children
  if (controlObj.Children && !Array.isArray(controlObj.Children) && controlObj.Children.Children) {
    for (const child of controlObj.Children.Children) {
      walkControls(child, screenName, fullPath, results);
    }
  }
}

/* ═══ Main parse function ═══ */
async function parseMsapp(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const result = {
    // Metadata
    appName: '',
    appVersion: '',
    appId: '',
    createdAt: '',
    modifiedAt: '',
    publisher: '',
    // Structure
    screens: [],       // { name, controlCount, controls: [...tree] }
    dataSources: [],   // { name, type, tableName, connectorId, ... }
    connections: [],    // { connectorId, displayName, ... }
    components: [],     // { name, description }
    // Analysis
    formulas: [],       // { screen, control, controlType, controlPath, property, formula, complexity }
    dataOps: [],        // { screen, control, controlPath, property, operation, target, fullExpression }
    flowCalls: [],      // { screen, control, controlPath, property, flowName, fullExpression }
    navigations: [],    // { from, to, control, controlPath, property }
    variables: [],      // { screen, control, property, type, name }
    // Deep Analysis
    issues: [],            // { id, severity, category, title, description, fix, screen, control, ... }
    screenLayouts: [],     // { name, type, screen, path, x, y, width, height, children, ... }
    formulaComplexity: {}, // { avgScore, maxScore, topComplex, distribution }
    orphanScreens: [],     // screens with no incoming navigation
    unusedDataSources: [], // data sources not referenced in formulas
    unusedVariables: [],   // variables set but never read
    healthScore: {},       // { overall, grade, scores: { performance, delegation, ... } }
    dependencyMatrix: [],  // { screen, dataSources: [{name, opCount, readCount, writeCount}] }
    // Aggregations (computed after parsing)
    summary: {},
    dataSourceUsage: [],   // { dataSourceName, usedIn: [{screen, control, property}] }
    screenMap: [],         // { screen, navigatesTo: [screen] }
    errors: [],
  };

  /* ═══ 1. Header.json ═══ */
  try {
    const headerFile = zip.file('Header.json') || zip.file('header.json');
    if (headerFile) {
      const header = JSON.parse(await headerFile.async('string'));
      result.appName = header.DocVersion || header.AppName || header.Name || '';
      result.appId = header.AppUri || header.AppId || '';
      result.appVersion = header.DocVersion || header.AppVersionNumber || '';
      result.publisher = header.Publisher || '';
      // Try to find date info
      if (header.LastSavedDateTimeUTC) result.modifiedAt = header.LastSavedDateTimeUTC;
    }
  } catch (e) {
    result.errors.push(`Errore parsing Header.json: ${e.message}`);
  }

  /* ═══ 2. Properties.json ═══ */
  try {
    const propsFile = zip.file('Properties.json') || zip.file('properties.json');
    if (propsFile) {
      const props = JSON.parse(await propsFile.async('string'));
      if (!result.appName && props.Name) result.appName = props.Name;
      if (props.Author) result.publisher = props.Author;
      if (props.CreatedTime) result.createdAt = props.CreatedTime;
      if (props.ModifiedTime) result.modifiedAt = props.ModifiedTime;
      if (props.AppCreationSource) result.appVersion = props.AppCreationSource;
      // Local connection references in Properties (may be a JSON string or object)
      let lcr = props.LocalConnectionReferences;
      if (typeof lcr === 'string') { try { lcr = JSON.parse(lcr); } catch { lcr = null; } }
      if (lcr && typeof lcr === 'object' && !Array.isArray(lcr)) {
        for (const [key, val] of Object.entries(lcr)) {
          if (typeof val === 'object' && val !== null) {
            result.connections.push({
              id: key,
              connectorId: val.id || '',
              displayName: val.displayName || key,
              connectionParamsJson: JSON.stringify(val),
            });
          }
        }
      }
      // If ExtensionData has more info...
      let ldr = props.LocalDatabaseReferences;
      if (typeof ldr === 'string') { try { ldr = JSON.parse(ldr); } catch { ldr = null; } }
      if (ldr && typeof ldr === 'object' && !Array.isArray(ldr)) {
        for (const [key, val] of Object.entries(ldr)) {
          result.dataSources.push({
            name: key,
            type: 'LocalDatabase',
            tableName: val.tableName || key,
            connectorId: '',
            raw: val,
          });
        }
      }
    }
  } catch (e) {
    result.errors.push(`Errore parsing Properties.json: ${e.message}`);
  }

  /* ═══ 3. DataSources.json ═══ */
  try {
    // DataSources.json may be at root or inside References/ — use regex to find it
    const dsMatches = zip.file(/DataSources\.json$/i);
    const dsFile = dsMatches.length > 0 ? dsMatches[0] : null;
    if (dsFile) {
      const dsContent = JSON.parse(await dsFile.async('string'));
      const dsList = dsContent.DataSources || dsContent;
      if (Array.isArray(dsList)) {
        for (const ds of dsList) {
          result.dataSources.push({
            name: ds.Name || ds.name || '(senza nome)',
            type: ds.Type || ds.type || ds.ApiId || '',
            tableName: ds.TableName || ds.DataEntityMetadataJson?.TableName || ds.RelatedEntityName || ds.Name || '',
            connectorId: ds.ApiId || ds.DatasetName || '',
            datasetName: ds.DatasetName || '',
            raw: ds,
          });
        }
      }
    }
  } catch (e) {
    result.errors.push(`Errore parsing DataSources.json: ${e.message}`);
  }

  /* ═══ 4. Connections/ ═══ */
  try {
    const connFiles = zip.file(/^Connections[/\\]/i);
    for (const cf of connFiles) {
      if (!cf.name.endsWith('.json')) continue;
      try {
        const conn = JSON.parse(await cf.async('string'));
        if (conn && typeof conn === 'object') {
          // Some formats have the connection as a dict
          for (const [key, val] of Object.entries(conn)) {
            if (typeof val === 'object' && val !== null) {
              // Only add if not already present
              if (!result.connections.find(c => c.id === key)) {
                result.connections.push({
                  id: key,
                  connectorId: val.id || val.connectorId || key,
                  displayName: val.displayName || key,
                  connectionParamsJson: JSON.stringify(val),
                });
              }
            }
          }
        }
      } catch { /* skip non-JSON */ }
    }
  } catch (e) {
    result.errors.push(`Errore parsing Connections: ${e.message}`);
  }

  /* ═══ 5. Controls/ — The core of the analysis ═══ */
  try {
    const controlFiles = zip.file(/^Controls[/\\]/i);
    // Also look for Src/ pattern (newer YAML-based format may store things differently)
    const srcFiles = zip.file(/^Src[/\\]/i);
    const screenFiles = controlFiles.length > 0 ? controlFiles : srcFiles;

    for (const cf of screenFiles) {
      if (!cf.name.endsWith('.json')) continue;
      try {
        const screenData = JSON.parse(await cf.async('string'));
        const topControl = screenData.TopParent || screenData;
        const screenName = topControl.Name || cf.name.replace(/^(Controls|Src)[/\\]/, '').replace('.json', '');

        const screenInfo = {
          name: screenName,
          fileName: cf.name,
          controlCount: 0,
          controls: [],
        };

        // Count controls recursively
        function countControls(ctrl) {
          let count = 1;
          const children = ctrl.Children || (ctrl.Children && ctrl.Children.Children) || [];
          if (Array.isArray(children)) {
            for (const ch of children) { count += countControls(ch); }
          }
          if (!Array.isArray(children) && children && children.Children) {
            for (const ch of children.Children) { count += countControls(ch); }
          }
          return count;
        }

        screenInfo.controlCount = countControls(topControl);

        // Build control tree summary
        function buildTree(ctrl, depth) {
          const name = ctrl.Name || '(senza nome)';
          const type = ctrl.Template?.Name || ctrl.Template?.ComponentType || ctrl.Type || '';
          const ruleCount = (ctrl.Rules || []).length;
          const node = { name, type, depth, ruleCount, children: [] };

          const children = ctrl.Children || [];
          if (Array.isArray(children)) {
            for (const ch of children) { node.children.push(buildTree(ch, depth + 1)); }
          }
          if (!Array.isArray(children) && children && children.Children) {
            for (const ch of children.Children) { node.children.push(buildTree(ch, depth + 1)); }
          }
          return node;
        }

        screenInfo.controls = [buildTree(topControl, 0)];

        // Walk for formulas + data ops + deep issues
        walkControls(topControl, screenName, '', result);

        // Accessibility + Naming checks
        checkAccessibility(topControl, screenName, '', result.issues);
        checkNaming(topControl, screenName, result.issues);

        // Extract layout data for wireframe
        result.screenLayouts.push(extractControlLayout(topControl, screenName, ''));

        result.screens.push(screenInfo);
      } catch (err) {
        result.errors.push(`Errore parsing ${cf.name}: ${err.message}`);
      }
    }
  } catch (e) {
    result.errors.push(`Errore parsing Controls: ${e.message}`);
  }

  /* ═══ 6. References/ — Components ═══ */
  try {
    const refFiles = zip.file(/^References[/\\]/i);
    for (const rf of refFiles) {
      if (!rf.name.endsWith('.json')) continue;
      try {
        const refData = JSON.parse(await rf.async('string'));
        if (Array.isArray(refData)) {
          for (const comp of refData) {
            result.components.push({
              name: comp.Name || comp.TemplateName || '',
              description: comp.Description || '',
              version: comp.Version || '',
            });
          }
        } else if (refData.ComponentDependencies) {
          for (const dep of refData.ComponentDependencies) {
            result.components.push({
              name: dep.Name || dep.TemplateName || '',
              description: dep.Description || '',
              version: dep.Version || '',
            });
          }
        }
      } catch { /* skip */ }
    }
  } catch (e) {
    result.errors.push(`Errore parsing References: ${e.message}`);
  }

  /* ═══ 7. Compute aggregations ═══ */

  // Data source usage — where is each datasource referenced?
  const dsNames = result.dataSources.map(ds => ds.name).filter(Boolean);
  const dsUsageMap = {};
  for (const ds of dsNames) dsUsageMap[ds] = [];
  for (const f of result.formulas) {
    for (const dsName of dsNames) {
      if (f.formula.includes(dsName)) {
        dsUsageMap[dsName].push({
          screen: f.screen,
          control: f.control,
          property: f.property,
        });
      }
    }
  }
  result.dataSourceUsage = dsNames.map(name => ({
    dataSourceName: name,
    usedIn: dsUsageMap[name] || [],
  }));

  // Screen navigation map
  const screenNames = result.screens.map(s => s.name);
  result.screenMap = screenNames.map(name => ({
    screen: name,
    navigatesTo: [...new Set(
      result.navigations
        .filter(n => n.from === name && n.to !== '(Back)')
        .map(n => n.to)
    )],
    navigatesFrom: [...new Set(
      result.navigations
        .filter(n => n.to === name)
        .map(n => n.from)
    )],
  }));

  // Deduplicate variables
  const varMap = new Map();
  for (const v of result.variables) {
    const key = `${v.type}::${v.name}`;
    if (!varMap.has(key)) {
      varMap.set(key, { type: v.type, name: v.name, setIn: [] });
    }
    varMap.get(key).setIn.push({ screen: v.screen, control: v.control, property: v.property });
  }
  const uniqueVars = [...varMap.values()];

  /* ═══ 8. Deep Analysis Computations ═══ */

  // Formula complexity analysis
  const complexityScores = result.formulas.map(f => f.complexity?.score || 0);
  const avgComplexity = complexityScores.length > 0 ? complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length : 0;
  const maxComplexity = complexityScores.length > 0 ? Math.max(...complexityScores) : 0;
  const topComplex = result.formulas
    .filter(f => f.complexity && f.complexity.score > 0)
    .sort((a, b) => (b.complexity?.score || 0) - (a.complexity?.score || 0))
    .slice(0, 20)
    .map(f => ({
      screen: f.screen,
      control: f.control,
      property: f.property,
      formula: f.formula.length > 200 ? f.formula.substring(0, 200) + '...' : f.formula,
      score: f.complexity.score,
      nestingDepth: f.complexity.nestingDepth,
      functionCount: f.complexity.functionCount,
      length: f.complexity.length,
    }));
  // Distribution buckets
  const dist = { simple: 0, moderate: 0, complex: 0, veryComplex: 0 };
  for (const s of complexityScores) {
    if (s <= 5) dist.simple++;
    else if (s <= 15) dist.moderate++;
    else if (s <= 30) dist.complex++;
    else dist.veryComplex++;
  }
  result.formulaComplexity = { avgScore: Math.round(avgComplexity * 10) / 10, maxScore: maxComplexity, topComplex, distribution: dist };

  // Orphan screens (no incoming navigation, excluding App and first screen)
  const firstScreen = screenNames[0];
  const allNavTargets = new Set(result.navigations.map(n => n.to));
  result.orphanScreens = screenNames.filter(name =>
    name !== 'App' && name !== firstScreen && !allNavTargets.has(name)
  );

  // Unused data sources (defined but never referenced in any formula)
  result.unusedDataSources = result.dataSourceUsage
    .filter(d => d.usedIn.length === 0)
    .map(d => d.dataSourceName);

  // Unused variables (Set but never read in any other formula)
  result.unusedVariables = [];
  for (const v of uniqueVars) {
    const varName = v.name;
    // Search all formulas for references to this variable (not in Set/UpdateContext context)
    let referenced = false;
    for (const f of result.formulas) {
      // Check if any formula references this variable name (outside of just setting it)
      const setLocations = new Set(v.setIn.map(s => `${s.screen}||${s.control}||${s.property}`));
      const formulaKey = `${f.screen}||${f.control}||${f.property}`;
      if (setLocations.has(formulaKey)) continue; // skip the formula that sets it
      if (f.formula.includes(varName)) { referenced = true; break; }
    }
    if (!referenced) {
      result.unusedVariables.push({ type: v.type, name: v.name, definedIn: v.setIn });
    }
  }

  // Dependency matrix: which screens use which data sources (read vs write)
  result.dependencyMatrix = screenNames.filter(n => n !== 'App').map(screenName => {
    const screenFormulas = result.formulas.filter(f => f.screen === screenName);
    const screenDataOps = result.dataOps.filter(o => o.screen === screenName);
    const dsDeps = [];
    for (const dsName of dsNames) {
      const readCount = screenFormulas.filter(f => f.formula.includes(dsName)).length;
      const writeOps = screenDataOps.filter(o => o.target === dsName || o.target === `'${dsName}'`);
      if (readCount > 0 || writeOps.length > 0) {
        dsDeps.push({
          name: dsName,
          readCount,
          writeCount: writeOps.length,
          operations: [...new Set(writeOps.map(o => o.operation))],
        });
      }
    }
    return { screen: screenName, dataSources: dsDeps };
  });

  // Per-screen stats for enhanced overview
  const screenStats = screenNames.map(name => ({
    name,
    controlCount: result.screens.find(s => s.name === name)?.controlCount || 0,
    formulaCount: result.formulas.filter(f => f.screen === name).length,
    dataOpCount: result.dataOps.filter(o => o.screen === name).length,
    navigationCount: result.navigations.filter(n => n.from === name).length,
    issueCount: result.issues.filter(i => i.screen === name).length,
    complexFormulas: result.formulas.filter(f => f.screen === name && f.complexity && f.complexity.score > 15).length,
  }));

  // Summary (enhanced)
  result.summary = {
    screenCount: result.screens.length,
    totalControls: result.screens.reduce((sum, s) => sum + s.controlCount, 0),
    totalFormulas: result.formulas.length,
    dataOpCount: result.dataOps.length,
    flowCallCount: result.flowCalls.length,
    dataSourceCount: result.dataSources.length,
    connectionCount: result.connections.length,
    componentCount: result.components.length,
    navigationCount: result.navigations.length,
    globalVarCount: uniqueVars.filter(v => v.type === 'Global').length,
    contextVarCount: uniqueVars.filter(v => v.type === 'Context').length,
    patchCount: result.dataOps.filter(d => d.operation === 'Patch').length,
    submitFormCount: result.dataOps.filter(d => d.operation === 'SubmitForm').length,
    removeCount: result.dataOps.filter(d => d.operation === 'Remove' || d.operation === 'RemoveIf').length,
    collectCount: result.dataOps.filter(d => d.operation === 'Collect' || d.operation === 'ClearCollect').length,
    uniqueFlows: [...new Set(result.flowCalls.map(f => f.flowName))],
    uniqueTablesWritten: [...new Set(result.dataOps.map(d => d.target).filter(Boolean))],
    // Deep analysis summary
    issueCount: result.issues.length,
    criticalIssues: result.issues.filter(i => i.severity === 'critical').length,
    highIssues: result.issues.filter(i => i.severity === 'high').length,
    mediumIssues: result.issues.filter(i => i.severity === 'medium').length,
    lowIssues: result.issues.filter(i => i.severity === 'low').length,
    orphanScreenCount: result.orphanScreens.length,
    unusedDsCount: result.unusedDataSources.length,
    unusedVarCount: result.unusedVariables.length,
    avgFormulaComplexity: result.formulaComplexity.avgScore,
    maxFormulaComplexity: result.formulaComplexity.maxScore,
    screenStats,
  };

  // Compute health score (needs summary and issues to be ready)
  result.healthScore = computeHealthScore(result);

  // Store deduplicated variables
  result.variables = uniqueVars;

  return result;
}

/* ═══ Diff two parsed apps ═══ */
function diffApps(appA, appB) {
  const diff = {
    screensAdded: [],
    screensRemoved: [],
    screensModified: [],
    formulasAdded: [],
    formulasRemoved: [],
    formulasChanged: [],
    dataOpsAdded: [],
    dataOpsRemoved: [],
    dataSourcesAdded: [],
    dataSourcesRemoved: [],
    summaryA: appA.summary,
    summaryB: appB.summary,
  };

  // Screen diff
  const screensA = new Set(appA.screens.map(s => s.name));
  const screensB = new Set(appB.screens.map(s => s.name));
  diff.screensAdded = [...screensB].filter(s => !screensA.has(s));
  diff.screensRemoved = [...screensA].filter(s => !screensB.has(s));

  // Formula diff — key by screen+control+property
  function formulaKey(f) { return `${f.screen}||${f.control}||${f.property}`; }
  const formMapA = new Map();
  const formMapB = new Map();
  for (const f of appA.formulas) formMapA.set(formulaKey(f), f);
  for (const f of appB.formulas) formMapB.set(formulaKey(f), f);

  for (const [key, fB] of formMapB) {
    if (!formMapA.has(key)) {
      diff.formulasAdded.push(fB);
    } else {
      const fA = formMapA.get(key);
      if (fA.formula !== fB.formula) {
        diff.formulasChanged.push({ before: fA, after: fB });
      }
    }
  }
  for (const [key, fA] of formMapA) {
    if (!formMapB.has(key)) {
      diff.formulasRemoved.push(fA);
    }
  }

  // DataOps diff
  function dataOpKey(d) { return `${d.screen}||${d.control}||${d.property}||${d.operation}||${d.target}`; }
  const opsA = new Set(appA.dataOps.map(dataOpKey));
  const opsB = new Set(appB.dataOps.map(dataOpKey));
  diff.dataOpsAdded = appB.dataOps.filter(d => !opsA.has(dataOpKey(d)));
  diff.dataOpsRemoved = appA.dataOps.filter(d => !opsB.has(dataOpKey(d)));

  // DataSource diff
  const dsA = new Set(appA.dataSources.map(d => d.name));
  const dsB = new Set(appB.dataSources.map(d => d.name));
  diff.dataSourcesAdded = [...dsB].filter(d => !dsA.has(d));
  diff.dataSourcesRemoved = [...dsA].filter(d => !dsB.has(d));

  // Screens modified (different control count or formula count)
  const commonScreens = [...screensA].filter(s => screensB.has(s));
  for (const sName of commonScreens) {
    const sA = appA.screens.find(s => s.name === sName);
    const sB = appB.screens.find(s => s.name === sName);
    const formulasInA = appA.formulas.filter(f => f.screen === sName).length;
    const formulasInB = appB.formulas.filter(f => f.screen === sName).length;
    if (sA.controlCount !== sB.controlCount || formulasInA !== formulasInB) {
      diff.screensModified.push({
        name: sName,
        controlsBefore: sA.controlCount,
        controlsAfter: sB.controlCount,
        formulasBefore: formulasInA,
        formulasAfter: formulasInB,
      });
    }
  }

  return diff;
}

module.exports = { parseMsapp, diffApps };
