import { Prisma } from "@/generated/prisma/client";

export const MAXIMUM_REPORT_AMOUNT = new Prisma.Decimal("9999999999.99");

export function sumReportAmounts(amounts: readonly string[]) {
  return amounts.reduce(
    (total, amount) => total.plus(amount),
    new Prisma.Decimal(0),
  );
}

export function buildReportDraftKey(
  ownerId: string,
  creatorId: string,
  teamId: string,
  websiteId: string,
  date: string,
) {
  return [ownerId, creatorId, teamId, websiteId, date].join(":");
}
