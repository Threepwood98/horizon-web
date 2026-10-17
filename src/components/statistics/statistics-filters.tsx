import Link from "next/link";
import { FilterIcon, RotateCcwIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };
type UserRole = "user" | "leader" | "manager" | "admin";

type StatisticsFiltersProps = {
  role: UserRole;
  range: { from: string; to: string };
  filters: {
    teamId?: string;
    websiteId?: string;
    userId?: string;
  };
  options: {
    teams: Option[];
    websites: Option[];
    users: Option[];
  };
};

export function StatisticsFilters({
  role,
  range,
  filters,
  options,
}: StatisticsFiltersProps) {
  const canFilterTeams = role === "admin" || role === "manager";
  const canFilterUsers = role !== "user";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros de consulta</CardTitle>
        <CardDescription>
          Las opciones disponibles respetan el alcance asignado a tu usuario.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/statistics" method="get">
          <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field>
              <FieldLabel htmlFor="statistics-from">Desde</FieldLabel>
              <Input
                id="statistics-from"
                name="from"
                type="date"
                defaultValue={range.from}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="statistics-to">Hasta</FieldLabel>
              <Input
                id="statistics-to"
                name="to"
                type="date"
                defaultValue={range.to}
                required
              />
            </Field>
            {canFilterTeams ? (
              <Field>
                <FieldLabel htmlFor="statistics-team">Equipo</FieldLabel>
                <NativeSelect
                  id="statistics-team"
                  name="teamId"
                  defaultValue={filters.teamId ?? ""}
                  className="w-full"
                >
                  <NativeSelectOption value="">Todos los equipos</NativeSelectOption>
                  {options.teams.map((team) => (
                    <NativeSelectOption key={team.id} value={team.id}>
                      {team.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="statistics-website">Sitio</FieldLabel>
              <NativeSelect
                id="statistics-website"
                name="websiteId"
                defaultValue={filters.websiteId ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">Todos los sitios</NativeSelectOption>
                {options.websites.map((website) => (
                  <NativeSelectOption key={website.id} value={website.id}>
                    {website.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            {canFilterUsers ? (
              <Field>
                <FieldLabel htmlFor="statistics-user">Usuario</FieldLabel>
                <NativeSelect
                  id="statistics-user"
                  name="userId"
                  defaultValue={filters.userId ?? ""}
                  className="w-full"
                >
                  <NativeSelectOption value="">Todos los usuarios</NativeSelectOption>
                  {options.users.map((member) => (
                    <NativeSelectOption key={member.id} value={member.id}>
                      {member.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            <Field className="md:col-span-2 xl:col-span-full">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Link
                  href="/statistics"
                  className={cn(buttonVariants({ variant: "outline" }), "sm:order-first")}
                >
                  <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
                  Restablecer
                </Link>
                <Button type="submit">
                  <FilterIcon data-icon="inline-start" aria-hidden="true" />
                  Aplicar filtros
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
