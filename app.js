/* ===================================================================
   PROJECT ESCAPE 2027 — EXECUTION OS
   Vanilla JS SPA · localStorage persistence · modular state
   =================================================================== */

const STORAGE_KEY = "escapeOS.v1";

const DEFAULT_STATE = {
  tasks: [
    { id: uid(), title: "1h Learning", priority: "high", completed: false, order: 0 },
    { id: uid(), title: "1.5h Project Building", priority: "high", completed: false, order: 1 },
    { id: uid(), title: "30m Career Branding", priority: "medium", completed: false, order: 2 },
    { id: uid(), title: "20m Job Applications", priority: "medium", completed: false, order: 3 },
  ],
  projects: [
    { id: uid(), name: "AI Compliance Engine", status: "active", progress: 35, next: "Finish rule-parser module", notes: "Core parsing engine for regulatory rule ingestion.", log: [] },
    { id: uid(), name: "Video AI Director System", status: "planning", progress: 10, next: "Define shot-selection model", notes: "Automated video editing pipeline using vision models.", log: [] },
    { id: uid(), name: "Product Intelligence Tool", status: "active", progress: 20, next: "Wire up analytics ingestion", notes: "Competitive intel scraper + summarizer.", log: [] },
  ],
  jobs: [],
  skills: [
    { id: uid(), name: "Python", level: 4 },
    { id: uid(), name: "API Integration", level: 4 },
    { id: uid(), name: "AI / LLM Systems", level: 3 },
    { id: uid(), name: "Automation Engineering", level: 3 },
    { id: uid(), name: "SQL", level: 1 },
    { id: uid(), name: "Docker", level: 1 },
    { id: uid(), name: "Cloud", level: 1 },
  ],
  progressAreas: [
    { key: "resume", name: "Resume", pct: 40 },
    { key: "linkedin", name: "LinkedIn", pct: 55 },
    { key: "github", name: "GitHub", pct: 30 },
    { key: "skills", name: "Skills", pct: 45 },
    { key: "projects", name: "Projects", pct: 25 },
    { key: "jobapps", name: "Job Apps", pct: 15 },
  ],
  review: { build: "", learn: "", fail: "", next: "", weekOf: currentWeekKey() },
  streak: { count: 0, lastCompletedDate: null, history: {} }, // history: { "YYYY-MM-DD": 0|1|2|3 }
};

let state = loadState();
let currentSection = "dashboard";
let currentQaType = "task";
let jobView = "list";
let jobFilter = "all";
let dragSrcId = null;

/* ---------------- utils ---------------- */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function currentWeekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch (e) {
    console.warn("state load failed, using defaults", e);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------------- navigation ---------------- */

function goTo(section) {
  currentSection = section;
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  document.getElementById(`section-${section}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((n) => {
    n.classList.toggle("active", n.dataset.section === section);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------- render: dashboard ---------------- */

function overallCompletion() {
  const areas = state.progressAreas.map((a) => a.pct);
  if (!areas.length) return 0;
  return Math.round(areas.reduce((a, b) => a + b, 0) / areas.length);
}

function renderHero() {
  document.getElementById("today-date").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  document.getElementById("streak-count").textContent = state.streak.count;

  const pct = overallCompletion();
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (pct / 100) * circumference;
  const ring = document.getElementById("hero-ring");
  ring.setAttribute("stroke-dasharray", circumference.toFixed(1));
  ring.setAttribute("stroke-dashoffset", offset.toFixed(1));
  document.getElementById("hero-ring-pct").textContent = pct + "%";

  const list = document.getElementById("hero-focus-list");
  const sorted = [...state.tasks].sort((a, b) => a.order - b.order);
  if (!sorted.length) {
    list.innerHTML = `<div class="hero-focus-item"><span class="dot"></span>No tasks yet — add one</div>`;
  } else {
    list.innerHTML = sorted.slice(0, 5).map((t) => `
      <div class="hero-focus-item ${t.completed ? "done" : ""}">
        <span class="dot"></span>${escapeHtml(t.title)}
      </div>
    `).join("");
  }
}

function renderProgressGrid() {
  const grid = document.getElementById("progress-grid");
  grid.innerHTML = state.progressAreas.map((a) => `
    <div class="progress-item">
      <div class="progress-item-top">
        <div class="progress-item-name">${escapeHtml(a.name)}</div>
        <div class="progress-item-pct">${a.pct}%</div>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${a.pct}%"></div></div>
      <input type="range" min="0" max="100" value="${a.pct}" oninput="updateProgressArea('${a.key}', this.value)" />
    </div>
  `).join("");
}

function updateProgressArea(key, val) {
  const area = state.progressAreas.find((a) => a.key === key);
  if (!area) return;
  area.pct = Number(val);
  saveState();
  renderProgressGrid();
  renderHero();
}

function renderHeatmap() {
  const el = document.getElementById("heatmap");
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  el.innerHTML = days.map((d) => {
    const key = todayKey(d);
    const level = state.streak.history[key] || 0;
    const isToday = key === todayKey();
    const cls = level >= 3 ? "l3" : level === 2 ? "l2" : level === 1 ? "l1" : "";
    return `<div class="heat-cell ${cls} ${isToday ? "today" : ""}" title="${key}"></div>`;
  }).join("");
}

function renderDashProjects() {
  const el = document.getElementById("dash-projects");
  const active = state.projects.filter((p) => p.status === "active").slice(0, 3);
  if (!active.length) {
    el.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">📁</div><div class="empty-state-text">No active projects. Add one from the Projects tab.</div></div></div>`;
    return;
  }
  el.innerHTML = active.map((p) => projectCardHtml(p, true)).join("");
}

/* ---------------- render: tasks ---------------- */

function renderTasks() {
  const el = document.getElementById("task-list");
  const empty = document.getElementById("task-empty");
  const sorted = [...state.tasks].sort((a, b) => a.order - b.order);
  if (!sorted.length) {
    el.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  el.innerHTML = sorted.map((t) => `
    <div class="task-row ${t.completed ? "completed" : ""}" draggable="true"
         data-id="${t.id}"
         ondragstart="onDragStart(event,'${t.id}')"
         ondragover="onDragOver(event)"
         ondrop="onDrop(event,'${t.id}')"
         ondragend="onDragEnd(event)">
      <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
      <button class="checkbox ${t.completed ? "checked" : ""}" onclick="toggleTask('${t.id}')" aria-label="Toggle complete">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="#0b0f1a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta"><span class="tag ${t.priority}">${t.priority}</span></div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" onclick="editTask('${t.id}')" aria-label="Edit">✎</button>
        <button class="icon-btn danger" onclick="deleteTask('${t.id}')" aria-label="Delete">🗑</button>
      </div>
    </div>
  `).join("");
}

function toggleTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveState();
  updateStreakForToday();
  renderTasks();
  renderHero();
  renderHeatmap();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  state.tasks.forEach((t, i) => (t.order = i));
  saveState();
  renderTasks();
  renderHero();
}

function editTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  openQuickAdd("task");
  document.getElementById("t-title").value = t.title;
  document.getElementById("t-edit-id").value = t.id;
  document.querySelectorAll("#t-priority button").forEach((b) => b.classList.toggle("active", b.dataset.val === t.priority));
  document.querySelector('#modal-overlay .modal-title').textContent = "Edit Task";
}

/* drag reorder */
function onDragStart(e, id) {
  dragSrcId = id;
  e.currentTarget.classList.add("dragging");
}
function onDragOver(e) { e.preventDefault(); }
function onDrop(e, targetId) {
  e.preventDefault();
  if (!dragSrcId || dragSrcId === targetId) return;
  const sorted = [...state.tasks].sort((a, b) => a.order - b.order);
  const srcIdx = sorted.findIndex((t) => t.id === dragSrcId);
  const tgtIdx = sorted.findIndex((t) => t.id === targetId);
  const [moved] = sorted.splice(srcIdx, 1);
  sorted.splice(tgtIdx, 0, moved);
  sorted.forEach((t, i) => (t.order = i));
  state.tasks = sorted;
  saveState();
  renderTasks();
  renderHero();
}
function onDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  dragSrcId = null;
}

/* streak logic: mark today "done" level based on completion ratio */
function updateStreakForToday() {
  const key = todayKey();
  const total = state.tasks.length || 1;
  const done = state.tasks.filter((t) => t.completed).length;
  const ratio = done / total;
  const level = ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : ratio > 0 ? 1 : 0;
  state.streak.history[key] = level;

  if (ratio >= 1) {
    const last = state.streak.lastCompletedDate;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = todayKey(y);
    if (last === key) {
      // already counted today
    } else if (last === yKey) {
      state.streak.count += 1;
      state.streak.lastCompletedDate = key;
    } else {
      state.streak.count = 1;
      state.streak.lastCompletedDate = key;
    }
  }
  saveState();
}

/* ---------------- render: projects ---------------- */

function statusClass(s) {
  return { active: "status-active", planning: "status-planning", blocked: "status-blocked", done: "status-done" }[s] || "status-planning";
}

function projectCardHtml(p, compact = false) {
  return `
    <div class="card project-card">
      <div class="project-head">
        <div class="project-name">${escapeHtml(p.name)}</div>
        <div class="project-status ${statusClass(p.status)}">${p.status}</div>
      </div>
      <div class="bar-track" style="margin-top:12px"><div class="bar-fill" style="width:${p.progress}%"></div></div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-faint);margin-top:6px">${p.progress}% complete</div>
      ${p.next ? `<div class="project-next">➜ ${escapeHtml(p.next)}</div>` : ""}
      ${!compact && p.notes ? `<div class="project-notes">${escapeHtml(p.notes)}</div>` : ""}
      ${!compact ? `
      <div class="project-foot">
        <button class="btn btn-ghost btn-sm" onclick="editProject('${p.id}')">Edit</button>
        <button class="icon-btn danger" onclick="deleteProject('${p.id}')" aria-label="Delete">🗑</button>
      </div>` : ""}
    </div>
  `;
}

function renderProjects() {
  const el = document.getElementById("project-list");
  const empty = document.getElementById("project-empty");
  if (!state.projects.length) {
    el.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  el.innerHTML = state.projects.map((p) => projectCardHtml(p, false)).join("");
}

function deleteProject(id) {
  state.projects = state.projects.filter((p) => p.id !== id);
  saveState();
  renderProjects();
  renderDashProjects();
}

function editProject(id) {
  const p = state.projects.find((x) => x.id === id);
  if (!p) return;
  openQuickAdd("project");
  document.getElementById("p-name").value = p.name;
  document.getElementById("p-status").value = p.status;
  document.getElementById("p-progress").value = p.progress;
  document.getElementById("p-progress-val").textContent = p.progress;
  document.getElementById("p-next").value = p.next || "";
  document.getElementById("p-notes").value = p.notes || "";
  document.getElementById("p-edit-id").value = p.id;
  document.querySelector('#modal-overlay .modal-title').textContent = "Edit Project";
}

/* ---------------- render: skills ---------------- */

function renderSkills() {
  const el = document.getElementById("skill-list");
  if (!state.skills.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🧬</div><div class="empty-state-text">No skills tracked yet.</div></div>`;
    return;
  }
  const labels = ["New", "Beginner", "Working", "Proficient", "Advanced", "Expert"];
  el.innerHTML = state.skills.map((s) => `
    <div class="skill-row">
      <div class="skill-top">
        <div class="skill-name">${escapeHtml(s.name)}</div>
        <div class="skill-level">${labels[s.level] || s.level}</div>
      </div>
      <div class="dots">
        ${[1,2,3,4,5].map((n) => `<div class="dot-pip ${n <= s.level ? "filled" : ""}" onclick="setSkillLevel('${s.id}', ${n})"></div>`).join("")}
      </div>
    </div>
  `).join("");
}

function setSkillLevel(id, level) {
  const s = state.skills.find((x) => x.id === id);
  if (!s) return;
  s.level = s.level === level ? level - 1 : level;
  saveState();
  renderSkills();
}

/* ---------------- render: jobs ---------------- */

const JOB_STATUSES = [
  { key: "all", label: "All" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "rejected", label: "Rejected" },
  { key: "offer", label: "Offer" },
];

function renderJobFilters() {
  const el = document.getElementById("job-filters");
  el.innerHTML = JOB_STATUSES.map((s) => `
    <button class="filter-chip ${jobFilter === s.key ? "active" : ""}" onclick="setJobFilter('${s.key}')">${s.label}</button>
  `).join("");
}

function setJobFilter(key) {
  jobFilter = key;
  renderJobFilters();
  renderJobs();
}

function setJobView(v) {
  jobView = v;
  document.getElementById("view-list-btn").classList.toggle("active", v === "list");
  document.getElementById("view-kanban-btn").classList.toggle("active", v === "kanban");
  document.getElementById("job-list-view").classList.toggle("hidden", v !== "list");
  document.getElementById("job-kanban-view").classList.toggle("hidden", v !== "kanban");
  renderJobs();
}

function jobCardHtml(j) {
  return `
    <div class="card job-card">
      <div class="job-head">
        <div>
          <div class="job-role">${escapeHtml(j.role)}</div>
          <div class="job-company">${escapeHtml(j.company)}</div>
          ${j.country ? `<div class="job-country">📍 ${escapeHtml(j.country)}</div>` : ""}
        </div>
        <div class="job-badge badge-${j.status}">${j.status}</div>
      </div>
      ${j.tags && j.tags.length ? `<div class="job-tags">${j.tags.map((t) => `<span class="tag low">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
      ${j.followup ? `<div class="job-followup">⏰ Follow up: ${j.followup}</div>` : ""}
      ${j.notes ? `<div class="job-notes">${escapeHtml(j.notes)}</div>` : ""}
      <div class="job-foot">
        <button class="btn btn-ghost btn-sm" onclick="editJob('${j.id}')">Edit</button>
        <button class="icon-btn danger" onclick="deleteJob('${j.id}')" aria-label="Delete">🗑</button>
      </div>
    </div>
  `;
}

function renderJobs() {
  const filtered = jobFilter === "all" ? state.jobs : state.jobs.filter((j) => j.status === jobFilter);
  const empty = document.getElementById("job-empty");
  empty.classList.toggle("hidden", state.jobs.length > 0);

  if (jobView === "list") {
    document.getElementById("job-list-view").innerHTML = filtered.map(jobCardHtml).join("");
  } else {
    const cols = ["applied", "interview", "rejected", "offer"];
    document.getElementById("job-kanban-view").innerHTML = cols.map((c) => `
      <div class="kanban-col">
        <div class="kanban-col-title">${c} (${state.jobs.filter((j) => j.status === c).length})</div>
        ${state.jobs.filter((j) => j.status === c).map((j) => `
          <div class="kanban-card" onclick="editJob('${j.id}')">
            <strong>${escapeHtml(j.role)}</strong><br/>
            <span style="color:var(--text-dim)">${escapeHtml(j.company)}</span>
          </div>
        `).join("")}
      </div>
    `).join("");
  }
}

function deleteJob(id) {
  state.jobs = state.jobs.filter((j) => j.id !== id);
  saveState();
  renderJobs();
  updateJobsProgressArea();
}

function editJob(id) {
  const j = state.jobs.find((x) => x.id === id);
  if (!j) return;
  openQuickAdd("job");
  document.getElementById("j-company").value = j.company;
  document.getElementById("j-role").value = j.role;
  document.getElementById("j-country").value = j.country || "";
  document.getElementById("j-status").value = j.status;
  document.getElementById("j-followup").value = j.followup || "";
  document.getElementById("j-tags").value = (j.tags || []).join(", ");
  document.getElementById("j-notes").value = j.notes || "";
  document.getElementById("j-edit-id").value = j.id;
  document.querySelector('#modal-overlay .modal-title').textContent = "Edit Application";
}

function updateJobsProgressArea() {
  const area = state.progressAreas.find((a) => a.key === "jobapps");
  if (!area) return;
  area.pct = Math.min(100, state.jobs.length * 8);
  saveState();
  renderProgressGrid();
  renderHero();
}

/* ---------------- weekly review ---------------- */

function loadReview() {
  document.getElementById("review-week-label").textContent = `Week of ${state.review.weekOf}`;
  document.getElementById("review-build").value = state.review.build;
  document.getElementById("review-learn").value = state.review.learn;
  document.getElementById("review-fail").value = state.review.fail;
  document.getElementById("review-next").value = state.review.next;
}

let reviewSaveTimeout;
function bindReviewAutosave() {
  ["build", "learn", "fail", "next"].forEach((field) => {
    document.getElementById(`review-${field}`).addEventListener("input", (e) => {
      state.review[field] = e.target.value;
      clearTimeout(reviewSaveTimeout);
      reviewSaveTimeout = setTimeout(() => {
        saveState();
        const ind = document.getElementById("save-indicator");
        ind.classList.add("show");
        setTimeout(() => ind.classList.remove("show"), 1200);
      }, 500);
    });
  });
}

/* ---------------- quick add modal ---------------- */

function openQuickAdd(type) {
  currentQaType = type || "task";
  document.getElementById("modal-overlay").classList.add("open");

  if (currentQaType === "skill") {
    document.getElementById("form-task").classList.add("hidden");
    document.getElementById("form-project").classList.add("hidden");
    document.getElementById("form-job").classList.add("hidden");
    document.getElementById("form-skill").classList.remove("hidden");
    document.getElementById("qa-tabs").classList.add("hidden");
    return;
  }
  document.getElementById("qa-tabs").classList.remove("hidden");
  document.getElementById("form-skill").classList.add("hidden");
  switchQaType(currentQaType);
}

function switchQaType(type) {
  currentQaType = type;
  document.querySelectorAll("#qa-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.type === type));
  document.getElementById("form-task").classList.toggle("hidden", type !== "task");
  document.getElementById("form-project").classList.toggle("hidden", type !== "project");
  document.getElementById("form-job").classList.toggle("hidden", type !== "job");
  document.querySelector('#modal-overlay .modal-title').textContent =
    type === "task" ? "New Task" : type === "project" ? "New Project" : "New Job Application";
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  ["form-task", "form-project", "form-job", "form-skill"].forEach((f) => document.getElementById(f).reset());
  document.getElementById("t-edit-id").value = "";
  document.getElementById("p-edit-id").value = "";
  document.getElementById("j-edit-id").value = "";
  document.querySelectorAll("#t-priority button").forEach((b) => b.classList.toggle("active", b.dataset.val === "medium"));
  document.getElementById("p-progress-val").textContent = "0";
}

function pickPill(btn) {
  btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

/* ---------------- form submit handlers ---------------- */

function saveTask(e) {
  e.preventDefault();
  const title = document.getElementById("t-title").value.trim();
  if (!title) return false;
  const priority = document.querySelector("#t-priority button.active")?.dataset.val || "medium";
  const editId = document.getElementById("t-edit-id").value;

  if (editId) {
    const t = state.tasks.find((x) => x.id === editId);
    if (t) { t.title = title; t.priority = priority; }
  } else {
    state.tasks.push({ id: uid(), title, priority, completed: false, order: state.tasks.length });
  }
  saveState();
  renderTasks();
  renderHero();
  closeModal();
  return false;
}

function saveProject(e) {
  e.preventDefault();
  const name = document.getElementById("p-name").value.trim();
  if (!name) return false;
  const status = document.getElementById("p-status").value;
  const progress = Number(document.getElementById("p-progress").value);
  const next = document.getElementById("p-next").value.trim();
  const notes = document.getElementById("p-notes").value.trim();
  const editId = document.getElementById("p-edit-id").value;

  if (editId) {
    const p = state.projects.find((x) => x.id === editId);
    if (p) Object.assign(p, { name, status, progress, next, notes });
  } else {
    state.projects.push({ id: uid(), name, status, progress, next, notes, log: [] });
  }
  saveState();
  renderProjects();
  renderDashProjects();
  updateProjectsProgressArea();
  closeModal();
  return false;
}

function updateProjectsProgressArea() {
  const area = state.progressAreas.find((a) => a.key === "projects");
  if (!area || !state.projects.length) return;
  area.pct = Math.round(state.projects.reduce((sum, p) => sum + p.progress, 0) / state.projects.length);
  saveState();
  renderProgressGrid();
  renderHero();
}

function saveJob(e) {
  e.preventDefault();
  const company = document.getElementById("j-company").value.trim();
  const role = document.getElementById("j-role").value.trim();
  if (!company || !role) return false;
  const country = document.getElementById("j-country").value.trim();
  const status = document.getElementById("j-status").value;
  const followup = document.getElementById("j-followup").value;
  const tags = document.getElementById("j-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
  const notes = document.getElementById("j-notes").value.trim();
  const editId = document.getElementById("j-edit-id").value;

  if (editId) {
    const j = state.jobs.find((x) => x.id === editId);
    if (j) Object.assign(j, { company, role, country, status, followup, tags, notes });
  } else {
    state.jobs.push({ id: uid(), company, role, country, status, followup, tags, notes });
  }
  saveState();
  renderJobs();
  updateJobsProgressArea();
  closeModal();
  return false;
}

function saveSkill(e) {
  e.preventDefault();
  const name = document.getElementById("s-name").value.trim();
  if (!name) return false;
  state.skills.push({ id: uid(), name, level: 1 });
  saveState();
  renderSkills();
  closeModal();
  return false;
}

/* ---------------- reset ---------------- */

function confirmReset() {
  if (confirm("This will permanently erase all tasks, projects, jobs, skills and reviews on this device. Continue?")) {
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(DEFAULT_STATE);
    saveState();
    renderAll();
  }
}

/* ---------------- render all ---------------- */

function renderAll() {
  renderHero();
  renderProgressGrid();
  renderHeatmap();
  renderDashProjects();
  renderTasks();
  renderProjects();
  renderSkills();
  renderJobFilters();
  renderJobs();
  loadReview();
}

/* ---------------- init ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  // migrate stale week
  if (state.review.weekOf !== currentWeekKey()) {
    state.review = { build: "", learn: "", fail: "", next: "", weekOf: currentWeekKey() };
    saveState();
  }
  renderAll();
  bindReviewAutosave();
  updateStreakForToday();
  renderHero();
  renderHeatmap();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("SW registration failed", err));
  }
});
