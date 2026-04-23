// db/store.js — lightweight JSON file store (no native deps)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) { return path.join(DATA_DIR, `${name}.json`); }

function read(name) {
  try {
    const f = filePath(name);
    if (!fs.existsSync(f)) return [];
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { return []; }
}

function write(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

// ── USERS ──────────────────────────────────────────────────────────────
const Users = {
  all: () => read('users'),

  findByEmail: (email) => read('users').find(u => u.email === email.toLowerCase()),

  findById: (id) => read('users').find(u => u.id === id),

  create: (user) => {
    const users = read('users');
    users.push(user);
    write('users', users);
    return user;
  },

  updateById: (id, patch) => {
    const users = read('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    write('users', users);
    return users[idx];
  }
};

// ── PROJECTS ────────────────────────────────────────────────────────────
const Projects = {
  byUser: (userId) => read('projects').filter(p => p.userId === userId),

  findById: (id) => read('projects').find(p => p.id === id),

  create: (project) => {
    const projects = read('projects');
    projects.push(project);
    write('projects', projects);
    return project;
  },

  update: (id, patch) => {
    const projects = read('projects');
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...patch, updatedAt: new Date().toISOString() };
    write('projects', projects);
    return projects[idx];
  },

  delete: (id) => {
    const projects = read('projects').filter(p => p.id !== id);
    write('projects', projects);
  }
};

module.exports = { Users, Projects };
