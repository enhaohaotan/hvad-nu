import assert from "node:assert/strict";
import test from "node:test";
import { createInterlinearLines } from "../lib/interlinear-layout.ts";

const measureText = (value: string) => Array.from(value).length;

test("wraps original text to the available line width", () => {
  const lines = createInterlinearLines(
    [
      {
        text: "Sidste onsdag begynder vi at se migranter.",
        translation: "Last Wednesday, we began to see migrants.",
      },
    ],
    18,
    measureText,
    "en",
  );

  assert.ok(lines.length > 1);
  assert.ok(
    lines.every(
      (line) => line.segments.map((segment) => segment.text).join(" ").length <= 18,
    ),
  );
});

test("preserves the complete translation without changing its word order", () => {
  const translation = "Last Wednesday, we began to see a small number of migrants.";
  const lines = createInterlinearLines(
    [
      {
        text: "Sidste onsdag begyndte vi at se et lille antal migranter.",
        translation,
      },
    ],
    15,
    measureText,
    "en",
  );

  assert.equal(
    lines.flatMap((line) => line.segments.map((segment) => segment.translation)).join(""),
    translation,
  );
});

test("preserves Chinese translations while splitting only visual lines", () => {
  const translation = "上周三，我们开始看到少量移民。";
  const lines = createInterlinearLines(
    [
      {
        text: "Sidste onsdag begyndte vi at se et lille antal migranter.",
        translation,
      },
    ],
    14,
    measureText,
    "zh",
  );

  assert.equal(
    lines.flatMap((line) => line.segments.map((segment) => segment.translation)).join(""),
    translation,
  );
});

test("distributes translations proportionally across original lines", () => {
  const translation = "甲乙丙丁戊己庚辛";
  const lines = createInterlinearLines(
    [
      {
        text: "Denne danske originaltekst fortsætter over flere linjer.",
        translation,
      },
    ],
    15,
    measureText,
    "zh",
  );

  assert.ok(lines.length > 1);
  assert.notEqual(lines[0].segments[0].translation, translation);
  assert.ok(
    lines.slice(1).some((line) => line.segments[0].translation !== ""),
  );
});

test("adds space after a short original when its translation is wider", () => {
  const lines = createInterlinearLines(
    [
      { text: "Jo.", translation: "沒錯。" },
      { text: "Det er rigtigt.", translation: "正确。" },
    ],
    40,
    measureText,
    "zh",
    (value) => Array.from(value).length * 3,
  );

  assert.equal(lines.length, 1);
  assert.equal(lines[0].segments[0].gapAfter, 5);
  assert.equal(lines[0].segments[1].sourceStart, 9);
  assert.equal(lines[0].segments[0].translation, "沒錯。");
});

test("lets separate short sentences share the same visual line", () => {
  const lines = createInterlinearLines(
    [
      { text: "Tak.", translation: "Thanks." },
      { text: "Velkommen.", translation: "Welcome." },
    ],
    20,
    measureText,
    "en",
  );

  assert.equal(lines.length, 1);
  assert.equal(lines[0].segments.length, 2);
  assert.deepEqual(
    lines[0].segments.map((segment) => segment.sourceStart),
    [0, measureText("Thanks.")],
  );
  assert.deepEqual(
    lines[0].segments.map((segment) => segment.translation),
    ["Thanks.", "Welcome."],
  );
});
