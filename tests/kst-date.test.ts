import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addKstDays,
  addKstMonths,
  endOfKstMonth,
  getKstDateKey,
  getKstWeekdayMondayIndex,
  parseKstDateTimeLocalToIsoString,
  sameKstDay,
  startOfKstMonth,
} from "../lib/kst-date";

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

test("KST date arithmetic stays stable at month and year boundaries", () => {
  const februaryStart = startOfKstMonth("2026-01-31T15:30:00.000Z");
  const februaryEnd = endOfKstMonth("2026-02-15T03:00:00.000Z");
  const marchStart = addKstMonths("2026-01-31T15:00:00.000Z", 1);
  const previousDay = addKstDays("2026-01-01T00:30:00.000Z", -1);

  assert.ok(februaryStart);
  assert.ok(februaryEnd);
  assert.ok(marchStart);
  assert.ok(previousDay);

  assert.equal(februaryStart?.toISOString(), "2026-01-31T15:00:00.000Z");
  assert.equal(getKstDateKey(februaryEnd ?? ""), "2026-02-28");
  assert.equal(marchStart?.toISOString(), "2026-02-28T15:00:00.000Z");
  assert.equal(previousDay?.toISOString(), "2025-12-30T15:00:00.000Z");
});

test("KST day keys and same-day checks stay pinned near midnight boundaries", () => {
  const startOfDay = "2026-04-22T15:00:00.000Z";
  const endOfSameDay = "2026-04-23T14:59:59.000Z";
  const nextDay = "2026-04-23T15:00:00.000Z";

  assert.equal(getKstDateKey(startOfDay), "2026-04-23");
  assert.equal(getKstDateKey(endOfSameDay), "2026-04-23");
  assert.equal(getKstDateKey(nextDay), "2026-04-24");
  assert.equal(sameKstDay(startOfDay, endOfSameDay), true);
  assert.equal(sameKstDay(startOfDay, nextDay), false);
});

test("KST Monday indexing stays correct when UTC is still Sunday", () => {
  assert.equal(getKstWeekdayMondayIndex("2026-04-05T15:30:00.000Z"), 0);
  assert.equal(getKstWeekdayMondayIndex("2026-04-04T15:30:00.000Z"), 6);
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

test("schedule validation keeps KST ordering correct across midnight", () => {
  const code = `
    import { createScheduleSchema } from "./lib/validation/schedules.ts";
    const valid = createScheduleSchema.safeParse({
      title: "t",
      location: "l",
      note: "n",
      adminPassword: "pw",
      options: [{ startAt: "2026-04-23T23:30", endAt: "2026-04-24T00:15", note: "" }]
    });
    const invalid = createScheduleSchema.safeParse({
      title: "t",
      location: "l",
      note: "n",
      adminPassword: "pw",
      options: [{ startAt: "2026-04-24T00:15", endAt: "2026-04-23T23:30", note: "" }]
    });
    console.log(JSON.stringify({
      valid: valid.success,
      invalid: invalid.success,
      invalidIssue: invalid.success ? null : invalid.error.issues[0]?.message
    }));
  `;

  const utc = JSON.parse(runTypeScriptInTimezone("UTC", code)) as {
    valid: boolean;
    invalid: boolean;
    invalidIssue: string | null;
  };
  const seoul = JSON.parse(runTypeScriptInTimezone("Asia/Seoul", code)) as typeof utc;
  const losAngeles = JSON.parse(runTypeScriptInTimezone("America/Los_Angeles", code)) as typeof utc;

  assert.deepEqual(utc, seoul);
  assert.deepEqual(seoul, losAngeles);
  assert.equal(utc.valid, true);
  assert.equal(utc.invalid, false);
  assert.equal(utc.invalidIssue, "End time must be later than start time");
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

test("admin createdAt formatting stays pinned to KST across runtime timezones", () => {
  const code = `
    import { formatKstDate } from "./lib/kst-date.ts";
    console.log(JSON.stringify(formatKstDate("2026-04-22T15:30:00.000Z", "ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit"
    })));
  `;

  const utc = JSON.parse(runTypeScriptInTimezone("UTC", code)) as string;
  const seoul = JSON.parse(runTypeScriptInTimezone("Asia/Seoul", code)) as string;
  const losAngeles = JSON.parse(runTypeScriptInTimezone("America/Los_Angeles", code)) as string;

  assert.equal(utc, seoul);
  assert.equal(seoul, losAngeles);
  assert.match(utc, /2026년 4월 23일/);
  assert.match(utc, /12:30/);
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

test("KST calendar primitives stay stable across runtime timezones", () => {
  const code = `
    import {
      addKstDays,
      addKstMonths,
      endOfKstMonth,
      getKstDateKey,
      getKstWeekdayMondayIndex,
      sameKstDay,
      startOfKstMonth
    } from "./lib/kst-date.ts";
    const result = {
      monthStart: startOfKstMonth("2026-01-31T15:30:00.000Z")?.toISOString(),
      monthEndKey: getKstDateKey(endOfKstMonth("2026-02-15T03:00:00.000Z") ?? ""),
      plusMonth: addKstMonths("2026-01-31T15:00:00.000Z", 1)?.toISOString(),
      minusDay: addKstDays("2026-01-01T00:30:00.000Z", -1)?.toISOString(),
      mondayIndex: getKstWeekdayMondayIndex("2026-04-05T15:30:00.000Z"),
      sameDay: sameKstDay("2026-04-22T15:00:00.000Z", "2026-04-23T14:59:59.000Z"),
      nextDay: sameKstDay("2026-04-22T15:00:00.000Z", "2026-04-23T15:00:00.000Z")
    };
    console.log(JSON.stringify(result));
  `;

  const utc = JSON.parse(runTypeScriptInTimezone("UTC", code));
  const seoul = JSON.parse(runTypeScriptInTimezone("Asia/Seoul", code));
  const losAngeles = JSON.parse(runTypeScriptInTimezone("America/Los_Angeles", code));

  assert.deepEqual(utc, seoul);
  assert.deepEqual(seoul, losAngeles);
});
