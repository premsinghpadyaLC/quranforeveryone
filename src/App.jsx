import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Headphones, Search, Bookmark, BookmarkCheck, Languages, MoonStar,
  Menu, X, ChevronDown, ChevronLeft, ChevronRight, Play, Pause, Volume2,
  Heart, Sun, BookMarked, Sparkles, Home, Info, ExternalLink, LoaderCircle,
  ListMusic, Copy, Check, Settings2, CircleHelp
} from "lucide-react";
import {
  getSurahs, getSurah, getEditionList, getEditionsByType, getRandomAyah,
  searchQuran, chooseEdition, getTeluguSurah, getTeluguAyah
} from "./api.js";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو (Urdu)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "te", label: "తెలుగు (Telugu)" }
];
const ARABIC_EDITION = "quran-uthmani";
const AUDIO_EDITION = "ar.alafasy";
const STORAGE_KEY = "qfe-bookmarks-v1";
const LAST_KEY = "qfe-last-read-v1";

function readBookmarks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function getStoredLast() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || "null"); }
  catch { return null; }
}
function ErrorMessage({ message, retry }) {
  return <div className="error-box"><Info size={18}/><span>{message}</span>{retry && <button className="text-button" onClick={retry}>Try again</button>}</div>;
}
function Loading({ label = "Loading Quran…" }) {
  return <div className="loading"><LoaderCircle className="spin" size={24}/><span>{label}</span></div>;
}
function App() {
  const [surahs, setSurahs] = useState([]);
  const [editions, setEditions] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem("qfe-language-v1") || "en");
  const [selectedSurah, setSelectedSurah] = useState(() => {
    const saved = getStoredLast();
    return Number.isInteger(saved?.surah) && saved.surah >= 1 && saved.surah <= 114 ? saved.surah : 1;
  });
  const [surahData, setSurahData] = useState([]);
  const [teluguAyahs, setTeluguAyahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readerLoading, setReaderLoading] = useState(false);
  const [error, setError] = useState("");
  const [readerError, setReaderError] = useState("");
  const [activeTab, setActiveTab] = useState("read");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [tafsirEditions, setTafsirEditions] = useState([]);
  const [tafsirEdition, setTafsirEdition] = useState("");
  const [showTafsir, setShowTafsir] = useState({});
  const [audioAyah, setAudioAyah] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [fontScale, setFontScale] = useState(1);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [copied, setCopied] = useState("");
  const [lastRead, setLastRead] = useState(getStoredLast());
  const [showSettings, setShowSettings] = useState(false);
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);

  const translationEdition = useMemo(() => {
    if (selectedLanguage === "te") return null;
    const preferred = {
      en: "en.sahih",
      ur: "ur.jalandhry",
      hi: "hi.hindi"
    }[selectedLanguage];
    const found = editions.find(e => e.identifier === preferred);
    return found || chooseEdition(editions, selectedLanguage);
  }, [editions, selectedLanguage]);

  const transliterationEdition = useMemo(
    () => editions.find(e => e.type === "transliteration" && e.language === "en") || null,
    [editions]
  );
  const tafsirOptions = useMemo(
    () => tafsirEditions.filter(e => !e.language || e.language === selectedLanguage || e.language === "en"),
    [tafsirEditions, selectedLanguage]
  );

  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const [chapters, editionList, tafsirList] = await Promise.all([
          getSurahs(), getEditionList(), getEditionsByType("tafsir").catch(() => [])
        ]);
        if (!alive) return;
        setSurahs(chapters);
        setEditions(editionList);
        setTafsirEditions(tafsirList);
        const preferredTafsir = tafsirList.find(e => e.language === "en") || tafsirList[0];
        if (preferredTafsir) setTafsirEdition(preferredTafsir.identifier);
        setLoading(false);
      } catch (e) {
        if (alive) { setError("We couldn't connect to the Quran content service. Please check your connection and try again."); setLoading(false); }
      }
    }
    init();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!editions.length || !surahs.length) return;
    loadSurah(selectedSurah);
  }, [selectedSurah, selectedLanguage, editions.length, surahs.length]);

  async function fetchDailyVerse() {
    if (selectedLanguage === "te") {
      const raw = await getRandomAyah([ARABIC_EDITION]);
      const arabicItems = Array.isArray(raw) ? raw : [raw];
      const arabic = arabicItems.find(item => item.edition?.identifier === ARABIC_EDITION) || arabicItems[0];
      if (!arabic?.surah?.number || !arabic?.numberInSurah) throw new Error("Daily verse unavailable");
      const telugu = await getTeluguAyah(arabic.surah.number, arabic.numberInSurah);
      return [...arabicItems, {
        edition: { identifier: "te.quranenc", englishName: "Telugu · QuranEnc" },
        text: telugu.text,
        footnotes: telugu.footnotes
      }];
    }
    const data = await getRandomAyah([ARABIC_EDITION, translationEdition?.identifier || "en.sahih"]);
    return Array.isArray(data) ? data : [data];
  }

  useEffect(() => {
    let alive = true;
    async function loadDaily() {
      setDailyLoading(true);
      try {
        const data = await fetchDailyVerse();
        if (alive) setDaily(data);
      } catch { if (alive) setDaily(null); }
      finally { if (alive) setDailyLoading(false); }
    }
    if (editions.length) loadDaily();
    return () => { alive = false; };
  }, [editions.length, translationEdition?.identifier, selectedLanguage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem("qfe-language-v1", selectedLanguage);
  }, [selectedLanguage]);

  async function loadSurah(number) {
    setReaderLoading(true);
    setReaderError("");
    setSurahData([]);
    setTeluguAyahs([]);

    try {
      const ids = [ARABIC_EDITION];

      if (selectedLanguage !== "te" && translationEdition?.identifier) {
        ids.push(translationEdition.identifier);
      }
      if (transliterationEdition) {
        ids.push(transliterationEdition.identifier);
      }

      const result = await getSurah(number, ids);
      setSurahData(result);

      if (selectedLanguage === "te") {
        const telugu = await getTeluguSurah(number);
        setTeluguAyahs(telugu);
      }

    } catch (error) {
      console.error("Surah loading error:", error);
      setReaderError(
        selectedLanguage === "te"
          ? "The Surah or Telugu translation could not be loaded. Please check your connection and try again."
          : "This Surah couldn't be loaded. Please try again."
      );
    } finally {
      setReaderLoading(false);
    }
  }

  const arabicData = surahData.find(x => x.edition?.identifier === ARABIC_EDITION) || surahData[0];
  const translationData = selectedLanguage === "te"
    ? { ayahs: teluguAyahs }
    : surahData.find(x => x.edition?.identifier === translationEdition?.identifier);
  const transliterationData = surahData.find(x => x.edition?.type === "transliteration");
  const verses = arabicData?.ayahs || [];
  const selectedChapter = surahs.find(s => s.number === selectedSurah);

  useEffect(() => {
    if (readerLoading || !verses.length || arabicData?.number !== selectedSurah || hasRestoredPosition) return;
    if (lastRead?.surah === selectedSurah) {
      requestAnimationFrame(() => {
        document.getElementById(`verse-${selectedSurah}-${lastRead.ayah}`)?.scrollIntoView({
          behavior: "auto",
          block: "center"
        });
      });
    }
    setHasRestoredPosition(true);
  }, [readerLoading, verses.length, selectedSurah, lastRead, hasRestoredPosition, arabicData?.number]);

  useEffect(() => {
    if (readerLoading || !hasRestoredPosition || activeTab !== "read" || !verses.length || arabicData?.number !== selectedSurah) return;
    const cards = document.querySelectorAll("[data-verse-progress]");
    if (!cards.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const ayah = Number(visible.target.dataset.verseProgress);
      if (!Number.isInteger(ayah)) return;
      const progress = { surah: selectedSurah, ayah };
      setLastRead(progress);
      localStorage.setItem(LAST_KEY, JSON.stringify(progress));
    }, { threshold: [0.35, 0.6, 0.85], rootMargin: "-12% 0px -42% 0px" });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [readerLoading, hasRestoredPosition, activeTab, selectedSurah, verses.length, arabicData?.number]);

  function verseAt(data, index) { return data?.ayahs?.[index]; }
  function toggleBookmark(ayah) {
    const key = `${ayah.surah?.number || selectedSurah}:${ayah.numberInSurah}`;
    setBookmarks(old => old.some(b => b.key === key)
      ? old.filter(b => b.key !== key)
      : [...old, { key, surah: ayah.surah?.number || selectedSurah, ayah: ayah.numberInSurah, text: ayah.text }]);
  }
  function isBookmarked(surah, ayah) { return bookmarks.some(b => b.key === `${surah}:${ayah}`); }

  async function runSearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    if (selectedLanguage === "te") {
      setSearchResults([]);
      setSearchError("Search is currently available in English, Urdu and Hindi. Telugu reading and verse translations are available in the reader.");
      return;
    }
    setSearchLoading(true); setSearchError(""); setSearchResults([]);
    try {
      const result = await searchQuran(query.trim(), translationEdition?.identifier || "en.sahih");
      setSearchResults(result.matches || []);
      if (!(result.matches || []).length) setSearchError("No matching verses were found. Try a different word or phrase.");
    } catch { setSearchError("Search is temporarily unavailable. Please try again."); }
    finally { setSearchLoading(false); }
  }

  async function playVerse(ayah) {
    const globalNumber = ayah.number;
    const player = document.getElementById("qfe-audio");
    if (!player) return;
    if (audioAyah === globalNumber) {
      if (audioPlaying) {
        player.pause();
        setAudioPlaying(false);
        return;
      }
      try {
        if (player.ended) player.currentTime = 0;
        await player.play();
        setAudioPlaying(true);
      } catch {
        setAudioPlaying(false);
        setAudioError("Audio couldn't resume. Please try again.");
      }
      return;
    }
    setAudioAyah(globalNumber);
    setAudioError("");
    player.src = `https://cdn.islamic.network/quran/audio/128/${AUDIO_EDITION}/${globalNumber}.mp3`;
    try {
      await player.play();
      setAudioPlaying(true);
    } catch {
      setAudioPlaying(false);
      setAudioError("Audio couldn't start. Please try again.");
    }
  }

  async function playDaily() {
    const arabic = daily?.find(x => x.edition?.identifier === ARABIC_EDITION) || daily?.[0];
    if (arabic) await playVerse(arabic);
  }

  function resumeReading() {
    setActiveTab("read");
    setMobileMenu(false);
    if (lastRead?.surah && lastRead.surah !== selectedSurah) {
      setHasRestoredPosition(false);
      setSelectedSurah(lastRead.surah);
    } else {
      requestAnimationFrame(() => {
        document.getElementById(`verse-${lastRead?.surah || selectedSurah}-${lastRead?.ayah || 1}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    document.getElementById("reader")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectSurah(number) {
    setSelectedSurah(number); setActiveTab("read"); setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goToBookmark(bookmark) {
    selectSurah(bookmark.surah);
  }
  async function copyVerse(text, key) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1400); } catch {}
  }

  const navItems = [
    { id: "read", label: "Read Quran", icon: BookOpen },
    { id: "search", label: "Search", icon: Search },
    { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
    { id: "daily", label: "Daily Ayah", icon: Sparkles }
  ];

  if (loading) return <div className="boot"><div className="brand-mark"><MoonStar/></div><h1>Quran for Everyone</h1><Loading label="Preparing your Quran experience…"/></div>;
  if (error) return <div className="boot"><div className="brand-mark"><MoonStar/></div><h1>Quran for Everyone</h1><ErrorMessage message={error} retry={() => window.location.reload()}/></div>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => {e.preventDefault(); setActiveTab("read");}}>
          <span className="brand-mark"><MoonStar size={21}/></span>
          <span><strong>Quran for Everyone</strong><small>Read · Reflect · Understand</small></span>
        </a>
        <nav className="desktop-nav">
          {navItems.map(item => <button key={item.id} className={`nav-link ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}><item.icon size={16}/>{item.label}</button>)}
        </nav>
        <div className="top-actions">
          <label className="language-select"><Languages size={16}/><select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} aria-label="Translation language">{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select><ChevronDown size={14}/></label>
          <button className="icon-button" title="Reading settings" onClick={() => setShowSettings(v => !v)}><Settings2 size={18}/></button>
          <button className="mobile-menu-button" onClick={() => setMobileMenu(v => !v)} aria-label="Open menu">{mobileMenu ? <X/> : <Menu/>}</button>
        </div>
      </header>

      {mobileMenu && <div className="mobile-nav">{navItems.map(item => <button key={item.id} onClick={() => {setActiveTab(item.id);setMobileMenu(false)}}><item.icon size={17}/>{item.label}</button>)}</div>}

      <main>
        <section className="hero">
          <div className="hero-pattern"></div>
          <div className="hero-content">
            <div className="eyebrow"><span></span> A FREE QURAN READING EXPERIENCE <span></span></div>
            <div className="hero-arabic" lang="ar" dir="rtl">الْقُرْآنُ الْكَرِيمُ</div>
            <h1>The Noble Quran</h1>
            <p>A space to read, listen, reflect and grow — open to everyone, everywhere.</p>
            <button className="hero-cta" onClick={resumeReading}><BookOpen size={17}/> {lastRead ? `Continue · ${lastRead.surah}:${lastRead.ayah}` : "Begin reading"} <ChevronRight size={16}/></button>
          </div>
          <div className="hero-ornament ornament-left">۞</div><div className="hero-ornament ornament-right">۞</div>
        </section>

        {showSettings && <section className="settings-panel"><div><strong>Reading appearance</strong><span>Adjust Arabic text size</span></div><div className="font-controls"><button onClick={() => setFontScale(v => Math.max(.8, +(v-.1).toFixed(1)))}>A−</button><span>{Math.round(fontScale*100)}%</span><button onClick={() => setFontScale(v => Math.min(1.6, +(v+.1).toFixed(1)))}>A+</button></div></section>}

        <section className="feature-strip">
          <div><BookOpen/><span><strong>114 Surahs</strong><small>The complete Quran</small></span></div>
          <div><Headphones/><span><strong>Listen & reflect</strong><small>Verse-by-verse audio</small></span></div>
          <div><Languages/><span><strong>5 languages</strong><small>Arabic + 4 translations</small></span></div>
          <div><Heart/><span><strong>Always free</strong><small>No account required</small></span></div>
        </section>

        <div className="content-layout">
          <aside className="sidebar">
            <div className="side-card">
              <div className="side-heading"><span>EXPLORE</span><BookOpen size={16}/></div>
              {navItems.map(item => <button key={item.id} className={`side-link ${activeTab === item.id ? "selected" : ""}`} onClick={() => setActiveTab(item.id)}><item.icon size={17}/>{item.label}{activeTab === item.id && <span className="side-dot"/>}</button>)}
            </div>
            <div className="side-card surah-list-card">
              <div className="side-heading"><span>ALL SURAHS</span><span className="count-pill">114</span></div>
              <div className="surah-list">
                {surahs.map(s => <button key={s.number} className={`surah-item ${selectedSurah === s.number && activeTab === "read" ? "current" : ""}`} onClick={() => selectSurah(s.number)}>
                  <span className="surah-number">{s.number}</span><span className="surah-name"><strong>{s.englishName}</strong><small>{s.englishNameTranslation}</small></span><span className="surah-arabic" lang="ar">{s.name}</span>
                </button>)}
              </div>
            </div>
            <div className="side-note"><MoonStar size={18}/><p>“The best among you are those who learn the Quran and teach it.”</p><small>— Sahih al-Bukhari 5027</small></div>
          </aside>

          <section className="main-panel" id="reader">
            {activeTab === "read" && <>
              <div className="section-heading">
                <div><span className="section-kicker">THE HOLY QURAN</span><h2>Continue your journey</h2><p>Choose a Surah and read at your own pace.</p></div>
                <div className="chapter-select-wrap"><select value={selectedSurah} onChange={e => setSelectedSurah(Number(e.target.value))}>{surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}</select><ChevronDown size={15}/></div>
              </div>
              {readerError && <ErrorMessage message={readerError} retry={() => loadSurah(selectedSurah)}/>}
              {readerLoading ? <Loading label="Loading verses…"/> : selectedChapter && verses.length > 0 && <>
                <div className="surah-banner">
                  <div className="surah-banner-top"><span>{selectedChapter.revelationType} · {selectedChapter.numberOfAyahs} AYahs</span><span>CHAPTER {selectedChapter.number}</span></div>
                  <div className="surah-title-ar" lang="ar" dir="rtl">{selectedChapter.name}</div>
                  <h3>{selectedChapter.englishName}</h3><p>{selectedChapter.englishNameTranslation}</p>
                  {selectedSurah !== 1 && selectedSurah !== 9 && <div className="bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>}
                </div>
                <div className="reader-toolbar"><span><BookOpen size={15}/> {selectedChapter.numberOfAyahs} verses</span><span className="translation-label"><Languages size={15}/>{selectedLanguage === "te" ? "Telugu · QuranEnc · Version 1.0.7" : (translationEdition?.englishName || LANGUAGES.find(l=>l.code===selectedLanguage)?.label || "Translation")}</span></div>
                <div className="verse-list">
                  {verses.map((ayah, index) => {
                    const translated = verseAt(translationData, index);
                    const transliterated = verseAt(transliterationData, index);
                    const marked = isBookmarked(selectedSurah, ayah.numberInSurah);
                    const playing = audioAyah === ayah.number && audioPlaying;
                    return <article id={`verse-${selectedSurah}-${ayah.numberInSurah}`} data-verse-progress={ayah.numberInSurah} className={`verse-card ${audioAyah === ayah.number ? "audio-active" : ""}`} key={ayah.number}>
                      <div className="verse-topline"><span className="ayah-badge">{selectedSurah}:{ayah.numberInSurah}</span><div className="verse-actions">
                        <button title={playing ? "Pause recitation" : "Play or resume recitation"} onClick={() => playVerse(ayah)} className={playing ? "action-active" : ""}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
                        <button title={marked ? "Remove bookmark" : "Bookmark"} onClick={() => toggleBookmark({...ayah, surah:selectedChapter})}>{marked ? <BookmarkCheck size={17}/> : <Bookmark size={17}/>}</button>
                        <button title="Copy Arabic text" onClick={() => copyVerse(ayah.text, `${selectedSurah}:${ayah.numberInSurah}`)}>{copied === `${selectedSurah}:${ayah.numberInSurah}` ? <Check size={16}/> : <Copy size={16}/>}</button>
                      </div></div>
                      <div className="arabic-text" lang="ar" dir="rtl" translate="no" style={{fontSize:`${2.05*fontScale}rem`}}>{ayah.text}</div>
                      {transliterated && <div className="transliteration">{transliterated.text}</div>}
                      {translated ? (
                        <>
                          <p className="translation-text" lang={selectedLanguage} dir={selectedLanguage === "ur" ? "rtl" : "ltr"}>{translated.text}</p>
                          {selectedLanguage === "te" && translated.footnotes && (
                            <p className="small-disclaimer">{translated.footnotes}</p>
                          )}
                        </>
                      ) : (
                        <p className="translation-text muted">
                          A translation in this language is not currently listed by the content provider. The Arabic text is shown above.
                        </p>
                      )}
                      <div className="verse-bottom"><span>Juz {ayah.juz} · Page {ayah.page}</span><button onClick={() => setShowTafsir(old => ({...old,[ayah.number]:!old[ayah.number]}))}><BookMarked size={14}/>{showTafsir[ayah.number] ? "Hide Tafsir" : "Read Tafsir"}</button></div>
                      {showTafsir[ayah.number] && <TafsirPanel ayah={ayah} editions={tafsirOptions} selected={tafsirEdition} onSelect={setTafsirEdition}/>}
                    </article>;
                  })}
                </div>
                <div className="chapter-pagination"><button disabled={selectedSurah===1} onClick={() => selectSurah(selectedSurah-1)}><ChevronLeft size={16}/> Previous Surah</button><span>{selectedSurah} / 114</span><button disabled={selectedSurah===114} onClick={() => selectSurah(selectedSurah+1)}>Next Surah <ChevronRight size={16}/></button></div>
              </>}
            </>}

            {activeTab === "search" && <div className="tab-page">
              <div className="section-heading"><div><span className="section-kicker">DISCOVER THE QURAN</span><h2>Search verses</h2><p>Search words or phrases in the selected translation.</p></div></div>
              <form className="search-form" onSubmit={runSearch}><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a word or phrase…" aria-label="Search Quran"/><button disabled={searchLoading || !query.trim()}>{searchLoading ? <LoaderCircle className="spin"/> : "Search"}</button></form>
              {searchLoading && <Loading label="Searching the Quran…"/>}
              {searchError && <ErrorMessage message={searchError}/>}
              <div className="search-results">{searchResults.map((match,i)=><article className="search-result" key={`${match.number}-${i}`}><span className="ayah-badge">{match.surah?.englishName} · {match.numberInSurah}</span><p>{match.text}</p><button onClick={()=>selectSurah(match.surah.number)}>Open Surah <ChevronRight size={14}/></button></article>)}</div>
              <p className="small-disclaimer">Search results depend on the selected translation and the availability of that edition from the content provider.</p>
            </div>}

            {activeTab === "bookmarks" && <div className="tab-page">
              <div className="section-heading"><div><span className="section-kicker">YOUR PERSONAL COLLECTION</span><h2>Saved verses</h2><p>Your bookmarks are stored only in this browser.</p></div><span className="count-pill">{bookmarks.length} saved</span></div>
              {bookmarks.length ? <div className="bookmark-list">{bookmarks.map(b=><article className="bookmark-card" key={b.key}><span className="ayah-badge">{b.key}</span><p className="arabic-text" lang="ar" dir="rtl">{b.text}</p><div className="bookmark-actions"><button onClick={()=>goToBookmark(b)}>Open Surah</button><button onClick={()=>setBookmarks(old=>old.filter(x=>x.key!==b.key))}>Remove</button></div></article>)}</div> : <div className="empty-state"><Bookmark size={30}/><h3>No saved verses yet</h3><p>Tap the bookmark icon beside any verse to keep it here.</p><button onClick={()=>setActiveTab("read")}>Start reading</button></div>}
            </div>}

{activeTab === "daily" && (
  <div className="tab-page">
    <div className="section-heading">
      <div>
        <span className="section-kicker">A MOMENT OF REFLECTION</span>
        <h2>Daily Ayah</h2>
        <p>A verse to read, reflect on and carry with you.</p>
      </div>
    </div>

    {dailyLoading ? (
      <Loading label="Finding a verse…" />
    ) : daily ? (
      <DailyCard
        daily={daily}
        play={playDaily}
        playing={audioPlaying}
        language={selectedLanguage}
      />
    ) : (
      <ErrorMessage
        message="The daily verse could not be loaded right now."
        retry={() => {
          setDailyLoading(true);
          fetchDailyVerse()
            .then(data => setDaily(data))
            .catch(() => setDaily(null))
            .finally(() => setDailyLoading(false));
        }}
      />
    )}
  </div>
)}
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-brand"><span className="brand-mark"><MoonStar size={18}/></span><strong>Quran for Everyone</strong></div>
        <p>Free access to Quran reading, listening and reflection for everyone.</p>
        <div className="footer-author">Created by <strong>Premsingh Padya</strong><span>A learner of the Quran, learning and sharing its teachings with others.</span></div>
        <div className="footer-links"><a href="https://alquran.cloud/api" target="_blank" rel="noreferrer">Quran data <ExternalLink size={12}/></a><a href="https://quranenc.com/en/home/api/" target="_blank" rel="noreferrer">QuranEnc translations <ExternalLink size={12}/></a><a href="https://tanzil.net/docs/Text_License" target="_blank" rel="noreferrer">Tanzil text licence <ExternalLink size={12}/></a></div>
        <small>Quran text, translations, recitations and commentary are provided by their respective publishers. Telugu translation: Abdurrahim ibn Muhammad, QuranEnc.com, version 1.0.7.</small>
      </footer>
      <audio id="qfe-audio" onEnded={()=>setAudioPlaying(false)} onPause={()=>setAudioPlaying(false)} onPlay={()=>setAudioPlaying(true)} />
      {audioError && <div className="toast">{audioError}<button onClick={()=>setAudioError("")}><X size={14}/></button></div>}
    </div>
  );
}

function TafsirPanel({ ayah, editions, selected, onSelect }) {
  const [data,setData] = useState(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (!selected) { setData(null); setError("No Tafsir edition is currently listed by the provider for this language."); return; }
      setBusy(true);setError("");setData(null);
      try {
        const result = await fetch(`https://api.alquran.cloud/v1/ayah/${ayah.number}/${encodeURIComponent(selected)}`).then(r=>r.json());
        if (!result || result.code !== 200) throw new Error("Unavailable");
        if(active) setData(result.data);
      } catch { if(active) setError("Tafsir could not be loaded. The selected commentary may not cover this verse."); }
      finally { if(active) setBusy(false); }
    }
    load(); return ()=>{active=false};
  },[ayah.number,selected]);
  return <div className="tafsir-panel"><div className="tafsir-head"><strong>Tafsir / Commentary</strong>{editions.length>0 && <select value={selected} onChange={e=>onSelect(e.target.value)}>{editions.map(e=><option key={e.identifier} value={e.identifier}>{e.englishName || e.name}</option>)}</select>}</div>{busy?<Loading label="Loading commentary…"/>:error?<p className="muted">{error}</p>:<><p>{data?.text}</p><small>Source: {data?.edition?.englishName || data?.edition?.name || selected}</small></>}</div>;
}

function DailyCard({daily,play,playing,language}) {
  const arabic = daily.find(x=>x.edition?.identifier==="quran-uthmani") || daily[0];
  const translation = daily.find(x=>x.edition?.identifier!=="quran-uthmani");
  return <div className="daily-card"><div className="daily-label"><Sparkles size={16}/> TODAY'S VERSE</div><div className="daily-arabic" lang="ar" dir="rtl" translate="no">{arabic?.text}</div>{translation && <p className="daily-translation" lang={language} dir={language === "ur" ? "rtl" : "ltr"}>{translation.text}</p>}<div className="daily-reference">Surah {arabic?.surah?.englishName || ""} · Ayah {arabic?.numberInSurah}</div><button className="daily-play" onClick={play}>{playing?<Pause size={16}/>:<Play size={16}/>} Listen to recitation</button></div>;
}

export default App;
