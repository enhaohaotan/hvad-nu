# Hva’ sagde de?

Turn a public DR LYD podcast episode into a readable Danish transcript with
OpenAI Speech-to-Text.

[Try Hva’ sagde de?](https://havdsagdede.tanenhao.com)

## What it does

1. Paste the URL of a specific episode from DR LYD.
2. The application finds its audio through DR's public podcast RSS feed.
3. The server downloads and splits the original MP3 without re-encoding it.
4. OpenAI transcribes the audio with the user's own API key.
5. The transcript streams into the page and can be read, copied, or downloaded.

The page also includes a compact audio player and keeps up to ten transcript
versions in the current browser for quick access later.

## Principles

This is intentionally a small, single-purpose application. It has no accounts,
authentication, database, analytics, payments, background workers, or
permanent server-side storage.

The user supplies their own OpenAI API key. It is stored in that browser's
`localStorage`, sent only with a transcription request, and never logged or
persisted by the application server. The page loads no third-party scripts and
uses restrictive browser security headers.

## Technology

- Next.js App Router, React, and TypeScript
- Tailwind CSS
- `fast-xml-parser` for DR's RSS feeds
- Native MP3 frame splitting
- Server-Sent Events for progress and transcript streaming
- OpenAI `gpt-transcribe`

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
No environment variables are required.

## Limitations

- Only episodes present in DR's public RSS feeds can be transcribed. Newly
  published episodes may appear there later than on DR LYD.
- The episode enclosure must be a readable MP3.
- Long transcriptions can be limited by the hosting platform's request duration.
- AI transcription can contain mistakes.
- OpenAI usage is billed directly to the user's API key.
- Saved keys and transcripts remain in one browser and do not sync between
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
