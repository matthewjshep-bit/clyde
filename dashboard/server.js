const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: run shell command and return promise
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 15000, shell: '/bin/zsh' }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, error: err.message, stderr, stdout });
      } else {
        resolve({ ok: true, stdout, stderr });
      }
    });
  });
}

// GET /api/cron → openclaw cron list --json
app.get('/api/cron', async (req, res) => {
  const result = await run('openclaw cron list --json');
  if (result.ok) {
    try {
      const data = JSON.parse(result.stdout);
      res.json({ ok: true, data });
    } catch (e) {
      // Return raw text if not valid JSON
      res.json({ ok: true, raw: result.stdout });
    }
  } else {
    res.json({ ok: false, error: result.error, raw: result.stdout + result.stderr });
  }
});

// GET /api/channels → openclaw channels status
app.get('/api/channels', async (req, res) => {
  const result = await run('openclaw channels status');
  res.json({ ok: result.ok, raw: result.stdout + (result.stderr || ''), error: result.error });
});

// GET /api/logs → parse all log files, return structured daily+hourly summaries
app.get('/api/logs', async (req, res) => {
  const logDir = '/tmp/openclaw';

  // Find all log files
  const listResult = await run(`ls ${logDir}/openclaw-*.log 2>/dev/null | sort`);
  if (!listResult.ok || !listResult.stdout.trim()) {
    return res.json({ ok: false, days: [], error: 'No log files found' });
  }

  const logFiles = listResult.stdout.trim().split('\n').filter(Boolean);
  const days = [];

  for (const logFile of logFiles) {
    const dateMatch = logFile.match(/openclaw-(\d{4}-\d{2}-\d{2})\.log/);
    if (!dateMatch) continue;
    const date = dateMatch[1];

    let raw = '';
    try {
      raw = fs.readFileSync(logFile, 'utf8');
    } catch (e) { continue; }

    const lines = raw.split('\n').filter(Boolean);
    const hourBuckets = {};

    for (const line of lines) {
      let entry;
      try { entry = JSON.parse(line); } catch (e) { continue; }

      const time = entry.time || entry._meta?.date;
      if (!time) continue;

      const dt = new Date(time);
      const hour = dt.getHours();
      const hourKey = `${String(hour).padStart(2,'0')}:00`;

      if (!hourBuckets[hourKey]) hourBuckets[hourKey] = [];

      // Extract a clean message
      const level = entry._meta?.logLevelName || 'INFO';
      let msg = '';
      if (typeof entry['1'] === 'string') msg = entry['1'];
      else if (typeof entry['0'] === 'string' && !entry['0'].startsWith('{')) msg = entry['0'];
      else if (typeof entry['1'] === 'object') msg = JSON.stringify(entry['1']);

      // Skip noisy/boring entries
      if (!msg) continue;
      if (msg.includes('tools.profile') && msg.includes('allowlist contains unknown')) continue;
      if (msg.includes('autoSelectFamily') || msg.includes('dnsResultOrder')) continue;
      if (msg.includes('DeprecationWarning')) continue;

      hourBuckets[hourKey].push({ level, msg: msg.slice(0, 200), time: dt.toISOString() });
    }

    // Summarize each hour bucket
    const hours = Object.keys(hourBuckets).sort().map(hourKey => {
      const entries = hourBuckets[hourKey];
      const summary = summarizeHour(entries);
      return { hour: hourKey, count: entries.length, summary, entries: entries.slice(0, 20) };
    });

    days.push({ date, file: logFile, hours, totalEvents: lines.length });
  }

  res.json({ ok: true, days: days.reverse() }); // newest day first
});

function summarizeHour(entries) {
  const bullets = new Set();

  for (const e of entries) {
    const m = e.msg;
    if (m.includes('gateway') && m.includes('listening')) bullets.add('Gateway started');
    else if (m.includes('SIGTERM') || m.includes('shutting down')) bullets.add('Gateway stopped/restarted');
    else if (m.includes('discord') && m.includes('connected')) bullets.add('Discord connected');
    else if (m.includes('discord') && m.includes('disconnected')) bullets.add('Discord disconnected');
    else if (m.includes('discord') && m.includes('starting provider')) bullets.add('Discord bot started');
    else if (m.includes('telegram') && m.includes('starting provider')) bullets.add('Telegram bot started');
    else if (m.includes('webchat connected')) bullets.add('Dashboard/webchat session opened');
    else if (m.includes('webchat disconnected')) bullets.add('Dashboard/webchat session closed');
    else if (m.includes('cron') && m.includes('started')) bullets.add('Cron scheduler started');
    else if (m.includes('cron') && m.includes('run')) bullets.add('Cron job triggered');
    else if (m.includes('config change')) bullets.add('Config updated');
    else if (m.includes('channels.discord')) bullets.add('Discord config changed');
    else if (m.includes('heartbeat')) bullets.add('Heartbeat tick');
    else if (m.includes('deploy-commands') && m.includes('done')) bullets.add('Discord slash commands deployed');
    else if (m.includes('agent model:')) {
      const model = m.replace('agent model:', '').trim();
      bullets.add(`Agent model: ${model}`);
    }
    else if (e.level === 'ERROR') bullets.add(`Error: ${m.slice(0, 80)}`);
    else if (e.level === 'WARN' && !m.includes('tools.profile')) bullets.add(`Warning: ${m.slice(0, 80)}`);
  }

  return Array.from(bullets).slice(0, 8);
}

// GET /api/config → openclaw config get --json
app.get('/api/config', async (req, res) => {
  const result = await run('openclaw config get --json');
  if (result.ok) {
    try {
      const data = JSON.parse(result.stdout);
      res.json({ ok: true, data });
    } catch (e) {
      res.json({ ok: true, raw: result.stdout });
    }
  } else {
    res.json({ ok: false, error: result.error, raw: result.stdout + result.stderr });
  }
});

// POST /api/cron/:id/run → openclaw cron run <id>
app.post('/api/cron/:id/run', async (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9_\-]/g, ''); // sanitize
  if (!id) return res.status(400).json({ ok: false, error: 'Invalid job ID' });

  const result = await run(`openclaw cron run ${id}`);
  res.json({ ok: result.ok, output: result.stdout + (result.stderr || ''), error: result.error });
});

app.listen(PORT, () => {
  console.log(`🤠 OpenClaw Dashboard running at http://localhost:${PORT}`);
});
