const MPEG_1_LAYER_3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const MPEG_2_LAYER_3_BITRATES = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];
const BASE_SAMPLE_RATES = [44100, 48000, 32000];

export const DEFAULT_CHUNK_SECONDS = 10 * 60;
export const MAX_CHUNK_BYTES = 24_000_000;

export type Mp3Chunk = {
  blob: Blob;
  durationSeconds: number;
};

type Frame = {
  byteLength: number;
  durationSeconds: number;
};

export function splitMp3(
  buffer: ArrayBuffer,
  targetSeconds = DEFAULT_CHUNK_SECONDS,
  maxBytes = MAX_CHUNK_BYTES,
): Mp3Chunk[] {
  const bytes = new Uint8Array(buffer);
  let cursor = findNextFrame(bytes, skipId3(bytes));

  if (cursor < 0) {
    throw new Error("Den downloadede fil er ikke en læsbar MP3-fil.");
  }

  const chunks: Mp3Chunk[] = [];
  let chunkStart = cursor;
  let chunkDuration = 0;

  while (cursor + 4 <= bytes.length) {
    const frame = readFrame(bytes, cursor);
    if (!frame || cursor + frame.byteLength > bytes.length) {
      const nextFrame = findNextFrame(bytes, cursor + 1);
      if (nextFrame < 0) break;
      cursor = nextFrame;
      if (chunkDuration === 0) chunkStart = cursor;
      continue;
    }

    const nextCursor = cursor + frame.byteLength;
    const nextChunkBytes = nextCursor - chunkStart;
    const wouldExceedTime =
      chunkDuration > 0 &&
      chunkDuration + frame.durationSeconds > targetSeconds;
    const wouldExceedSize =
      chunkDuration > 0 && nextChunkBytes > maxBytes;

    if (wouldExceedTime || wouldExceedSize) {
      chunks.push(makeChunk(bytes, chunkStart, cursor, chunkDuration));
      chunkStart = cursor;
      chunkDuration = 0;
      continue;
    }

    chunkDuration += frame.durationSeconds;
    cursor = nextCursor;
  }

  if (cursor > chunkStart && chunkDuration > 0) {
    chunks.push(makeChunk(bytes, chunkStart, cursor, chunkDuration));
  }

  if (!chunks.length || chunks.some((chunk) => chunk.blob.size > maxBytes)) {
    throw new Error("MP3-filen kunne ikke opdeles under uploadgrænsen.");
  }

  return chunks;
}

function makeChunk(
  source: Uint8Array,
  start: number,
  end: number,
  durationSeconds: number,
): Mp3Chunk {
  return {
    blob: new Blob([source.slice(start, end)], { type: "audio/mpeg" }),
    durationSeconds,
  };
}

function skipId3(bytes: Uint8Array): number {
  if (
    bytes.length < 10 ||
    bytes[0] !== 0x49 ||
    bytes[1] !== 0x44 ||
    bytes[2] !== 0x33
  ) {
    return 0;
  }

  const size =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);
  const footer = (bytes[5] & 0x10) !== 0 ? 10 : 0;
  return Math.min(bytes.length, 10 + size + footer);
}

function findNextFrame(bytes: Uint8Array, start: number): number {
  for (let offset = Math.max(0, start); offset + 4 <= bytes.length; offset++) {
    const frame = readFrame(bytes, offset);
    if (!frame) continue;

    const nextOffset = offset + frame.byteLength;
    if (
      nextOffset + 4 > bytes.length ||
      readFrame(bytes, nextOffset) ||
      bytes.length - nextOffset < 128
    ) {
      return offset;
    }
  }
  return -1;
}

function readFrame(bytes: Uint8Array, offset: number): Frame | null {
  if (offset + 4 > bytes.length) return null;

  const header =
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0;

  if (((header & 0xffe00000) >>> 0) !== 0xffe00000) return null;

  const versionBits = (header >>> 19) & 0x3;
  const layerBits = (header >>> 17) & 0x3;
  const bitrateIndex = (header >>> 12) & 0xf;
  const sampleRateIndex = (header >>> 10) & 0x3;
  const padding = (header >>> 9) & 0x1;

  if (
    versionBits === 0x1 ||
    layerBits !== 0x1 ||
    bitrateIndex === 0 ||
    bitrateIndex === 0xf ||
    sampleRateIndex === 0x3
  ) {
    return null;
  }

  const isMpeg1 = versionBits === 0x3;
  const bitrate = (isMpeg1
    ? MPEG_1_LAYER_3_BITRATES
    : MPEG_2_LAYER_3_BITRATES)[bitrateIndex];
  const sampleRateDivisor = isMpeg1 ? 1 : versionBits === 0x2 ? 2 : 4;
  const sampleRate = BASE_SAMPLE_RATES[sampleRateIndex] / sampleRateDivisor;
  const byteLength =
    Math.floor(((isMpeg1 ? 144000 : 72000) * bitrate) / sampleRate) +
    padding;

  if (!byteLength || byteLength < 4) return null;

  return {
    byteLength,
    durationSeconds: (isMpeg1 ? 1152 : 576) / sampleRate,
  };
}
