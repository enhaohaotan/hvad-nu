import assert from "node:assert/strict";
import test from "node:test";
import { splitMp3 } from "../lib/mp3.ts";

const FRAME_LENGTH = 626;

function makeMpeg1Layer3Frames(count: number): ArrayBuffer {
  const bytes = new Uint8Array(FRAME_LENGTH * count);
  for (let index = 0; index < count; index++) {
    const offset = index * FRAME_LENGTH;
    bytes.set([0xff, 0xfb, 0xb0, 0x00], offset);
  }
  return bytes.buffer;
}

test("splits MP3 data close to the requested duration", () => {
  const chunks = splitMp3(makeMpeg1Layer3Frames(100), 0.25, 24_000_000);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every((chunk) => chunk.durationSeconds <= 0.28));
  assert.equal(
    chunks.reduce((total, chunk) => total + chunk.blob.size, 0),
    FRAME_LENGTH * 100,
  );
});

test("uses byte size as a hard upper bound", () => {
  const chunks = splitMp3(makeMpeg1Layer3Frames(20), 60, 2_000);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.blob.size <= 2_000));
});

test("rejects data that is not MP3 audio", () => {
  assert.throws(
    () => splitMp3(new Uint8Array(256).buffer),
    /ikke en læsbar MP3/i,
  );
});
