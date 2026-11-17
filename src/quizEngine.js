const API = "https://api.alquran.cloud/v1";
const CACHE_KEY = "qfe-quiz-history-v1";

async function fetchEdition(edition) {
  const response = await fetch(`${API}/quran/${encodeURIComponent(edition)}`);
  if (!response.ok) throw new Error(`Quran content service returned ${response.status}`);
  const json = await response.json();
  if (json.code !== 200 || !json.data?.surahs) {
    throw new Error(`The ${edition} Quran edition could not be loaded.`);
  }
  return json.data.surahs;
}

export async function loadQuizCorpus() {
  const [arabicSurahs, englishSurahs] = await Promise.all([
    fetchEdition("quran-uthmani"),
    fetchEdition("en.sahih")
  ]);

  const englishByNumber = new Map(englishSurahs.map(s => [s.number, s]));
  const surahs = arabicSurahs.map(arabicSurah => {
    const englishSurah = englishByNumber.get(arabicSurah.number);
    const englishByAyah = new Map((englishSurah?.ayahs || []).map(a => [a.numberInSurah, a]));
    return {
      number: arabicSurah.number,
      name: arabicSurah.name,
      englishName: arabicSurah.englishName,
      englishNameTranslation: arabicSurah.englishNameTranslation,
      revelationType: arabicSurah.revelationType,
      numberOfAyahs: arabicSurah.numberOfAyahs,
      ayahs: (arabicSurah.ayahs || []).map(ayah => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        juz: ayah.juz,
        page: ayah.page,
        text: ayah.text,
        translation: englishByAyah.get(ayah.numberInSurah)?.text || ""
      }))
    };
  });

  const ayahs = surahs.flatMap(surah =>
    surah.ayahs.map(ayah => ({ ...ayah, surah }))
  );

  if (surahs.length !== 114 || ayahs.length < 6000) {
    throw new Error("The complete Quran dataset did not load correctly. Please try again.");
  }

  return { surahs, ayahs };
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickOptions(correct, candidates, keyFn, count = 4) {
  const correctKey = keyFn(correct);
  const distractors = shuffle(uniqueBy(candidates, keyFn))
    .filter(item => keyFn(item) !== correctKey)
    .slice(0, count - 1);
  if (distractors.length < count - 1) return null;
  return shuffle([correct, ...distractors]).map((item, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 8)}`,
    value: keyFn(item),
    label: String(keyFn(item))
  }));
}

function makeQuestion(type, target, corpus, allSurahs) {
  const allAyahs = corpus.ayahs;
  const reference = `Surah ${target.surah.englishName} · ${target.surah.number}:${target.numberInSurah}`;

  if (type === "identify") {
    const options = pickOptions(
      target.surah,
      allSurahs,
      s => s.englishName
    );
    if (!options) return null;
    return {
      type, title: "Identify the Surah",
      prompt: "Which Surah does this Ayah belong to?",
      arabic: target.text, translation: target.translation,
      options, correct: target.surah.englishName,
      explanation: `This Ayah is from ${target.surah.englishName} (${target.surah.name}), Surah ${target.surah.number}.`,
      reference
    };
  }

  if (type === "completion") {
    const words = target.text.trim().split(/\s+/);
    if (words.length < 3) return null;
    const index = 1 + Math.floor(Math.random() * (words.length - 2));
    const correctWord = words[index];
    const blanked = [...words];
    blanked[index] = "ــــــــــــ";
    const wordPool = allAyahs.flatMap(a => a.text.split(/\s+/))
      .filter(word => word && word !== correctWord && word.length > 1);
    const distractors = shuffle([...new Set(wordPool)]).slice(0, 3);
    if (distractors.length < 3) return null;
    const options = shuffle([correctWord, ...distractors]).map((word, i) => ({
      id: `word-${i}`, value: word, label: word
    }));
    return {
      type, title: "Complete the Ayah",
      prompt: "Choose the missing Arabic word.",
      arabic: blanked.join(" "), translation: target.translation,
      options, correct: correctWord,
      explanation: `The complete Ayah is: ${target.text}`,
      reference
    };
  }

  if (type === "translation") {
    if (!target.translation) return null;
    const otherTranslations = shuffle(allAyahs)
      .filter(a => a.number !== target.number && a.translation && a.translation !== target.translation)
      .slice(0, 3)
      .map(a => a.translation);
    if (otherTranslations.length < 3) return null;
    const options = shuffle([target.translation, ...otherTranslations]).map((value, i) => ({
      id: `translation-${i}`, value, label: value
    }));
    return {
      type, title: "Understand the Ayah",
      prompt: "Choose the English translation that matches this Arabic Ayah.",
      arabic: target.text, options, correct: target.translation,
      explanation: target.translation,
      reference
    };
  }

  if (type === "next") {
    const next = allAyahs.find(a => a.number === target.number + 1);
    if (!next) return null;
    const distractors = shuffle(allAyahs)
      .filter(a => a.number !== next.number && a.number !== target.number)
      .slice(0, 3);
    const options = shuffle([next, ...distractors]).map((a, i) => ({
      id: `next-${i}`, value: String(a.number), label: a.text
    }));
    return {
      type, title: "What comes next?",
      prompt: "Which Ayah comes immediately after the one shown?",
      arabic: target.text, options, correct: String(next.number),
      explanation: `The next Ayah is ${next.text}`,
      reference: `${reference} · Next: ${next.surah.englishName} ${next.surah.number}:${next.numberInSurah}`
    };
  }

  if (type === "juz") {
    const correct = String(target.juz);
    const numbers = shuffle(Array.from({ length: 30 }, (_, i) => String(i + 1)))
      .filter(n => n !== correct).slice(0, 3);
    const options = shuffle([correct, ...numbers]).map((value, i) => ({
      id: `juz-${i}`, value, label: `Juz ${value}`
    }));
    return {
      type, title: "Find the Juz",
      prompt: "This Ayah belongs to which Juz?",
      arabic: target.text, translation: target.translation,
      options, correct,
      explanation: `This Ayah is in Juz ${target.juz}.`,
      reference
    };
  }

  if (type === "audio") {
    const options = pickOptions(target.surah, allSurahs, s => s.englishName);
    if (!options) return null;
    return {
      type, title: "Listening challenge",
      prompt: "Listen to the recitation. Which Surah is it from?",
      audioUrl: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${target.number}.mp3`,
      options, correct: target.surah.englishName,
      explanation: `This recitation is Ayah ${target.numberInSurah} of ${target.surah.englishName}.`,
      reference
    };
  }

  if (type === "facts") {
    const correct = String(target.surah.numberOfAyahs);
    const alternatives = shuffle([...new Set(allSurahs.map(s => String(s.numberOfAyahs)))])
      .filter(value => value !== correct)
      .slice(0, 3);
    if (alternatives.length < 3) return null;
    const options = shuffle([correct, ...alternatives]).map((value, i) => ({
      id: `fact-${i}`, value, label: `${value} Ayahs`
    }));
    return {
      type, title: "Surah knowledge",
      prompt: `How many Ayahs are in ${target.surah.englishName}?`,
      options,
      correct,
      explanation: `${target.surah.englishName} contains ${correct} Ayahs.`,
      reference: `Surah ${target.surah.number} · ${target.surah.revelationType}`
    };
  }

  return null;
}

const TYPE_MAP = {
  mixed: ["identify", "completion", "translation", "next", "juz", "audio", "facts"],
  identify: ["identify"],
  completion: ["completion"],
  translation: ["translation"],
  next: ["next"],
  juz: ["juz"],
  audio: ["audio"],
  facts: ["facts"]
};

export function buildQuiz({ corpus, surahNumber = "all", category = "mixed", difficulty = "beginner", count = 10 }) {
  const selectedSurahs = surahNumber === "all"
    ? corpus.surahs
    : corpus.surahs.filter(s => s.number === Number(surahNumber));
  const allowedNumbers = new Set(selectedSurahs.map(s => s.number));
  const targets = corpus.ayahs.filter(a => allowedNumbers.has(a.surah.number));
  const difficultyTypes = {
    beginner: ["identify", "facts", "translation"],
    intermediate: ["identify", "completion", "translation", "juz", "facts"],
    advanced: ["completion", "next", "juz", "audio", "translation"]
  };
  const types = category === "mixed"
    ? (difficultyTypes[difficulty] || difficultyTypes.beginner)
    : (TYPE_MAP[category] || TYPE_MAP.mixed);
  const questions = [];
  const used = new Set();
  const maxAttempts = count * 30;
  let attempts = 0;

  while (questions.length < count && attempts < maxAttempts) {
    attempts++;
    const target = targets[Math.floor(Math.random() * targets.length)];
    if (!target || used.has(target.number)) continue;
    const type = types[questions.length % types.length];
    const question = makeQuestion(type, target, corpus, corpus.surahs);
    if (!question) continue;
    used.add(target.number);
    question.id = `q-${questions.length + 1}`;
    questions.push(question);
  }

  if (questions.length < count) {
    throw new Error(`We could create only ${questions.length} questions for this selection. Try Mixed Quiz or choose another Surah.`);
  }

  return questions;
}

export function readQuizHistory() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveQuizResult(result) {
  const history = readQuizHistory();
  history.unshift({ ...result, id: `${Date.now()}` });
  localStorage.setItem(CACHE_KEY, JSON.stringify(history.slice(0, 30)));
}
