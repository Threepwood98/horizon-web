import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/current-user";

export function getReportScope(user: CurrentUser): Prisma.ReportWhereInput {
  if (user.role === "admin" || user.role === "manager") {
    return {};
  }

  if (user.role === "leader") {
    return { teamId: user.teamId ?? "__unassigned__" };
  }

  return { userId: user.id };
}

export function getReportManagementScope(
  user: CurrentUser,
): Prisma.ReportWhereInput {
  const teamId = user.teamId ?? "__unassigned__";

  if (user.role === "leader") {
    return { createdById: user.id, teamId };
  }

  if (user.role === "user") {
    return { createdById: user.id, userId: user.id, teamId };
  }

  return { id: { in: [] } };
}

export function getReportEventScope(
  user: CurrentUser,
): Prisma.ReportEventWhereInput {
  if (user.role === "admin" || user.role === "manager") {
    return {};
  }

  if (user.role === "leader") {
    return { teamId: user.teamId ?? "__unassigned__" };
  }

  return { ownerId: user.id };
}
