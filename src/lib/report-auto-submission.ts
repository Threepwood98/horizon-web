import type { Prisma } from "@/generated/prisma/client";
import { getTodayDate, parseDateOnly } from "@/lib/domain";
import {
  buildReportEvent,
  getSubmissionEventType,
  reportEventSnapshotSelect,
} from "@/lib/report-events";

export function isReportOverdue(reportDate: string, today: string) {
  return reportDate < today;
}

export async function autoSubmitOverdueReports(
  now = new Date(),
  transaction?: Prisma.TransactionClient,
) {
  const today = getTodayDate(now);
  const cutoff = parseDateOnly(today);

  const submit = async (client: Prisma.TransactionClient) => {
    const candidates = await client.report.findMany({
      where: {
        status: "draft",
        date: { lt: cutoff },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    let submittedCount = 0;

    for (const candidate of candidates) {
      const claimed = await client.report.updateMany({
        where: {
          id: candidate.id,
          status: "draft",
          date: { lt: cutoff },
        },
        data: {
          status: "sent",
          draftKey: null,
          sentAt: now,
          submissionOrigin: "automatic",
          rejectionNote: null,
          reviewedAt: null,
          reviewedById: null,
          submissionCount: { increment: 1 },
        },
      });

      if (claimed.count === 0) {
        continue;
      }

      const report = await client.report.findUniqueOrThrow({
        where: { id: candidate.id },
        select: reportEventSnapshotSelect,
      });
      await client.reportEvent.create({
        data: buildReportEvent(report, {
          type: getSubmissionEventType(report.submissionCount),
          occurredAt: now,
        }),
      });
      submittedCount += 1;
    }

    return submittedCount;
  };

  const submittedCount = transaction
    ? await submit(transaction)
    : await (await import("@/lib/transaction")).withSerializableTransaction(
        submit,
      );

  return {
    businessDate: today,
    submittedCount,
  };
}
