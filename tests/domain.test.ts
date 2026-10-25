import assert from "node:assert/strict";
import test from "node:test";

import type { CurrentUser } from "../src/lib/current-user";
import {
  countCalendarDays,
  DomainError,
  formatCurrency,
  formatDateOnly,
  getTodayDate,
  parseDateOnly,
} from "../src/lib/domain";
import { isReportOverdue } from "../src/lib/report-auto-submission";
import {
  buildReportDraftKey,
  MAXIMUM_REPORT_AMOUNT,
  sumReportAmounts,
} from "../src/lib/report-breakdown";
import { assertReportDateAllowed } from "../src/lib/report-date-policy";
import { getSubmissionEventType } from "../src/lib/report-events";
import { getReportEventScope, getReportScope } from "../src/lib/report-scope";

test("date-only values round-trip without a time-zone shift", () => {
  const value = "2026-03-08";
  assert.equal(formatDateOnly(parseDateOnly(value)), value);
});

test("invalid civil dates are rejected", () => {
  assert.throws(() => parseDateOnly("2026-02-29"), DomainError);
  assert.throws(() => parseDateOnly("03/08/2026"), DomainError);
});

test("the current business date follows America/Havana", () => {
  assert.equal(getTodayDate(new Date("2026-07-01T03:59:59.000Z")), "2026-06-30");
  assert.equal(getTodayDate(new Date("2026-07-01T04:00:00.000Z")), "2026-07-01");
  assert.equal(getTodayDate(new Date("2026-01-01T04:59:59.000Z")), "2025-12-31");
  assert.equal(getTodayDate(new Date("2026-01-01T05:00:00.000Z")), "2026-01-01");
});

test("only drafts from an earlier civil date are overdue", () => {
  assert.equal(isReportOverdue("2026-10-23", "2026-10-24"), true);
  assert.equal(isReportOverdue("2026-10-24", "2026-10-24"), false);
  assert.equal(isReportOverdue("2026-10-25", "2026-10-24"), false);
});

test("calendar-day averages include zero-activity days", () => {
  assert.equal(countCalendarDays("2026-02-27", "2026-03-01"), 3);
  assert.equal(countCalendarDays("2026-10-16", "2026-10-16"), 1);
});

test("USD values use a stable two-decimal representation", () => {
  assert.equal(formatCurrency("1234.5"), "$1,234.50");
});

test("report visibility follows the user's role", () => {
  const baseUser = {
    id: "user-1",
    name: "User",
    email: "user@example.com",
    image: null,
    role: "user",
    teamId: "team-1",
    team: { name: "Team 1" },
  } satisfies CurrentUser;

  assert.deepEqual(getReportScope(baseUser), { userId: "user-1" });
  assert.deepEqual(getReportScope({ ...baseUser, role: "leader" }), {
    teamId: "team-1",
  });
  assert.deepEqual(getReportScope({ ...baseUser, role: "manager" }), {});
  assert.deepEqual(getReportScope({ ...baseUser, role: "admin" }), {});

  assert.deepEqual(getReportEventScope(baseUser), {
    ownerId: "__forbidden__",
  });
  assert.deepEqual(getReportEventScope({ ...baseUser, role: "leader" }), {
    teamId: "team-1",
  });
  assert.deepEqual(getReportEventScope({ ...baseUser, role: "manager" }), {});
  assert.deepEqual(getReportEventScope({ ...baseUser, role: "admin" }), {});
});

test("submission events distinguish the first and later review cycles", () => {
  assert.equal(getSubmissionEventType(1), "submitted");
  assert.equal(getSubmissionEventType(2), "resubmitted");
  assert.equal(getSubmissionEventType(5), "resubmitted");
});

test("draft entries use exact decimal totals", () => {
  assert.equal(sumReportAmounts(["10.00", "5.00"]).toFixed(2), "15.00");
  assert.equal(
    sumReportAmounts(["9999999999.98", "0.01"]).equals(MAXIMUM_REPORT_AMOUNT),
    true,
  );
});

test("draft aggregation keys distinguish creator, site, and date", () => {
  assert.equal(
    buildReportDraftKey(
      "user-1",
      "user-1",
      "team-1",
      "site-1",
      "2026-10-20",
    ),
    "user-1:user-1:team-1:site-1:2026-10-20",
  );
  assert.notEqual(
    buildReportDraftKey(
      "user-1",
      "user-1",
      "team-1",
      "site-1",
      "2026-10-20",
    ),
    buildReportDraftKey(
      "user-1",
      "leader-1",
      "team-1",
      "site-1",
      "2026-10-20",
    ),
  );
  assert.notEqual(
    buildReportDraftKey(
      "user-1",
      "leader-1",
      "team-1",
      "site-1",
      "2026-10-20",
    ),
    buildReportDraftKey(
      "user-1",
      "leader-1",
      "team-1",
      "site-2",
      "2026-10-20",
    ),
  );
});

test("users can only create reports for the current day", () => {
  assert.doesNotThrow(() =>
    assertReportDateAllowed({
      role: "user",
      requestedDate: "2026-10-24",
      today: "2026-10-24",
    }),
  );
  assert.throws(
    () =>
      assertReportDateAllowed({
        role: "user",
        requestedDate: "2026-10-23",
        today: "2026-10-24",
      }),
    /Solo puedes registrar ganancias del día actual/,
  );
});

test("users can edit an earlier report without changing its date", () => {
  assert.doesNotThrow(() =>
    assertReportDateAllowed({
      role: "user",
      requestedDate: "2026-10-20",
      today: "2026-10-24",
      originalDate: "2026-10-20",
    }),
  );
  assert.throws(
    () =>
      assertReportDateAllowed({
        role: "user",
        requestedDate: "2026-10-21",
        today: "2026-10-24",
        originalDate: "2026-10-20",
      }),
    /No puedes cambiar la fecha de un reporte existente/,
  );
});

test("leaders can select past dates but not future dates", () => {
  assert.doesNotThrow(() =>
    assertReportDateAllowed({
      role: "leader",
      requestedDate: "2026-10-20",
      today: "2026-10-24",
    }),
  );
  assert.throws(
    () =>
      assertReportDateAllowed({
        role: "leader",
        requestedDate: "2026-10-25",
        today: "2026-10-24",
      }),
    /No puedes registrar ganancias en una fecha futura/,
  );
});
