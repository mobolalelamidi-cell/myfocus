const API_BASE = getApiBase();

const USER_KEY = "myfocus_user";
const GOALS_KEY = "myfocus_goals";
const LOCAL_USERS_KEY = "myfocus_local_users";
const LOCAL_TASKS_KEY = "myfocus_local_tasks";
const LOCAL_MEMORIES_KEY = "myfocus_local_memories";

const state = {
  user: null,
  selectedDate: localDate(),
  taskFilter: "all",
  todayTasks: [],
  currentMonth: startOfMonth(new Date()),
  monthTasks: {},
  monthMemories: {},
};

document.addEventListener("DOMContentLoaded", () => {
  createIcons();
  initAuth();
  initDashboard();
});

function createIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function getApiBase() {
  const configuredApiBase = String(window.MYFOCUS_API_BASE || "").trim();

  if (configuredApiBase) {
    return configuredApiBase.replace(/\/$/, "");
  }

  if (window.location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "http://localhost/myfocus/backend/api";
  }

  return "";
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function apiPost(endpoint, payload) {
  if (!API_BASE) {
    return localApiPost(endpoint, payload);
  }

  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

async function apiGet(endpoint, params) {
  if (!API_BASE) {
    return localApiGet(endpoint, params);
  }

  const url = new URL(`${API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  let data = {};

  try {
    data = await response.json();
  } catch {
    throw new Error("Réponse API invalide.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Une erreur est survenue.");
  }

  return data;
}

async function localApiPost(endpoint, payload = {}) {
  const action = endpoint.replace(".php", "");

  switch (action) {
    case "register":
      return registerLocalUser(payload);
    case "login":
      return loginLocalUser(payload);
    case "add_task":
      return addLocalTask(payload);
    case "complete_task":
      return completeLocalTask(payload);
    case "delete_task":
      return deleteLocalTask(payload);
    case "update_task":
      return updateLocalTask(payload);
    case "add_memory":
      return addLocalMemory(payload);
    case "delete_memory":
      return deleteLocalMemory(payload);
    case "update_memory":
      return updateLocalMemory(payload);
    default:
      throw new Error("Action locale non disponible.");
  }
}

async function localApiGet(endpoint, params = {}) {
  const action = endpoint.replace(".php", "");

  if (action === "get_tasks") {
    return getLocalTasks(params);
  }

  if (action === "get_memories") {
    return getLocalMemories(params);
  }

  throw new Error("Lecture locale non disponible.");
}

async function registerLocalUser(data) {
  const name = cleanLocalString(data.name || "Utilisateur").slice(0, 100) || "Utilisateur";
  const phone = requiredLocalString(data.phone, "Le téléphone");
  const password = requiredLocalString(data.password, "Le mot de passe");

  validateLocalPhone(phone);
  validateLocalPassword(password);

  const users = getLocalItems(LOCAL_USERS_KEY);
  if (users.some((user) => user.phone === phone)) {
    throw new Error("Ce numéro de téléphone est déjà utilisé.");
  }

  const user = {
    id: nextLocalId(users),
    name,
    phone,
    password: await hashLocalPassword(password),
    created_at: new Date().toISOString(),
  };

  users.push(user);
  saveLocalItems(LOCAL_USERS_KEY, users);

  return {
    success: true,
    message: "Compte créé avec succès.",
    user: publicLocalUser(user),
  };
}

async function loginLocalUser(data) {
  const phone = requiredLocalString(data.phone, "Le téléphone");
  const password = requiredLocalString(data.password, "Le mot de passe");
  const users = getLocalItems(LOCAL_USERS_KEY);
  const user = users.find((item) => item.phone === phone);

  if (!user || !(await verifyLocalPassword(password, user.password))) {
    throw new Error("Téléphone ou mot de passe incorrect.");
  }

  return {
    success: true,
    message: "Connexion réussie.",
    user: publicLocalUser(user),
  };
}

function addLocalTask(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const title = requiredLocalString(data.title, "La tâche").slice(0, 255);
  const date = normalizeLocalDate(data.date);
  const tasks = getLocalItems(LOCAL_TASKS_KEY);
  const now = new Date().toISOString();

  tasks.push({
    id: nextLocalId(tasks),
    user_id: userId,
    title,
    is_completed: 0,
    date,
    created_at: now,
    updated_at: now,
  });

  saveLocalItems(LOCAL_TASKS_KEY, tasks);
  return { success: true, message: "Tâche ajoutée." };
}

function completeLocalTask(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const taskId = requiredLocalInt(data.task_id, "La tâche");
  const tasks = getLocalItems(LOCAL_TASKS_KEY);
  const task = tasks.find((item) => item.user_id === userId && item.id === taskId);

  if (!task) {
    throw new Error("Tâche introuvable.");
  }

  task.is_completed = Number(data.is_completed) === 1 ? 1 : 0;
  task.updated_at = new Date().toISOString();
  saveLocalItems(LOCAL_TASKS_KEY, tasks);
  return { success: true, message: "Tâche mise à jour." };
}

function updateLocalTask(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const taskId = requiredLocalInt(data.task_id, "La tâche");
  const tasks = getLocalItems(LOCAL_TASKS_KEY);
  const task = tasks.find((item) => item.user_id === userId && item.id === taskId);

  if (!task) {
    throw new Error("Tâche introuvable.");
  }

  if (data.title !== undefined) {
    task.title = requiredLocalString(data.title, "La tâche").slice(0, 255);
  }

  if (data.date !== undefined) {
    task.date = normalizeLocalDate(data.date);
  }

  task.updated_at = new Date().toISOString();
  saveLocalItems(LOCAL_TASKS_KEY, tasks);
  return { success: true, message: "Tâche mise à jour." };
}

function deleteLocalTask(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const taskId = requiredLocalInt(data.task_id, "La tâche");
  const tasks = getLocalItems(LOCAL_TASKS_KEY);
  const nextTasks = tasks.filter((task) => !(task.user_id === userId && task.id === taskId));

  saveLocalItems(LOCAL_TASKS_KEY, nextTasks);
  return { success: true, message: "Tâche supprimée." };
}

function getLocalTasks(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const tasks = getLocalItems(LOCAL_TASKS_KEY)
    .filter((task) => task.user_id === userId)
    .map(normalizeLocalTask);
  const filteredTasks = filterLocalDatedItems(tasks, data);
  const sortedTasks = filteredTasks.sort((a, b) => (
    a.date.localeCompare(b.date) || Number(a.is_completed) - Number(b.is_completed) || b.id - a.id
  ));
  const completed = sortedTasks.filter((task) => Number(task.is_completed) === 1).length;
  const total = sortedTasks.length;

  return {
    success: true,
    tasks: sortedTasks,
    grouped: groupLocalItems(sortedTasks),
    stats: {
      total,
      completed,
      pending: total - completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  };
}

function addLocalMemory(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const content = requiredLocalString(data.content, "Le souvenir").slice(0, 5000);
  const mood = cleanLocalString(data.mood || "🙂").slice(0, 16) || "🙂";
  const date = normalizeLocalDate(data.date);
  const memories = getLocalItems(LOCAL_MEMORIES_KEY);
  const now = new Date().toISOString();

  memories.push({
    id: nextLocalId(memories),
    user_id: userId,
    content,
    mood,
    date,
    created_at: now,
    updated_at: now,
  });

  saveLocalItems(LOCAL_MEMORIES_KEY, memories);
  return { success: true, message: "Moment mémorable sauvegardé." };
}

function updateLocalMemory(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const memoryId = requiredLocalInt(data.memory_id, "Le souvenir");
  const memories = getLocalItems(LOCAL_MEMORIES_KEY);
  const memory = memories.find((item) => item.user_id === userId && item.id === memoryId);

  if (!memory) {
    throw new Error("Souvenir introuvable.");
  }

  if (data.content !== undefined) {
    memory.content = requiredLocalString(data.content, "Le souvenir").slice(0, 5000);
  }

  if (data.mood !== undefined) {
    memory.mood = cleanLocalString(data.mood).slice(0, 16) || "🙂";
  }

  if (data.date !== undefined) {
    memory.date = normalizeLocalDate(data.date);
  }

  memory.updated_at = new Date().toISOString();
  saveLocalItems(LOCAL_MEMORIES_KEY, memories);
  return { success: true, message: "Souvenir mis à jour." };
}

function deleteLocalMemory(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const memoryId = requiredLocalInt(data.memory_id, "Le souvenir");
  const memories = getLocalItems(LOCAL_MEMORIES_KEY);
  const nextMemories = memories.filter((memory) => !(memory.user_id === userId && memory.id === memoryId));

  saveLocalItems(LOCAL_MEMORIES_KEY, nextMemories);
  return { success: true, message: "Souvenir supprimé." };
}

function getLocalMemories(data) {
  const userId = requiredLocalInt(data.user_id, "L'utilisateur");
  const memories = getLocalItems(LOCAL_MEMORIES_KEY)
    .filter((memory) => memory.user_id === userId)
    .map(normalizeLocalMemory);
  const filteredMemories = filterLocalDatedItems(memories, data)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  return {
    success: true,
    memories: filteredMemories,
    grouped: groupLocalItems(filteredMemories),
    stats: {
      total: filteredMemories.length,
    },
  };
}

function getLocalItems(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLocalItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function nextLocalId(items) {
  return items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
}

function publicLocalUser(user) {
  return {
    id: Number(user.id),
    name: user.name,
    phone: user.phone,
  };
}

function cleanLocalString(value) {
  return String(value ?? "").trim();
}

function requiredLocalString(value, label) {
  const text = cleanLocalString(value);

  if (!text) {
    throw new Error(`${label} est obligatoire.`);
  }

  return text;
}

function requiredLocalInt(value, label) {
  const number = Number.parseInt(value, 10);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${label} est invalide.`);
  }

  return number;
}

function validateLocalPhone(phone) {
  if (!/^[0-9+\s().-]{6,25}$/.test(phone)) {
    throw new Error("Numéro de téléphone invalide.");
  }
}

function validateLocalPassword(password) {
  if (password.length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  }
}

function normalizeLocalDate(value) {
  const candidate = cleanLocalString(value) || localDate();
  const parsed = parseDate(candidate);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(parsed.getTime()) || localDate(parsed) !== candidate) {
    throw new Error("La date doit être au format YYYY-MM-DD.");
  }

  return candidate;
}

function filterLocalDatedItems(items, data) {
  if (data.month) {
    const month = cleanLocalString(data.month);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error("Le mois doit être au format YYYY-MM.");
    }

    return items.filter((item) => item.date.startsWith(`${month}-`));
  }

  const date = normalizeLocalDate(data.date);
  return items.filter((item) => item.date === date);
}

function groupLocalItems(items) {
  return items.reduce((grouped, item) => {
    grouped[item.date] = grouped[item.date] || [];
    grouped[item.date].push(item);
    return grouped;
  }, {});
}

function normalizeLocalTask(task) {
  return {
    id: Number(task.id),
    user_id: Number(task.user_id),
    title: task.title,
    is_completed: Number(task.is_completed) === 1 ? 1 : 0,
    date: task.date,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

function normalizeLocalMemory(memory) {
  return {
    id: Number(memory.id),
    user_id: Number(memory.user_id),
    content: memory.content,
    mood: memory.mood,
    date: memory.date,
    created_at: memory.created_at,
    updated_at: memory.updated_at,
  };
}

async function hashLocalPassword(password) {
  if (window.crypto?.subtle && typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(password);
    const hash = await window.crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return `sha256:${hex}`;
  }

  return `plain:${password}`;
}

async function verifyLocalPassword(password, storedPassword) {
  return storedPassword === await hashLocalPassword(password) || storedPassword === `plain:${password}`;
}

function showToast(message, type = "success") {
  const toast = qs("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.toggle("is-error", type === "error");
  toast.classList.add("is-visible");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
}

function initAuth() {
  if (!document.body.classList.contains("auth-page")) return;

  if (getStoredUser()) {
    window.location.href = "dashboard.html";
    return;
  }

  qsa("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
  });

  qs("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    setLoading(button, true);

    try {
      const data = await apiPost("login.php", {
        phone: qs("#loginPhone").value.trim(),
        password: qs("#loginPassword").value,
      });
      setStoredUser(data.user);
      window.location.href = "dashboard.html";
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(button, false);
    }
  });

  qs("#registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    setLoading(button, true);

    try {
      const data = await apiPost("register.php", {
        name: qs("#registerName").value.trim() || "Utilisateur",
        phone: qs("#registerPhone").value.trim(),
        password: qs("#registerPassword").value,
      });
      setStoredUser(data.user);
      window.location.href = "dashboard.html";
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(button, false);
    }
  });
}

function switchAuthTab(tab) {
  qsa("[data-auth-tab]").forEach((button) => {
    const isActive = button.dataset.authTab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  qs("#loginForm").classList.toggle("is-active", tab === "login");
  qs("#registerForm").classList.toggle("is-active", tab === "register");
}

function initDashboard() {
  if (!document.body.classList.contains("dashboard-page")) return;

  state.user = getStoredUser();
  if (!state.user) {
    window.location.href = "index.html";
    return;
  }

  hydrateProfile();
  bindDashboardEvents();
  setDateInputs(state.selectedDate);
  setTopDates();
  loadToday();
  loadMemories();
  loadMonth();
  renderGoals();
}

function hydrateProfile() {
  const name = state.user.name || "Utilisateur";
  qs("#profileName").textContent = name;
  qs("#profilePhone").textContent = state.user.phone || "";
  qs("#profileInitial").textContent = name.trim().charAt(0).toUpperCase() || "M";
}

function bindDashboardEvents() {
  qsa("[data-view]").forEach((button) => {
    button.addEventListener("click", () => activateView(button.dataset.view));
  });

  qs("#logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(USER_KEY);
    window.location.href = "index.html";
  });

  qs("#mobileMenuBtn").addEventListener("click", toggleSidebar);
  qs("#sidebarBackdrop").addEventListener("click", toggleSidebar);

  qs("#taskForm").addEventListener("submit", addTask);
  qs("#taskList").addEventListener("change", toggleTask);
  qs("#taskList").addEventListener("click", deleteTask);

  qsa("[data-task-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.taskFilter = button.dataset.taskFilter;
      qsa("[data-task-filter]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderTasks();
    });
  });

  qs("#prevMonthBtn").addEventListener("click", () => changeMonth(-1));
  qs("#nextMonthBtn").addEventListener("click", () => changeMonth(1));
  qs("#calendarGrid").addEventListener("click", selectCalendarDate);
  qs("#openSelectedDateBtn").addEventListener("click", () => {
    setDateInputs(state.selectedDate);
    activateView("today");
    loadToday();
    loadMemories();
  });

  qs("#memoryForm").addEventListener("submit", addMemory);
  qs("#memoryList").addEventListener("click", deleteMemory);

  qs("#goalForm").addEventListener("submit", addGoal);
  qs("#goalList").addEventListener("change", toggleGoal);
  qs("#goalList").addEventListener("click", deleteGoal);
}

function activateView(view) {
  qsa(".view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `view-${view}`);
  });

  qsa("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  const section = qs(`#view-${view}`);
  qs("#pageTitle").textContent = section.dataset.title || "MyFocus";
  qs("#topEyebrow").textContent = section.dataset.eyebrow || "";

  if (view === "planning") loadMonth();
  if (view === "memories") loadMemories();
  if (view === "history") renderHistory();

  closeSidebar();
  createIcons();
}

function toggleSidebar() {
  qs("#sidebar").classList.toggle("is-open");
  qs("#sidebarBackdrop").classList.toggle("is-visible");
}

function closeSidebar() {
  qs("#sidebar").classList.remove("is-open");
  qs("#sidebarBackdrop").classList.remove("is-visible");
}

async function addTask(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  const title = qs("#taskTitle").value.trim();
  const date = qs("#taskDate").value;

  if (!title) return;
  setLoading(button, true);

  try {
    await apiPost("add_task.php", {
      user_id: state.user.id,
      title,
      date,
    });
    qs("#taskTitle").value = "";
    state.selectedDate = date;
    setDateInputs(date);
    await refreshVisibleData();
    showToast("Tâche ajoutée.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setLoading(button, false);
  }
}

async function loadToday() {
  try {
    const data = await apiGet("get_tasks.php", {
      user_id: state.user.id,
      date: state.selectedDate,
    });
    state.todayTasks = data.tasks || [];
    renderProgress(data.stats);
    renderTasks();
    setTopDates();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderTasks() {
  const list = qs("#taskList");
  const tasks = filteredTasks();

  if (tasks.length === 0) {
    list.innerHTML = `<li class="empty-state">Aucune tâche trouvée.</li>`;
    return;
  }

  list.innerHTML = tasks.map((task) => {
    const checked = Number(task.is_completed) === 1;
    return `
      <li class="task-item ${checked ? "is-completed" : ""}">
        <label class="task-main">
          <input type="checkbox" data-task-complete="${task.id}" ${checked ? "checked" : ""}>
          <span class="task-text">
            <strong>${escapeHtml(task.title)}</strong>
            <small>${formatDate(task.date)}</small>
          </span>
        </label>
        <button class="icon-button danger-button" type="button" data-task-delete="${task.id}" aria-label="Supprimer">
          <i data-lucide="trash-2" aria-hidden="true"></i>
        </button>
      </li>
    `;
  }).join("");

  createIcons();
}

function filteredTasks() {
  if (state.taskFilter === "done") {
    return state.todayTasks.filter((task) => Number(task.is_completed) === 1);
  }

  if (state.taskFilter === "pending") {
    return state.todayTasks.filter((task) => Number(task.is_completed) === 0);
  }

  return state.todayTasks;
}

async function toggleTask(event) {
  const checkbox = event.target.closest("[data-task-complete]");
  if (!checkbox) return;

  try {
    await apiPost("complete_task.php", {
      user_id: state.user.id,
      task_id: checkbox.dataset.taskComplete,
      is_completed: checkbox.checked ? 1 : 0,
    });
    await refreshVisibleData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteTask(event) {
  const button = event.target.closest("[data-task-delete]");
  if (!button) return;

  try {
    await apiPost("delete_task.php", {
      user_id: state.user.id,
      task_id: button.dataset.taskDelete,
    });
    await refreshVisibleData();
    showToast("Tâche supprimée.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderProgress(stats = {}) {
  const rawProgress = Number(stats.progress || 0);
  const progress = Number.isFinite(rawProgress) ? rawProgress : 0;
  const boundedProgress = Math.max(0, Math.min(progress, 100));
  qs("#progressRing").style.setProperty("--progress-angle", `${boundedProgress * 3.6}deg`);
  qs("#progressValue").textContent = `${progress}%`;
  qs("#totalTasks").textContent = stats.total || 0;
  qs("#doneTasks").textContent = stats.completed || 0;
  qs("#pendingTasks").textContent = stats.pending || 0;
}

async function addMemory(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  const content = qs("#memoryContent").value.trim();
  const mood = qs("#memoryMood").value;
  const date = qs("#memoryDate").value;

  if (!content) return;
  setLoading(button, true);

  try {
    await apiPost("add_memory.php", {
      user_id: state.user.id,
      content,
      mood,
      date,
    });
    qs("#memoryContent").value = "";
    state.selectedDate = date;
    setDateInputs(date);
    await refreshVisibleData();
    showToast("Moment mémorable sauvegardé.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setLoading(button, false);
  }
}

async function loadMemories() {
  try {
    const data = await apiGet("get_memories.php", {
      user_id: state.user.id,
      date: state.selectedDate,
    });
    renderMemories(data.memories || []);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderMemories(memories) {
  const list = qs("#memoryList");

  if (memories.length === 0) {
    list.innerHTML = `<div class="empty-state">Aucun souvenir pour cette date.</div>`;
    return;
  }

  list.innerHTML = memories.map((memory) => `
    <article class="memory-card">
      <header>
        <strong>${escapeHtml(memory.mood)}</strong>
        <div>
          <time>${formatDate(memory.date)}</time>
          <button class="icon-button danger-button" type="button" data-memory-delete="${memory.id}" aria-label="Supprimer">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      </header>
      <p>${escapeHtml(memory.content)}</p>
    </article>
  `).join("");

  createIcons();
}

async function deleteMemory(event) {
  const button = event.target.closest("[data-memory-delete]");
  if (!button) return;

  try {
    await apiPost("delete_memory.php", {
      user_id: state.user.id,
      memory_id: button.dataset.memoryDelete,
    });
    await refreshVisibleData();
    showToast("Souvenir supprimé.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadMonth() {
  const month = monthKey(state.currentMonth);

  try {
    const [tasks, memories] = await Promise.all([
      apiGet("get_tasks.php", { user_id: state.user.id, month }),
      apiGet("get_memories.php", { user_id: state.user.id, month }),
    ]);

    state.monthTasks = tasks.grouped || {};
    state.monthMemories = memories.grouped || {};
    renderCalendar(tasks.stats || { total: 0, completed: 0 });
    renderAgenda();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderCalendar(stats) {
  const grid = qs("#calendarGrid");
  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const monthTitle = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(firstDay);

  qs("#monthLabel").textContent = monthTitle;
  qs("#monthSummary").textContent = `${stats.total || 0} tâches, ${stats.completed || 0} terminées`;

  const blanks = Array.from({ length: mondayOffset }, () => `<div class="calendar-blank"></div>`);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = localDate(new Date(year, month, day));
    const tasks = state.monthTasks[date] || [];
    const memories = state.monthMemories[date] || [];
    const classes = [
      "calendar-day",
      date === localDate() ? "is-today" : "",
      date === state.selectedDate ? "is-selected" : "",
    ].join(" ");
    const chips = tasks.slice(0, 3).map((task) => (
      `<span class="calendar-chip">${Number(task.is_completed) ? "✓" : "•"} ${escapeHtml(task.title)}</span>`
    )).join("");

    return `
      <button class="${classes}" type="button" data-calendar-date="${date}">
        <span class="calendar-number">
          <span>${day}</span>
          ${tasks.length ? `<span class="calendar-count">${tasks.length}</span>` : ""}
          ${memories.length ? `<span class="calendar-memory-dot" title="Souvenir"></span>` : ""}
        </span>
        <span class="calendar-chips">${chips}</span>
      </button>
    `;
  });

  grid.innerHTML = [...blanks, ...days].join("");
}

function renderAgenda() {
  const date = state.selectedDate;
  const tasks = state.monthTasks[date] || [];
  const memories = state.monthMemories[date] || [];
  const list = qs("#agendaList");

  qs("#agendaTitle").textContent = formatDate(date);

  if (tasks.length === 0 && memories.length === 0) {
    list.innerHTML = `<div class="empty-state">Aucun élément pour cette date.</div>`;
    return;
  }

  const taskItems = tasks.map((task) => `
    <div class="agenda-item">
      <div>
        <strong>${escapeHtml(task.title)}</strong>
        <small>Tâche</small>
      </div>
      <span class="status-pill ${Number(task.is_completed) ? "is-done" : ""}">
        ${Number(task.is_completed) ? "Fait" : "À faire"}
      </span>
    </div>
  `);

  const memoryItems = memories.map((memory) => `
    <div class="agenda-item">
      <div>
        <strong>${escapeHtml(memory.mood)} ${escapeHtml(memory.content)}</strong>
        <small>Souvenir</small>
      </div>
    </div>
  `);

  list.innerHTML = [...taskItems, ...memoryItems].join("");
}

function selectCalendarDate(event) {
  const button = event.target.closest("[data-calendar-date]");
  if (!button) return;

  state.selectedDate = button.dataset.calendarDate;
  setDateInputs(state.selectedDate);
  renderCalendar({
    total: Object.values(state.monthTasks).flat().length,
    completed: Object.values(state.monthTasks).flat().filter((task) => Number(task.is_completed) === 1).length,
  });
  renderAgenda();
}

function changeMonth(step) {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() + step,
    1
  );
  loadMonth();
}

function addGoal(event) {
  event.preventDefault();
  const title = qs("#goalTitle").value.trim();
  const dueDate = qs("#goalDate").value;
  if (!title) return;

  const goals = getGoals();
  goals.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    dueDate,
    isCompleted: false,
    createdAt: new Date().toISOString(),
  });

  saveGoals(goals);
  qs("#goalTitle").value = "";
  qs("#goalDate").value = "";
  renderGoals();
}

function getGoals() {
  try {
    return JSON.parse(localStorage.getItem(`${GOALS_KEY}_${state.user.id}`)) || [];
  } catch {
    return [];
  }
}

function saveGoals(goals) {
  localStorage.setItem(`${GOALS_KEY}_${state.user.id}`, JSON.stringify(goals));
}

function renderGoals() {
  const list = qs("#goalList");
  if (!list) return;

  const goals = getGoals();
  if (goals.length === 0) {
    list.innerHTML = `<li class="empty-state">Aucun objectif enregistré.</li>`;
    return;
  }

  list.innerHTML = goals.map((goal) => `
    <li class="goal-item ${goal.isCompleted ? "is-completed" : ""}">
      <label class="goal-main">
        <input type="checkbox" data-goal-toggle="${goal.id}" ${goal.isCompleted ? "checked" : ""}>
        <span class="goal-text">
          <strong>${escapeHtml(goal.title)}</strong>
          <small>${goal.dueDate ? formatDate(goal.dueDate) : "Sans échéance"}</small>
        </span>
      </label>
      <button class="icon-button danger-button" type="button" data-goal-delete="${goal.id}" aria-label="Supprimer">
        <i data-lucide="trash-2" aria-hidden="true"></i>
      </button>
    </li>
  `).join("");

  createIcons();
}

function toggleGoal(event) {
  const checkbox = event.target.closest("[data-goal-toggle]");
  if (!checkbox) return;

  const goals = getGoals().map((goal) => (
    goal.id === checkbox.dataset.goalToggle
      ? { ...goal, isCompleted: checkbox.checked }
      : goal
  ));
  saveGoals(goals);
  renderGoals();
}

function deleteGoal(event) {
  const button = event.target.closest("[data-goal-delete]");
  if (!button) return;

  saveGoals(getGoals().filter((goal) => goal.id !== button.dataset.goalDelete));
  renderGoals();
}

function renderHistory() {
  const history = [];

  Object.entries(state.monthTasks).forEach(([date, tasks]) => {
    tasks.forEach((task) => {
      history.push({
        date,
        title: task.title,
        type: Number(task.is_completed) ? "Tâche terminée" : "Tâche à faire",
        done: Number(task.is_completed) === 1,
      });
    });
  });

  Object.entries(state.monthMemories).forEach(([date, memories]) => {
    memories.forEach((memory) => {
      history.push({
        date,
        title: `${memory.mood} ${memory.content}`,
        type: "Souvenir",
        done: true,
      });
    });
  });

  history.sort((a, b) => b.date.localeCompare(a.date));

  const list = qs("#historyList");
  if (history.length === 0) {
    list.innerHTML = `<div class="empty-state">Aucun historique pour ce mois.</div>`;
    return;
  }

  list.innerHTML = history.map((item) => `
    <div class="history-item">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${formatDate(item.date)} · ${escapeHtml(item.type)}</small>
      </div>
      <span class="status-pill ${item.done ? "is-done" : ""}">${item.done ? "OK" : "Ouvert"}</span>
    </div>
  `).join("");
}

async function refreshVisibleData() {
  await Promise.all([loadToday(), loadMemories(), loadMonth()]);
  renderHistory();
}

function setDateInputs(date) {
  qs("#taskDate").value = date;
  qs("#memoryDate").value = date;
  state.selectedDate = date;
  setTopDates();
}

function setTopDates() {
  const todayText = formatDate(localDate());
  const selectedText = formatDate(state.selectedDate);
  qs("#currentDateLabel").textContent = todayText;
  qs("#selectedDateLabel").textContent = selectedText;
}

function setLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  button.dataset.originalText = button.dataset.originalText || button.innerHTML;
  button.innerHTML = isLoading ? "Traitement..." : button.dataset.originalText;
  if (!isLoading) createIcons();
}

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date) {
  return localDate(date).slice(0, 7);
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDate(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
