(() => {
  'use strict';

  const config = window.NEXO_CONFIG || {};
  const SUPABASE_URL = (config.supabaseUrl || '').replace(/\/$/, '');
  const SUPABASE_KEY = config.supabasePublishableKey || '';
  const STORAGE_KEY = 'nexo_sst_auth_v1';
  const THEME_KEY = 'nexo_sst_theme_v1';
  const STORAGE_BUCKET = 'sst-documents';
  const MAX_UPLOAD_SIZE = 15 * 1024 * 1024;
  const MODULES = {
    iperc: { title: 'IPERC y riesgos', eyebrow: 'IDENTIFICACIÓN DE PELIGROS', description: 'Carga tu matriz PDF o Excel y organiza manualmente sus revisiones, versiones y controles.', upload: true, requiredFile: true, accept: '.pdf,.xls,.xlsx,.csv', fileHelp: 'Adjunta la matriz en PDF, Excel o CSV. Máximo 15 MB.' },
    epp: { title: 'Entrega y reposición de EPP', eyebrow: 'EQUIPOS DE PROTECCIÓN', description: 'Organiza entregas y reposiciones con constancias adjuntas; no incluye firma digital del trabajador.', upload: true, accept: '.pdf,.xlsx,.csv,.jpg,.jpeg,.png', fileHelp: 'Adjunta constancias o evidencias administrativas; evita datos médicos.' },
    committee: { title: 'Comité de SST', eyebrow: 'COMITÉ Y ACUERDOS', description: 'Da seguimiento a fechas, actas y acuerdos; elecciones, votos y firmas aún no están conectados.', upload: true, accept: '.pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png', fileHelp: 'Adjunta actas o documentos del Comité. No se registran votos individuales.' },
    incidents: { title: 'Incidentes y acciones', eyebrow: 'REPORTE Y SEGUIMIENTO', description: 'Organiza reportes, investigaciones y medidas correctivas sin guardar diagnósticos ni resultados clínicos.', upload: true, accept: '.pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png', fileHelp: 'Sube evidencia operativa. No incluyas diagnósticos ni información clínica.' },
    inspections: { title: 'Inspecciones y mapa de riesgos', eyebrow: 'EN PLANTA', description: 'Registra inspecciones, hallazgos y planos adjuntos; el editor gráfico del mapa no está conectado.', upload: true, accept: '.pdf,.xlsx,.csv,.jpg,.jpeg,.png', fileHelp: 'Puedes adjuntar listas, planos o fotografías de inspección.' },
    emergency: { title: 'Preparación ante emergencias', eyebrow: 'BRIGADAS Y SIMULACROS', description: 'Centraliza simulacros, brigadas y planes por sede como registros y adjuntos.', upload: true, accept: '.pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png', fileHelp: 'Adjunta planes o evidencia de simulacros.' },
    management_docs: { title: 'Plan anual y RISST', eyebrow: 'DOCUMENTOS DE GESTIÓN', description: 'Carga y da seguimiento al Plan Anual, RISST y sus versiones; no genera documentos ni firmas automáticamente.', upload: true, accept: '.pdf,.docx,.xlsx,.csv', fileHelp: 'Adjunta Plan Anual, RISST u otros documentos administrativos.' },
    audit_followup: { title: 'Auditorías y monitoreo', eyebrow: 'SEGUIMIENTO DEL SISTEMA', description: 'Organiza auditorías, monitoreo de agentes y seguimiento mensual; las estadísticas no se calculan automáticamente.', upload: true, accept: '.pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png', fileHelp: 'Adjunta reportes administrativos; no subas resultados clínicos.' },
    exam_schedule: { title: 'Agenda de exámenes', eyebrow: 'COORDINACIÓN ADMINISTRATIVA', description: 'Organiza fechas y coordinaciones por grupo o sede, sin registrar resultados médicos.', upload: false, accept: '', fileHelp: '' },
    training: { title: 'Capacitaciones', eyebrow: 'FORMACIÓN Y EVIDENCIAS', description: 'Programa actividades y conserva listas o materiales; no emite evaluaciones ni certificados automáticamente.', upload: true, accept: '.pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png', fileHelp: 'Adjunta listas de asistencia o materiales; no incluyas información clínica.' },
    participation: { title: 'Participación de trabajadores', eyebrow: 'COMUNICACIÓN Y CONSTANCIAS', description: 'Organiza reportes de peligros y constancias; votaciones y firmas digitales aún no están activas.', upload: true, accept: '.pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png', fileHelp: 'Las firmas electrónicas y votaciones aún no están conectadas; no las declares como validadas.' }
  };
  const RESPONSE_ITEMS = [
    { title: 'Matriz IPERC vigente', moduleKey: 'iperc', needsFile: true },
    { title: 'Agenda de exámenes · solo administración', moduleKey: 'exam_schedule', administrativeOnly: true },
    { title: 'Capacitaciones y asistencia', moduleKey: 'training', needsFile: true },
    { title: 'Entrega de EPP', moduleKey: 'epp', needsFile: true },
    { title: 'Actas del Comité SST', moduleKey: 'committee', needsFile: true },
    { title: 'Plan y Programa Anual de SST', moduleKey: 'management_docs', needsFile: true, match: 'plan|programa|anual' },
    { title: 'RISST y constancia administrativa', moduleKey: 'management_docs', needsFile: true, match: 'risst|reglamento' },
    { title: 'Accidentes e incidentes', moduleKey: 'incidents', needsFile: true }
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let session = readSession();
  let currentUser = null;
  let company = null;
  let employees = [];
  let tasks = [];
  let sstRecords = [];
  let currentModuleKey = 'iperc';
  let currentEditingRecord = null;
  let taskFilter = 'all';
  let toastTimer = null;
  let callbackType = null;
  let pendingConfirmEmail = '';

  function readSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  }

  function setTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    try { localStorage.setItem(THEME_KEY, nextTheme); } catch { /* Storage may be disabled. */ }
    const themeMeta = $('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = nextTheme === 'dark' ? '#10181d' : '#f5f7f5';
    $$('[data-theme-toggle]').forEach(button => {
      const isDark = nextTheme === 'dark';
      button.setAttribute('aria-pressed', String(isDark));
      button.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema nocturno');
      const text = button.querySelector('[data-theme-label]');
      if (text) text.textContent = isDark ? 'Tema claro' : 'Tema nocturno';
      const icon = button.querySelector('[data-theme-icon]');
      if (icon) icon.textContent = isDark ? '☀' : '☾';
    });
  }

  function loadTheme() {
    let stored = 'light';
    try { stored = localStorage.getItem(THEME_KEY) || 'light'; } catch { /* Use light by default. */ }
    setTheme(stored);
  }

  function saveSession(next) {
    session = next;
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }

  function normalizeSession(data) {
    const expiresIn = Number(data.expires_in || 3600);
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || session?.refresh_token,
      expires_at: data.expires_at ? Number(data.expires_at) * 1000 : Date.now() + expiresIn * 1000,
      user: data.user || session?.user || null
    };
  }

  function friendlyError(error) {
    const message = String(error?.message || error || 'Ocurrió un error inesperado.');
    if (/invalid login credentials/i.test(message)) return 'El correo o la contraseña no son correctos.';
    if (/email not confirmed/i.test(message)) return 'Confirma tu correo desde el enlace que te enviamos antes de iniciar sesión.';
    if (/user already registered|already registered/i.test(message)) return 'Ese correo ya tiene una cuenta. Prueba iniciar sesión.';
    if (/duplicate key|companies_ruc_key|companies_ruc/i.test(message)) return 'Ese RUC ya está registrado en otra cuenta. Revisa el número o contacta al administrador.';
    if (/password.*(least|short|length)/i.test(message)) return 'La contraseña debe tener al menos 8 caracteres.';
    if (/failed to fetch|networkerror|load failed/i.test(message)) return 'No se pudo conectar al servicio de datos. Revisa tu conexión e inténtalo de nuevo.';
    return message.length > 190 ? `${message.slice(0, 187)}…` : message;
  }

  async function authRequest(path, { method = 'POST', body, token } = {}) {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data = null;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      const error = new Error(data.msg || data.message || data.error_description || data.error || `Error ${response.status}`);
      error.status = response.status;
      error.code = data.code;
      throw error;
    }
    return data;
  }

  async function validSession() {
    if (!session?.access_token) throw new Error('Tu sesión terminó. Inicia sesión de nuevo.');
    if (session.expires_at && Date.now() > session.expires_at - 60000) {
      if (!session.refresh_token) {
        saveSession(null);
        throw new Error('Tu sesión terminó. Inicia sesión de nuevo.');
      }
      try {
        const refreshed = await authRequest('token?grant_type=refresh_token', {
          body: { refresh_token: session.refresh_token }
        });
        saveSession(normalizeSession(refreshed));
      } catch (error) {
        saveSession(null);
        throw new Error('Tu sesión venció. Inicia sesión de nuevo.');
      }
    }
    return session;
  }

  async function restRequest(table, { method = 'GET', query = '', body, prefer } = {}) {
    const active = await validSession();
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${active.access_token}`,
      Accept: 'application/json'
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) {
      const error = new Error(data?.message || data?.details || data?.hint || `Error al consultar datos (${response.status}).`);
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }
    return data;
  }

  function hideLoading() { $('#loading-screen').classList.add('hidden'); }
  function showAuth() {
    hideLoading();
    $('#app-shell').classList.add('hidden');
    $('#auth-screen').classList.remove('hidden');
  }
  function showApp() {
    hideLoading();
    $('#auth-screen').classList.add('hidden');
    $('#app-shell').classList.remove('hidden');
  }

  function setNotice(message, type = 'info', addResend = false) {
    const notice = $('#auth-notice');
    notice.className = `notice ${type}`;
    notice.textContent = message;
    notice.classList.remove('hidden');
    if (addResend && pendingConfirmEmail) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-button';
      button.textContent = ' Reenviar correo';
      button.addEventListener('click', resendConfirmation);
      notice.appendChild(button);
    }
  }

  function clearNotice() {
    const notice = $('#auth-notice');
    notice.className = 'notice hidden';
    notice.textContent = '';
  }

  function setAuthTab(tab) {
    callbackType = null;
    $$('.auth-tab').forEach(button => {
      const active = button.dataset.authTab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $('#login-form').classList.toggle('hidden', tab !== 'login');
    $('#signup-form').classList.toggle('hidden', tab !== 'signup');
    $('#reset-form').classList.add('hidden');
    $('#auth-title').textContent = tab === 'signup' ? 'Crea tu espacio de empresa' : 'Tu espacio de trabajo';
    $('#auth-subtitle').textContent = tab === 'signup' ? 'Registra los datos básicos y configura tu cuenta.' : 'Inicia sesión o registra tu empresa para comenzar.';
    clearNotice();
  }

  function showRecoveryForm() {
    $('#auth-screen').classList.remove('hidden');
    $('#app-shell').classList.add('hidden');
    hideLoading();
    $$('.auth-tab').forEach(button => button.classList.add('hidden'));
    $('#login-form').classList.add('hidden');
    $('#signup-form').classList.add('hidden');
    $('#reset-form').classList.remove('hidden');
    $('#auth-title').textContent = 'Recuperación de cuenta';
    $('#auth-subtitle').textContent = 'Actualiza la contraseña asociada a tu correo.';
    setNotice('Elige una contraseña nueva para continuar.', 'info');
  }

  function redirectUri() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function parseAuthCallback() {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      callbackType = params.get('type');
      saveSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Date.now() + Number(params.get('expires_in') || 3600) * 1000,
        user: null
      });
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
      window.setTimeout(() => setNotice(decodeURIComponent(errorDescription.replace(/\+/g, ' ')), 'error'), 0);
    }
  }

  function initials(value) {
    const words = String(value || '').trim().split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || 'N').slice(0, 2)).toUpperCase();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function showToast(message, kind = 'normal') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.toggle('error', kind === 'error');
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3400);
  }

  function showGlobal(message, kind = 'info') {
    const box = $('#global-message');
    box.className = `global-message ${kind}`;
    box.textContent = message;
    box.classList.remove('hidden');
    if (kind !== 'error') setTimeout(() => box.classList.add('hidden'), 5000);
  }

  function switchView(view) {
    const validViews = ['dashboard', 'company', 'employees', 'tasks', 'health', 'evidence', 'roi', 'module'];
    if (!validViews.includes(view)) return;
    $$('.view-section').forEach(section => section.classList.toggle('hidden', section.id !== `view-${view}`));
    $$('.side-link').forEach(link => link.classList.toggle('active', !link.dataset.module && link.dataset.view === view));
    const titles = { dashboard: 'Resumen', company: 'Mi empresa', employees: 'Personal', tasks: 'Tareas', health: 'Salud ocupacional', evidence: 'Carpeta de evidencias', roi: 'Indicador de ahorro', module: MODULES[currentModuleKey]?.title || 'Módulo SST' };
    $('#page-title').textContent = titles[view];
    $('#breadcrumb-current').textContent = titles[view];
    $('#sidebar').classList.remove('open');
    $('#mobile-overlay').classList.remove('show');
    if (view === 'company') fillCompanyForm();
    if (view === 'employees') renderEmployees();
    if (view === 'tasks') renderTasks();
    if (view === 'module') renderModule();
    if (view === 'evidence') renderEvidenceReport();
    if (view === 'roi') updateRoiApp();
  }

  function switchModule(moduleKey) {
    if (!MODULES[moduleKey]) return;
    currentModuleKey = moduleKey;
    switchView('module');
    $$('.side-link').forEach(link => link.classList.toggle('active', link.dataset.module === moduleKey));
    $('#page-title').textContent = MODULES[moduleKey].title;
    $('#breadcrumb-current').textContent = MODULES[moduleKey].title;
  }

  async function loadUser() {
    if (session?.user?.id) return session.user;
    const user = await authRequest('user', { method: 'GET', token: session?.access_token });
    session = { ...session, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return user;
  }

  async function ensureCompany(user) {
    const existing = await restRequest('companies', { query: 'select=*&limit=1' });
    if (existing?.length) return existing[0];
    const draft = user?.user_metadata?.company_draft;
    if (!draft?.legal_name || !draft?.ruc) return null;
    const payload = {
      owner_id: user.id,
      legal_name: draft.legal_name,
      commercial_name: draft.commercial_name || null,
      ruc: String(draft.ruc).replace(/\D/g, ''),
      sector: draft.sector || 'Otro',
      employee_count: Number(draft.employee_count || 0),
      contact_name: draft.contact_name || user.user_metadata?.full_name || user.email,
      contact_email: draft.contact_email || user.email,
      phone: draft.phone || null,
      address: draft.address || null
    };
    const created = await restRequest('companies', { method: 'POST', query: 'select=*', body: payload, prefer: 'return=representation' });
    return created?.[0] || null;
  }

  async function loadWorkspace() {
    const user = await loadUser();
    currentUser = user;
    company = await ensureCompany(user);
    if (company) {
      const companyId = encodeURIComponent(company.id);
      const [employeeRows, taskRows, recordRows] = await Promise.all([
        restRequest('employees', { query: `select=*&company_id=eq.${companyId}&order=created_at.desc` }),
        restRequest('tasks', { query: `select=*&company_id=eq.${companyId}&order=due_date.asc.nullslast,created_at.desc` }),
        restRequest('sst_records', { query: `select=*&company_id=eq.${companyId}&order=due_date.asc.nullslast,created_at.desc` })
      ]);
      employees = employeeRows || [];
      tasks = taskRows || [];
      sstRecords = recordRows || [];
    } else {
      employees = [];
      tasks = [];
      sstRecords = [];
    }
    showApp();
    renderAll();
    switchView('dashboard');
  }

  function renderAll() {
    const displayName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Usuario';
    const companyName = company?.commercial_name || company?.legal_name || 'Configura tu empresa';
    const companyMark = initials(companyName);
    $('#user-name').textContent = displayName;
    $('#user-email').textContent = currentUser?.email || '';
    $('#user-avatar').textContent = initials(displayName);
    $('#topbar-avatar').textContent = initials(displayName);
    $('#sidebar-company-name').textContent = companyName;
    $('#sidebar-company-ruc').textContent = company?.ruc ? `RUC ${company.ruc}` : 'Perfil pendiente';
    $('#company-initials').textContent = companyMark;
    $('#welcome-name').textContent = displayName.split(' ')[0];
    $('#welcome-company').textContent = companyName;
    $('#dashboard-company-initials').textContent = companyMark;
    $('#dashboard-company-name').textContent = companyName;
    $('#dashboard-company-sector').textContent = company?.sector || 'Completa tu perfil';
    $('#dashboard-company-ruc').textContent = company?.ruc || 'Pendiente';
    $('#dashboard-company-employees').textContent = String(company?.employee_count ?? 0);
    $('#dashboard-company-contact').textContent = company?.contact_name || displayName;
    $('#today-label').textContent = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
    $('#employee-nav-count').textContent = String(employees.length);
    $('#task-nav-count').textContent = String(tasks.filter(task => task.status !== 'done').length);
    const profileComplete = Boolean(company?.legal_name && company?.ruc && company?.contact_email);
    $('#stat-profile').textContent = profileComplete ? 'Completo' : 'Pendiente';
    $('#stat-profile-hint').textContent = profileComplete ? 'Datos básicos guardados' : 'Completa la información';
    $('#stat-employees').textContent = String(employees.length);
    $('#stat-active').textContent = `${employees.filter(person => person.status === 'active').length} activos`;
    $('#stat-pending').textContent = String(tasks.filter(task => task.status !== 'done').length);
    $('#stat-overdue').textContent = String(tasks.filter(task => task.status !== 'done' && task.due_date && task.due_date < todayISO()).length);
    fillCompanyForm();
    renderEmployees();
    renderTasks();
    renderDashboardTasks();
    renderModuleCounts();
    renderModuleShortcuts();
    if (!$('#view-module').classList.contains('hidden')) renderModule();
    renderEvidenceReport();
    updateRoiApp();
  }

  function todayISO() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function fillCompanyForm() {
    const form = $('#company-form');
    if (!form) return;
    const values = company || {};
    ['legal_name', 'commercial_name', 'ruc', 'sector', 'employee_count', 'contact_name', 'contact_email', 'phone', 'address'].forEach(key => {
      const input = form.elements.namedItem(key);
      if (input && document.activeElement !== input) input.value = values[key] ?? '';
    });
  }

  function dateLabel(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(date);
  }

  function priorityLabel(value) {
    return ({ normal: 'Normal', high: 'Alta', urgent: 'Urgente' })[value] || 'Normal';
  }

  function taskStatusLabel(value) {
    return ({ pending: 'Pendiente', in_progress: 'En curso', done: 'Completada' })[value] || 'Pendiente';
  }

  function renderDashboardTasks() {
    const container = $('#dashboard-task-list');
    const empty = $('#dashboard-empty');
    const openTasks = [...tasks].filter(task => task.status !== 'done').sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31')).slice(0, 5);
    container.innerHTML = openTasks.map(task => {
      const overdue = task.due_date && task.due_date < todayISO();
      return `<div class="compact-task"><span class="task-priority-dot ${escapeHtml(task.priority)}"></span><span class="compact-task-copy"><b>${escapeHtml(task.title)}</b><small>${escapeHtml(task.assigned_to || 'Sin responsable')} · ${escapeHtml(taskStatusLabel(task.status))}</small></span><span class="task-date ${overdue ? 'overdue' : ''}">${escapeHtml(dateLabel(task.due_date))}</span></div>`;
    }).join('');
    empty.classList.toggle('hidden', openTasks.length > 0);
  }

  function renderEmployees() {
    const tbody = $('#employee-table-body');
    if (!tbody) return;
    const term = ($('#employee-search')?.value || '').trim().toLocaleLowerCase('es');
    const filtered = employees.filter(person => [person.full_name, person.email, person.position, person.area].some(value => String(value || '').toLocaleLowerCase('es').includes(term)));
    $('#employee-count-label').textContent = String(employees.length);
    $('#employee-nav-count').textContent = String(employees.length);
    $('#employee-empty').classList.toggle('hidden', filtered.length > 0);
    $('.table-scroll').classList.toggle('hidden', filtered.length === 0);
    tbody.innerHTML = filtered.map(person => {
      const full = escapeHtml(person.full_name);
      const email = escapeHtml(person.email || 'Sin correo');
      const statusClass = person.status === 'inactive' ? 'inactive' : '';
      const statusText = person.status === 'inactive' ? 'Inactivo' : 'Activo';
      return `<tr>
        <td><div class="employee-person"><span class="employee-avatar">${escapeHtml(initials(person.full_name))}</span><span><b>${full}</b><small>${email}</small></span></div></td>
        <td>${escapeHtml(person.position || '—')}</td>
        <td>${escapeHtml(person.area || '—')}</td>
        <td><span class="status-pill ${statusClass}">${statusText}</span></td>
        <td><div class="row-actions"><button type="button" class="row-action" data-employee-edit="${escapeHtml(person.id)}" title="Editar" aria-label="Editar ${full}">✎</button><button type="button" class="row-action danger" data-employee-delete="${escapeHtml(person.id)}" title="Eliminar" aria-label="Eliminar ${full}">×</button></div></td>
      </tr>`;
    }).join('');
  }

  function renderTasks() {
    const container = $('#task-list');
    if (!container) return;
    const ordered = [...tasks].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31');
    });
    const visible = ordered.filter(task => taskFilter === 'all' || (taskFilter === 'pending' ? task.status !== 'done' : task.status === 'done'));
    $('#filter-all-count').textContent = String(tasks.length);
    $('#filter-pending-count').textContent = String(tasks.filter(task => task.status !== 'done').length);
    $('#filter-done-count').textContent = String(tasks.filter(task => task.status === 'done').length);
    $$('.filter-tab').forEach(button => button.classList.toggle('active', button.dataset.filter === taskFilter));
    $('#task-empty').classList.toggle('hidden', visible.length > 0);
    container.innerHTML = visible.map(task => {
      const overdue = task.status !== 'done' && task.due_date && task.due_date < todayISO();
      const safeId = escapeHtml(task.id);
      return `<article class="task-card ${task.status === 'done' ? 'done' : ''}">
        <button type="button" class="task-check" data-task-toggle="${safeId}" aria-label="Marcar como ${task.status === 'done' ? 'pendiente' : 'completada'}">✓</button>
        <div class="task-main"><b>${escapeHtml(task.title)}</b><p>${escapeHtml(task.description || task.assigned_to ? [task.description, task.assigned_to ? `Responsable: ${task.assigned_to}` : ''].filter(Boolean).join(' · ') : 'Sin descripción adicional')}</p></div>
        <div class="task-meta"><span class="priority-badge ${escapeHtml(task.priority)}">${escapeHtml(priorityLabel(task.priority))}</span><span class="date-badge ${overdue ? 'overdue' : ''}">${escapeHtml(dateLabel(task.due_date))}</span></div>
        <div class="task-card-actions"><select class="task-status-select" data-task-status="${safeId}" aria-label="Estado de ${escapeHtml(task.title)}"><option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pendiente</option><option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>En curso</option><option value="done" ${task.status === 'done' ? 'selected' : ''}>Completada</option></select><button type="button" class="row-action" data-task-edit="${safeId}" title="Editar" aria-label="Editar tarea">✎</button><button type="button" class="task-delete" data-task-delete="${safeId}" title="Eliminar" aria-label="Eliminar tarea">×</button></div>
      </article>`;
    }).join('');
  }

  function moduleStatusLabel(status) {
    return ({ pending: 'Pendiente', in_progress: 'En curso', done: 'Completado' })[status] || 'Pendiente';
  }

  function renderModuleCounts() {
    Object.keys(MODULES).forEach(key => {
      const count = sstRecords.filter(record => record.module_key === key).length;
      const badge = $(`[data-module-count="${key}"]`);
      if (badge) badge.textContent = String(count);
    });
  }

  function renderModuleShortcuts() {
    const container = $('#dashboard-module-shortcuts');
    if (!container) return;
    const keys = ['iperc', 'epp', 'committee', 'incidents', 'inspections', 'emergency'];
    container.innerHTML = keys.map(key => {
      const item = MODULES[key];
      const count = sstRecords.filter(record => record.module_key === key).length;
      return `<button type="button" class="quick-module" data-module="${key}"><span class="quick-module-icon">${({ iperc: '▧', epp: '⬡', committee: '♧', incidents: '!', inspections: '⌕', emergency: '◇' })[key]}</span><span><b>${escapeHtml(item.title)}</b><small>${count} ${count === 1 ? 'registro' : 'registros'}</small></span><span class="quick-module-arrow">→</span></button>`;
    }).join('');
  }

  function renderModule() {
    const module = MODULES[currentModuleKey];
    if (!module) return;
    $('#module-eyebrow').textContent = module.eyebrow;
    $('#module-title').textContent = module.title;
    $('#module-description').textContent = module.description;
    $('#module-action-hint').textContent = module.upload ? 'Adjunta evidencia administrativa para mantenerla junto al registro.' : 'Solo agenda y coordinación administrativa; no se almacenan resultados médicos.';
    const privacy = $('#module-privacy-note');
    privacy.textContent = currentModuleKey === 'exam_schedule'
      ? 'Privacidad: registra solo fecha, sede o grupo y coordinación administrativa. No ingreses resultados, diagnósticos, aptitudes individuales ni adjuntes EMO.'
      : currentModuleKey === 'iperc'
        ? 'Carga segura: la matriz y los adjuntos se guardan en un espacio privado de tu empresa. No incluyas información clínica ni datos personales innecesarios.'
        : 'No registres diagnósticos, resultados médicos ni historias clínicas en notas o documentos.';
    privacy.classList.toggle('hidden', !['exam_schedule', 'iperc', 'incidents', 'audit_followup', 'training'].includes(currentModuleKey));
    $('#toggle-record-form').classList.toggle('hidden', !company);
    const fileWrap = $('#record-file-wrap');
    fileWrap.classList.toggle('hidden', !module.upload);
    const fileInput = $('#record-file');
    fileInput.accept = module.accept;
    fileInput.required = Boolean(module.requiredFile && !currentEditingRecord?.file_path);
    $('#record-file-help').textContent = currentEditingRecord?.file_name
      ? `Adjunto actual: ${currentEditingRecord.file_name}. Selecciona otro para reemplazarlo; si no, se conserva.`
      : module.fileHelp || 'Los adjuntos no están disponibles para este módulo.';
    $('#record-notes').placeholder = currentModuleKey === 'exam_schedule'
      ? 'Solo notas administrativas de coordinación. No ingreses resultados médicos ni diagnósticos.'
      : 'Describe el seguimiento. No ingreses datos médicos ni diagnósticos.';
    renderModuleRecords();
  }

  function renderModuleRecords() {
    const moduleRecords = sstRecords.filter(record => record.module_key === currentModuleKey);
    const query = ($('#record-search')?.value || '').trim().toLocaleLowerCase('es');
    const sorted = [...moduleRecords].sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31') || String(b.created_at || '').localeCompare(String(a.created_at || '')));
    const visible = sorted.filter(record => [record.title, record.category, record.responsible, record.notes, record.file_name].some(value => String(value || '').toLocaleLowerCase('es').includes(query)));
    const open = moduleRecords.filter(record => record.status !== 'done');
    const overdue = open.filter(record => record.due_date && record.due_date < todayISO());
    $('#module-record-total').textContent = String(moduleRecords.length);
    $('#module-record-open').textContent = String(open.length);
    $('#module-record-overdue').textContent = String(overdue.length);
    $('#record-count-label').textContent = String(moduleRecords.length);
    $('#record-empty').classList.toggle('hidden', visible.length > 0);
    $('#record-empty b').textContent = query && moduleRecords.length ? 'No hay resultados para esta búsqueda' : 'Aún no hay registros en este módulo';
    $('#record-empty p').textContent = query && moduleRecords.length ? 'Prueba con otro título, tipo o responsable.' : 'Agrega un registro para empezar a organizar la evidencia.';
    $('#record-empty button').textContent = query && moduleRecords.length ? 'Limpiar búsqueda' : '＋ Crear registro';
    $('#record-table-body').closest('.table-scroll').classList.toggle('hidden', visible.length === 0);
    $('#record-table-body').innerHTML = visible.map(record => {
      const recordId = escapeHtml(record.id);
      const dueDate = record.due_date || '';
      const overdueClass = record.status !== 'done' && dueDate && dueDate < todayISO() ? 'overdue' : '';
      const attachment = record.file_path
        ? `<button type="button" class="file-link" data-record-download="${recordId}" title="Descargar ${escapeHtml(record.file_name || 'archivo')}">↓ ${escapeHtml(record.file_name || 'Archivo')}</button>`
        : '<span class="muted-cell">—</span>';
      return `<tr>
        <td><div class="record-primary"><b>${escapeHtml(record.title)}</b><small>${escapeHtml(record.notes || 'Sin notas adicionales')}</small></div></td>
        <td>${escapeHtml(record.category || '—')}</td>
        <td>${escapeHtml(record.responsible || '—')}</td>
        <td><span class="date-badge ${overdueClass}">${escapeHtml(dateLabel(dueDate))}</span></td>
        <td><span class="module-status ${escapeHtml(record.status || 'pending')}">${escapeHtml(moduleStatusLabel(record.status))}</span></td>
        <td>${attachment}</td>
        <td><div class="row-actions"><button type="button" class="row-action" data-record-edit="${recordId}" title="Editar" aria-label="Editar ${escapeHtml(record.title)}">✎</button><button type="button" class="row-action danger" data-record-delete="${recordId}" title="Eliminar" aria-label="Eliminar ${escapeHtml(record.title)}">×</button></div></td>
      </tr>`;
    }).join('');
  }

  function resetRecordForm() {
    const form = $('#record-form');
    form.reset();
    form.elements.namedItem('id').value = '';
    currentEditingRecord = null;
    $('#record-form-title').textContent = 'Nuevo registro';
    $('#record-form-hint').textContent = 'Completa los datos y guarda.';
    $('#record-status').value = 'pending';
    $('#record-priority').value = 'normal';
    $('#record-file').required = Boolean(MODULES[currentModuleKey]?.requiredFile);
    $('#record-file-help').textContent = MODULES[currentModuleKey]?.fileHelp || '';
  }

  function openRecordForm(record = null) {
    if (!company) {
      showToast('Completa primero el perfil de tu empresa.', 'error');
      switchView('company');
      return;
    }
    resetRecordForm();
    currentEditingRecord = record;
    const form = $('#record-form');
    if (record) {
      form.elements.namedItem('id').value = record.id;
      ['title', 'category', 'responsible', 'due_date', 'status', 'priority', 'notes'].forEach(key => {
        const input = form.elements.namedItem(key);
        if (input) input.value = record[key] ?? '';
      });
      $('#record-form-title').textContent = 'Editar registro';
      $('#record-form-hint').textContent = record.file_name ? `Adjunto actual: ${record.file_name}.` : 'Si adjuntas un archivo, quedará asociado a este registro.';
    }
    renderModule();
    toggleForm(form, true);
    $('#record-title').focus();
  }

  function fileExtension(name) {
    return String(name || '').split('.').pop().toLowerCase();
  }

  function cleanFileName(name) {
    const raw = String(name || 'evidencia').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const cleaned = raw.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(-110);
    return cleaned || 'evidencia';
  }

  function fileMime(file) {
    const byExtension = ({ pdf: 'application/pdf', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' })[fileExtension(file.name)];
    return file.type && file.type !== 'application/octet-stream' ? file.type : byExtension || file.type || 'application/octet-stream';
  }

  function encodeStoragePath(path) {
    return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
  }

  async function storageRequest(url, { method = 'GET', body, contentType, extraHeaders = {} } = {}) {
    const active = await validSession();
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${active.access_token}`, ...extraHeaders };
    if (contentType) headers['Content-Type'] = contentType;
    const response = await fetch(url, { method, headers, body });
    if (!response.ok) {
      let data = {};
      try { data = await response.json(); } catch { /* Keep generic status. */ }
      throw new Error(data.message || data.error || data.msg || `No se pudo procesar el archivo (${response.status}).`);
    }
    return response;
  }

  async function uploadPrivateFile(path, file) {
    const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodeStoragePath(path)}`;
    await storageRequest(url, { method: 'POST', body: file, contentType: fileMime(file), extraHeaders: { 'x-upsert': 'true' } });
  }

  async function removePrivateFile(path) {
    if (!path) return;
    const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}`;
    await storageRequest(url, { method: 'DELETE', body: JSON.stringify({ prefixes: [path] }), contentType: 'application/json' });
  }

  async function downloadPrivateFile(record) {
    const path = encodeStoragePath(record.file_path || '');
    const url = `${SUPABASE_URL}/storage/v1/object/authenticated/${STORAGE_BUCKET}/${path}`;
    try {
      const response = await storageRequest(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = record.file_name || 'evidencia';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
    } catch (error) {
      showToast(friendlyError(error), 'error');
    }
  }

  function validateModuleFile(file) {
    if (!file) return true;
    const module = MODULES[currentModuleKey];
    if (!module?.upload) { showToast('Este módulo no admite adjuntos.', 'error'); return false; }
    if (file.size > MAX_UPLOAD_SIZE) { showToast('El archivo supera el límite de 15 MB.', 'error'); return false; }
    const ext = fileExtension(file.name);
    const accepted = String(module.accept || '').split(',').map(item => item.replace(/^\./, '').trim().toLowerCase()).filter(Boolean);
    if (!accepted.includes(ext)) { showToast(`Formato no admitido. Tipos permitidos: ${module.accept || 'ninguno'}.`, 'error'); return false; }
    return true;
  }

  async function submitRecord(event) {
    event.preventDefault();
    if (!company) { showToast('Completa primero el perfil de tu empresa.', 'error'); return; }
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const file = $('#record-file').files[0] || null;
    const isNew = !values.id;
    const existing = values.id ? sstRecords.find(record => record.id === values.id) : null;
    if (!values.title.trim()) { showToast('Escribe un título para el registro.', 'error'); return; }
    if (file && !validateModuleFile(file)) return;
    if (MODULES[currentModuleKey].requiredFile && !file && !existing?.file_path) {
      showToast('Adjunta la matriz IPERC para guardar el registro.', 'error');
      $('#record-file').focus();
      return;
    }
    const payload = {
      company_id: company.id,
      module_key: currentModuleKey,
      title: values.title.trim(),
      category: values.category.trim() || null,
      responsible: values.responsible.trim() || null,
      due_date: values.due_date || null,
      status: values.status || 'pending',
      priority: values.priority || 'normal',
      notes: values.notes.trim() || null
    };
    const button = form.querySelector('button[type="submit"]');
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Guardando…';
    try {
      let saved;
      if (values.id) {
        const rows = await restRequest('sst_records', {
          method: 'PATCH',
          query: `id=eq.${encodeURIComponent(values.id)}&company_id=eq.${encodeURIComponent(company.id)}&select=*`,
          body: payload,
          prefer: 'return=representation'
        });
        saved = rows?.[0];
      } else {
        const rows = await restRequest('sst_records', { method: 'POST', query: 'select=*', body: payload, prefer: 'return=representation' });
        saved = rows?.[0];
      }
      if (!saved?.id) throw new Error('No se pudo guardar el registro.');
      if (!values.id) {
        form.elements.namedItem('id').value = saved.id;
        values.id = saved.id;
        currentEditingRecord = saved;
      }
      if (file) {
        const fileName = cleanFileName(file.name);
        const filePath = `${company.id}/${saved.id}/${fileName}`;
        await uploadPrivateFile(filePath, file);
        const metadata = { file_path: filePath, file_name: file.name, file_size: file.size, mime_type: fileMime(file) };
        const updated = await restRequest('sst_records', {
          method: 'PATCH',
          query: `id=eq.${encodeURIComponent(saved.id)}&company_id=eq.${encodeURIComponent(company.id)}&select=*`,
          body: metadata,
          prefer: 'return=representation'
        });
        saved = updated?.[0] || { ...saved, ...metadata };
        if (existing?.file_path && existing.file_path !== filePath) {
          try { await removePrivateFile(existing.file_path); } catch { /* The new private file and database reference are already saved. */ }
        }
      }
      await reloadWorkspaceData();
      resetRecordForm();
      toggleForm(form, false);
      showToast(isNew ? 'Registro creado.' : 'Registro actualizado.');
    } catch (error) {
      showToast(friendlyError(error), 'error');
      try { await reloadWorkspaceData(); } catch { /* Keep the current view and report the original error. */ }
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function editRecord(id) {
    const record = sstRecords.find(item => item.id === id);
    if (record) openRecordForm(record);
  }

  async function deleteRecord(id) {
    const record = sstRecords.find(item => item.id === id);
    if (!record || !window.confirm(`¿Eliminar “${record.title}” y su adjunto? Esta acción no se puede deshacer.`)) return;
    try {
      await restRequest('sst_records', { method: 'DELETE', query: `id=eq.${encodeURIComponent(record.id)}&company_id=eq.${encodeURIComponent(company.id)}` });
      let fileWarning = false;
      if (record.file_path) {
        try { await removePrivateFile(record.file_path); }
        catch { fileWarning = true; }
      }
      await reloadWorkspaceData();
      showToast(fileWarning ? 'Registro eliminado. No se pudo borrar el adjunto privado; revisa el almacenamiento.' : 'Registro eliminado.');
    } catch (error) { showToast(friendlyError(error), 'error'); }
  }

  function getResponseItemState(item) {
    let matching = sstRecords.filter(record => record.module_key === item.moduleKey);
    if (item.match) {
      const matcher = new RegExp(item.match, 'i');
      matching = matching.filter(record => matcher.test(`${record.title || ''} ${record.category || ''}`));
    }
    if (item.administrativeOnly) {
      return { label: matching.length ? 'Agenda registrada · sin EMO' : 'Falta agenda administrativa', className: matching.length ? 'admin' : 'pending', record: matching[0] || null, file: null };
    }
    const withFile = matching.find(record => record.file_path);
    return withFile
      ? { label: withFile.status === 'done' ? 'Adjunto · completado' : 'Adjunto disponible', className: 'ready', record: withFile, file: withFile }
      : { label: 'Falta adjunto', className: 'pending', record: matching[0] || null, file: null };
  }

  function renderRequestChecklist() {
    const container = $('#sunafil-checklist');
    if (!container) return;
    container.innerHTML = RESPONSE_ITEMS.map(item => {
      const state = getResponseItemState(item);
      const icon = state.className === 'ready' ? '✓' : state.className === 'admin' ? '◷' : '!';
      const filename = state.file?.file_name ? ` · ${escapeHtml(state.file.file_name)}` : '';
      return `<article class="checklist-item"><span class="checklist-status ${state.className}">${icon}</span><span class="checklist-copy"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(state.label)}${filename}</small></span><button type="button" class="checklist-open" data-module="${item.moduleKey}" aria-label="Abrir ${escapeHtml(MODULES[item.moduleKey].title)}">Abrir →</button></article>`;
    }).join('');
    const ready = RESPONSE_ITEMS.filter(item => getResponseItemState(item).className === 'ready').length;
    const summary = document.createElement('div');
    summary.className = 'checklist-progress';
    summary.innerHTML = `<span><b>${ready} de ${RESPONSE_ITEMS.length}</b> evidencias documentales adjuntas</span><span class="checklist-progress-track"><i style="width:${Math.round(ready / RESPONSE_ITEMS.length * 100)}%"></i></span>`;
    container.prepend(summary);
  }

  function calculateBusinessDaysDeadline(startDate, days) {
    const date = new Date(`${startDate}T00:00:00`);
    if (!startDate || Number.isNaN(date.getTime())) return '';
    let remaining = Math.max(0, Math.min(365, Number(days) || 0));
    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) remaining -= 1;
    }
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function updateRequestDeadline() {
    const result = $('#request-deadline');
    if (!result) return;
    const dateInput = $('#request-letter-date');
    if (!dateInput.value) dateInput.value = todayISO();
    const days = Math.max(0, Math.min(365, Number($('#request-business-days').value || 0)));
    const due = calculateBusinessDaysDeadline(dateInput.value, days);
    const prettyDate = due ? new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${due}T00:00:00`)) : '—';
    result.innerHTML = `<small>Fecha objetivo orientativa</small><b>${escapeHtml(prettyDate)}</b><span>${days} ${days === 1 ? 'día hábil' : 'días hábiles'} desde recepción</span>`;
  }

  function renderEvidenceReport() {
    const container = $('#evidence-report');
    if (!container) return;
    const byModule = Object.keys(MODULES).map(key => ({ key, title: MODULES[key].title, rows: sstRecords.filter(item => item.module_key === key) })).filter(group => group.rows.length);
    const complete = sstRecords.filter(item => item.status === 'done').length;
    const pending = sstRecords.length - complete;
    const moduleSummary = byModule.length ? byModule.map(group => `<div class="evidence-module-summary"><span><b>${escapeHtml(group.title)}</b><small>${group.rows.length} ${group.rows.length === 1 ? 'registro' : 'registros'}</small></span><span class="evidence-summary-arrow">→</span></div>`).join('') : '<div class="empty-state"><span class="empty-symbol">▤</span><b>Tu carpeta aún está vacía</b><p>Empieza cargando una matriz IPERC o creando un registro en los módulos.</p><button type="button" class="button secondary small-button" data-module="iperc">Abrir IPERC</button></div>';
    const rows = [...sstRecords].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).map(record => `<tr><td><b>${escapeHtml(record.title)}</b><small>${escapeHtml(MODULES[record.module_key]?.title || record.module_key)}</small></td><td>${escapeHtml(record.responsible || '—')}</td><td><span class="module-status ${escapeHtml(record.status || 'pending')}">${escapeHtml(moduleStatusLabel(record.status))}</span></td><td>${escapeHtml(dateLabel(record.due_date))}</td><td>${record.file_path ? escapeHtml(record.file_name || 'Adjunto privado') : '—'}</td></tr>`).join('');
    container.innerHTML = `<div class="evidence-report-header"><div><span class="panel-kicker">${escapeHtml(company?.legal_name || 'ESPACIO DE EMPRESA')}</span><h3>Resumen de documentación</h3><p>Generado el ${escapeHtml(new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()))}</p></div><span class="evidence-mark">N</span></div><div class="evidence-kpis"><div><small>Registros</small><b>${sstRecords.length}</b></div><div><small>Completados</small><b>${complete}</b></div><div><small>En seguimiento</small><b>${pending}</b></div><div><small>Archivos privados</small><b>${sstRecords.filter(item => item.file_path).length}</b></div></div><div class="evidence-layout"><div><h4>Resumen por módulo</h4><div class="evidence-module-list">${moduleSummary}</div></div><div><h4>Contenido registrado</h4>${rows ? `<div class="evidence-table-wrap"><table class="evidence-table"><thead><tr><th>REGISTRO</th><th>RESPONSABLE</th><th>ESTADO</th><th>SEGUIMIENTO</th><th>ADJUNTO</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted-cell">Aún no hay registros para mostrar.</p>'}</div></div><p class="evidence-disclaimer">Resumen operativo de la información ingresada. No constituye certificación ni determina cumplimiento legal. Los adjuntos permanecen privados y no se incluyen en este resumen.</p>`;
    renderRequestChecklist();
    updateRequestDeadline();
  }

  function exportEvidenceCsv() {
    const headers = ['Tipo de fila', 'Modulo', 'Registro', 'Tipo', 'Responsable', 'Seguimiento', 'Estado', 'Prioridad', 'Archivo'];
    const rows = sstRecords.map(record => ['Registro', MODULES[record.module_key]?.title || record.module_key, record.title, record.category, record.responsible, record.due_date, moduleStatusLabel(record.status), priorityLabel(record.priority), record.file_name]);
    RESPONSE_ITEMS.forEach(item => {
      const state = getResponseItemState(item);
      rows.push(['Checklist', MODULES[item.moduleKey].title, item.title, '', '', '', state.label, '', state.file?.file_name || '']);
    });
    const safeCell = value => {
      let text = String(value ?? '').replace(/\r?\n/g, ' ');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = '\ufeff' + [headers, ...rows].map(row => row.map(safeCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nexo-sst-evidencias-${todayISO()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function updateRoiApp() {
    const valueNode = $('#app-roi-value');
    if (!valueNode) return;
    const keys = ['rrhh-hours', 'sst-hours', 'health-hours'];
    const totalHours = keys.reduce((sum, key) => sum + Math.max(0, Number($(`#app-${key}`)?.value || 0)), 0);
    const totalMonthlyCost = [['rrhh-hours', 'rrhh-cost'], ['sst-hours', 'sst-cost'], ['health-hours', 'health-cost']].reduce((sum, [hours, cost]) => sum + Math.max(0, Number($(`#app-${hours}`)?.value || 0)) * Math.max(0, Number($(`#app-${cost}`)?.value || 0)), 0);
    const percent = Math.min(100, Math.max(0, Number($('#app-saved-percent')?.value || 0)));
    const annualValue = totalMonthlyCost * 12 * percent / 100;
    const annualHours = totalHours * 12 * percent / 100;
    valueNode.textContent = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(annualValue);
    $('#app-roi-hours').textContent = `${Math.round(annualHours).toLocaleString('es-PE')} horas potenciales al año`;
  }

  async function submitSignup(event) {
    event.preventDefault();
    clearNotice();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const ruc = String(values.ruc || '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(ruc)) {
      setNotice('El RUC debe tener exactamente 11 dígitos.', 'error');
      return;
    }
    if (String(values.password || '').length < 8) {
      setNotice('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const oldText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span>Creando tu cuenta…</span>';
    pendingConfirmEmail = values.email;
    const draft = {
      legal_name: values.legal_name.trim(),
      commercial_name: '',
      ruc,
      sector: values.sector,
      employee_count: Number(values.employee_count || 0),
      contact_name: values.full_name.trim(),
      contact_email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      address: ''
    };
    try {
      const redirect = encodeURIComponent(redirectUri());
      const response = await authRequest(`signup?redirect_to=${redirect}`, {
        body: {
          email: values.email.trim().toLowerCase(),
          password: values.password,
          data: { full_name: values.full_name.trim(), company_draft: draft }
        }
      });
      if (response.access_token && response.refresh_token) {
        saveSession(normalizeSession(response));
        try { await loadWorkspace(); showToast('Tu cuenta y empresa ya están listas.'); }
        catch (error) { showAuth(); setNotice(friendlyError(error), 'error'); }
      } else {
        setNotice('Cuenta creada. Confirma tu correo con el enlace que te enviamos; al volver aquí se guardará el perfil de tu empresa.', 'success', true);
        form.reset();
      }
    } catch (error) {
      setNotice(friendlyError(error), 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = oldText;
    }
  }

  async function resendConfirmation() {
    if (!pendingConfirmEmail) return;
    try {
      const redirect = encodeURIComponent(redirectUri());
      await authRequest(`resend?redirect_to=${redirect}`, { body: { type: 'signup', email: pendingConfirmEmail } });
      setNotice('Enviamos otro enlace de confirmación. Revisa tu bandeja de entrada y correo no deseado.', 'success');
    } catch (error) { setNotice(friendlyError(error), 'error'); }
  }

  async function submitLogin(event) {
    event.preventDefault();
    clearNotice();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector('button[type="submit"]');
    const oldText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span>Ingresando…</span>';
    try {
      const response = await authRequest('token?grant_type=password', {
        body: { email: values.email.trim().toLowerCase(), password: values.password }
      });
      saveSession(normalizeSession(response));
      await loadWorkspace();
      form.reset();
    } catch (error) {
      setNotice(friendlyError(error), 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = oldText;
    }
  }

  async function requestPasswordReset() {
    const email = $('#login-email').value.trim().toLowerCase();
    if (!email) {
      setNotice('Escribe primero tu correo y luego vuelve a tocar “¿La olvidaste?”.', 'info');
      $('#login-email').focus();
      return;
    }
    try {
      const redirect = encodeURIComponent(redirectUri());
      await authRequest(`recover?redirect_to=${redirect}`, { body: { email } });
      setNotice('Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.', 'success');
    } catch (error) { setNotice(friendlyError(error), 'error'); }
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    const password = $('#reset-password').value;
    if (password.length < 8) { setNotice('La contraseña debe tener al menos 8 caracteres.', 'error'); return; }
    try {
      const active = await validSession();
      await authRequest('user', { method: 'PUT', token: active.access_token, body: { password } });
      saveSession(null);
      $$('.auth-tab').forEach(button => button.classList.remove('hidden'));
      setAuthTab('login');
      setNotice('Contraseña actualizada. Ya puedes iniciar sesión.', 'success');
    } catch (error) { setNotice(friendlyError(error), 'error'); }
  }

  async function logout() {
    try { if (session?.access_token) await authRequest('logout', { token: session.access_token }); }
    catch { /* Clear the local session even if the remote session already expired. */ }
    saveSession(null);
    currentUser = null; company = null; employees = []; tasks = []; sstRecords = [];
    setAuthTab('login');
    showAuth();
  }

  async function submitCompany(event) {
    event.preventDefault();
    if (!company) { showGlobal('No encontramos un perfil de empresa asociado. Cierra sesión y crea el espacio desde “Crear empresa”.', 'error'); return; }
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const ruc = String(values.ruc || '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(ruc)) { showToast('El RUC debe tener exactamente 11 dígitos.', 'error'); return; }
    values.ruc = ruc;
    values.employee_count = Number(values.employee_count || 0);
    values.commercial_name = values.commercial_name.trim() || null;
    values.phone = values.phone.trim() || null;
    values.address = values.address.trim() || null;
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const oldText = button.innerHTML;
    button.disabled = true; button.textContent = 'Guardando…';
    try {
      const result = await restRequest('companies', {
        method: 'PATCH',
        query: `id=eq.${encodeURIComponent(company.id)}&select=*`,
        body: values,
        prefer: 'return=representation'
      });
      if (!result?.length) throw new Error('No se pudo actualizar el perfil de empresa.');
      company = result[0];
      renderAll();
      showToast('Perfil de empresa actualizado.');
    } catch (error) { showToast(friendlyError(error), 'error'); }
    finally { button.disabled = false; button.innerHTML = oldText; }
  }

  function toggleForm(form, open) {
    form.classList.toggle('hidden', !open);
    if (open) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function resetEmployeeForm() {
    $('#employee-form').reset();
    $('#employee-form').elements.namedItem('id').value = '';
    $('#employee-form-title').textContent = 'Agregar persona';
    $('#employee-form').elements.namedItem('status').value = 'active';
  }

  async function submitEmployee(event) {
    event.preventDefault();
    if (!company) { showToast('Completa primero el perfil de la empresa.', 'error'); switchView('company'); return; }
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const id = values.id;
    const payload = {
      full_name: values.full_name.trim(),
      email: values.email.trim() || null,
      position: values.position.trim() || null,
      area: values.area.trim() || null,
      status: values.status || 'active'
    };
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const oldText = button.textContent;
    button.disabled = true; button.textContent = 'Guardando…';
    try {
      let result;
      if (id) {
        result = await restRequest('employees', { method: 'PATCH', query: `id=eq.${encodeURIComponent(id)}&company_id=eq.${encodeURIComponent(company.id)}&select=*`, body: payload, prefer: 'return=representation' });
      } else {
        result = await restRequest('employees', { method: 'POST', query: 'select=*', body: { ...payload, company_id: company.id }, prefer: 'return=representation' });
      }
      if (id && !result?.length) throw new Error('No encontramos esa persona para actualizar.');
      await reloadWorkspaceData();
      resetEmployeeForm(); toggleForm($('#employee-form'), false);
      showToast(id ? 'Persona actualizada.' : 'Persona agregada.');
    } catch (error) { showToast(friendlyError(error), 'error'); }
    finally { button.disabled = false; button.textContent = oldText; }
  }

  function editEmployee(id) {
    const person = employees.find(item => item.id === id);
    if (!person) return;
    const form = $('#employee-form');
    form.elements.namedItem('id').value = person.id;
    form.elements.namedItem('full_name').value = person.full_name || '';
    form.elements.namedItem('email').value = person.email || '';
    form.elements.namedItem('position').value = person.position || '';
    form.elements.namedItem('area').value = person.area || '';
    form.elements.namedItem('status').value = person.status || 'active';
    $('#employee-form-title').textContent = 'Editar persona';
    toggleForm(form, true);
  }

  async function deleteEmployee(id) {
    const person = employees.find(item => item.id === id);
    if (!person || !window.confirm(`¿Eliminar a ${person.full_name} del directorio?`)) return;
    try {
      await restRequest('employees', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}&company_id=eq.${encodeURIComponent(company.id)}` });
      await reloadWorkspaceData();
      showToast('Persona eliminada del directorio.');
    } catch (error) { showToast(friendlyError(error), 'error'); }
  }

  function resetTaskForm() {
    $('#task-form').reset();
    $('#task-form').elements.namedItem('id').value = '';
    $('#task-form-title').textContent = 'Crear tarea';
    $('#task-priority').value = 'normal';
  }

  async function submitTask(event) {
    event.preventDefault();
    if (!company) { showToast('Completa primero el perfil de la empresa.', 'error'); switchView('company'); return; }
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const id = values.id;
    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      due_date: values.due_date || null,
      priority: values.priority || 'normal',
      assigned_to: values.assigned_to.trim() || null
    };
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const oldText = button.textContent;
    button.disabled = true; button.textContent = 'Guardando…';
    try {
      let result;
      if (id) {
        result = await restRequest('tasks', { method: 'PATCH', query: `id=eq.${encodeURIComponent(id)}&company_id=eq.${encodeURIComponent(company.id)}&select=*`, body: payload, prefer: 'return=representation' });
        if (!result?.length) throw new Error('No encontramos esa tarea para actualizar.');
      } else {
        result = await restRequest('tasks', { method: 'POST', query: 'select=*', body: { ...payload, company_id: company.id }, prefer: 'return=representation' });
      }
      await reloadWorkspaceData();
      resetTaskForm(); toggleForm($('#task-form'), false);
      showToast(id ? 'Tarea actualizada.' : 'Tarea creada.');
    } catch (error) { showToast(friendlyError(error), 'error'); }
    finally { button.disabled = false; button.textContent = oldText; }
  }

  function editTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    const form = $('#task-form');
    form.elements.namedItem('id').value = task.id;
    form.elements.namedItem('title').value = task.title || '';
    form.elements.namedItem('description').value = task.description || '';
    form.elements.namedItem('due_date').value = task.due_date || '';
    form.elements.namedItem('priority').value = task.priority || 'normal';
    form.elements.namedItem('assigned_to').value = task.assigned_to || '';
    $('#task-form-title').textContent = 'Editar tarea';
    toggleForm(form, true);
  }

  async function updateTask(id, changes, successMessage) {
    try {
      const result = await restRequest('tasks', { method: 'PATCH', query: `id=eq.${encodeURIComponent(id)}&company_id=eq.${encodeURIComponent(company.id)}&select=*`, body: changes, prefer: 'return=representation' });
      if (!result?.length) throw new Error('No encontramos esa tarea para actualizar.');
      await reloadWorkspaceData();
      if (successMessage) showToast(successMessage);
    } catch (error) { showToast(friendlyError(error), 'error'); renderTasks(); }
  }

  async function deleteTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task || !window.confirm(`¿Eliminar la tarea “${task.title}”?`)) return;
    try {
      await restRequest('tasks', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}&company_id=eq.${encodeURIComponent(company.id)}` });
      await reloadWorkspaceData();
      showToast('Tarea eliminada.');
    } catch (error) { showToast(friendlyError(error), 'error'); }
  }

  async function reloadWorkspaceData() {
    if (!company) return;
    const companyId = encodeURIComponent(company.id);
    const [employeeRows, taskRows, recordRows] = await Promise.all([
      restRequest('employees', { query: `select=*&company_id=eq.${companyId}&order=created_at.desc` }),
      restRequest('tasks', { query: `select=*&company_id=eq.${companyId}&order=due_date.asc.nullslast,created_at.desc` }),
      restRequest('sst_records', { query: `select=*&company_id=eq.${companyId}&order=due_date.asc.nullslast,created_at.desc` })
    ]);
    employees = employeeRows || [];
    tasks = taskRows || [];
    sstRecords = recordRows || [];
    renderAll();
  }

  function bindEvents() {
    $$('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    }));
    document.addEventListener('click', event => {
      const moduleButton = event.target.closest('[data-module]');
      if (!moduleButton) return;
      event.preventDefault();
      switchModule(moduleButton.dataset.module);
    });
    $$('.auth-tab').forEach(button => button.addEventListener('click', () => setAuthTab(button.dataset.authTab)));
    $$('[data-go-signup]').forEach(button => button.addEventListener('click', () => setAuthTab('signup')));
    $('#signup-form').addEventListener('submit', submitSignup);
    $('#login-form').addEventListener('submit', submitLogin);
    $('#reset-form').addEventListener('submit', submitPasswordReset);
    $('#forgot-password').addEventListener('click', requestPasswordReset);
    $('#company-form').addEventListener('submit', submitCompany);
    $('#employee-form').addEventListener('submit', submitEmployee);
    $('#task-form').addEventListener('submit', submitTask);
    $('#record-form').addEventListener('submit', submitRecord);
    $('#logout-button').addEventListener('click', logout);

    $$('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
    $('#toggle-record-form').addEventListener('click', () => openRecordForm());
    $('#empty-add-record').addEventListener('click', () => {
      if ($('#record-search').value && sstRecords.some(record => record.module_key === currentModuleKey)) {
        $('#record-search').value = '';
        renderModuleRecords();
      } else openRecordForm();
    });
    $('#cancel-record').addEventListener('click', () => { resetRecordForm(); toggleForm($('#record-form'), false); });
    $('#cancel-record-text').addEventListener('click', () => { resetRecordForm(); toggleForm($('#record-form'), false); });
    $('#record-search').addEventListener('input', renderModuleRecords);
    $('#record-table-body').addEventListener('click', event => {
      const edit = event.target.closest('[data-record-edit]');
      const remove = event.target.closest('[data-record-delete]');
      const download = event.target.closest('[data-record-download]');
      if (edit) editRecord(edit.dataset.recordEdit);
      if (remove) deleteRecord(remove.dataset.recordDelete);
      if (download) {
        const record = sstRecords.find(item => item.id === download.dataset.recordDownload);
        if (record) downloadPrivateFile(record);
      }
    });
    $('#export-evidence').addEventListener('click', exportEvidenceCsv);
    $('#print-evidence').addEventListener('click', () => window.print());
    $('#request-letter-date').addEventListener('change', updateRequestDeadline);
    $('#request-business-days').addEventListener('input', updateRequestDeadline);
    ['app-rrhh-hours', 'app-rrhh-cost', 'app-sst-hours', 'app-sst-cost', 'app-health-hours', 'app-health-cost', 'app-saved-percent'].forEach(id => {
      $(`#${id}`).addEventListener('input', updateRoiApp);
    });
    $('#employee-search').addEventListener('input', renderEmployees);
    $('#toggle-employee-form').addEventListener('click', () => { resetEmployeeForm(); toggleForm($('#employee-form'), true); });
    $('#empty-add-employee').addEventListener('click', () => { resetEmployeeForm(); toggleForm($('#employee-form'), true); });
    $('#cancel-employee').addEventListener('click', () => { resetEmployeeForm(); toggleForm($('#employee-form'), false); });
    $('#cancel-employee-text').addEventListener('click', () => { resetEmployeeForm(); toggleForm($('#employee-form'), false); });
    $('#toggle-task-form').addEventListener('click', () => { resetTaskForm(); toggleForm($('#task-form'), true); });
    $('#empty-add-task').addEventListener('click', () => { resetTaskForm(); toggleForm($('#task-form'), true); });
    $('#cancel-task').addEventListener('click', () => { resetTaskForm(); toggleForm($('#task-form'), false); });
    $('#cancel-task-text').addEventListener('click', () => { resetTaskForm(); toggleForm($('#task-form'), false); });
    $('#task-filters').addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      taskFilter = button.dataset.filter;
      renderTasks();
    });
    $('#employee-table-body').addEventListener('click', event => {
      const editButton = event.target.closest('[data-employee-edit]');
      const deleteButton = event.target.closest('[data-employee-delete]');
      if (editButton) editEmployee(editButton.dataset.employeeEdit);
      if (deleteButton) deleteEmployee(deleteButton.dataset.employeeDelete);
    });
    $('#task-list').addEventListener('click', event => {
      const toggle = event.target.closest('[data-task-toggle]');
      const edit = event.target.closest('[data-task-edit]');
      const remove = event.target.closest('[data-task-delete]');
      if (toggle) {
        const task = tasks.find(item => item.id === toggle.dataset.taskToggle);
        if (task) updateTask(task.id, { status: task.status === 'done' ? 'pending' : 'done' }, task.status === 'done' ? 'Tarea marcada como pendiente.' : 'Tarea completada.');
      }
      if (edit) editTask(edit.dataset.taskEdit);
      if (remove) deleteTask(remove.dataset.taskDelete);
    });
    $('#task-list').addEventListener('change', event => {
      const select = event.target.closest('[data-task-status]');
      if (select) updateTask(select.dataset.taskStatus, { status: select.value }, 'Estado actualizado.');
    });
    $('#mobile-nav-open').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobile-overlay').classList.add('show'); });
    $('#mobile-nav-close').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#mobile-overlay').classList.remove('show'); });
    $('#mobile-overlay').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#mobile-overlay').classList.remove('show'); });
  }

  async function init() {
    loadTheme();
    bindEvents();
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      hideLoading(); showAuth(); setNotice('Falta configurar la conexión de Supabase en config.js.', 'error'); return;
    }
    parseAuthCallback();
    if (callbackType === 'recovery') {
      showRecoveryForm();
      return;
    }
    if (session?.access_token) {
      try {
        await validSession();
        await loadWorkspace();
      } catch (error) {
        saveSession(null); showAuth(); setAuthTab('login'); setNotice(friendlyError(error), 'info');
      }
    } else {
      showAuth();
      const initialTab = new URLSearchParams(window.location.search).get('registro') === '1' ? 'signup' : 'login';
      setAuthTab(initialTab);
    }
  }

  init();
})();
