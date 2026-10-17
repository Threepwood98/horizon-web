import type { LucideIcon } from "lucide-react";
import { ListOrderedIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/domain";

type RankingCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  entries: Array<{ id: string; name: string; amount: number }>;
};

export function RankingCard({
  title,
  description,
  icon: Icon,
  entries,
}: RankingCardProps) {
  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        {entries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Pos.</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant={index === 0 ? "default" : "outline"}>
                      {index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-44 truncate font-medium">
                    {entry.name}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(entry.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty className="min-h-48 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListOrderedIcon />
              </EmptyMedia>
              <EmptyTitle>Sin posiciones</EmptyTitle>
              <EmptyDescription>
                No hay reportes aceptados para construir este ranking.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
