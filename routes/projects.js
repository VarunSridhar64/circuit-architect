// routes/projects.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Projects } = require('../db/store');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/projects
router.get('/', (req, res) => {
  const projects = Projects.byUser(req.user.id);
  res.json(projects.map(p => ({
    id: p.id, name: p.name, prompt: p.prompt,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
    thumbnail: p.thumbnail
  })));
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, prompt, circuit } = req.body;
  if (!name || !circuit) return res.status(400).json({ error: 'name and circuit required' });

  const project = {
    id: uuidv4(),
    userId: req.user.id,
    name: name.trim(),
    prompt: prompt || '',
    circuit,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  Projects.create(project);
  res.json(project);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const p = Projects.findById(req.params.id);
  if (!p || p.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const p = Projects.findById(req.params.id);
  if (!p || p.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
  const updated = Projects.update(req.params.id, {
    name: req.body.name || p.name,
    circuit: req.body.circuit || p.circuit,
    prompt: req.body.prompt || p.prompt
  });
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const p = Projects.findById(req.params.id);
  if (!p || p.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
  Projects.delete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
