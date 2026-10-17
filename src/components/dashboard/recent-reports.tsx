import { FileTextIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/domain";

type ReportStatus = "draft" | "sent" | "accepted" | "rejected";

type RecentReport = {
  id: string;
  date: string;
  amount: number;
  status: ReportStatus;
  userName: string;
  websiteName: string;
};

const statusDetails: Record<
  ReportStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  draft: { label: "Borrador", variant: "outline" },
  sent: { label: "Pendiente", variant: "secondary" },
  accepted: { label: "Aceptado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatReportDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

export function RecentReports({ reports }: { reports: RecentReport[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Informes recientes</CardTitle>
        <CardDescription>Los últimos movimientos dentro de tu alcance.</CardDescription>
        <CardAction>
          <Badge
            variant="outline"
            aria-label={`${reports.length} informes recientes`}
          >
            {reports.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className={reports.length > 0 ? "px-0" : undefined}>
        {reports.length > 0 ? (
          <Table>
            <TableCaption className="sr-only">
              Informes recientes con sitio, autor, fecha, estado e importe.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Informe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-4 text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const status = statusDetails[report.status];

                return (
                  <TableRow key={report.id}>
                    <TableCell className="max-w-48 pl-4 sm:max-w-64">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium">
                          {report.websiteName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {report.userName} ·{" "}
                          <time dateTime={report.date}>
                            {formatReportDate(report.date)}
                          </time>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right font-mono font-medium tabular-nums">
                      {formatCurrency(report.amount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No hay informes recientes</EmptyTitle>
              <EmptyDescription>
                Los informes aparecerán aquí a medida que se registren.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
