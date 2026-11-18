import assert from "node:assert/strict";
import { test } from "node:test";
import { toBusinessDate } from "../src/modules/orders/daily-number.js";

const SP = "America/Sao_Paulo";

test("virada às 05:00 em São Paulo: 04:59 ainda é o dia anterior, 05:00 já é o dia", () => {
  // São Paulo é UTC-3: 04:59 local = 07:59Z.
  assert.equal(
    toBusinessDate(new Date("2026-11-18T07:59:00Z"), SP, 5),
    "2026-11-17",
  );
  assert.equal(
    toBusinessDate(new Date("2026-11-18T08:00:00Z"), SP, 5),
    "2026-11-18",
  );
  // 03:40 do dia 18 pertence ao dia 17 (exemplo da regra).
  assert.equal(
    toBusinessDate(new Date("2026-11-18T06:40:00Z"), SP, 5),
    "2026-11-17",
  );
});

test("usa o fuso do restaurante, não o do servidor (UTC)", () => {
  // 01:00Z do dia 18 é 22:00 do dia 17 em São Paulo: no servidor UTC já seria 18.
  const now = new Date("2026-11-18T01:00:00Z");
  assert.equal(toBusinessDate(now, SP, 0), "2026-11-17");
  assert.equal(toBusinessDate(now, "UTC", 0), "2026-11-18");
  // Virada à meia-noite e às 23:00.
  assert.equal(
    toBusinessDate(new Date("2026-11-18T03:00:00Z"), SP, 0),
    "2026-11-18",
  );
  assert.equal(
    toBusinessDate(new Date("2026-11-18T01:59:00Z"), SP, 23),
    "2026-11-16",
  );
});

test("virada de mês e de ano", () => {
  assert.equal(
    toBusinessDate(new Date("2027-01-01T07:00:00Z"), SP, 5),
    "2026-12-31",
  );
  assert.equal(
    toBusinessDate(new Date("2026-12-01T08:00:00Z"), SP, 5),
    "2026-12-01",
  );
});
