import { handbookContext, handbookDefinition, searchStudySources } from './may-ai-sources.mjs?v=1';
import { responsePlan, studyPrompt } from './may-ai-prompt.mjs?v=1';
import { cloudReply } from './may-ai-cloud.mjs?v=1';

const runtimeURL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.89/+esm';
const cloudModel = { label: 'Đám mây · Gemma 4', extendedTokens: 1200 };
const models = {
  cloud: cloudModel,
  standard: { name: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', label: 'Nhẹ · Qwen 1.5B', download: '870 MB', extendedTokens: 800 },
  advanced: { name: 'Qwen2.5-3B-Instruct-q4f32_1-MLC', label: 'Mạnh hơn · Qwen 3B', download: '1,74 GB', extendedTokens: 1200 }
};
const contextSize = 4096;
const memoryIssue = /device.?lost|device was lost|out.?of.?memory|gpu.?out.?of.?memory|gpu process|invalid (?:gpu)?buffer|unknown.*device|vk_error|modelnotloaded|model is not loaded|no model loaded|worker failed/i;
const contextIssue = /contextwindowsizeexceeded|prompt tokens exceed context|exceed(?:s|ed)? (?:the )?(?:model'?s? )?context window/i;

async function fitRequest(engine, system, message, history, desiredTokens) {
  const count = async text => (await engine.tokenize(text)).length;
  const margin = 64;
  let available = contextSize - (await count(system)) - (await count(message)) - margin;
  if (available < 64) throw new Error('ContextWindowSizeExceeded');
  const max_tokens = Math.min(desiredTokens, available);
  available -= max_tokens;
  const recent = [];
  for (let i = history.length - 2; i >= 0; i -= 2) {
    const [question, answer] = history.slice(i, i + 2);
    if (question.role !== 'user' || answer.role !== 'assistant') break;
    const tokens = (await count(question.content + '\n' + answer.content)) + 20;
    if (tokens > available) break;
    recent.unshift({ role: 'user', content: question.content }, { role: 'assistant', content: answer.content });
    available -= tokens;
  }
  return { messages: [{ role: 'system', content: system }, ...recent, { role: 'user', content: message }], max_tokens, temperature: 0.3 };
}

export function browserTutor() {
  const preferenceKey = 'so-tay-ai-mode:' + new URL('.', import.meta.url).pathname;
  let selection = 'cloud';
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (Object.hasOwn(models, saved)) selection = saved;
  } catch {}
  let session;
  let state = 'idle';
  let progress = null;
  let detail = '';
  let busy = false;
  let runtime;
  let importAttempt = 0;
  const notify = () => window.dispatchEvent(new Event('study-ai-state'));

  function resetModel(current, text) {
    if (session !== current) return;
    session = undefined;
    current.worker.terminate();
    state = 'error';
    detail = text;
    notify();
  }

  return {
    get state() { return state; },
    get progress() { return progress; },
    get detail() { return detail; },
    get busy() { return busy; },
    get selection() { return selection; },
    get model() { return models[selection]; },
    get activeModel() { return session?.key; },
    get ready() { return selection === 'cloud' || (state === 'ready' && session?.key === selection); },

    select(key) {
      if (!Object.hasOwn(models, key) || busy || state === 'loading' || key === selection) return;
      selection = key;
      if (state === 'error' || state === 'unsupported') {
        state = 'idle';
        detail = '';
      }
      try { localStorage.setItem(preferenceKey, key); } catch {}
      notify();
    },

    async enable() {
      if (selection === 'cloud' || busy || state === 'loading' || state === 'unsupported' || session?.key === selection) return;
      const key = selection;
      session?.worker.terminate();
      session = undefined;
      state = 'loading';
      progress = null;
      detail = 'Đang kiểm tra khả năng chạy AI…';
      notify();

      let current;
      try {
        if (!navigator.gpu || !await navigator.gpu.requestAdapter()) {
          state = 'unsupported';
          detail = 'Thiết bị hoặc trình duyệt này chưa chạy được WebGPU. Hãy thử Chrome hoặc Edge mới trên máy khác.';
          return;
        }

        detail = 'Đang chuẩn bị tải mô hình…';
        notify();
        if (!runtime) {
          // A failed ESM import is remembered for that URL until the page reloads.
          const url = importAttempt ? runtimeURL + '?retry=' + importAttempt : runtimeURL;
          importAttempt++;
          runtime = await import(url);
        }
        const worker = new Worker(new URL('./may-ai-worker.mjs?v=1', import.meta.url), { type: 'module' });
        current = { key, worker };
        current.failure = new Promise((_, reject) => {
          worker.addEventListener('error', () => {
            reject(new Error('WebLLM worker failed'));
            resetModel(current, 'Mô hình đã dừng. Bấm Thử lại để mở lại.');
          }, { once: true });
        });
        current.engine = await Promise.race([
          current.failure,
          runtime.CreateWebWorkerMLCEngine(worker, models[key].name, {
            initProgressCallback(report) {
              if (state !== 'loading' || !Number.isFinite(report.progress)) return;
              progress = Math.max(progress ?? 0, Math.floor(Math.min(1, Math.max(0, report.progress)) * 100));
              detail = progress < 100 ? 'Đang tải và chuẩn bị mô hình…' : 'Đang khởi động mô hình…';
              notify();
            }
          })
        ]);
        session = current;
        state = 'ready';
        detail = '';
        try { localStorage.setItem(preferenceKey, key); } catch {}
      } catch (error) {
        current?.worker.terminate();
        console.warn('Không khởi động được Mây AI:', error);
        state = 'error';
        detail = /quotaexceeded|quota exceeded/i.test(String(error))
          ? 'Trình duyệt thiếu chỗ để lưu mô hình. Hãy kiểm tra dung lượng trống.'
          : key === 'advanced'
            ? 'Chưa mở được mô hình 3B. Kiểm tra mạng hoặc chọn chế độ Nhẹ nếu máy thiếu bộ nhớ đồ họa.'
            : 'Chưa mở được mô hình. Kiểm tra mạng và bộ nhớ đồ họa rồi thử lại.';
      } finally {
        notify();
      }
    },

    async reply(message, history, { search = false, onStatus = () => {}, onChunk = () => {} } = {}) {
      if (!this.ready || busy) throw new Error('Mây AI chưa sẵn sàng.');
      const current = session;
      const mode = selection;
      busy = true;
      notify();
      let answer = '';
      let finishReason = '';
      let timer;
      let sources = [];
      let note = '';
      try {
        if (search) {
          onStatus('Đang tìm nguồn trên web…');
          try {
            sources = await searchStudySources(message);
            if (!sources.length) note = 'Mây chưa tìm thấy nguồn phù hợp.';
          } catch {
            note = 'Mây chưa truy cập được nguồn web.';
          }
        }

        const definition = handbookDefinition(message);
        if (definition) return { answer: definition, sources, note };

        const glossary = handbookContext(message);
        if (mode === 'cloud') {
          const result = await cloudReply(message, history, { sources, glossary, onStatus, onChunk });
          return { answer: result.answer, sources, note: [note, result.note].filter(Boolean).join(' ') };
        }

        onStatus('Mây đang chuẩn bị câu trả lời…');
        const { engine, failure } = current;
        const plan = responsePlan(message, history, models[mode].extendedTokens);
        const system = studyPrompt(plan.instruction, glossary, sources);

        let startTimer;
        const stalled = new Promise((_, reject) => {
          startTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => reject(new Error('InferenceTimeout')), 150000);
          };
        });
        startTimer();

        const generate = async () => {
          const request = await fitRequest(engine, system, message, history, plan.tokens);
          try {
            const stream = await engine.chat.completions.create({ ...request, stream: true });
            for await (const chunk of stream) {
              startTimer();
              const choice = chunk?.choices?.[0];
              finishReason = choice?.finish_reason || finishReason;
              const token = choice?.delta?.content;
              if (!token) continue;
              if (!answer) onStatus('Mây đang viết…');
              answer += token;
              onChunk(answer);
            }
            if (!answer.trim()) throw new Error('Empty stream');
          } catch (error) {
            if (answer.trim() || session !== current || memoryIssue.test(String(error)) || contextIssue.test(String(error))) throw error;
            // Retry only if streaming failed before returning any visible text.
            onStatus('Mây đang thử lại lượt trả lời…');
            startTimer();
            const response = await engine.chat.completions.create({ ...request, stream: false });
            answer = response?.choices?.[0]?.message?.content || '';
            finishReason = response?.choices?.[0]?.finish_reason || '';
          }
        };
        await Promise.race([generate(), failure, stalled]);
        if (!answer.trim()) throw new Error('Empty model response');
        if (finishReason === 'length') {
          note = [note, 'Mây đã chạm giới hạn câu trả lời. Bạn có thể nhắn “viết tiếp”.'].filter(Boolean).join(' ');
        }
        return { answer: answer.trim(), sources, note };
      } catch (error) {
        console.warn('Mây AI không trả lời được:', error);
        if (mode === 'cloud') throw error;
        const cause = String(error);
        let message = 'Mô hình gặp lỗi khi trả lời. Bạn có thể gửi lại câu hỏi.';
        if (/InferenceTimeout|aborterror/i.test(cause) || memoryIssue.test(cause)) {
          message = /InferenceTimeout/i.test(cause)
            ? 'Mô hình ngừng phản hồi trên máy này. Hãy bật lại Mây AI rồi thử gửi lại.'
            : 'Mô hình mất kết nối với GPU hoặc thiếu bộ nhớ. Hãy thử mở lại ở chế độ Nhẹ.';
          resetModel(current, message);
        } else if (contextIssue.test(cause)) {
          message = 'Câu hỏi này vượt cửa sổ ngữ cảnh của mô hình. Hãy chia tài liệu thành vài phần rồi gửi từng phần.';
        }
        if (answer.trim()) return { answer: answer.trim(), sources, note: [note, 'Câu trả lời bị gián đoạn.', message].filter(Boolean).join(' ') };
        throw new Error(message);
      } finally {
        clearTimeout(timer);
        busy = false;
        notify();
      }
    }
  };
}
