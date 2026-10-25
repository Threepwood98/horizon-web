import type {
  Prisma,
  ReportEventType,
  UserRole,
} from "@/generated/prisma/client";

export const reportEventSnapshotSelect = {
  id: true,
  userId: true,
  createdById: true,
  teamId: true,
  websiteId: true,
  date: true,
  amount: true,
  breakdown: true,
  status: true,
  submissionOrigin: true,
  rejectionNote: true,
  startAmount: true,
  endAmount: true,
  submissionCount: true,
  user: { select: { name: true } },
  createdBy: { select: { name: true } },
  team: { select: { name: true } },
  website: { select: { name: true } },
} satisfies Prisma.ReportSelect;

export type ReportEventSnapshot = Prisma.ReportGetPayload<{
  select: typeof reportEventSnapshotSelect;
}>;

type ReportEventActor = {
  id: string;
  name: string;
  role: UserRole;
};

type BuildReportEventOptions = {
  type: ReportEventType;
  actor?: ReportEventActor | null;
  occurredAt?: Date;
  relatedReportId?: string;
};

export function buildReportEvent(
  report: ReportEventSnapshot,
  {
    type,
    actor = null,
    occurredAt = new Date(),
    relatedReportId,
  }: BuildReportEventOptions,
): Prisma.ReportEventCreateInput {
  return {
    reportId: report.id,
    relatedReportId,
    type,
    cycle: report.submissionCount,
    occurredAt,
    actorId: actor?.id,
    actorName: actor?.name ?? (report.submissionOrigin === "automatic" ? "Sistema" : null),
    actorRole: actor?.role,
    ownerId: report.userId,
    ownerName: report.user.name,
    creatorId: report.createdById,
    creatorName: report.createdBy.name,
    teamId: report.teamId,
    teamName: report.team.name,
    websiteId: report.websiteId,
    websiteName: report.website.name,
    reportDate: report.date,
    amount: report.amount,
    breakdown: report.breakdown,
    status: report.status,
    submissionOrigin: report.submissionOrigin,
    rejectionNote: report.rejectionNote,
    startAmount: report.startAmount,
    endAmount: report.endAmount,
  };
}

export function getSubmissionEventType(submissionCount: number): ReportEventType {
  return submissionCount === 1 ? "submitted" : "resubmitted";
}
