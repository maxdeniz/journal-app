const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app       = express();
const PORT      = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_PATH || path.join('/data', 'entries.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadEntries() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function saveEntries(entries) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

// GET all entries
app.get('/api/entries', (req, res) => {
  res.json(loadEntries());
});

// POST new entry — called by Telegram bot
app.post('/api/entries', (req, res) => {
  const entries = loadEntries();
  const entry   = { ...req.body, id: Date.now().toString() };
  const idx     = entries.findIndex(e => e.date === entry.date);
  if (idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);
  saveEntries(entries);
  console.log(`[${new Date().toISOString()}] Entry saved: ${entry.date} — ${entry.headline}`);
  res.json({ ok: true, entry });
});

// PUT — update existing entry (for inline edits)
app.put('/api/entries/:id', (req, res) => {
  const entries = loadEntries();
  const idx     = entries.findIndex(e => e.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, error: 'Not found' });
  entries[idx]  = { ...entries[idx], ...req.body, id: req.params.id };
  saveEntries(entries);
  console.log(`[${new Date().toISOString()}] Entry updated: ${entries[idx].date}`);
  res.json({ ok: true, entry: entries[idx] });
});

// DELETE entry
app.delete('/api/entries/:id', (req, res) => {
  const entries = loadEntries().filter(e => e.id !== req.params.id);
  saveEntries(entries);
  res.json({ ok: true });
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true, entries: loadEntries().length }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Journal app running on port ${PORT}`);
});
