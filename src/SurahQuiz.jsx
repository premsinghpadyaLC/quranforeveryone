import React, { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Download,
  Share2,
  Sparkles,
  X
} from "lucide-react";

import "./surah-quiz.css";

const BRAND = "Quran for Everyone";
const MAX_QUESTIONS = 5;

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function makeQuestions(verses, translations) {
  const translationMap = new Map(
    (translations || []).map(item => [
      item.numberInSurah,
      String(item.text || "").trim()
    ])
  );

  const usable = (verses || [])
    .map(ayah => ({
      number: ayah.numberInSurah,
      arabic: String(ayah.text || "").trim(),
      translation: translationMap.get(ayah.numberInSurah) || ""
    }))
    .filter(item => item.arabic && item.translation);

  if (usable.length < 2) return [];

  const selected = shuffle(usable).slice(
    0,
    Math.min(MAX_QUESTIONS, usable.length)
  );

  return selected.map((item, index) => {
    const otherTranslations = [
      ...new Set(
        usable
          .filter(other => other.number !== item.number)
          .map(other => other.translation)
          .filter(text => text && text !== item.translation)
      )
    ];

    const wrongAnswers = shuffle(otherTranslations).slice(0, 3);

    return {
      id: `${item.number}-${index}`,
      arabic: item.arabic,
      answer: item.translation,
      options: shuffle([item.translation, ...wrongAnswers])
    };
  });
}

function createImage({
  surahName,
  score,
  total,
  percentage,
  learnerName = "",
  certificate = false
}) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");

    canvas.width = 1200;
    canvas.height = certificate ? 850 : 650;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas is unavailable."));
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    const background = ctx.createLinearGradient(0, 0, width, height);

    background.addColorStop(0, "#102f2a");
    background.addColorStop(1, "#205c4c");

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    // Decorative borders
    ctx.strokeStyle = "rgba(231,203,137,0.65)";
    ctx.lineWidth = 4;
    ctx.strokeRect(35, 35, width - 70, height - 70);

    ctx.strokeStyle = "rgba(231,203,137,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, width - 104, height - 104);

    ctx.textAlign = "center";

    // Brand
    ctx.fillStyle = "#e7cb89";
    ctx.font = "bold 30px Georgia, serif";
    ctx.fillText(BRAND.toUpperCase(), width / 2, 115);

    // Main heading
    ctx.fillStyle = "#ffffff";
    ctx.font = certificate
      ? "bold 48px Georgia, serif"
      : "bold 55px Georgia, serif";

    ctx.fillText(
      certificate ? "CERTIFICATE OF ACHIEVEMENT" : "SURAH QUIZ COMPLETED",
      width / 2,
      220
    );

    // Surah name
    ctx.fillStyle = "#e7cb89";
    ctx.font = "42px Georgia, serif";
    ctx.fillText(surahName, width / 2, 300);

    if (certificate) {
      ctx.fillStyle = "#f6f1e5";
      ctx.font = "30px Georgia, serif";
      ctx.fillText("This certificate is proudly presented to", width / 2, 390);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px Georgia, serif";

      let displayName = learnerName;

      while (
        ctx.measureText(displayName).width > 950 &&
        ctx.font.includes("48px")
      ) {
        ctx.font = "bold 38px Georgia, serif";
      }

      ctx.fillText(displayName, width / 2, 470);

      ctx.fillStyle = "#f6f1e5";
      ctx.font = "27px Georgia, serif";
      ctx.fillText("for completing the Surah quiz with", width / 2, 535);
    } else {
      ctx.fillStyle = "#f6f1e5";
      ctx.font = "30px Georgia, serif";
      ctx.fillText(
        "Every Surah is another step in your learning journey",
        width / 2,
        400
      );
    }

    // Score
    ctx.fillStyle = "#e7cb89";
    ctx.font = "bold 76px Georgia, serif";

    ctx.fillText(
      `${percentage}%`,
      width / 2,
      certificate ? 650 : 530
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "28px Georgia, serif";

    ctx.fillText(
      `${score} out of ${total} correct`,
      width / 2,
      certificate ? 710 : 580
    );

    ctx.fillStyle = "#e7cb89";
    ctx.font = "22px Georgia, serif";
    ctx.fillText("Read · Reflect · Understand", width / 2, height - 75);

    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create image."));
    }, "image/png");
  });
}

async function shareOrDownload(blob, filename, title, message) {
  if (!blob) throw new Error("Image could not be created.");

  const file = new File([blob], filename, {
    type: "image/png"
  });

  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title,
      text: message,
      files: [file]
    });

    return;
  }

  // Fallback for browsers that do not support image sharing
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SurahQuiz({
  surah,
  verses = [],
  translations = [],
  onNextSurah
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [completed, setCompleted] = useState(false);

  const [learnerName, setLearnerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const score = useMemo(() => {
    return questions.reduce((total, question) => {
      return total + (
        answers[question.id] === question.answer ? 1 : 0
      );
    }, 0);
  }, [questions, answers]);

  const percentage = questions.length
    ? Math.round((score / questions.length) * 100)
    : 0;

  const question = questions[currentQuestion];

  function startQuiz() {
    const generated = makeQuestions(verses, translations);

    if (!generated.length) {
      setMessage(
        "There are not enough translated verses available to start this quiz."
      );
      return;
    }

    setQuestions(generated);
    setCurrentQuestion(0);
    setAnswers({});
    setCompleted(false);
    setLearnerName("");
    setMessage("");
    setIsOpen(true);
  }

  function selectAnswer(option) {
    if (answers[question.id]) return;

    setAnswers(previous => ({
      ...previous,
      [question.id]: option
    }));
  }

  function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(previous => previous + 1);
    } else {
      setCompleted(true);
    }
  }

  async function shareScore() {
    setBusy(true);
    setMessage("");

    try {
      const image = await createImage({
        surahName: surah.englishName,
        score,
        total: questions.length,
        percentage
      });

      await shareOrDownload(
        image,
        `Quran-${surah.englishName}-Quiz-Score.png`,
        `${surah.englishName} Quiz Score`,
        `I scored ${score}/${questions.length} (${percentage}%) in the ${surah.englishName} quiz!`
      );

      setMessage("Your score image is ready.");
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessage("Unable to share the image. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function createCertificate() {
    if (!learnerName.trim()) return;

    setBusy(true);
    setMessage("");

    try {
      const image = await createImage({
        surahName: surah.englishName,
        score,
        total: questions.length,
        percentage,
        learnerName: learnerName.trim(),
        certificate: true
      });

      await shareOrDownload(
        image,
        `Quran-${surah.englishName}-Certificate.png`,
        "Quran for Everyone Certificate",
        `${learnerName.trim()} achieved ${percentage}% in the ${surah.englishName} quiz.`
      );

      setMessage("Your certificate image is ready.");
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessage("Unable to create your certificate. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Surah ending quiz invitation */}
      <section className="qfe-surah-quiz">
        <div className="qfe-quiz-decoration">☪</div>

        <div className="qfe-quiz-copy">
          <span className="qfe-quiz-kicker">Let us Recap</span>

          <h3>
            You've completed {surah.englishName}!
          </h3>

          <p>
            How much did you take away today? Try this short quiz to reflect on what you've learned and share it with family and friends.
          </p>
        </div>

        <button
          className="qfe-start-quiz"
          onClick={startQuiz}
        >
          Start Quiz
          <ChevronRight size={18} />
        </button>
      </section>

      {message && !isOpen && (
        <p className="qfe-quiz-message" role="status">
          {message}
        </p>
      )}

      {/* Quiz popup */}
      {isOpen && (
        <div
          className="qfe-quiz-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${surah.englishName} quiz`}
        >
          <div className="qfe-quiz-modal">

            <button
              className="qfe-quiz-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close quiz"
            >
              <X size={21} />
            </button>

            {!completed && question && (
              <>
                <div className="qfe-modal-brand">
                  <Sparkles size={17} />
                  {BRAND}
                </div>

                <div className="qfe-progress">
                  <span
                    style={{
                      width: `${((currentQuestion + 1) / questions.length) * 100}%`
                    }}
                  />
                </div>

                <div className="qfe-question-meta">
                  QUESTION {currentQuestion + 1} OF {questions.length}
                  {" · "}
                  {surah.englishName}
                </div>

                <h2>
                  What is the meaning of this verse?
                </h2>

                <p
                  className="qfe-question-arabic"
                  lang="ar"
                  dir="rtl"
                >
                  {question.arabic}
                </p>

                <div className="qfe-options">
                  {question.options.map((option, index) => {
                    const selected = answers[question.id] === option;
                    const correct = option === question.answer;
                    const answered = Boolean(answers[question.id]);

                    return (
                      <button
                        key={`${question.id}-${index}`}
                        className={[
                          "qfe-option",
                          answered && correct ? "correct" : "",
                          selected && !correct ? "incorrect" : ""
                        ].join(" ")}
                        onClick={() => selectAnswer(option)}
                        disabled={answered}
                      >
                        <span>{String.fromCharCode(65 + index)}</span>

                        <span className="qfe-option-text">
                          {option}
                        </span>

                        {answered && correct && (
                          <CheckCircle2 size={19} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {answers[question.id] && (
                  <button
                    className="qfe-next-question"
                    onClick={nextQuestion}
                  >
                    {currentQuestion === questions.length - 1
                      ? "See My Score"
                      : "Next Question"}

                    <ChevronRight size={17} />
                  </button>
                )}
              </>
            )}

            {/* Quiz result */}
            {completed && (
              <div className="qfe-result">

                <div className="qfe-result-icon">
                  <Award size={36} />
                </div>

                <span className="qfe-quiz-kicker">
                  QUIZ COMPLETED
                </span>

                <h2>
                  {percentage >= 75
                    ? "Wonderful work!"
                    : "Well done for learning!"}
                </h2>

                <div className="qfe-score">
                  {percentage}%
                </div>

                <p>
                  You answered{" "}
                  <strong>
                    {score} out of {questions.length}
                  </strong>{" "}
                  questions correctly in {surah.englishName}.
                </p>

                <button
                  className="qfe-share-button"
                  onClick={shareScore}
                  disabled={busy}
                >
                  <Share2 size={18} />
                  Share My Score
                </button>

                {/* Certificate only at 75% or above */}
                {percentage >= 75 && (
                  <div className="qfe-certificate">
                    <div className="qfe-certificate-heading">
                      <Award size={22} />
                      <strong>You earned a certificate!</strong>
                    </div>

                    <p>
                      Enter your name to create your achievement certificate.
                    </p>

                    <input
                      type="text"
                      value={learnerName}
                      onChange={event => setLearnerName(event.target.value)}
                      placeholder="Enter your name"
                      maxLength={50}
                      aria-label="Your name for the certificate"
                    />

                    <button
                      className="qfe-certificate-button"
                      onClick={createCertificate}
                      disabled={busy || !learnerName.trim()}
                    >
                      <Download size={17} />
                      Create My Certificate
                    </button>
                  </div>
                )}

                {message && (
                  <p className="qfe-quiz-message" role="status">
                    {message}
                  </p>
                )}

                <div className="qfe-result-actions">
                  <button
                    className="qfe-retake"
                    onClick={startQuiz}
                  >
                    Try Again
                  </button>

                  {onNextSurah && (
                    <button
                      className="qfe-next-surah"
                      onClick={() => {
                        setIsOpen(false);
                        onNextSurah();
                      }}
                    >
                      Continue to Next Surah
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}