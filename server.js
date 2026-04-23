// server.js — Circuit Architect Pro
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/generate', require('./routes/generate'));

app.get('/health', (req, res) => res.json({
  status: 'ok',
  groq: !!process.env.GROQ_API_KEY,
  anthropic: !!process.env.ANTHROPIC_API_KEY
}));

// SPA fallback
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.listen(PORT, () => {
  console.log(`\n⚡ Circuit Architect Pro running → http://localhost:${PORT}`);
  console.log(`   Groq API: ${process.env.GROQ_API_KEY ? '✓' : '✗ not set'}`);
  console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ not set'}\n`);
});
