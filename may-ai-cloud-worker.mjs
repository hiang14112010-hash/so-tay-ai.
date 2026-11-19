import { responsePlan, studyPrompt } from './may-ai-prompt.mjs';

const site = 'https://hiang14112010-hash.github.io';
const model = '@cf/google/gemma-4-26b-a4b-it';
const sizeLimit = 32 * 1024;
const cors = { 'Access-Control-Allow-Origin': site, 'Vary': 'Origin', 'Cache-Control': 'no-store' };

const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { ...cors, ...headers } });
const asText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function readJSON(request) {
  if (Number(request.headers.get('Content-Length')) > sizeLimit) throw new RangeError('body');
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('body');
  let length = 0, text = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      length += value.byteLength;
      if (length > sizeLimit) throw new RangeError('body');
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel();
  }
}

export default {
  async fetch(request, env) {
    const { pathname, protocol } = new URL(request.url);
    if (protocol !== 'https:') return json({ code: 'https' }, 403);
    if (pathname === '/health' && request.method === 'GET') return json({ ok: true });
    if (pathname !== '/chat') return json({ code: 'not_found' }, 404);
    if (request.headers.get('Origin') !== site) return json({ code: 'origin' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '3600'
    }});
    if (request.method !== 'POST') return json({ code: 'method' }, 405, { Allow: 'POST, OPTIONS' });
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return json({ code: 'format' }, 415);
    }

    let data;
    try { data = await readJSON(request); }
    catch (error) { return json({ code: error instanceof RangeError ? 'size' : 'format' }, error instanceof RangeError ? 413 : 400); }
    const message = asText(data?.message, 6001);
    if (!message || message.length > 6000) return json({ code: 'message' }, 400);

    try {
      const limit = await env.CHAT_RATE.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
      if (!limit.success) return json({ code: 'rate' }, 429, { 'Retry-After': '60' });
      const history = Array.isArray(data.history) ? data.history.slice(-8).flatMap(turn => {
        const content = asText(turn?.content, 900);
        return content && ['user','assistant'].includes(turn?.role) ? [{ role: turn.role, content }] : [];
      }) : [];
      const sources = Array.isArray(data.sources) ? data.sources.slice(0, 2).flatMap(source => {
        const title = asText(source?.title, 200), text = asText(source?.text, 600);
        return title && text ? [{ title, text }] : [];
      }) : [];
      const plan = responsePlan(message, history, 1200);
      const system = studyPrompt(plan.instruction, asText(data.glossary, 350), sources);
      const stream = await env.AI.run(model, {
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: message }],
        max_completion_tokens: plan.tokens, temperature: 0.3, stream: true, store: false,
        chat_template_kwargs: { enable_thinking: false }
      });
      return new Response(stream, { headers: { ...cors, 'Content-Type': 'text/event-stream; charset=utf-8' } });
    } catch (error) {
      const cause = String(error);
      const limit = /(?:429|rate.?limit|daily.?limit|quota|allocation)/i.test(cause);
      console.warn(JSON.stringify({ event: 'may_ai_request_failed', reason: limit ? 'limit' : 'upstream', providerCode: Number(error?.code) || undefined }));
      return json({ code: limit ? 'quota' : 'unavailable' }, limit ? 429 : 503);
    }
  }
};
