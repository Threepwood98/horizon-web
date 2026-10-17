import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  countCalendarDays,
  formatDateOnly,
  getTodayDate,
  parseDateOnly,
} from "@/lib/domain";
import { getReportScope } from "@/lib/report-scope";

export async function getDashboardData(user: CurrentUser) {
  const today = getTodayDate();
  const start = `${today.slice(0, 7)}-01`;
  const dateRange = { gte: parseDateOnly(start), lte: parseDateOnly(today) };
  const scope = getReportScope(user);
  const acceptedWhere = { ...scope, status: "accepted", date: dateRange } satisfies Prisma.ReportWhereInput;

  const [accepted, pendingCount, rejectedCount, recentReports, dailyTotals] = await Promise.all([
    db.report.aggregate({
      where: acceptedWhere,
      _sum: { amount: true },
      _count: true,
    }),
    db.report.count({ where: { ...scope, status: "sent" } }),
    db.report.count({ where: { ...scope, status: "rejected", date: dateRange } }),
    db.report.findMany({
      where: scope,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
      include: {
        user: { select: { name: true } },
        website: { select: { name: true } },
      },
    }),
    db.report.groupBy({
      by: ["date"],
      where: acceptedWhere,
      orderBy: { date: "asc" },
      _sum: { amount: true },
    }),
  ]);

  const total = Number(accepted._sum.amount ?? 0);
  const days = countCalendarDays(start, today);

  return {
    period: { from: start, to: today, days },
    metrics: {
      total,
      dailyAverage: total / days,
      acceptedCount: accepted._count,
      pendingCount,
      rejectedCount,
    },
    dailyTotals: dailyTotals.map((entry) => ({
      date: formatDateOnly(entry.date),
      amount: Number(entry._sum.amount ?? 0),
    })),
    recentReports: recentReports.map((report) => ({
      id: report.id,
      date: formatDateOnly(report.date),
      amount: Number(report.amount),
      status: report.status,
      userName: report.user.name,
      websiteName: report.website.name,
    })),
  };
}

export async function getReportsData(user: CurrentUser) {
  const teamId = user.teamId ?? "__unassigned__";
  const [siteAccounts, reports] = await Promise.all([
    db.siteAccount.findMany({
      where: { teamId, website: { active: true } },
      orderBy: { website: { name: "asc" } },
      include: { website: { select: { id: true, name: true } } },
    }),
    db.report.findMany({
      where: { userId: user.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { website: { select: { name: true } } },
    }),
  ]);

  return {
    websites: siteAccounts.map((account) => ({
      id: account.website.id,
      name: account.website.name,
      openingBalance: Number(account.openingBalance),
    })),
    reports: reports.map((report) => ({
      id: report.id,
      websiteId: report.websiteId,
      websiteName: report.website.name,
      date: formatDateOnly(report.date),
      amount: Number(report.amount),
      startAmount: report.startAmount === null ? null : Number(report.startAmount),
      endAmount: report.endAmount === null ? null : Number(report.endAmount),
      status: report.status,
      rejectionNote: report.rejectionNote,
    })),
  };
}

export async function getApprovalsData(user: CurrentUser) {
  const teamId = user.teamId ?? "__unassigned__";
  const [pendingReports, recentlyReviewed] = await Promise.all([
    db.report.findMany({
      where: { teamId, status: "sent" },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        user: { select: { name: true } },
        website: { select: { name: true } },
      },
    }),
    db.report.findMany({
      where: { teamId, status: { in: ["accepted", "rejected"] } },
      orderBy: { reviewedAt: "desc" },
      take: 12,
      include: {
        user: { select: { name: true } },
        website: { select: { name: true } },
      },
    }),
  ]);

  const serialize = (report: (typeof pendingReports)[number] | (typeof recentlyReviewed)[number]) => ({
    id: report.id,
    date: formatDateOnly(report.date),
    amount: Number(report.amount),
    startAmount: report.startAmount === null ? null : Number(report.startAmount),
    endAmount: report.endAmount === null ? null : Number(report.endAmount),
    status: report.status,
    rejectionNote: report.rejectionNote,
    userName: report.user.name,
    websiteName: report.website.name,
  });

  return {
    pendingReports: pendingReports.map(serialize),
    recentlyReviewed: recentlyReviewed.map(serialize),
  };
}

export async function getStatisticsData(
  user: CurrentUser,
  requestedRange: { from?: string; to?: string; teamId?: string; websiteId?: string; userId?: string },
) {
  const today = getTodayDate();
  const defaultFrom = `${today.slice(0, 7)}-01`;
  const from = safeDate(requestedRange.from, defaultFrom);
  const to = safeDate(requestedRange.to, today);
  const normalizedFrom = from <= to ? from : to;
  const normalizedTo = from <= to ? to : from;
  const scope = getReportScope(user);
  const filters = buildPermittedFilters(user, requestedRange);
  const where = {
    ...scope,
    ...filters,
    status: "accepted",
    date: {
      gte: parseDateOnly(normalizedFrom),
      lte: parseDateOnly(normalizedTo),
    },
  } satisfies Prisma.ReportWhereInput;

  const [total, byDate, byTeam, byWebsite, byUser, filterOptions] = await Promise.all([
    db.report.aggregate({ where, _sum: { amount: true }, _count: true }),
    db.report.groupBy({
      by: ["date"],
      where,
      orderBy: { date: "asc" },
      _sum: { amount: true },
    }),
    db.report.groupBy({ by: ["teamId"], where, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } } }),
    db.report.groupBy({ by: ["websiteId"], where, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } } }),
    db.report.groupBy({ by: ["userId"], where, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } } }),
    getStatisticsFilterOptions(user),
  ]);

  const [teams, websites, users] = await Promise.all([
    db.team.findMany({
      where: { id: { in: byTeam.map((entry) => entry.teamId) } },
      select: { id: true, name: true },
    }),
    db.website.findMany({
      where: { id: { in: byWebsite.map((entry) => entry.websiteId) } },
      select: { id: true, name: true },
    }),
    db.user.findMany({
      where: { id: { in: byUser.map((entry) => entry.userId) } },
      select: { id: true, name: true },
    }),
  ]);
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  const websiteNames = new Map(websites.map((website) => [website.id, website.name]));
  const userNames = new Map(users.map((member) => [member.id, member.name]));
  const amount = Number(total._sum.amount ?? 0);
  const days = countCalendarDays(normalizedFrom, normalizedTo);

  return {
    range: { from: normalizedFrom, to: normalizedTo, days },
    filters: {
      teamId: filters.teamId,
      websiteId: filters.websiteId,
      userId: filters.userId,
    },
    filterOptions,
    metrics: {
      total: amount,
      dailyAverage: amount / days,
      acceptedCount: total._count,
    },
    dailyTotals: byDate.map((entry) => ({
      date: formatDateOnly(entry.date),
      amount: Number(entry._sum.amount ?? 0),
    })),
    teamRanking: byTeam.map((entry) => ({
      id: entry.teamId,
      name: teamNames.get(entry.teamId) ?? "Equipo eliminado",
      amount: Number(entry._sum.amount ?? 0),
    })),
    websiteRanking: byWebsite.map((entry) => ({
      id: entry.websiteId,
      name: websiteNames.get(entry.websiteId) ?? "Sitio eliminado",
      amount: Number(entry._sum.amount ?? 0),
    })),
    userRanking: byUser.map((entry) => ({
      id: entry.userId,
      name: userNames.get(entry.userId) ?? "Usuario eliminado",
      amount: Number(entry._sum.amount ?? 0),
    })),
  };
}

export async function getAdministrationData() {
  const [teams, websites, users, accounts] = await Promise.all([
    db.team.findMany({
      orderBy: { name: "asc" },
      include: {
        leader: { select: { id: true, name: true } },
        _count: { select: { members: true, accounts: true, reports: true } },
      },
    }),
    db.website.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { _count: { select: { accounts: true, reports: true } } },
    }),
    db.user.findMany({
      orderBy: [{ name: "asc" }],
      include: { team: { select: { name: true } } },
    }),
    db.siteAccount.findMany({
      orderBy: [{ team: { name: "asc" } }, { website: { name: "asc" } }],
      include: {
        team: { select: { name: true } },
        website: { select: { name: true, active: true } },
      },
    }),
  ]);

  return {
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      leaderId: team.leaderId,
      leaderName: team.leader?.name ?? null,
      memberCount: team._count.members,
      accountCount: team._count.accounts,
      reportCount: team._count.reports,
    })),
    websites: websites.map((website) => ({
      id: website.id,
      name: website.name,
      logoUrl: website.logoUrl,
      active: website.active,
      accountCount: website._count.accounts,
      reportCount: website._count.reports,
    })),
    users: users.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      teamId: member.teamId,
      teamName: member.team?.name ?? null,
    })),
    accounts: accounts.map((account) => ({
      teamId: account.teamId,
      teamName: account.team.name,
      websiteId: account.websiteId,
      websiteName: account.website.name,
      websiteActive: account.website.active,
      openingBalance: Number(account.openingBalance),
    })),
  };
}

async function getStatisticsFilterOptions(user: CurrentUser) {
  const teamFilter =
    user.role === "admin" || user.role === "manager"
      ? {}
      : { id: user.teamId ?? "__unassigned__" };
  const userFilter =
    user.role === "admin" || user.role === "manager"
      ? {}
      : user.role === "leader"
        ? { teamId: user.teamId ?? "__unassigned__" }
        : { id: user.id };
  const websiteFilter =
    user.role === "admin" || user.role === "manager"
      ? {}
      : { accounts: { some: { teamId: user.teamId ?? "__unassigned__" } } };
  const [teams, websites, users] = await Promise.all([
    db.team.findMany({ where: teamFilter, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.website.findMany({ where: websiteFilter, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({ where: userFilter, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return { teams, websites, users };
}

function buildPermittedFilters(
  user: CurrentUser,
  filters: { teamId?: string; websiteId?: string; userId?: string },
) {
  const result: { teamId?: string; websiteId?: string; userId?: string } = {};

  if ((user.role === "admin" || user.role === "manager") && filters.teamId) {
    result.teamId = filters.teamId;
  }
  if (filters.websiteId) {
    result.websiteId = filters.websiteId;
  }
  if (filters.userId && user.role !== "user") {
    result.userId = filters.userId;
  }

  return result;
}

function safeDate(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  try {
    parseDateOnly(value);
    return value;
  } catch {
    return fallback;
  }
}
