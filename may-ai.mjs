const runtimeURL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.89/+esm';
const model = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
const tutor = 'Bạn là Mây AI, bạn học tiếng Anh cho học sinh lớp 11. Giải thích ngắn gọn bằng tiếng Việt, cho ví dụ tiếng Anh có bản dịch khi phù hợp. Khi luyện tập, đưa gợi ý rồi chờ học sinh thử trước khi giải đáp. Nếu không chắc, nói rõ để học sinh kiểm chứng.';

export function browserTutor() {
  let session;
  let state = 'idle';
  let progress = null;
  let detail = '';
  let busy = false;
  let runtime;
  let importAttempt = 0;
  const notify = () => window.dispatchEvent(new Event('study-ai-state'));

  return {
    get state() { return state; },
    get progress() { return progress; },
    get detail() { return detail; },
    get busy() { return busy; },

    async enable() {
      if (state === 'loading' || state === 'ready' || state === 'unsupported') return;
      state = 'loading';
      progress = null;
      detail = 'Đang kiểm tra khả năng chạy AI…';
      notify();

      let worker;
      try {
        if (!navigator.gpu || !await navigator.gpu.requestAdapter()) {
          state = 'unsupported';
          detail = 'Thiết bị hoặc trình duyệt này chưa chạy được WebGPU. Hãy thử Chrome hoặc Edge mới trên máy khác.';
          return;
        }

        detail = 'Đang mở WebLLM và chuẩn bị tải mô hình…';
        notify();
        // Browsers remember failed imports under the same URL until the page reloads.
        if (!runtime) {
          const url = importAttempt ? runtimeURL + '?retry=' + importAttempt : runtimeURL;
          importAttempt++;
          runtime = await import(url);
        }
        worker = new Worker(new URL('./may-ai-worker.mjs?v=1', import.meta.url), { type: 'module' });
        const failure = new Promise((_, reject) => {
          worker.addEventListener('error', () => {
            reject(new Error('WebLLM worker failed'));
            if (session?.worker !== worker) return;
            session = undefined;
            worker.terminate();
            state = 'error';
            detail = 'Mây AI đã dừng. Bấm Thử lại để mở lại mô hình.';
            notify();
          }, { once: true });
        });

        const engine = await Promise.race([
          failure,
          runtime.CreateWebWorkerMLCEngine(worker, model, {
            initProgressCallback(report) {
              if (state !== 'loading') return;
              progress = Math.floor(Math.max(0, Math.min(1, report.progress)) * 100);
              detail = progress < 100 ? 'Đang tải và chuẩn bị mô hình…' : 'Đang khởi động mô hình…';
              notify();
            }
          })
        ]);
        session = { engine, worker, failure };
        state = 'ready';
      } catch (error) {
        worker?.terminate();
        console.warn('Không khởi động được Mây AI:', error);
        state = 'error';
        detail = /quotaexceeded|quota exceeded/i.test(String(error))
          ? 'Trình duyệt thiếu chỗ để lưu mô hình. Hãy dùng cửa sổ Chrome hoặc Edge thông thường và kiểm tra dung lượng trống.'
          : 'Chưa mở được mô hình. Kiểm tra mạng và bộ nhớ đồ họa rồi thử lại.';
      } finally {
        notify();
      }
    },

    async reply(message, history) {
      if (!session || state !== 'ready' || busy) throw new Error('Mây AI chưa sẵn sàng.');
      busy = true;
      notify();

      // Keep complete turns and cap their size so examples fit the local context window.
      const recent = history.slice(-4).map(turn => ({
        role: turn.role,
        content: turn.content.slice(0, 650)
      }));
      try {
        const { engine, failure } = session;
        const response = await Promise.race([
          failure,
          engine.chat.completions.create({
            messages: [{ role: 'system', content: tutor }, ...recent, { role: 'user', content: message }],
            temperature: 0.4,
            max_tokens: 384
          })
        ]);
        const answer = response.choices[0]?.message.content?.trim();
        if (!answer) throw new Error('Empty model response');
        return { answer };
      } catch (error) {
        console.warn('Mây AI không trả lời được:', error);
        throw new Error('Mây chưa trả lời được. Hãy thử lại với câu hỏi ngắn hơn.');
      } finally {
        busy = false;
        notify();
      }
    }
  };
}
