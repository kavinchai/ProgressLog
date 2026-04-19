import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

// ── Config ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.FITTRACK_API_URL ?? 'http://localhost:8080/api';
const API_KEY = process.env.FITTRACK_API_KEY; // Non-expiring API key for the kavinchai account
const PORT = parseInt(process.env.PORT ?? '3100', 10);

if (!API_KEY) {
  console.error('FITTRACK_API_KEY is required. Generate one: POST /api/auth/api-key (with Bearer token)');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : '', s ? `${s}s` : '']
    .filter(Boolean).join(' ') || '0s';
}

function describeSet(s) {
  if (s.distanceMiles != null || s.durationSeconds != null) {
    const parts = [];
    if (s.distanceMiles != null) parts.push(`${s.distanceMiles} mi`);
    if (s.durationSeconds != null) parts.push(formatDuration(s.durationSeconds));
    return parts.join(' in ');
  }
  return `${s.reps ?? 0} reps @ ${s.weightLbs ?? 0} lbs`;
}

// ── API helper ──────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'X-API-Key': API_KEY,
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

// ── MCP Server factory ─────────────────────────────────────────────────────
// Each session needs its own McpServer instance because the SDK only allows
// one transport per server.

function createMcpServer() {
  const mcp = new McpServer(
    { name: 'fittrack', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // ── Tool: log_weight ──────────────────────────────────────────────────────

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

  // ── Tool: log_workout ─────────────────────────────────────────────────────

  mcp.tool(
    'log_workout',
    `Log a workout session. ALWAYS add the activity as an entry in the exercises array — never use sessionName as a substitute.
- Strength/lifting: add an exercise with reps and weightLbs per set
- Running: add an exercise named "Run" with distanceMiles and durationSeconds (setNumber: 1, omit reps/weight)
- Timed activities (Muay Thai, boxing, yoga, etc.): add an exercise named after the activity with durationSeconds only (setNumber: 1, omit reps/weight/distance)
Examples:
  "5 mile run in 35 mins" → exercises: [{ exerciseName: "Run", sets: [{ setNumber: 1, distanceMiles: 5, durationSeconds: 2100 }] }]
  "1 hour Muay Thai" → exercises: [{ exerciseName: "Muay Thai", sets: [{ setNumber: 1, durationSeconds: 3600 }] }]`,
    {
      sessionName: z.string().optional().describe('Optional label for the whole session, e.g. "Push Day", "Pull Day", "Legs". Do NOT use this for the activity name — add it as an exercise instead.'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
      exercises: z.array(z.object({
        exerciseName: z.string().describe('Name of the exercise or activity, e.g. "Bench Press", "Run", "Muay Thai"'),
        sets: z.array(z.object({
          setNumber: z.number().int().positive().describe('Set number starting from 1. Use 1 for cardio/timed activities.'),
          reps: z.number().int().min(0).optional().describe('Reps performed (strength only — omit for cardio/timed)'),
          weightLbs: z.number().min(0).optional().describe('Weight in pounds (strength only — omit for cardio/timed)'),
          distanceMiles: z.number().min(0).optional().describe('Distance in miles (running only)'),
          durationSeconds: z.number().int().min(0).optional().describe('Total duration in seconds (running and timed activities)'),
        })).describe('Array of sets. Cardio/timed activities use a single set with setNumber: 1.'),
      })).min(1).describe('Array of exercises or activities performed. Must contain at least one entry.'),
    },
    async ({ sessionName, date, exercises }) => {
      const payload = {
        sessionDate: date ?? todayStr(),
        sessionName: sessionName ?? null,
        exercises: exercises.map(e => ({
          exerciseName: e.exerciseName,
          sets: e.sets.map(s => ({
            setNumber: s.setNumber,
            reps: s.reps ?? 0,
            weightLbs: s.weightLbs ?? 0,
            ...(s.distanceMiles != null && { distanceMiles: s.distanceMiles }),
            ...(s.durationSeconds != null && { durationSeconds: s.durationSeconds }),
          })),
        })),
      };

      const result = await api('POST', '/workouts', payload);

      const summary = exercises.map(e => {
        const setsDesc = e.sets.map(s => describeSet(s)).join(', ');
        return `• ${e.exerciseName}: ${setsDesc}`;
      }).join('\n');

      return {
        content: [{ type: 'text', text: `Logged workout${sessionName ? ` "${sessionName}"` : ''} on ${result.sessionDate}:\n${summary}` }],
      };
    },
  );

  // ── Tool: log_cardio ─────────────────────────────────────────────────────

  mcp.tool(
    'log_cardio',
    `Log a distance-based cardio activity (running, cycling, rowing, etc.) where both distance and duration are known.
Do NOT use this for activities with no distance (use log_activity instead).
Examples:
  "1.53 mile run in 14 mins" → activityName: "Run", distanceMiles: 1.53, durationSeconds: 840
  "10 mile bike ride in 45 mins" → activityName: "Cycling", distanceMiles: 10, durationSeconds: 2700`,
    {
      activityName: z.string().describe('Name of the activity, e.g. "Run", "Cycling", "Rowing"'),
      distanceMiles: z.number().min(0).describe('Distance covered in miles'),
      durationSeconds: z.number().int().min(1).describe('Total duration in seconds'),
      sessionName: z.string().optional().describe('Optional session label. Defaults to "activityName distanceMiles mi".'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
    },
    async ({ activityName, distanceMiles, durationSeconds, sessionName, date }) => {
      const payload = {
        sessionDate: date ?? todayStr(),
        sessionName: sessionName ?? `${activityName} ${distanceMiles} mi`,
        exercises: [
          {
            exerciseName: activityName,
            sets: [
              {
                setNumber: 1,
                reps: 0,
                weightLbs: 0,
                distanceMiles,
                durationSeconds,
              },
            ],
          },
        ],
      };

      const result = await api('POST', '/workouts', payload);

      return {
        content: [{ type: 'text', text: `Logged ${activityName}: ${distanceMiles} mi in ${formatDuration(durationSeconds)} on ${result.sessionDate}` }],
      };
    },
  );

  // ── Tool: log_activity ────────────────────────────────────────────────────

  mcp.tool(
    'log_activity',
    `Log a general timed activity with no distance component — martial arts, yoga, sports, classes, etc.
Use this for anything that is not a lift (use log_workout) and not distance-based cardio (use log_cardio).
Only duration is recorded; reps and weight are not applicable.
Examples:
  "1 hour Muay Thai" → activityName: "Muay Thai", durationSeconds: 3600
  "45 min yoga" → activityName: "Yoga", durationSeconds: 2700
  "30 min boxing" → activityName: "Boxing", durationSeconds: 1800`,
    {
      activityName: z.string().describe('Name of the activity, e.g. "Muay Thai", "Yoga", "Boxing", "Basketball", "Soccer"'),
      durationSeconds: z.number().int().min(1).describe('Total duration of the activity in seconds'),
      sessionName: z.string().optional().describe('Optional session label. Defaults to activityName.'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
    },
    async ({ activityName, durationSeconds, sessionName, date }) => {
      const payload = {
        sessionDate: date ?? todayStr(),
        sessionName: sessionName ?? activityName,
        exercises: [
          {
            exerciseName: activityName,
            sets: [
              {
                setNumber: 1,
                reps: 0,
                weightLbs: 0,
                durationSeconds,
              },
            ],
          },
        ],
      };

      const result = await api('POST', '/workouts', payload);

      return {
        content: [{ type: 'text', text: `Logged ${activityName}: ${formatDuration(durationSeconds)} on ${result.sessionDate}` }],
      };
    },
  );

  // ── Tool: get_workout_by_date ─────────────────────────────────────────────

  mcp.tool(
    'get_workout_by_date',
    'Look up a workout session by date. Returns the session ID and full exercise details needed to retroactively edit a past session. Call this before edit_workout when the user wants to change a session from a specific date.',
    {
      date: z.string().describe('Date to look up in YYYY-MM-DD format'),
    },
    async ({ date }) => {
      const sessions = await api('GET', `/workouts?date=${encodeURIComponent(date)}`);
      if (!sessions.length) {
        return { content: [{ type: 'text', text: `No workout found for ${date}.` }] };
      }
      const session = sessions[0];
      const grouped = (session.exerciseSets ?? []).reduce((acc, s) => {
        if (!acc[s.exerciseName]) acc[s.exerciseName] = [];
        acc[s.exerciseName].push(s);
        return acc;
      }, {});
      const lines = Object.entries(grouped).map(([name, sets]) => {
        const desc = sets.map(s => describeSet(s)).join(', ');
        return `  • ${name}: ${desc}`;
      });
      const header = `Workout on ${session.sessionDate}${session.sessionName ? ` — "${session.sessionName}"` : ''} [session ID: ${session.id}]`;
      return {
        content: [{ type: 'text', text: `${header}\n${lines.join('\n') || '  No exercises logged'}` }],
      };
    },
  );

  // ── Tool: edit_workout ─────────────────────────────────────────────────────

  mcp.tool(
    'edit_workout',
    'Edit/update an existing workout session — replace its exercises and sets entirely, or rename it. Use get_workout_by_date or get_today_summary first to find the session ID. Preserves the original session date automatically.',
    {
      sessionId: z.number().int().positive().describe('The workout session ID to update (get from get_workout_by_date or get_today_summary)'),
      sessionName: z.string().optional().describe('New name for the session'),
      exercises: z.array(z.object({
        exerciseName: z.string().describe('Name of the exercise'),
        sets: z.array(z.object({
          setNumber: z.number().int().positive().describe('Set number starting from 1'),
          reps: z.number().int().min(0).describe('Number of reps'),
          weightLbs: z.number().min(0).describe('Weight in pounds'),
          distanceMiles: z.number().min(0).optional().describe('Distance in miles (for cardio)'),
          durationSeconds: z.number().int().min(0).optional().describe('Duration in seconds (for cardio)'),
        })).describe('Array of sets for this exercise'),
      })).describe('Complete list of exercises — replaces all existing exercises'),
    },
    async ({ sessionId, sessionName, exercises }) => {
      const existing = await api('GET', `/workouts/${sessionId}`);
      const result = await api('PUT', `/workouts/${sessionId}`, {
        sessionDate: existing.sessionDate,
        sessionName: sessionName ?? null,
        exercises,
      });

      const grouped = (result.exerciseSets ?? []).reduce((acc, s) => {
        if (!acc[s.exerciseName]) acc[s.exerciseName] = [];
        acc[s.exerciseName].push(s);
        return acc;
      }, {});
      const lines = Object.entries(grouped).map(([name, sets]) => {
        const desc = sets.map(s => describeSet(s)).join(', ');
        return `• ${name}: ${desc}`;
      });

      return {
        content: [{ type: 'text', text: `Updated workout${result.sessionName ? ` "${result.sessionName}"` : ''} (ID: ${result.id}):\n${lines.join('\n')}` }],
      };
    },
  );

  // ── Tool: delete_workout ──────────────────────────────────────────────────

  mcp.tool(
    'delete_workout',
    'Delete an entire workout session. Use get_today_summary first to find the session ID.',
    {
      sessionId: z.number().int().positive().describe('The workout session ID to delete'),
    },
    async ({ sessionId }) => {
      await api('DELETE', `/workouts/${sessionId}`);
      return {
        content: [{ type: 'text', text: `Deleted workout session ${sessionId}.` }],
      };
    },
  );

  // ── Tool: delete_exercise ─────────────────────────────────────────────────

  mcp.tool(
    'delete_exercise',
    'Delete a specific exercise from an existing workout session (keeps other exercises). Use get_today_summary first to find the session ID.',
    {
      sessionId: z.number().int().positive().describe('The workout session ID'),
      exerciseName: z.string().describe('Name of the exercise to remove'),
    },
    async ({ sessionId, exerciseName }) => {
      await api('DELETE', `/workouts/${sessionId}/exercises?name=${encodeURIComponent(exerciseName)}`);
      return {
        content: [{ type: 'text', text: `Removed "${exerciseName}" from session ${sessionId}.` }],
      };
    },
  );

  // ── Tool: log_meal ────────────────────────────────────────────────────────

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

  // ── Tool: log_steps ───────────────────────────────────────────────────────

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

  // ── Tool: get_today_summary ───────────────────────────────────────────────

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
        parts.push(`\n🏋️ Workout${workout.sessionName ? ` (${workout.sessionName})` : ''} [session ID: ${workout.id}]:`);
        if (workout.exerciseSets?.length > 0) {
          const grouped = {};
          for (const s of workout.exerciseSets) {
            if (!grouped[s.exerciseName]) grouped[s.exerciseName] = [];
            grouped[s.exerciseName].push(s);
          }
          for (const [name, sets] of Object.entries(grouped)) {
            const desc = sets.map(s => describeSet(s)).join(', ');
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

  // ── Tool: get_personal_records ────────────────────────────────────────────

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

  return mcp;
}

// ── Express + Streamable HTTP transport ─────────────────────────────────────

const app = express();
app.use(express.json());

// CORS — required for Claude.ai to connect from the browser
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Stateless mode — each POST gets a fresh server+transport.
// Our tools are pure API proxies with no session state, so this is
// simpler and survives redeploys without losing sessions.

app.post('/mcp', async (req, res) => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP POST:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

app.get('/mcp', (req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed. Use POST.' },
    id: null,
  });
});

app.delete('/mcp', (req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed.' },
    id: null,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'fittrack-mcp' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FitTrack MCP server listening on port ${PORT}`);
  console.log(`API target: ${API_BASE}`);
});
