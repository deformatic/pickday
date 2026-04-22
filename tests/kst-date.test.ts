import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseKstDateTimeLocalToIsoString } from "../lib/kst-date";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

function runTypeScriptInTimezone(timeZone: string, code: string) {
  const tsxBin = path.join(projectRoot, "node_modules", ".bin", "tsx");

  return execFileSync(
    tsxBin,
    ["--eval", code],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        TZ: timeZone,
      },
      encoding: "utf8",
    },
  ).trim();
}

test("parses datetime-local values as fixed KST wall-clock times", () => {
  assert.equal(
    parseKstDateTimeLocalToIsoString("2026-04-23T09:00"),
    "2026-04-23T00:00:00.000Z",
  );
  assert.equal(parseKstDateTimeLocalToIsoString("2026-02-31T09:00"), null);
});

test("schedule creation validation is stable across runtime timezones", () => {
  const code = `
    import { createScheduleSchema } from "./lib/validation/schedules.ts";
    const parsed = createScheduleSchema.parse({
      title: "t",
      location: "l",
      note: "n",
      adminPassword: "pw",
      options: [{ startAt: "2026-04-23T09:00", endAt: "2026-04-23T10:00", note: "" }]
    });
    console.log(JSON.stringify(parsed.options[0]));
  `;

  const utc = runTypeScriptInTimezone("UTC", code);
  const seoul = runTypeScriptInTimezone("Asia/Seoul", code);
  const losAngeles = runTypeScriptInTimezone("America/Los_Angeles", code);

  assert.equal(utc, seoul);
  assert.equal(seoul, losAngeles);
  assert.match(utc, /"startAt":"2026-04-23T00:00:00.000Z"/);
  assert.match(utc, /"endAt":"2026-04-23T01:00:00.000Z"/);
});

test("schedule option formatting stays pinned to KST across runtime timezones", () => {
  const code = `
    import { formatScheduleOptionWindow } from "./lib/schedule-options.ts";
    console.log(JSON.stringify(formatScheduleOptionWindow({
      startAt: "2026-04-23T00:00:00.000Z",
      endAt: "2026-04-23T01:00:00.000Z"
    })));
  `;

  const utc = JSON.parse(runTypeScriptInTimezone("UTC", code)) as string;
  const seoul = JSON.parse(runTypeScriptInTimezone("Asia/Seoul", code)) as string;
  const losAngeles = JSON.parse(runTypeScriptInTimezone("America/Los_Angeles", code)) as string;

  assert.equal(utc, seoul);
  assert.equal(seoul, losAngeles);
  assert.match(utc, /2026년 4월 23일/);
  assert.doesNotMatch(utc, /4월 22일/);
});

test("calendar bucketing uses the KST civil date even near midnight boundaries", () => {
  const code = `
    import { getKstDateKey } from "./lib/kst-date.ts";
    import { buildScheduleCalendarMonths } from "./lib/schedule-calendar.ts";
    const months = buildScheduleCalendarMonths([
      { startAt: "2026-04-22T15:30:00.000Z", endAt: "2026-04-22T16:30:00.000Z" }
    ]);
    const hit = months.flatMap((month) =>
      month.days
        .filter((day) => day.items.length > 0)
        .map((day) => getKstDateKey(day.date))
    );
    console.log(JSON.stringify(hit));
  `;

  const utc = JSON.parse(runTypeScriptInTimezone("UTC", code)) as string[];
  const seoul = JSON.parse(runTypeScriptInTimezone("Asia/Seoul", code)) as string[];
  const losAngeles = JSON.parse(runTypeScriptInTimezone("America/Los_Angeles", code)) as string[];

  assert.deepEqual(utc, ["2026-04-23"]);
  assert.deepEqual(utc, seoul);
  assert.deepEqual(seoul, losAngeles);
});
