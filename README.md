# Hva’ sagde de?

A small, single-purpose web application that turns public DR podcast episodes
into readable Danish transcripts with OpenAI Speech-to-Text.

## Stack

- Next.js, React, and TypeScript
- Tailwind CSS
- `fast-xml-parser` for DR RSS feeds
- Native MP3 frame splitting and streamed server responses

There is no authentication, database, queue, cache, or permanent file storage.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## How it works

1. The resolver accepts a specific `dr.dk/lyd` episode URL, derives its public
   RSS feed, and validates the DR audio enclosure.
2. The backend downloads the original MP3 directly from DR LYD.
3. It splits MP3 frames into roughly ten-minute chunks, with 24 MB as a hard
   limit. Audio is not re-encoded.
4. Each chunk is sent to OpenAI using `gpt-transcribe` with Danish as the
   language hint.
5. Progress and transcript deltas stream to the browser over one SSE response.

The OpenAI API key is stored in the user's browser `localStorage`, as requested.
It is sent only with the transcription request and is never logged or persisted
by the application server. Because browser storage is accessible to JavaScript,
the application loads no third-party scripts and applies restrictive security
headers.

## Checks

```bash
npm test
npm run lint
npm run build
```

Tests cover DR URL/feed validation and MP3 duration/byte-limit chunking. A live
OpenAI transcription is intentionally not part of the automated suite and
requires the user's own API key.
