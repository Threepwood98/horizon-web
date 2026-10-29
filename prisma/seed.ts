import "dotenv/config";

import { randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "better-auth/crypto";

import type { Prisma } from "../src/generated/prisma/client";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { getTodayDate, parseDateOnly } from "../src/lib/domain";
import { buildReportDraftKey } from "../src/lib/report-breakdown";
import { buildReportEvent } from "../src/lib/report-events";
import { withSerializableTransaction } from "../src/lib/transaction";

const DEMO_PASSWORD = "HorizonDemo2026!";

const teamIds = {
  alpha: "demo-team-alpha",
  beta: "demo-team-beta",
  gamma: "demo-team-gamma",
} as const;

type TeamKey = keyof typeof teamIds;

const websiteIds = {
  orion: "demo-website-orion",
  nova: "demo-website-nova",
  atlas: "demo-website-atlas",
  legacy: "demo-website-legacy",
  unlinked: "demo-website-unlinked",
} as const;

type WebsiteKey = keyof typeof websiteIds;
type DemoRole = "user" | "leader" | "manager" | "admin";

const demoUsers = [
  {
    key: "userAlpha",
    name: "Ana Operadora",
    email: "user.alpha@demo.horizon.test",
    role: "user",
    team: "alpha",
  },
  {
    key: "memberAlpha",
    name: "Mia Operadora",
    email: "member.alpha@demo.horizon.test",
    role: "user",
    team: "alpha",
  },
  {
    key: "userBeta",
    name: "Bruno Operador",
    email: "user.beta@demo.horizon.test",
    role: "user",
    team: "beta",
  },
  {
    key: "candidateGamma",
    name: "Carla Candidata",
    email: "candidate.gamma@demo.horizon.test",
    role: "user",
    team: "gamma",
  },
  {
    key: "unassigned",
    name: "Usuario Sin Equipo",
    email: "unassigned@demo.horizon.test",
    role: "user",
    team: null,
  },
  {
    key: "leaderAlpha",
    name: "Leo Lider",
    email: "leader.alpha@demo.horizon.test",
    role: "leader",
    team: "alpha",
  },
  {
    key: "leaderBeta",
    name: "Elena Lider",
    email: "leader.beta@demo.horizon.test",
    role: "leader",
    team: "beta",
  },
  {
    key: "manager",
    name: "Marta Manager",
    email: "manager@demo.horizon.test",
    role: "manager",
    team: null,
  },
  {
    key: "admin",
    name: "Ada Admin",
    email: "admin@demo.horizon.test",
    role: "admin",
    team: null,
  },
  {
    key: "adminBackup",
    name: "Alex Admin",
    email: "admin.backup@demo.horizon.test",
    role: "admin",
    team: null,
  },
] as const satisfies ReadonlyArray<{
  key: string;
  name: string;
  email: string;
  role: DemoRole;
  team: TeamKey | null;
}>;

type DemoUser = (typeof demoUsers)[number];
type DemoUserKey = DemoUser["key"];

const demoTeams = [
  { key: "alpha", id: teamIds.alpha, name: "Alpha", leader: "leaderAlpha" },
  { key: "beta", id: teamIds.beta, name: "Beta", leader: "leaderBeta" },
  { key: "gamma", id: teamIds.gamma, name: "Gamma", leader: null },
] as const satisfies ReadonlyArray<{
  key: TeamKey;
  id: string;
  name: string;
  leader: DemoUserKey | null;
}>;

const demoWebsites = [
  { key: "orion", id: websiteIds.orion, name: "Orion", active: true },
  { key: "nova", id: websiteIds.nova, name: "Nova", active: true },
  { key: "atlas", id: websiteIds.atlas, name: "Atlas", active: true },
  { key: "legacy", id: websiteIds.legacy, name: "Legacy", active: false },
  { key: "unlinked", id: websiteIds.unlinked, name: "Unlinked", active: true },
] as const satisfies ReadonlyArray<{
  key: WebsiteKey;
  id: string;
  name: string;
  active: boolean;
}>;

const demoSiteAccounts = [
  { team: "alpha", website: "orion", openingBalance: "1000.00" },
  { team: "alpha", website: "nova", openingBalance: "200.00" },
  { team: "alpha", website: "legacy", openingBalance: "50.00" },
  { team: "beta", website: "orion", openingBalance: "5000.00" },
  { team: "beta", website: "atlas", openingBalance: "300.00" },
] as const satisfies ReadonlyArray<{
  team: TeamKey;
  website: WebsiteKey;
  openingBalance: string;
}>;

type DemoReportFixture = {
  id: string;
  owner: DemoUserKey;
  team: TeamKey;
  website: WebsiteKey;
  date: string;
  amount: string;
  breakdown?: readonly string[];
  status: "draft" | "sent" | "accepted" | "rejected";
  submissionOrigin?: "manual" | "automatic";
  creator?: DemoUserKey;
  submissionCount?: number;
  previousRejectionNote?: string;
  reviewer?: DemoUserKey;
  rejectionNote?: string;
  startAmount?: string;
  endAmount?: string;
};

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The demo seed is disabled when NODE_ENV=production.");
  }

  const userIds = new Map<DemoUserKey, string>();

  for (const fixture of demoUsers) {
    const userId = await ensureDemoUser(fixture);
    userIds.set(fixture.key, userId);
  }

  const reports = buildDemoReports();
  await seedDomainData(userIds, reports);
  await validateDemoData(userIds, reports);

  console.log(`Demo data ready: ${demoUsers.length} users, ${reports.length} reports.`);
  console.log(`Shared demo password: ${DEMO_PASSWORD}`);
  for (const user of demoUsers) {
    console.log(`- ${user.email} (${user.role})`);
  }
}

async function ensureDemoUser(fixture: DemoUser) {
  const email = fixture.email.toLowerCase();
  let user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    await auth.api.signUpEmail({
      body: {
        email,
        name: fixture.name,
        password: DEMO_PASSWORD,
      },
    });

    user = await db.user.findUniqueOrThrow({
      where: { email },
      select: { id: true },
    });
  }

  const credentialAccounts = await db.account.findMany({
    where: {
      userId: user.id,
      providerId: "credential",
    },
    orderBy: { createdAt: "asc" },
  });
  const credentialAccount =
    credentialAccounts.find((account) => account.accountId === user.id) ?? credentialAccounts[0];

  if (!credentialAccount) {
    await db.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: await hashPassword(DEMO_PASSWORD),
      },
    });
  } else {
    const passwordMatches =
      credentialAccount.password !== null &&
      (await verifyPassword({
        hash: credentialAccount.password,
        password: DEMO_PASSWORD,
      }));

    if (credentialAccount.accountId !== user.id || !passwordMatches) {
      await db.account.update({
        where: { id: credentialAccount.id },
        data: {
          accountId: user.id,
          password: passwordMatches ? undefined : await hashPassword(DEMO_PASSWORD),
        },
      });
    }

    const duplicateIds = credentialAccounts
      .filter((account) => account.id !== credentialAccount.id)
      .map((account) => account.id);
    if (duplicateIds.length > 0) {
      await db.account.deleteMany({ where: { id: { in: duplicateIds } } });
    }
  }

  await db.session.deleteMany({ where: { userId: user.id } });
  return user.id;
}

async function seedDomainData(
  userIds: ReadonlyMap<DemoUserKey, string>,
  reports: readonly DemoReportFixture[],
) {
  const allUserIds = [...userIds.values()];
  const allTeamIds = Object.values(teamIds);

  await withSerializableTransaction(async (transaction) => {
    await transaction.reportEvent.deleteMany({
      where: { ownerId: { in: allUserIds } },
    });
    await transaction.report.deleteMany({
      where: { userId: { in: allUserIds } },
    });
    await transaction.team.updateMany({
      where: { leaderId: { in: allUserIds } },
      data: { leaderId: null },
    });

    for (const team of demoTeams) {
      await transaction.team.upsert({
        where: { id: team.id },
        create: {
          id: team.id,
          name: team.name,
        },
        update: {
          name: team.name,
          leaderId: null,
        },
      });
    }

    for (const website of demoWebsites) {
      await transaction.website.upsert({
        where: { id: website.id },
        create: {
          id: website.id,
          name: website.name,
          active: website.active,
          logoUrl: null,
        },
        update: {
          name: website.name,
          active: website.active,
          logoUrl: null,
        },
      });
    }

    for (const fixture of demoUsers) {
      await transaction.user.update({
        where: { id: requireUserId(userIds, fixture.key) },
        data: {
          name: fixture.name,
          emailVerified: true,
          role: fixture.role,
          teamId: fixture.team === null ? null : teamIds[fixture.team],
        },
      });
    }

    for (const team of demoTeams) {
      await transaction.team.update({
        where: { id: team.id },
        data: {
          leaderId: team.leader === null ? null : requireUserId(userIds, team.leader),
        },
      });
    }

    await transaction.siteAccount.deleteMany({
      where: { teamId: { in: allTeamIds } },
    });
    await transaction.siteAccount.createMany({
      data: demoSiteAccounts.map((account) => ({
        teamId: teamIds[account.team],
        websiteId: websiteIds[account.website],
        openingBalance: account.openingBalance,
      })),
    });

    await transaction.report.createMany({
      data: reports.map((report, index) => {
        const reviewed = report.status === "accepted" || report.status === "rejected";

        return {
          id: report.id,
          userId: requireUserId(userIds, report.owner),
          createdById: requireUserId(
            userIds,
            report.creator ?? report.owner,
          ),
          teamId: teamIds[report.team],
          websiteId: websiteIds[report.website],
          date: parseDateOnly(report.date),
          amount: report.amount,
          breakdown: report.breakdown ? [...report.breakdown] : [report.amount],
          draftKey:
            report.status === "draft"
              ? buildReportDraftKey(
                  requireUserId(userIds, report.owner),
                  requireUserId(userIds, report.creator ?? report.owner),
                  teamIds[report.team],
                  websiteIds[report.website],
                  report.date,
                )
              : null,
          startAmount: report.startAmount ?? null,
          endAmount: report.endAmount ?? null,
          status: report.status,
          submissionOrigin:
            report.status === "draft"
              ? null
              : (report.submissionOrigin ?? "manual"),
          rejectionNote: report.rejectionNote ?? null,
          sentAt: report.status === "draft" ? null : reportTimestamp(report.date, 9, index),
          reviewedById:
            reviewed && report.reviewer ? requireUserId(userIds, report.reviewer) : null,
          reviewedAt: reviewed ? reportTimestamp(report.date, 10, index) : null,
          submissionCount:
            report.submissionCount ?? (report.status === "draft" ? 0 : 1),
          createdAt: reportTimestamp(report.date, 8, index),
        };
      }),
    });

    await seedReportEvents(transaction, userIds, reports);
  });
}

async function seedReportEvents(
  transaction: Prisma.TransactionClient,
  userIds: ReadonlyMap<DemoUserKey, string>,
  fixtures: readonly DemoReportFixture[],
) {
  const reports = await transaction.report.findMany({
    where: { id: { in: fixtures.map((fixture) => fixture.id) } },
    include: {
      user: { select: { name: true } },
      createdBy: { select: { name: true } },
      team: { select: { name: true } },
      website: { select: { name: true } },
    },
  });
  const users = await transaction.user.findMany({
    where: { id: { in: [...userIds.values()] } },
    select: { id: true, name: true, role: true },
  });
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const usersById = new Map(users.map((user) => [user.id, user]));

  function getActor(key: DemoUserKey) {
    const id = requireUserId(userIds, key);
    const actor = usersById.get(id);
    if (!actor) {
      throw new Error(`Missing event actor ${key}.`);
    }
    return actor;
  }

  for (const fixture of fixtures) {
    const report = reportsById.get(fixture.id);
    if (!report) {
      throw new Error(`Missing report ${fixture.id} while seeding events.`);
    }

    const owner = getActor(fixture.owner);
    const creator = getActor(fixture.creator ?? fixture.owner);
    await transaction.reportEvent.create({
      data: {
        ...buildReportEvent(report, {
          type: "created",
          actor: creator,
          occurredAt: report.createdAt,
        }),
        cycle: 0,
        status: "draft",
        submissionOrigin: null,
        rejectionNote: null,
        startAmount: null,
        endAmount: null,
      },
    });

    if (fixture.status === "draft") {
      continue;
    }

    if (!report.sentAt) {
      throw new Error(`Submitted report ${fixture.id} has no sent timestamp.`);
    }

    const automatic = fixture.submissionOrigin === "automatic";
    const submissionActor = automatic ? null : owner;
    if (fixture.previousRejectionNote) {
      const firstSubmittedAt = new Date(report.createdAt.getTime() + 15 * 60_000);
      const firstRejectedAt = new Date(report.createdAt.getTime() + 30 * 60_000);
      const correctedAt = new Date(report.createdAt.getTime() + 45 * 60_000);
      const reviewer = getActor(fixture.reviewer ?? fixture.owner);

      await transaction.reportEvent.create({
        data: {
          ...buildReportEvent(report, {
            type: "submitted",
            actor: owner,
            occurredAt: firstSubmittedAt,
          }),
          cycle: 1,
          status: "sent",
          submissionOrigin: "manual",
          rejectionNote: null,
          startAmount: null,
          endAmount: null,
        },
      });
      await transaction.reportEvent.create({
        data: {
          ...buildReportEvent(report, {
            type: "rejected",
            actor: reviewer,
            occurredAt: firstRejectedAt,
          }),
          cycle: 1,
          status: "rejected",
          submissionOrigin: "manual",
          rejectionNote: fixture.previousRejectionNote,
          startAmount: null,
          endAmount: null,
        },
      });
      await transaction.reportEvent.create({
        data: {
          ...buildReportEvent(report, {
            type: "edited",
            actor: owner,
            occurredAt: correctedAt,
          }),
          cycle: 1,
          status: "draft",
          submissionOrigin: null,
          rejectionNote: null,
          startAmount: null,
          endAmount: null,
        },
      });
    }

    const submissionCycle = fixture.submissionCount ?? 1;
    await transaction.reportEvent.create({
      data: {
        ...buildReportEvent(report, {
          type: submissionCycle === 1 ? "submitted" : "resubmitted",
          actor: submissionActor,
          occurredAt: report.sentAt,
        }),
        cycle: submissionCycle,
        status: "sent",
        rejectionNote: null,
        startAmount: null,
        endAmount: null,
      },
    });

    if (fixture.status === "sent") {
      continue;
    }

    if (!fixture.reviewer || !report.reviewedAt) {
      throw new Error(`Reviewed report ${fixture.id} has incomplete fixture data.`);
    }

    await transaction.reportEvent.create({
      data: buildReportEvent(report, {
        type: fixture.status,
        actor: getActor(fixture.reviewer),
        occurredAt: report.reviewedAt,
      }),
    });
  }
}

function buildDemoReports(): DemoReportFixture[] {
  const dates = getDemoDates();

  return [
    acceptedReport(
      "demo-report-alpha-orion-ana-previous",
      "userAlpha",
      "alpha",
      "orion",
      dates.previousLate,
      "75.00",
      "1000.00",
      "1075.00",
      "leaderAlpha",
    ),
    acceptedReport(
      "demo-report-alpha-orion-ana-current",
      "userAlpha",
      "alpha",
      "orion",
      dates.day1,
      "100.00",
      "1075.00",
      "1175.00",
      "leaderAlpha",
    ),
    acceptedReport(
      "demo-report-alpha-orion-mia-current",
      "memberAlpha",
      "alpha",
      "orion",
      dates.day3,
      "50.00",
      "1175.00",
      "1225.00",
      "leaderAlpha",
    ),
    acceptedReport(
      "demo-report-alpha-orion-leo-current",
      "leaderAlpha",
      "alpha",
      "orion",
      dates.day6,
      "25.00",
      "1225.00",
      "1250.00",
      "leaderAlpha",
    ),
    {
      ...acceptedReport(
        "demo-report-alpha-nova-ana-current",
        "userAlpha",
        "alpha",
        "nova",
        dates.day2,
        "40.00",
        "200.00",
        "240.00",
        "leaderAlpha",
      ),
      submissionCount: 2,
      previousRejectionNote: "Confirma el cierre antes de reenviar.",
    },
    acceptedReport(
      "demo-report-alpha-nova-mia-current",
      "memberAlpha",
      "alpha",
      "nova",
      dates.day4,
      "60.00",
      "240.00",
      "300.00",
      "leaderAlpha",
    ),
    acceptedReport(
      "demo-report-alpha-legacy-ana-previous",
      "userAlpha",
      "alpha",
      "legacy",
      dates.previousMiddle,
      "10.00",
      "50.00",
      "60.00",
      "leaderAlpha",
    ),
    acceptedReport(
      "demo-report-beta-orion-bruno-current",
      "userBeta",
      "beta",
      "orion",
      dates.day1,
      "300.00",
      "5000.00",
      "5300.00",
      "leaderBeta",
    ),
    acceptedReport(
      "demo-report-beta-orion-elena-current",
      "leaderBeta",
      "beta",
      "orion",
      dates.day6,
      "100.00",
      "5300.00",
      "5400.00",
      "leaderBeta",
    ),
    acceptedReport(
      "demo-report-beta-atlas-bruno-current",
      "userBeta",
      "beta",
      "atlas",
      dates.day2,
      "80.00",
      "300.00",
      "380.00",
      "leaderBeta",
    ),
    {
      id: "demo-report-ana-draft",
      owner: "userAlpha",
      team: "alpha",
      website: "nova",
      date: dates.today,
      amount: "15.00",
      breakdown: ["10.00", "5.00"],
      status: "draft",
      creator: "leaderAlpha",
    },
    {
      id: "demo-report-ana-own-draft",
      owner: "userAlpha",
      team: "alpha",
      website: "orion",
      date: dates.today,
      amount: "9.00",
      status: "draft",
    },
    {
      id: "demo-report-ana-sent",
      owner: "userAlpha",
      team: "alpha",
      website: "orion",
      date: dates.yesterday,
      amount: "35.00",
      status: "sent",
      submissionOrigin: "automatic",
    },
    rejectedReport(
      "demo-report-ana-rejected",
      "userAlpha",
      "alpha",
      "nova",
      dates.recent2,
      "20.00",
      "Corrige el importe y vuelve a enviar.",
      "leaderAlpha",
    ),
    {
      id: "demo-report-leo-draft",
      owner: "leaderAlpha",
      team: "alpha",
      website: "nova",
      date: dates.today,
      amount: "15.00",
      status: "draft",
    },
    {
      id: "demo-report-leo-sent",
      owner: "leaderAlpha",
      team: "alpha",
      website: "nova",
      date: dates.recent2,
      amount: "22.00",
      status: "sent",
    },
    rejectedReport(
      "demo-report-leo-rejected",
      "leaderAlpha",
      "alpha",
      "orion",
      dates.recent4,
      "18.00",
      "Adjunta el total correcto antes de reenviar.",
      "leaderAlpha",
    ),
    {
      id: "demo-report-mia-sent-orion-first",
      owner: "memberAlpha",
      team: "alpha",
      website: "orion",
      date: dates.recent5,
      amount: "30.00",
      status: "sent",
    },
    {
      id: "demo-report-mia-sent-orion-second",
      owner: "memberAlpha",
      team: "alpha",
      website: "orion",
      date: dates.recent4,
      amount: "45.00",
      status: "sent",
    },
    {
      id: "demo-report-mia-sent-nova",
      owner: "memberAlpha",
      team: "alpha",
      website: "nova",
      date: dates.recent3,
      amount: "55.00",
      status: "sent",
    },
    rejectedReport(
      "demo-report-mia-rejected",
      "memberAlpha",
      "alpha",
      "nova",
      dates.recent6,
      "14.00",
      "El valor no coincide con el cierre diario.",
      "leaderAlpha",
    ),
    {
      id: "demo-report-bruno-draft",
      owner: "userBeta",
      team: "beta",
      website: "atlas",
      date: dates.today,
      amount: "11.00",
      status: "draft",
    },
    {
      id: "demo-report-bruno-sent",
      owner: "userBeta",
      team: "beta",
      website: "atlas",
      date: dates.recent2,
      amount: "70.00",
      status: "sent",
    },
    rejectedReport(
      "demo-report-bruno-rejected",
      "userBeta",
      "beta",
      "orion",
      dates.recent4,
      "16.00",
      "Revisa el comprobante antes de volver a enviarlo.",
      "leaderBeta",
    ),
  ];
}

function acceptedReport(
  id: string,
  owner: DemoUserKey,
  team: TeamKey,
  website: WebsiteKey,
  date: string,
  amount: string,
  startAmount: string,
  endAmount: string,
  reviewer: DemoUserKey,
): DemoReportFixture {
  return {
    id,
    owner,
    team,
    website,
    date,
    amount,
    status: "accepted",
    startAmount,
    endAmount,
    reviewer,
  };
}

function rejectedReport(
  id: string,
  owner: DemoUserKey,
  team: TeamKey,
  website: WebsiteKey,
  date: string,
  amount: string,
  rejectionNote: string,
  reviewer: DemoUserKey,
): DemoReportFixture {
  return {
    id,
    owner,
    team,
    website,
    date,
    amount,
    status: "rejected",
    rejectionNote,
    reviewer,
  };
}

function getDemoDates() {
  const today = getTodayDate();
  const [year, month, day] = today.split("-").map(Number);

  function currentMonthDate(preferredDay: number) {
    return formatUtcDate(new Date(Date.UTC(year, month - 1, Math.min(preferredDay, day))));
  }

  function recentDate(daysAgo: number) {
    return currentMonthDate(Math.max(1, day - daysAgo));
  }

  function previousMonthDate(preferredDay: number) {
    const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
    return formatUtcDate(new Date(Date.UTC(year, month - 2, Math.min(preferredDay, lastDay))));
  }

  return {
    today,
    yesterday: formatUtcDate(new Date(Date.UTC(year, month - 1, day - 1))),
    day1: currentMonthDate(1),
    day2: currentMonthDate(2),
    day3: currentMonthDate(3),
    day4: currentMonthDate(4),
    day6: currentMonthDate(6),
    recent1: recentDate(1),
    recent2: recentDate(2),
    recent3: recentDate(3),
    recent4: recentDate(4),
    recent5: recentDate(5),
    recent6: recentDate(6),
    previousMiddle: previousMonthDate(15),
    previousLate: previousMonthDate(28),
  };
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function reportTimestamp(date: string, hour: number, sequence: number) {
  const timestamp = new Date(`${date}T00:00:00.000Z`);
  timestamp.setUTCHours(hour, sequence, 0, 0);

  const now = new Date();
  if (timestamp > now) {
    const minutesBeforeNow =
      (11 - hour) * 15 + Math.max(0, 30 - sequence);
    return new Date(now.getTime() - minutesBeforeNow * 60_000);
  }

  return timestamp;
}

function requireUserId(userIds: ReadonlyMap<DemoUserKey, string>, key: DemoUserKey) {
  const userId = userIds.get(key);
  if (!userId) {
    throw new Error(`Missing demo user id for ${key}.`);
  }

  return userId;
}

async function validateDemoData(
  userIds: ReadonlyMap<DemoUserKey, string>,
  fixtures: readonly DemoReportFixture[],
) {
  const allUserIds = [...userIds.values()];
  const users = await db.user.findMany({ where: { id: { in: allUserIds } } });
  const teams = await db.team.findMany({
    where: { id: { in: Object.values(teamIds) } },
  });
  const websites = await db.website.findMany({
    where: { id: { in: Object.values(websiteIds) } },
  });
  const siteAccounts = await db.siteAccount.findMany({
    where: { teamId: { in: Object.values(teamIds) } },
  });
  const reports = await db.report.findMany({
    where: { userId: { in: allUserIds } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const reportEvents = await db.reportEvent.findMany({
    where: { ownerId: { in: allUserIds } },
  });
  const credentialAccounts = await db.account.findMany({
    where: {
      userId: { in: allUserIds },
      providerId: "credential",
    },
  });

  assertCount("users", users.length, demoUsers.length);
  assertCount("teams", teams.length, demoTeams.length);
  assertCount("websites", websites.length, demoWebsites.length);
  assertCount("site accounts", siteAccounts.length, demoSiteAccounts.length);
  assertCount("reports", reports.length, fixtures.length);
  const expectedEventCount = fixtures.reduce(
    (total, fixture) =>
      total +
      1 +
      (fixture.status === "draft" ? 0 : 1) +
      (fixture.status === "accepted" || fixture.status === "rejected" ? 1 : 0) +
      (fixture.previousRejectionNote ? 3 : 0),
    0,
  );
  assertCount("report events", reportEvents.length, expectedEventCount);
  assertCount("credential accounts", credentialAccounts.length, demoUsers.length);

  for (const fixture of demoUsers) {
    const user = users.find((candidate) => candidate.id === requireUserId(userIds, fixture.key));
    if (
      !user ||
      user.role !== fixture.role ||
      user.teamId !== (fixture.team === null ? null : teamIds[fixture.team])
    ) {
      throw new Error(`Invalid role or team for ${fixture.email}.`);
    }
  }

  for (const teamFixture of demoTeams) {
    const team = teams.find((candidate) => candidate.id === teamFixture.id);
    const expectedLeaderId =
      teamFixture.leader === null ? null : requireUserId(userIds, teamFixture.leader);
    if (!team || team.leaderId !== expectedLeaderId) {
      throw new Error(`Invalid leader for team ${teamFixture.name}.`);
    }
  }

  for (const account of credentialAccounts) {
    if (
      account.accountId !== account.userId ||
      !account.password ||
      !(await verifyPassword({ hash: account.password, password: DEMO_PASSWORD }))
    ) {
      throw new Error(`Invalid credential account for user ${account.userId}.`);
    }
  }

  const expectedStatuses = { draft: 4, sent: 6, accepted: 10, rejected: 4 };
  for (const [status, expected] of Object.entries(expectedStatuses)) {
    assertCount(
      `${status} reports`,
      reports.filter((report) => report.status === status).length,
      expected,
    );
  }

  for (const report of reports) {
    const fixture = fixtures.find((candidate) => candidate.id === report.id);
    if (!fixture) {
      throw new Error(`Missing fixture for report ${report.id}.`);
    }

    if (
      report.breakdown.length === 0 ||
      report.breakdown.reduce((total, entry) => total + moneyToCents(entry), 0) !==
        moneyToCents(report.amount)
    ) {
      throw new Error(`Report ${report.id} has an invalid breakdown.`);
    }

    const expectedDraftKey =
      report.status === "draft"
        ? buildReportDraftKey(
            report.userId,
            report.createdById,
            report.teamId,
            report.websiteId,
            report.date.toISOString().slice(0, 10),
          )
        : null;
    if (report.draftKey !== expectedDraftKey) {
      throw new Error(`Report ${report.id} has an invalid draft key.`);
    }

    const expectedOrigin =
      fixture.status === "draft"
        ? null
        : (fixture.submissionOrigin ?? "manual");
    if (report.submissionOrigin !== expectedOrigin) {
      throw new Error(`Report ${report.id} has an invalid submission origin.`);
    }

    const expectedCreatorId = requireUserId(
      userIds,
      fixture.creator ?? fixture.owner,
    );
    if (report.createdById !== expectedCreatorId) {
      throw new Error(`Report ${report.id} has invalid creator data.`);
    }

    const expectedSubmissionCount =
      fixture.submissionCount ?? (fixture.status === "draft" ? 0 : 1);
    if (report.submissionCount !== expectedSubmissionCount) {
      throw new Error(`Report ${report.id} has an invalid submission count.`);
    }
  }

  const openingBalances = new Map(
    siteAccounts.map((account) => [
      `${account.teamId}:${account.websiteId}`,
      moneyToCents(account.openingBalance),
    ]),
  );
  const runningBalances = new Map(openingBalances);

  for (const report of reports.filter((candidate) => candidate.status === "accepted")) {
    if (
      report.startAmount === null ||
      report.endAmount === null ||
      report.reviewedById === null ||
      report.reviewedAt === null ||
      report.rejectionNote !== null
    ) {
      throw new Error(`Accepted report ${report.id} has incomplete review data.`);
    }

    const accountKey = `${report.teamId}:${report.websiteId}`;
    const expectedStart = runningBalances.get(accountKey);
    if (expectedStart === undefined || moneyToCents(report.startAmount) !== expectedStart) {
      throw new Error(`Accepted report ${report.id} breaks its balance chain.`);
    }

    const expectedEnd = expectedStart + moneyToCents(report.amount);
    if (moneyToCents(report.endAmount) !== expectedEnd) {
      throw new Error(`Accepted report ${report.id} has an invalid ending balance.`);
    }
    runningBalances.set(accountKey, expectedEnd);
  }

  for (const report of reports.filter((candidate) => candidate.status === "rejected")) {
    if (
      !report.rejectionNote ||
      report.reviewedById === null ||
      report.reviewedAt === null ||
      report.startAmount !== null ||
      report.endAmount !== null
    ) {
      throw new Error(`Rejected report ${report.id} has invalid review data.`);
    }
  }
}

function assertCount(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} ${label}, found ${actual}.`);
  }
}

function moneyToCents(value: unknown) {
  return Math.round(Number(value) * 100);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
