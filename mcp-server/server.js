import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

// ── Config ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.PROGRESSLOG_API_URL ?? 'http://localhost:8080/api';
// Default/fallback API key (single-user env-var mode, e.g. kavinchai's Railway deployment).
// Per-request keys via ?apiKey= query param take precedence and enable multi-user support.
const DEFAULT_API_KEY = process.env.PROGRESSLOG_API_KEY;
const PORT = parseInt(process.env.PORT ?? '3100', 10);

/** Resolve the API key for a given request.
 *  Priority: ?apiKey= query param → X-API-Key header → PROGRESSLOG_API_KEY env var */
function resolveApiKey(req) {
  return req.query?.apiKey || req.headers['x-api-key'] || DEFAULT_API_KEY || null;
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

function makeApi(apiKey) {
  return async function api(method, path, body) {
    const opts = {
      method,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`ProgressLog API ${method} ${path} → ${res.status}: ${text}`);
    }
    return text ? JSON.parse(text) : null;
  };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── MCP Server factory ─────────────────────────────────────────────────────
// Each session needs its own McpServer instance because the SDK only allows
// one transport per server.

function createMcpServer(apiKey) {
  const api = makeApi(apiKey);

  async function logExercisesToDate(date, sessionName, exercises) {
    const existing = await api('GET', `/workouts?date=${encodeURIComponent(date)}`);
    if (existing.length > 0) {
      const sessionId = existing[0].id;
      let result;
      for (const exercise of exercises) {
        result = await api('POST', `/workouts/${sessionId}/exercises`, exercise);
      }
      return result ?? await api('GET', `/workouts/${sessionId}`);
    }
    return await api('POST', '/workouts', {
      sessionDate: date,
      sessionName: sessionName ?? null,
      exercises,
    });
  }

  const mcp = new McpServer(
    { name: 'progresslog', version: '1.0.0' },
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
    `Log a strength/lifting workout session. Use ONLY for exercises with reps and weight (e.g. Bench Press, Squat, Deadlift).
Do NOT use this for runs, cardio, or timed activities — use log_cardio or log_activity instead.
Examples:
  "5x5 bench press at 135 lbs" → exercises: [{ exerciseName: "Bench Press", sets: [{setNumber:1,reps:5,weightLbs:135}, ...] }]
  "3 sets of 10 squats at 185 lbs" → exercises: [{ exerciseName: "Squat", sets: [{setNumber:1,reps:10,weightLbs:185}, ...] }]`,
    {
      sessionName: z.string().optional().describe('Optional label for the session, e.g. "Push Day", "Pull Day", "Legs".'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
      exercises: z.array(z.object({
        exerciseName: z.string().describe('Name of the strength exercise, e.g. "Bench Press", "Squat", "Deadlift"'),
        sets: z.array(z.object({
          setNumber: z.number().int().positive().describe('Set number starting from 1'),
          reps: z.number().int().min(0).describe('Reps performed'),
          weightLbs: z.number().min(0).describe('Weight in pounds'),
        })).describe('Array of sets for this exercise'),
      })).min(1).describe('Array of strength exercises performed'),
    },
    async ({ sessionName, date, exercises }) => {
      const targetDate = date ?? todayStr();
      const mappedExercises = exercises.map(e => ({
        exerciseName: e.exerciseName,
        sets: e.sets.map(s => ({
          setNumber: s.setNumber,
          reps: s.reps,
          weightLbs: s.weightLbs,
        })),
      }));

      const result = await logExercisesToDate(targetDate, sessionName ?? null, mappedExercises);

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
    `Log a run, bike ride, row, or any cardio activity where both distance and duration are known. Always use this (not log_workout) for any run or distance-based cardio.
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
      const targetDate = date ?? todayStr();
      const exercise = {
        exerciseName: activityName,
        sets: [{ setNumber: 1, reps: 0, weightLbs: 0, distanceMiles, durationSeconds }],
      };

      const result = await logExercisesToDate(targetDate, sessionName ?? `${activityName} ${distanceMiles} mi`, [exercise]);

      return {
        content: [{ type: 'text', text: `Logged ${activityName}: ${distanceMiles} mi in ${formatDuration(durationSeconds)} on ${result.sessionDate}` }],
      };
    },
  );

  // ── Tool: log_activity ────────────────────────────────────────────────────

  mcp.tool(
    'log_activity',
    `Log a timed activity with no distance — martial arts, yoga, sports, classes, etc. Always use this (not log_workout) for any non-lifting, non-distance activity.
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
      const targetDate = date ?? todayStr();
      const exercise = {
        exerciseName: activityName,
        sets: [{ setNumber: 1, reps: 0, weightLbs: 0, durationSeconds }],
      };

      const result = await logExercisesToDate(targetDate, sessionName ?? activityName, [exercise]);

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
    'Log step count for a given date. Call this when the user mentions steps or walking. Creates or updates the step entry for the date.',
    {
      steps: z.number().int().min(0).describe('Number of steps'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
    },
    async ({ steps, date }) => {
      const logDate = date ?? todayStr();
      const result = await api('POST', '/steps', { logDate, steps });
      return {
        content: [{ type: 'text', text: `Logged ${steps.toLocaleString()} steps on ${result.logDate}` }],
      };
    },
  );

  // ── Tool: edit_steps ─────────────────────────────────────────────────────

  mcp.tool(
    'edit_steps',
    'Update the step count for a date. Use this when the user wants to correct or change a previously logged step count.',
    {
      steps: z.number().int().min(0).describe('New step count to set'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
    },
    async ({ steps, date }) => {
      const logDate = date ?? todayStr();
      await api('POST', '/steps', { logDate, steps });
      return {
        content: [{ type: 'text', text: `Updated steps to ${steps.toLocaleString()} on ${logDate}` }],
      };
    },
  );

  // ── Tool: delete_steps ────────────────────────────────────────────────────

  mcp.tool(
    'delete_steps',
    'Remove/clear the step count for a given date. Use this when the user wants to delete or clear their step count for a day.',
    {
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
    },
    async ({ date }) => {
      const logDate = date ?? todayStr();
      const allLogs = await api('GET', '/steps');
      const existing = allLogs.find(s => s.logDate === logDate);
      if (!existing) {
        return {
          content: [{ type: 'text', text: `No steps logged for ${logDate}. Nothing to delete.` }],
        };
      }
      await api('DELETE', `/steps/${existing.id}`);
      return {
        content: [{ type: 'text', text: `Cleared steps for ${logDate}` }],
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
      const [weightData, workoutData, nutritionData, stepData] = await Promise.all([
        api('GET', '/weight'),
        api('GET', '/workouts'),
        api('GET', '/nutrition'),
        api('GET', '/steps'),
      ]);

      const weight = weightData.find(w => w.logDate === today);
      const workouts = workoutData.filter(w => w.sessionDate === today);
      const nutrition = nutritionData.find(n => n.logDate === today);
      const stepEntry = stepData.find(s => s.logDate === today);

      const parts = [];

      parts.push(`📅 Summary for ${today}:\n`);

      if (weight) {
        parts.push(`⚖️ Weight: ${weight.weightLbs} lbs`);
      } else {
        parts.push('⚖️ Weight: not logged');
      }

      if (workouts.length > 0) {
        for (const workout of workouts) {
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
        }
      } else {
        parts.push('\n🏋️ Workout: not logged');
      }

      if (stepEntry) {
        parts.push(`\n👟 Steps: ${stepEntry.steps.toLocaleString()}`);
      } else {
        parts.push('\n👟 Steps: not logged');
      }

      if (nutrition) {
        parts.push(`\n🍽️ Nutrition (${nutrition.dayType}):`);
        parts.push(`  Calories: ${nutrition.totalCalories ?? 0} kcal`);
        parts.push(`  Protein: ${nutrition.totalProtein ?? 0}g`);
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
  const apiKey = resolveApiKey(req);
  if (!apiKey) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'API key required. Pass ?apiKey=<your-key> or X-API-Key header.' },
      id: null,
    });
    return;
  }

  try {
    const server = createMcpServer(apiKey);
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

app.get('/mcp', (_req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed. Use POST.' },
    id: null,
  });
});

app.delete('/mcp', (_req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed.' },
    id: null,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'progresslog-mcp' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ProgressLog MCP server listening on port ${PORT}`);
  console.log(`API target: ${API_BASE}`);
});
