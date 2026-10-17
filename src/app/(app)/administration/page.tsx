import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Building2Icon,
  Link2Icon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

import { AdministrationConsole } from "@/components/administration/administration-console";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/current-user";
import { getAdministrationData } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Administración",
  description: "Gestión de equipos, sitios, cuentas y accesos.",
};

export default async function AdministrationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "manager" && user.role !== "admin") {
    redirect("/dashboard");
  }

  const data = await getAdministrationData();
  const activeWebsites = data.websites.filter((website) => website.active).length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Configuración operativa</Badge>
          <span className="text-sm text-muted-foreground">
            {user.role === "admin" ? "Administrador" : "Gestor"}
          </span>
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Administración
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Organiza la estructura de trabajo, los sitios y sus saldos iniciales.
          {user.role === "admin"
            ? " También puedes administrar roles y asignaciones de usuarios."
            : " Los cambios de acceso están reservados a administradores."}
        </p>
      </header>

      <section aria-label="Resumen administrativo" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={UsersRoundIcon}
          label="Equipos"
          value={data.teams.length}
          description="Estructuras registradas"
        />
        <SummaryCard
          icon={Building2Icon}
          label="Sitios activos"
          value={activeWebsites}
          description={`De ${data.websites.length} sitios`}
        />
        <SummaryCard
          icon={Link2Icon}
          label="Cuentas vinculadas"
          value={data.accounts.length}
          description="Relaciones equipo-sitio"
        />
        <SummaryCard
          icon={ShieldCheckIcon}
          label="Usuarios"
          value={data.users.length}
          description="Accesos registrados"
        />
      </section>

      <AdministrationConsole
        data={data}
        isAdmin={user.role === "admin"}
        currentUserId={user.id}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof UsersRoundIcon;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <CardTitle>{label}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
