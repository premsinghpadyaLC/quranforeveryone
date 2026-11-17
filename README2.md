## Latest Development — Surah-Based Quiz & Achievement Certificates

The Quran for Everyone application now includes an interactive quiz feature designed to help learners review what they have read after completing each Surah.

### Features Implemented

- **End-of-Surah Quiz:** A quiz invitation appears after the learner reaches the end of a Surah.
- **Automatic Question Generation:** Up to five questions are generated using the Arabic verses and their corresponding translations from the currently selected translation.
- **Multiple-Choice Questions:** Learners identify the correct meaning of an Arabic verse by selecting from the available translation options.
- **Instant Feedback:** Correct answers are highlighted, helping learners identify the right translation.
- **Progress Tracking:** Displays the current question and overall quiz progress.
- **Automatic Scoring:** Calculates the learner's score and percentage after completing the quiz.
- **Score Sharing:** Generates a branded PNG score image that learners can share with friends or download.
- **Achievement Certificates:** Learners who achieve a score of 75% or higher can enter their name and generate a personalised certificate.
- **Creator Attribution:** Certificates include a subtle creator credit: "Created by Premsingh Padya".
- **Retake Quiz:** Learners can attempt the quiz again.
- **Next Surah Navigation:** After completing the quiz, learners can continue directly to the next Surah.

### Certificate & Score Image

The generated images use the Quran for Everyone branding and a decorative design.

Certificates include:
- Learner's name
- Surah name
- Achievement percentage
- Correct answers out of total questions
- Quran for Everyone branding
- Creator attribution

### Technical Implementation

- **Frontend:** React.js
- **Styling:** CSS with responsive layouts
- **Icons:** Lucide React
- **Question Generation:** JavaScript using the currently loaded Quran verses and translation data
- **Image Generation:** HTML Canvas API
- **Sharing:** Web Share API where supported, with automatic PNG download as a fallback
- **Authentication:** No login or registration required
- **Backend:** No additional backend required for the quiz functionality

### Build & Verification

The application successfully passed the Vite production build twice.

```bash
npm run build
```

Build result:
- 1,580 modules transformed successfully.
- Production JavaScript and CSS bundles generated.
- No compilation errors.

### Current Scope & Future Enhancements

The current quiz implementation focuses on matching Arabic verses with their corresponding translations. It is intended as a learning and revision activity, not as a comprehensive assessment of Quranic understanding, Tafsir knowledge, or Tajweed proficiency.

Future improvements may include:
- Multiple quiz formats and learning activities.
- Listening-based Quran learning challenges.
- Surah and Juz identification exercises.
- Additional language support.
- More detailed learning progress and achievements.