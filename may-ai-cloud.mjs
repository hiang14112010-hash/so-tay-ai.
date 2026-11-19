const endpoint = 'https://may-ai.hiang14112010-sotayai.workers.dev/chat';

const messages = {
  quota: 'Agen AI trên đám mây đang chạm hạn mức. Bạn thử lại sau nhé.',
  rate: 'Bạn vừa gửi nhiều câu liên tiếp. Đợi một phút rồi gửi lại nhé.',
  unavailable: 'Agen AI trên đám mây chưa phản hồi. Bạn thử gửi lại sau nhé.',
  message: 'Câu hỏi cần có nội dung và dài tối đa 6.000 ký tự.',
  size: 'Tin nhắn và ngữ cảnh gửi kèm quá lớn. Hãy mở cuộc trò chuyện mới để thử lại.'
};

export async function cloudReply(message, history, { sources, glossary, onStatus, onChunk }) {
  onStatus('Agen AI đang hỏi mô hình trên đám mây…');
  let answer = '', incomplete = false;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, history: history.slice(-8).map(turn => ({ role: turn.role, content: turn.content.slice(0, 900) })),
        sources: sources.map(source => ({ title: source.title, text: source.text })), glossary
      }),
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(90000)
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(messages[body?.code] || messages[response.status === 429 ? 'quota' : 'unavailable']);
    }
    if (!response.body || !response.headers.get('Content-Type')?.startsWith('text/event-stream')) throw new Error(messages.unavailable);
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    const consume = line => {
      if (!line.startsWith('data:')) return;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') return;
      const event = JSON.parse(payload);
      if (event.error) throw new Error(messages.unavailable);
      const choice = event.choices?.[0];
      incomplete ||= choice?.finish_reason === 'length' || event.finish_reason === 'length';
      const token = choice?.delta?.content ?? event.response;
      if (typeof token !== 'string' || !token) return;
      if (!answer) onStatus('Agen AI đang viết…');
      answer += token;
      onChunk(answer);
    };
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach(consume);
      }
      if (buffer) consume(buffer);
    } finally {
      await reader.cancel().catch(() => {});
    }
    if (!answer.trim()) throw new Error(messages.unavailable);
    return { answer: answer.trim(), note: incomplete ? 'Agen AI đã chạm giới hạn câu trả lời. Bạn có thể nhắn “viết tiếp”.' : '' };
  } catch (error) {
    if (answer.trim()) return { answer: answer.trim(), note: 'Câu trả lời từ đám mây bị gián đoạn.' };
    throw new Error(Object.values(messages).includes(error.message) ? error.message : messages.unavailable);
  }
}
