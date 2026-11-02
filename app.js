(() => {
  'use strict';

  const config = window.NEXO_CONFIG || {};
  const SUPABASE_URL = (config.supabaseUrl || '').replace(/\/$/, '');
  const SUPABASE_KEY = config.supabasePublishableKey || '';
  const STORAGE_KEY = 'nexo_sst_auth_v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let session = readSession();
  let currentUser = null;
  let company = null;
  let employees = [];
  let tasks = [];
  let taskFilter = 'all';
  let toastTimer = null;
  let callbackType = null;
  let pendingConfirmEmail = '';

  function readSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
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
    const validViews = ['dashboard', 'company', 'employees', 'tasks'];
    if (!validViews.includes(view)) return;
    $$('.view-section').forEach(section => section.classList.toggle('hidden', section.id !== `view-${view}`));
    $$('.side-link').forEach(link => link.classList.toggle('active', link.dataset.view === view));
    const titles = { dashboard: 'Resumen', company: 'Mi empresa', employees: 'Personal', tasks: 'Tareas' };
    $('#page-title').textContent = titles[view];
    $('#breadcrumb-current').textContent = titles[view];
    $('#sidebar').classList.remove('open');
    $('#mobile-overlay').classList.remove('show');
    if (view === 'company') fillCompanyForm();
    if (view === 'employees') renderEmployees();
    if (view === 'tasks') renderTasks();
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
      const [employeeRows, taskRows] = await Promise.all([
        restRequest('employees', { query: `select=*&company_id=eq.${companyId}&order=created_at.desc` }),
        restRequest('tasks', { query: `select=*&company_id=eq.${companyId}&order=due_date.asc.nullslast,created_at.desc` })
      ]);
      employees = employeeRows || [];
      tasks = taskRows || [];
    } else {
      employees = [];
      tasks = [];
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
    currentUser = null; company = null; employees = []; tasks = [];
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
    const [employeeRows, taskRows] = await Promise.all([
      restRequest('employees', { query: `select=*&company_id=eq.${companyId}&order=created_at.desc` }),
      restRequest('tasks', { query: `select=*&company_id=eq.${companyId}&order=due_date.asc.nullslast,created_at.desc` })
    ]);
    employees = employeeRows || [];
    tasks = taskRows || [];
    renderAll();
  }

  function bindEvents() {
    $$('.auth-tab').forEach(button => button.addEventListener('click', () => setAuthTab(button.dataset.authTab)));
    $$('[data-go-signup]').forEach(button => button.addEventListener('click', () => setAuthTab('signup')));
    $('#signup-form').addEventListener('submit', submitSignup);
    $('#login-form').addEventListener('submit', submitLogin);
    $('#reset-form').addEventListener('submit', submitPasswordReset);
    $('#forgot-password').addEventListener('click', requestPasswordReset);
    $('#company-form').addEventListener('submit', submitCompany);
    $('#employee-form').addEventListener('submit', submitEmployee);
    $('#task-form').addEventListener('submit', submitTask);
    $('#logout-button').addEventListener('click', logout);

    $$('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
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
