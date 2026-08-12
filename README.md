# Hvad nu?

Two independent Danish-learning tools with one shared editorial design language.

[Visit the product suite](https://hvadnu.tanenhao.com)

## What it does

1. Paste the URL of a specific episode from DR LYD.
2. The application finds its audio through DR's public podcast RSS feed.
3. The server downloads and splits the original MP3 without re-encoding it.
4. OpenAI transcribes the audio with the user's own API key.
5. The transcript streams into the page and can be read, copied, or downloaded.

The transcription page also includes a compact audio player and keeps up to ten transcript
versions in the current browser for quick access later.

`Hva’ synes du?` generates a roughly ten-minute Danish reading followed by a
focused written discussion. It supplies useful expressions and open questions,
then returns detailed corrections, language upgrades, a complete revised answer,
and a follow-up question. Sessions and an evolving learner profile stay in the
current browser.

## Principles

This is intentionally a small, single-purpose application. It has no accounts,
authentication, database, analytics, payments, background workers, or
permanent server-side storage.

The user supplies their own OpenAI API key. It is stored in that browser's
`localStorage`, sent only with an OpenAI transcription, generation, translation,
or feedback request, and never logged or persisted by the application server. The page loads no third-party scripts and
uses restrictive browser security headers.

## Technology

- Next.js App Router, React, and TypeScript
- Tailwind CSS
- `fast-xml-parser` for DR's RSS feeds
- Native MP3 frame splitting
- Server-Sent Events for progress and transcript streaming
- Selectable OpenAI transcription modes: `gpt-transcribe`, `whisper-1`, or a
  dual-model pipeline with GPT text aligned to Whisper word timestamps

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects
to Hva’ sagde de?.
No environment variables are required.

## Routes

- `/hvadsagdede` — Hva’ sagde de?, the DR LYD transcription product.
- `/hvadsagdede/demo` — a complete, ready-to-read demo with the timed
  transcript of “Migrantkaos i Ceuta” and Chinese and English translations.
- `/hvadsynesdu` — Hva’ synes du?, the independent AI-generated Danish reading
  and written-discussion product. It keeps the ten newest sessions and the
  learner profile in local storage. For each session, the model can decide
  whether a verified current Danish source would improve the reading and use
  OpenAI web search when appropriate.
- `/` — redirects to `/hvadsagdede`.

## Limitations

- Only episodes present in DR's public RSS feeds can be transcribed. Newly
  published episodes may appear there later than on DR LYD.
- The episode enclosure must be a readable MP3.
- Long transcriptions can be limited by the hosting platform's request duration.
- AI transcription can contain mistakes.
- OpenAI usage is billed directly to the user's API key.
- Saved keys, transcripts, learning sessions, and profiles remain in one browser and do not sync between
  devices.

## Checks

```bash
npm test
npm run lint
npm run build
```

The automated tests cover DR URL and feed validation, MP3 chunking, and browser
transcript-cache behavior. Live DR and OpenAI requests are intentionally excluded
from the test suite.
