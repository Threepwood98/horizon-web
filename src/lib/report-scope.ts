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
