const BASE = "https://api.alquran.cloud/v1";
const QURANENC_BASE = "https://quranenc.com/api/v1";
const TELUGU_TRANSLATION_KEY = "telugu_muhammad";

async function request(path) {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Quran data service returned ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 200 || !json.data) {
    throw new Error(json.status || "Unable to load Quran data");
  }

  return json.data;
}

export const getSurahs = () => request("/surah");

export const getSurah = (number, editions) =>
  request(`/surah/${number}/editions/${editions.map(encodeURIComponent).join(",")}`);

export const getEditionList = () => request("/edition");

export const getEditionsByType = (type) =>
  request(`/edition/type/${encodeURIComponent(type)}`);

export const getEditionsByLanguage = (language) =>
  request(`/edition/language/${encodeURIComponent(language)}`);

export const getRandomAyah = (editions) =>
  request(`/ayah/random/editions/${editions.map(encodeURIComponent).join(",")}`);

export const searchQuran = (query, edition = "en.sahih") =>
  request(`/search/${encodeURIComponent(query)}/all/${encodeURIComponent(edition)}`);

export async function getTeluguAyah(surahNumber, ayahNumber) {
  const surah = Number(surahNumber);
  const ayah = Number(ayahNumber);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) {
    throw new Error("Invalid verse reference");
  }
  const response = await fetch(
    `${QURANENC_BASE}/translation/aya/${TELUGU_TRANSLATION_KEY}/${surah}/${ayah}`
  );
  if (!response.ok) throw new Error(`QuranEnc returned ${response.status}`);
  const json = await response.json();
  const item = Array.isArray(json) ? json[0] : json.result || json;
  if (!item?.translation) throw new Error("Telugu verse translation is unavailable");
  return { text: item.translation, footnotes: item.footnotes || "" };
}

export async function getTeluguSurah(surahNumber) {
  if (!Number.isInteger(Number(surahNumber)) || surahNumber < 1 || surahNumber > 114) {
    throw new Error("Invalid Surah number");
  }

  const url = `${QURANENC_BASE}/translation/sura/${TELUGU_TRANSLATION_KEY}/${Number(surahNumber)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`QuranEnc returned ${response.status}`);
  }

  const json = await response.json();
  const rows = Array.isArray(json) ? json : json.result;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("QuranEnc returned no Telugu translation verses");
  }

  return rows
    .map((item) => ({
      numberInSurah: Number(item.aya),
      text: item.translation,
      footnotes: item.footnotes || ""
    }))
    .filter((item) => Number.isInteger(item.numberInSurah) && item.text)
    .sort((a, b) => a.numberInSurah - b.numberInSurah);
}

export function chooseEdition(editions, language, preferred = []) {
  const matches = editions.filter(
    (edition) => edition.language === language && edition.type === "translation"
  );

  for (const id of preferred) {
    const exact = matches.find((edition) => edition.identifier === id);
    if (exact) return exact;
  }

  return matches[0] || null;
}
