# Quran for Everyone

A free, responsive Quran reading and listening experience built with React and Vite.

## Features

- Complete 114-Surah Quran reader
- Arabic text with English, Urdu, Hindi and Telugu translation options
- Verse-by-verse recitation
- Search, bookmarks and Tafsir panel
- Reading position automatically saved in this browser and restored when you return
- Responsive desktop, tablet and mobile layouts with touch-friendly controls
- Adjustable Arabic reading size
- No account or subscription required

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

## Production build

```bash
npm run build
npm run preview
```

The production website is generated in the `dist` folder.

## Free hosting

The project can be deployed to Cloudflare Pages or GitHub Pages. For Cloudflare Pages, connect the repository and use:

- Build command: `npm run build`
- Build output directory: `dist`

For GitHub Pages, the included workflow builds and deploys the site when changes are pushed to the configured branch.

## Content sources

- Arabic Quran text, translations, recitation metadata and Tafsir editions: [AlQuran Cloud API](https://alquran.cloud/api)
- Telugu translation: [QuranEnc](https://quranenc.com/en/home/api/)
- Arabic text licensing information: [Tanzil text license](https://tanzil.net/docs/Text_License)

QuranEnc translation content is displayed with its publisher and version attribution. Translation text is presented without modification.

## Reading progress and privacy

Bookmarks, language preference and reading position are saved in the browser's local storage on the device being used. They are not synchronized between devices. The Quran text and translation content are retrieved from their respective providers while the app is online.

## Author

Premsingh Padya — a learner of the Quran, learning and sharing its teachings with others.
