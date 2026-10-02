// Calls Claude for one step of the call map, logs tokens + cost, returns parsed JSON.
//
// Caching: the shared system prompt, and the growing prefix in any multi-round
// web-search call, are marked as cache breakpoints. A cache write costs 1.25x
// normal input price; a cache read costs 0.1x (0.05x on Opus). Since several
// steps share a model and several calls resend the same context on a retry or
// on "Rebuild", this turns a meaningful share of input tokens into near-free
// reads instead of full-price sends. Confirmed pricing: platform.claude.com/docs/en/about-claude/pricing.
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, PRICES, WEB_SEARCH_PRICE, STEPS } from './settings.js';
import { query } from './db.js';
import { mockResponse } from './mocks.js';

const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;
const MOCK = process.env.MOCK_AI === '1';

const CACHE_WRITE_MULT = 1.25;
const cacheReadMult = (model) => (model === MODELS.opus ? 0.05 : 0.1); // Opus 5.5 reads at 5%, other current models at 10%.
const cache = { type: 'ephemeral' };

const SHARED_SYSTEM = `You are the research and planning engine for ai-tinerary.com, run by Wandering Mustache,
a small invite-only travel operation. Voice: warm, plain-spoken, honest, practical; favors real local
experiences over tourist traps and never oversells. Accuracy matters more than completeness: if you are
not sure something is true, say so or leave it out. Never invent prices, opening hours, URLs, or venues.
Respond with ONE valid JSON object only: no prose before or after, no markdown fences. Some steps let you
search the web — when you do, write what you learned in your own words. Never wrap any part of the output
in <cite> tags or similar citation markup; a field's value must be plain text a traveler can read as-is.`;

export function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Claude did not return JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Safety net for the instruction above: web search naturally makes Claude want to cite its
// sources inline (<cite index="...">claim</cite>), which is right for a chat reply but breaks
// here — a JSON field's value should be the plain claim, not markup. Strip any such tags from
// every string in the parsed result, on every step, rather than trust the instruction alone.
function stripCiteTags(value) {
  if (typeof value === 'string') return value.replace(/<\/?cite[^>]*>/gi, '');
  if (Array.isArray(value)) return value.map(stripCiteTags);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripCiteTags(v)]));
  return value;
}

function costOf(model, usage, searches) {
  const p = PRICES[model] || { input: 0, output: 0 };
  const reg = usage.input_tokens || 0;
  const write = usage.cache_creation_input_tokens || 0;
  const read = usage.cache_read_input_tokens || 0;
  const inputCost = reg * p.input + write * p.input * CACHE_WRITE_MULT + read * p.input * cacheReadMult(model);
  return (inputCost + (usage.output_tokens || 0) * p.output) / 1e6 + searches * WEB_SEARCH_PRICE;
}

async function logCall(tripId, step, model, usage, searches, ms, ok, error) {
  try {
    await query(
      `INSERT INTO ai_calls (trip_id, step, model, input_tokens, output_tokens, web_searches, cost_usd, duration_ms, ok, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [tripId, step, model, usage.input_tokens || 0, usage.output_tokens || 0, searches,
       costOf(model, usage, searches).toFixed(5), ms, ok, error ? String(error).slice(0, 500) : null]
    );
  } catch (e) {
    console.error('Could not log AI call:', e.message);
  }
}

/**
 * Run one step. `stepKey` must exist in STEPS (settings.js).
 * Returns the parsed JSON object Claude produced.
 */
export async function runStep(tripId, stepKey, prompt, { maxTokens = 4000 } = {}) {
  const step = STEPS[stepKey];
  if (!step) throw new Error(`Unknown step ${stepKey}`);
  const model = MODELS[step.model];
  const started = Date.now();

  if (MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    const out = stripCiteTags(mockResponse(stepKey, prompt));
    await logCall(tripId, stepKey, model, { input_tokens: 0, output_tokens: 0 }, 0, Date.now() - started, true);
    return out;
  }
  if (!client) throw new Error('CLAUDE_API_KEY is not set. Add it in Railway → Variables.');

  const tools = step.search
    ? [{ type: 'web_search_20250305', name: 'web_search', max_uses: step.maxSearches || 3 }]
    : undefined;

  // Cache breakpoint 1: the shared system prompt (identical on every call to this model).
  const system = [{ type: 'text', text: SHARED_SYSTEM, cache_control: cache }];
  // Cache breakpoint 2: this step's own prompt. If a retry or a "Rebuild" sends the exact
  // same prompt again within 5 minutes, that whole block is billed at the cache-read rate.
  const messages = [{ role: 'user', content: [{ type: 'text', text: prompt, cache_control: cache }] }];
  const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  let searches = 0;
  let text = '';

  try {
    // Web-search turns can pause mid-way ("pause_turn"); we continue up to 3 times.
    // Each continuation re-sends everything so far, so we move the cache breakpoint to the
    // end of what was just added — the next round reads that whole prefix from cache instead
    // of paying full price for it again.
    for (let round = 0; round < 4; round++) {
      const stream = client.messages.stream({ model, max_tokens: maxTokens, system, messages, ...(tools ? { tools } : {}) });
      const msg = await stream.finalMessage();
      usage.input_tokens += msg.usage?.input_tokens || 0;
      usage.output_tokens += msg.usage?.output_tokens || 0;
      usage.cache_creation_input_tokens += msg.usage?.cache_creation_input_tokens || 0;
      usage.cache_read_input_tokens += msg.usage?.cache_read_input_tokens || 0;
      searches += msg.usage?.server_tool_use?.web_search_requests || 0;
      // Keep only the text written after the last search result (the final answer),
      // so "Let me search…" narration never gets mixed into the JSON.
      let lastTool = -1;
      msg.content.forEach((b, i) => { if (b.type !== 'text') lastTool = i; });
      const finalText = msg.content.slice(lastTool + 1).filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (finalText.trim()) text = finalText;
      if (msg.stop_reason !== 'pause_turn') {
        if (msg.stop_reason === 'max_tokens') throw new Error('The answer was cut off (max tokens reached).');
        break;
      }
      const content = msg.content.map((b, i, arr) => (i === arr.length - 1 ? { ...b, cache_control: cache } : b));
      messages.push({ role: 'assistant', content });
    }
    const json = stripCiteTags(extractJson(text));
    await logCall(tripId, stepKey, model, usage, searches, Date.now() - started, true);
    return json;
  } catch (err) {
    await logCall(tripId, stepKey, model, usage, searches, Date.now() - started, false, err.message);
    throw err;
  }
}
