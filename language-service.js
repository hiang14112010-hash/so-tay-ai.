(() => {
  async function google(text, from, to, signal) {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.search = new URLSearchParams({ client: 'gtx', sl: from, tl: to, dt: 't' });
    url.searchParams.append('dt', 'bd');
    const response = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams({ q: text }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal
    });
    if (!response.ok) throw new Error('Google Translate request failed');
    const [segments, entries] = await response.json();
    const translated = Array.isArray(segments)
      ? segments.map((segment) => Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : '').join('').trim()
      : '';
    if (!translated) throw new Error('Google Translate result was empty');
    return { translated, entries };
  }

  async function memory(text, from, to, signal) {
    const chunks = [];
    let chunk = '';
    const encoder = new TextEncoder();
    for (const part of text.match(/\S+\s*|\s+/g) ?? []) {
      if (encoder.encode(part).length > 500) throw new Error('Text too long for fallback translation');
      if (encoder.encode(chunk + part).length > 500) {
        chunks.push(chunk.trim());
        chunk = '';
      }
      chunk += part;
    }
    if (chunk.trim()) chunks.push(chunk.trim());
    const pieces = await Promise.all(chunks.map(async (part) => {
      const url = new URL('https://api.mymemory.translated.net/get');
      url.search = new URLSearchParams({ q: part, langpair: from + '|' + to });
      const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
      if (!response.ok) throw new Error('Fallback translation failed');
      const data = await response.json();
      if (Number(data.responseStatus) !== 200 || typeof data.responseData?.translatedText !== 'string' ||
          !data.responseData.translatedText.trim() || /MYMEMORY WARNING/i.test(data.responseData.translatedText)) {
        throw new Error('Fallback translation unavailable');
      }
      const machine = Array.isArray(data.matches) && data.matches.find((match) =>
        match.createdBy === 'MT!' && typeof match.translation === 'string' && match.translation.trim());
      const translated = (machine ? machine.translation : data.responseData.translatedText).trim();
      return translated.replace(/&?(?:#(\d{2,7});|#x([\da-f]{2,6});)|&(?:quot|apos|amp|lt|gt);/gi, (entity, decimal, hex) => {
        if (decimal || hex) {
          const value = decimal ? Number(decimal) : parseInt(hex, 16);
          return value <= 0x10ffff ? String.fromCodePoint(value) : entity;
        }
        return ({ '&quot;': '"', '&apos;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>' })[entity] || entity;
      });
    }));
    return { translated: pieces.join(' '), fallback: true };
  }

  async function translate(text, from, to, signal, allowFallback = false) {
    if (!allowFallback) return google(text, from, to, signal);
    try {
      const attempt = [AbortSignal.timeout(2300), signal].filter(Boolean);
      return await google(text, from, to, AbortSignal.any(attempt));
    } catch {
      if (signal?.aborted) throw signal.reason;
      return memory(text, from, to, signal);
    }
  }

  async function dictionary(word, signal) {
    const root = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
    const response = await fetch(root + encodeURIComponent(word), { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error('Dictionary request failed');
    const records = await response.json();
    if (!Array.isArray(records)) return [];
    const partNames = { noun: 'danh từ', verb: 'động từ', adjective: 'tính từ', adverb: 'trạng từ',
      pronoun: 'đại từ', preposition: 'giới từ', conjunction: 'liên từ', interjection: 'thán từ' };
    return records.flatMap((entry) => {
      const phonetic = entry.phonetic || entry.phonetics?.find((item) => item.text)?.text;
      const source = entry.sourceUrls?.find((url) => typeof url === 'string' && /^https:\/\/en\.wiktionary\.org\//.test(url));
      const license = entry.license?.url;
      return (entry.meanings ?? []).flatMap((meaning) => (meaning.definitions ?? [])
        .filter((item) => typeof item.definition === 'string')
        .map(({ definition, example }) => ({ definition, example, phonetic, source, license, kind: partNames[meaning.partOfSpeech] })));
    });
  }

  window.handbookLanguage = { translate, dictionary };
})();
