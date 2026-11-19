import { vocabulary } from './learning-data.mjs';

const wordPattern = "([a-z][a-z'-]{1,39})";
const meaningQuestion = new RegExp(
  "^(?:(?:từ|nghĩa của từ|nghĩa của|dịch từ|dịch|giải thích từ|what does|meaning of)\\s+)?[“\"']?" +
  wordPattern + "[”\"']?(?:\\s+(?:nghĩa là (?:gì|sao)|có nghĩa (?:là )?gì|là gì|mean|sang tiếng việt))?[.!?]*$", 'iu'
);

const definitionTerm = question => meaningQuestion.exec(question.trim())?.[1]?.toLowerCase();
const contextTerm = question => question.trim()
  .match(/^(?:giải thích|nghĩa của)\s+(?:từ\s+)?[“"']?([a-z][a-z'-]{1,39})[”"']?\s+trong\b/iu)?.[1]?.toLowerCase();
const handbookWord = term => vocabulary.find(entry => entry.word === term);

export function handbookContext(question) {
  const item = handbookWord(contextTerm(question));
  return item ? `${item.word} (${item.pos}): ${item.meaning}. Example: ${item.example}` : '';
}

export function handbookDefinition(question) {
  const term = definitionTerm(question);
  if (!term) return null;
  const item = handbookWord(term);
  return item ? `${item.word} nghĩa là ${item.meaning}.\nVí dụ: ${item.example}` : null;
}

async function wikiJSON(url, signal) {
  const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
  if (!response.ok) throw new Error('Wikimedia HTTP ' + response.status);
  return response.json();
}

function cleanDefinition(markup) {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = markup.replace(/<[^>]*>/g, '');
  return decoder.value.replace(/\s+/g, ' ').trim();
}

const words = phrase => phrase.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
const stopWords = new Set('ai anh bạn cho của có gì giúp hay hãy how is it là làm một mình nào người này nói quá sao theo thế thì tôi trong từ và về với was what when where who why the does did'.split(' '));

export async function searchStudySources(question) {
  const signal = AbortSignal.timeout(6500);
  const term = definitionTerm(question) || contextTerm(question);
  if (term) {
    const root = 'https://en.wiktionary.org';
    const path = encodeURIComponent(term);
    try {
      const result = await wikiJSON(root + '/api/rest_v1/page/definition/' + path, signal);
      const definitions = (result.en || []).flatMap(sense => sense.definitions.slice(0, 2).map(item =>
        `${sense.partOfSpeech}: ${cleanDefinition(item.definition)}`
      )).slice(0, 3);
      if (definitions.length) return [{ title: term + ' · Wiktionary', url: root + '/wiki/' + path, text: definitions.join('\n').slice(0, 560) }];
    } catch (error) {
      if (signal.aborted || error.message !== 'Wikimedia HTTP 404') throw error;
    }
  }

  const quoted = question.match(/[“"]([^”"]{2,160})[”"]/u)?.[1];
  const terms = words(quoted || question).filter(word => !stopWords.has(word)).slice(0, 12);
  const query = terms.join(' ').slice(0, 180);
  if (!query) return [];
  const vi = /[À-ỹ]|\b(?:tieng|nghia|nguyen)\b/iu.test(question);
  const root = vi ? 'https://vi.wikipedia.org' : 'https://en.wikipedia.org';
  const params = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: query, gsrlimit: '5',
    prop: 'extracts', exintro: '1', explaintext: '1', exchars: '550',
    format: 'json', formatversion: '2', origin: '*'
  });
  const result = await wikiJSON(root + '/w/api.php?' + params, signal);
  if (result.error) throw new Error('Wikimedia search failed');
  const matches = (result.query?.pages || [])
    .map(page => ({ ...page, overlap: words(page.title || '').filter(word => terms.includes(word)).length }))
    .filter(page => page.extract && page.overlap >= Math.min(terms.length, 2))
    .sort((a, b) => b.overlap - a.overlap || a.index - b.index);
  return matches.filter(page => page.overlap === matches[0]?.overlap).slice(0, 2)
    .map(page => ({ title: page.title + ' · Wikipedia', url: root + '/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')), text: page.extract.slice(0, 560) }));
}
