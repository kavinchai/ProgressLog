import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

// ── Config ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.FITTRACK_API_URL ?? 'http://localhost:8080/api';
const API_TOKEN = process.env.FITTRACK_API_TOKEN; // JWT for the kavinchai account
const PORT = parseInt(process.env.PORT ?? '3100', 10);

if (!API_TOKEN) {
  console.error('FITTRACK_API_TOKEN is required. Get a JWT by logging in: POST /api/auth/login');
  process.exit(1);
}

// ── API helper ──────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`FitTrack API ${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const mcp = new McpServer(
  { name: 'fittrack', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── Tool: log_weight ────────────────────────────────────────────────────────

mcp.tool(
  'log_weight',
  'Log body weight for a given date. Call this when the user mentions their weight.',
  {
    weightLbs: z.number().positive().describe('Weight in pounds'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
  },
  async ({ weightLbs, date }) => {
    const result = await api('POST', '/weight', {
      logDate: date ?? todayStr(),
      weightLbs,
    });
    return {
      content: [{ type: 'text', text: `Logged weight: ${result.weightLbs} lbs on ${result.logDate}` }],
    };
  },
);

// ── Tool: log_workout ───────────────────────────────────────────────────────

mcp.tool(
  'log_workout',
  'Log a workout session with exercises and sets. Call this when the user mentions exercises, sets, reps, or weights they lifted.',
  {
    sessionName: z.string().optional().describe('Name for the session, e.g. "Push", "Pull", "Legs"'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
    exercises: z.array(z.object({
      exerciseName: z.string().describe('Name of the exercise, e.g. "Bench Press", "Squat"'),
      sets: z.array(z.object({
        setNumber: z.number().int().positive().describe('Set number starting from 1'),
        reps: z.number().int().min(0).describe('Number of reps'),
        weightLbs: z.number().min(0).describe('Weight in pounds'),
      })).describe('Array of sets for this exercise'),
    })).describe('Array of exercises performed'),
  },
  async ({ sessionName, date, exercises }) => {
    const result = await api('POST', '/workouts', {
      sessionDate: date ?? todayStr(),
      sessionName: sessionName ?? null,
      exercises,
    });

    const summary = exercises.map(e => {
      const setsDesc = e.sets.map(s => `${s.reps}@${s.weightLbs}lbs`).join(', ');
      return `• ${e.exerciseName}: ${setsDesc}`;
    }).join('\n');

    return {
      content: [{ type: 'text', text: `Logged workout${sessionName ? ` "${sessionName}"` : ''} on ${result.sessionDate}:\n${summary}` }],
    };
  },
);

// ── Tool: log_meal ──────────────────────────────────────────────────────────

mcp.tool(
  'log_meal',
  'Log a meal with calories and protein. Call this when the user mentions food, eating, meals, calories, or macros.',
  {
    mealName: z.string().optional().describe('Name of the meal, e.g. "Breakfast", "Protein Shake"'),
    calories: z.number().int().min(0).describe('Total calories'),
    proteinGrams: z.number().int().min(0).describe('Protein in grams'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
    dayType: z.enum(['training', 'rest']).optional().describe('Whether this is a training or rest day. Defaults to "training".'),
  },
  async ({ mealName, calories, proteinGrams, date, dayType }) => {
    const logDate = date ?? todayStr();

    // Step 1: Ensure a nutrition day log exists (upsert)
    const dayLog = await api('POST', '/nutrition', {
      logDate,
      dayType: dayType ?? 'training',
      steps: null,
    });

    // Step 2: Add the meal to that day log
    const result = await api('POST', `/nutrition/${dayLog.id}/meals`, {
      mealName: mealName ?? null,
      calories,
      proteinGrams,
    });

    const totalCal = result.totalCalories ?? calories;
    const totalProt = result.totalProtein ?? proteinGrams;

    return {
      content: [{
        type: 'text',
        text: `Logged meal${mealName ? ` "${mealName}"` : ''}: ${calories} kcal, ${proteinGrams}g protein on ${logDate}\nDay totals: ${totalCal} kcal, ${totalProt}g protein`,
      }],
    };
  },
);

// ── Tool: log_steps ─────────────────────────────────────────────────────────

mcp.tool(
  'log_steps',
  'Log step count for a given date. Call this when the user mentions steps or walking.',
  {
    steps: z.number().int().min(0).describe('Number of steps'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
    dayType: z.enum(['training', 'rest']).optional().describe('Whether this is a training or rest day. Defaults to "training".'),
  },
  async ({ steps, date, dayType }) => {
    const logDate = date ?? todayStr();
    const result = await api('POST', '/nutrition', {
      logDate,
      dayType: dayType ?? 'training',
      steps,
    });
    return {
      content: [{ type: 'text', text: `Logged ${steps.toLocaleString()} steps on ${logDate}` }],
    };
  },
);

// ── Tool: get_today_summary ─────────────────────────────────────────────────

mcp.tool(
  'get_today_summary',
  'Get a summary of everything logged today — weight, workouts, and nutrition. Call this when the user asks what they\'ve logged or wants a recap.',
  {},
  async () => {
    const today = todayStr();
    const [weightData, workoutData, nutritionData] = await Promise.all([
      api('GET', '/weight'),
      api('GET', '/workouts'),
      api('GET', '/nutrition'),
    ]);

    const weight = weightData.find(w => w.logDate === today);
    const workout = workoutData.find(w => w.sessionDate === today);
    const nutrition = nutritionData.find(n => n.logDate === today);

    const parts = [];

    parts.push(`📅 Summary for ${today}:\n`);

    if (weight) {
      parts.push(`⚖️ Weight: ${weight.weightLbs} lbs`);
    } else {
      parts.push('⚖️ Weight: not logged');
    }

    if (workout) {
      parts.push(`\n🏋️ Workout${workout.sessionName ? ` (${workout.sessionName})` : ''}:`);
      if (workout.exerciseSets?.length > 0) {
        const grouped = {};
        for (const s of workout.exerciseSets) {
          if (!grouped[s.exerciseName]) grouped[s.exerciseName] = [];
          grouped[s.exerciseName].push(s);
        }
        for (const [name, sets] of Object.entries(grouped)) {
          const desc = sets.map(s => `${s.reps}@${s.weightLbs}lbs`).join(', ');
          parts.push(`  • ${name}: ${desc}`);
        }
      } else {
        parts.push('  No exercises logged');
      }
    } else {
      parts.push('\n🏋️ Workout: not logged');
    }

    if (nutrition) {
      parts.push(`\n🍽️ Nutrition (${nutrition.dayType}):`);
      parts.push(`  Calories: ${nutrition.totalCalories ?? 0} kcal`);
      parts.push(`  Protein: ${nutrition.totalProtein ?? 0}g`);
      if (nutrition.steps != null) {
        parts.push(`  Steps: ${nutrition.steps.toLocaleString()}`);
      }
      if (nutrition.meals?.length > 0) {
        parts.push('  Meals:');
        for (const m of nutrition.meals) {
          parts.push(`    • ${m.mealName || 'Meal'}: ${m.calories} kcal, ${m.proteinGrams}g protein`);
        }
      }
    } else {
      parts.push('\n🍽️ Nutrition: not logged');
    }

    return {
      content: [{ type: 'text', text: parts.join('\n') }],
    };
  },
);

// ── Tool: get_personal_records ──────────────────────────────────────────────

mcp.tool(
  'get_personal_records',
  'Get all personal records (PRs) for each exercise. Call this when the user asks about their PRs or best lifts.',
  {},
  async () => {
    const prs = await api('GET', '/progress/prs');
    if (!prs.length) {
      return { content: [{ type: 'text', text: 'No personal records yet.' }] };
    }
    const lines = prs.map(pr =>
      `• ${pr.exerciseName}: ${parseFloat(pr.maxWeightLbs)} lbs (${pr.achievedDate})`
    );
    return {
      content: [{ type: 'text', text: `🏆 Personal Records:\n${lines.join('\n')}` }],
    };
  },
);

// ── Express + Streamable HTTP transport ─────────────────────────────────────

const app = express();

// Store transports by session ID for stateful connections
const transports = {};

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport for this session
    await transports[sessionId].handleRequest(req, res, req.body);
    return;
  }

  // New session — create a transport
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      delete transports[transport.sessionId];
    }
  };

  await mcp.connect(transport);

  if (transport.sessionId) {
    transports[transport.sessionId] = transport;
  }

  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && transports[sessionId]) {
    await transports[sessionId].handleRequest(req, res);
    return;
  }
  res.status(400).json({ error: 'Missing or invalid session ID' });
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId && transports[sessionId]) {
    await transports[sessionId].handleRequest(req, res);
    return;
  }
  res.status(400).json({ error: 'Missing or invalid session ID' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'fittrack-mcp' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FitTrack MCP server listening on port ${PORT}`);
  console.log(`API target: ${API_BASE}`);
});
