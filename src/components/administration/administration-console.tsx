"use client";

import { useActionState, useState } from "react";
import {
  Building2Icon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Link2Icon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
  SaveIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersRoundIcon,
  WalletCardsIcon,
} from "lucide-react";

import {
  saveSiteAccountAction,
  saveTeamAction,
  saveWebsiteAction,
  setWebsiteActiveAction,
  updateUserAccessAction,
} from "@/app/actions/administration";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { formatCurrency } from "@/lib/domain";
import type { getAdministrationData } from "@/lib/queries";

type AdministrationData = Awaited<ReturnType<typeof getAdministrationData>>;
type Team = AdministrationData["teams"][number];
type Website = AdministrationData["websites"][number];
type SiteAccount = AdministrationData["accounts"][number];
type User = AdministrationData["users"][number];
type UserRole = User["role"];

const roleLabels: Record<UserRole, string> = {
  user: "Usuario",
  leader: "Líder",
  manager: "Gestor",
  admin: "Administrador",
};

type AdministrationConsoleProps = {
  data: AdministrationData;
  isAdmin: boolean;
  currentUserId: string;
};

export function AdministrationConsole({
  data,
  isAdmin,
  currentUserId,
}: AdministrationConsoleProps) {
  return (
    <Tabs defaultValue="teams" className="min-w-0">
      <div className="overflow-x-auto pb-1">
        <TabsList variant="line" className="min-w-max">
          <TabsTrigger value="teams">
            <UsersRoundIcon data-icon="inline-start" aria-hidden="true" />
            Equipos
          </TabsTrigger>
          <TabsTrigger value="websites">
            <Building2Icon data-icon="inline-start" aria-hidden="true" />
            Sitios
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <Link2Icon data-icon="inline-start" aria-hidden="true" />
            Cuentas
          </TabsTrigger>
          <TabsTrigger value="users">
            <UserCogIcon data-icon="inline-start" aria-hidden="true" />
            Usuarios
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="teams">
        <TeamsSection data={data} />
      </TabsContent>
      <TabsContent value="websites">
        <WebsitesSection data={data} />
      </TabsContent>
      <TabsContent value="accounts">
        <AccountsSection data={data} />
      </TabsContent>
      <TabsContent value="users">
        <UsersSection
          data={data}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
      </TabsContent>
    </Tabs>
  );
}

function TeamsSection({ data }: { data: AdministrationData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipos</CardTitle>
        <CardDescription>
          Crea equipos, cambia su nombre y asigna un líder elegible.
        </CardDescription>
        <CardAction>
          <Dialog>
            <DialogTrigger render={<Button size="sm" />}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Nuevo equipo
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear equipo</DialogTitle>
                <DialogDescription>
                  El líder es opcional y se puede asignar más adelante.
                </DialogDescription>
              </DialogHeader>
              <TeamForm teams={data.teams} users={data.users} />
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.teams.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead>Líder</TableHead>
                <TableHead className="text-right">Miembros</TableHead>
                <TableHead className="text-right">Cuentas</TableHead>
                <TableHead className="text-right">Reportes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>
                    {team.leaderName ?? (
                      <span className="text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {team.memberCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {team.accountCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {team.reportCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" size="sm" />}>
                        <PencilIcon data-icon="inline-start" aria-hidden="true" />
                        Editar
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Editar equipo</DialogTitle>
                          <DialogDescription>
                            Actualiza el nombre o cambia la persona responsable.
                          </DialogDescription>
                        </DialogHeader>
                        <TeamForm
                          team={team}
                          teams={data.teams}
                          users={data.users}
                        />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <SectionEmpty
            icon={UsersRoundIcon}
            title="Aún no hay equipos"
            description="Crea el primer equipo para comenzar a organizar usuarios y sitios."
          />
        )}
      </CardContent>
    </Card>
  );
}

function TeamForm({
  team,
  teams,
  users,
}: {
  team?: Team;
  teams: Team[];
  users: User[];
}) {
  const [state, formAction, isPending] = useActionState(
    saveTeamAction,
    initialActionState,
  );
  const idPrefix = team ? `team-${team.id}` : "team-new";
  const nameErrors = getFieldErrors(state, "name");
  const leaderErrors = getFieldErrors(state, "leaderId");
  const leaderCandidates = users.filter(
    (member) => member.role === "user" || member.role === "leader",
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="teamId" value={team?.id ?? ""} />
      <FieldGroup>
        <Field data-invalid={Boolean(nameErrors?.length)}>
          <FieldLabel htmlFor={`${idPrefix}-name`}>Nombre</FieldLabel>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            defaultValue={team?.name ?? ""}
            minLength={2}
            maxLength={80}
            autoComplete="off"
            aria-invalid={Boolean(nameErrors?.length)}
            required
          />
          <FieldError errors={nameErrors} />
        </Field>
        <Field data-invalid={Boolean(leaderErrors?.length)}>
          <FieldLabel htmlFor={`${idPrefix}-leader`}>Líder</FieldLabel>
          <NativeSelect
            id={`${idPrefix}-leader`}
            name="leaderId"
            defaultValue={team?.leaderId ?? ""}
            className="w-full"
            aria-invalid={Boolean(leaderErrors?.length)}
          >
            <NativeSelectOption value="">Sin líder</NativeSelectOption>
            {leaderCandidates.map((member) => {
              const leadsAnotherTeam = teams.some(
                (candidateTeam) =>
                  candidateTeam.id !== team?.id &&
                  candidateTeam.leaderId === member.id,
              );

              return (
                <NativeSelectOption
                  key={member.id}
                  value={member.id}
                  disabled={leadsAnotherTeam}
                >
                  {member.name}
                  {leadsAnotherTeam ? " (ya lidera otro equipo)" : ""}
                </NativeSelectOption>
              );
            })}
          </NativeSelect>
          <FieldDescription>
            Al asignarlo, el usuario pasa al rol de líder y se incorpora al equipo.
          </FieldDescription>
          <FieldError errors={leaderErrors} />
        </Field>
      </FieldGroup>
      <ActionFeedback state={state} />
      <DialogFooter>
        <SubmitButton isPending={isPending} label="Guardar equipo" />
      </DialogFooter>
    </form>
  );
}

function WebsitesSection({ data }: { data: AdministrationData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sitios</CardTitle>
        <CardDescription>
          Mantén el catálogo y controla qué sitios están disponibles para operar.
        </CardDescription>
        <CardAction>
          <Dialog>
            <DialogTrigger render={<Button size="sm" />}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Nuevo sitio
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear sitio</DialogTitle>
                <DialogDescription>
                  El sitio quedará activo al crearse.
                </DialogDescription>
              </DialogHeader>
              <WebsiteForm />
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.websites.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sitio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Cuentas</TableHead>
                <TableHead className="text-right">Reportes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.websites.map((website) => (
                <TableRow key={website.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        {website.logoUrl ? (
                          <AvatarImage src={website.logoUrl} alt="" />
                        ) : null}
                        <AvatarFallback>{getInitials(website.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{website.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={website.active ? "secondary" : "outline"}>
                      {website.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {website.accountCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {website.reportCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog>
                          <DialogTrigger
                            render={<Button variant="outline" size="sm" />}
                          >
                            <PencilIcon data-icon="inline-start" aria-hidden="true" />
                            Editar
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Editar sitio</DialogTitle>
                              <DialogDescription>
                                Actualiza la identidad visible del sitio.
                              </DialogDescription>
                            </DialogHeader>
                            <WebsiteForm website={website} />
                          </DialogContent>
                        </Dialog>
                        <WebsiteActivationForm website={website} />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <SectionEmpty
            icon={Building2Icon}
            title="Aún no hay sitios"
            description="Añade el primer sitio para poder vincularlo con los equipos."
          />
        )}
      </CardContent>
    </Card>
  );
}

function WebsiteForm({ website }: { website?: Website }) {
  const [state, formAction, isPending] = useActionState(
    saveWebsiteAction,
    initialActionState,
  );
  const idPrefix = website ? `website-${website.id}` : "website-new";
  const nameErrors = getFieldErrors(state, "name");
  const logoErrors = getFieldErrors(state, "logoUrl");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="websiteId" value={website?.id ?? ""} />
      <FieldGroup>
        <Field data-invalid={Boolean(nameErrors?.length)}>
          <FieldLabel htmlFor={`${idPrefix}-name`}>Nombre</FieldLabel>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            defaultValue={website?.name ?? ""}
            minLength={2}
            maxLength={80}
            autoComplete="off"
            aria-invalid={Boolean(nameErrors?.length)}
            required
          />
          <FieldError errors={nameErrors} />
        </Field>
        <Field data-invalid={Boolean(logoErrors?.length)}>
          <FieldLabel htmlFor={`${idPrefix}-logo`}>URL del logotipo</FieldLabel>
          <Input
            id={`${idPrefix}-logo`}
            name="logoUrl"
            type="url"
            defaultValue={website?.logoUrl ?? ""}
            maxLength={500}
            inputMode="url"
            placeholder="https://"
            aria-invalid={Boolean(logoErrors?.length)}
          />
          <FieldDescription>Opcional. Debe ser una URL completa.</FieldDescription>
          <FieldError errors={logoErrors} />
        </Field>
      </FieldGroup>
      <ActionFeedback state={state} />
      <DialogFooter>
        <SubmitButton isPending={isPending} label="Guardar sitio" />
      </DialogFooter>
    </form>
  );
}

function WebsiteActivationForm({ website }: { website: Website }) {
  const [state, formAction, isPending] = useActionState(
    setWebsiteActiveAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="websiteId" value={website.id} />
      <input type="hidden" name="active" value={String(!website.active)} />
      <Button
        type="submit"
        size="sm"
        variant={website.active ? "outline" : "default"}
        disabled={isPending}
        aria-label={`${website.active ? "Desactivar" : "Activar"} ${website.name}`}
      >
        {isPending ? (
          <Spinner data-icon="inline-start" aria-label="Actualizando" />
        ) : website.active ? (
          <PowerOffIcon data-icon="inline-start" aria-hidden="true" />
        ) : (
          <PowerIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {isPending ? "Actualizando..." : website.active ? "Desactivar" : "Activar"}
      </Button>
      <ActionFeedback state={state} compact />
    </form>
  );
}

function AccountsSection({ data }: { data: AdministrationData }) {
  const canCreateAccount = data.teams.length > 0 && data.websites.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas por equipo y sitio</CardTitle>
        <CardDescription>
          Vincula equipos con sitios y administra el saldo desde el que comienza
          su historial.
        </CardDescription>
        <CardAction>
          <Dialog>
            <DialogTrigger
              render={<Button size="sm" disabled={!canCreateAccount} />}
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Nueva cuenta
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Vincular cuenta</DialogTitle>
                <DialogDescription>
                  Si la relación ya existe, su saldo inicial se actualizará.
                </DialogDescription>
              </DialogHeader>
              <SiteAccountForm teams={data.teams} websites={data.websites} />
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!canCreateAccount ? (
          <Alert>
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>Faltan datos básicos</AlertTitle>
            <AlertDescription>
              Crea al menos un equipo y un sitio antes de vincular una cuenta.
            </AlertDescription>
          </Alert>
        ) : null}
        {data.accounts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead>Sitio</TableHead>
                <TableHead>Estado del sitio</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.accounts.map((account) => (
                <TableRow key={`${account.teamId}:${account.websiteId}`}>
                  <TableCell className="font-medium">{account.teamName}</TableCell>
                  <TableCell>{account.websiteName}</TableCell>
                  <TableCell>
                    <Badge variant={account.websiteActive ? "secondary" : "outline"}>
                      {account.websiteActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(account.openingBalance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" size="sm" />}>
                        <WalletCardsIcon data-icon="inline-start" aria-hidden="true" />
                        Editar saldo
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Editar saldo inicial</DialogTitle>
                          <DialogDescription>
                            El cambio ajustará los saldos históricos de los reportes
                            aceptados de esta cuenta.
                          </DialogDescription>
                        </DialogHeader>
                        <SiteAccountForm
                          account={account}
                          teams={data.teams}
                          websites={data.websites}
                        />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <SectionEmpty
            icon={Link2Icon}
            title="Aún no hay cuentas vinculadas"
            description="Relaciona un equipo con un sitio para definir su saldo inicial."
          />
        )}
      </CardContent>
    </Card>
  );
}

function SiteAccountForm({
  account,
  teams,
  websites,
}: {
  account?: SiteAccount;
  teams: Team[];
  websites: Website[];
}) {
  const [state, formAction, isPending] = useActionState(
    saveSiteAccountAction,
    initialActionState,
  );
  const idPrefix = account
    ? `account-${account.teamId}-${account.websiteId}`
    : "account-new";
  const teamErrors = getFieldErrors(state, "teamId");
  const websiteErrors = getFieldErrors(state, "websiteId");
  const balanceErrors = getFieldErrors(state, "openingBalance");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        {account ? (
          <>
            <input type="hidden" name="teamId" value={account.teamId} />
            <input type="hidden" name="websiteId" value={account.websiteId} />
            <Field data-invalid={Boolean(teamErrors?.length)}>
              <FieldLabel htmlFor={`${idPrefix}-team`}>Equipo</FieldLabel>
              <Input
                id={`${idPrefix}-team`}
                value={account.teamName}
                disabled
                readOnly
              />
              <FieldError errors={teamErrors} />
            </Field>
            <Field data-invalid={Boolean(websiteErrors?.length)}>
              <FieldLabel htmlFor={`${idPrefix}-website`}>Sitio</FieldLabel>
              <Input
                id={`${idPrefix}-website`}
                value={account.websiteName}
                disabled
                readOnly
              />
              <FieldError errors={websiteErrors} />
            </Field>
          </>
        ) : (
          <>
            <Field data-invalid={Boolean(teamErrors?.length)}>
              <FieldLabel htmlFor={`${idPrefix}-team`}>Equipo</FieldLabel>
              <NativeSelect
                id={`${idPrefix}-team`}
                name="teamId"
                defaultValue=""
                className="w-full"
                aria-invalid={Boolean(teamErrors?.length)}
                required
              >
                <NativeSelectOption value="" disabled>
                  Selecciona un equipo
                </NativeSelectOption>
                {teams.map((team) => (
                  <NativeSelectOption key={team.id} value={team.id}>
                    {team.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={teamErrors} />
            </Field>
            <Field data-invalid={Boolean(websiteErrors?.length)}>
              <FieldLabel htmlFor={`${idPrefix}-website`}>Sitio</FieldLabel>
              <NativeSelect
                id={`${idPrefix}-website`}
                name="websiteId"
                defaultValue=""
                className="w-full"
                aria-invalid={Boolean(websiteErrors?.length)}
                required
              >
                <NativeSelectOption value="" disabled>
                  Selecciona un sitio
                </NativeSelectOption>
                {websites.map((website) => (
                  <NativeSelectOption key={website.id} value={website.id}>
                    {website.name}
                    {website.active ? "" : " (inactivo)"}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={websiteErrors} />
            </Field>
          </>
        )}
        <Field data-invalid={Boolean(balanceErrors?.length)}>
          <FieldLabel htmlFor={`${idPrefix}-balance`}>Saldo inicial</FieldLabel>
          <Input
            id={`${idPrefix}-balance`}
            name="openingBalance"
            type="number"
            step="0.01"
            min="-9999999999.99"
            max="9999999999.99"
            inputMode="decimal"
            defaultValue={account ? String(account.openingBalance) : "0.00"}
            aria-invalid={Boolean(balanceErrors?.length)}
            required
          />
          <FieldDescription>
            Admite hasta dos decimales. Al modificarlo se conserva la continuidad
            contable de los reportes aceptados.
          </FieldDescription>
          <FieldError errors={balanceErrors} />
        </Field>
      </FieldGroup>
      <ActionFeedback state={state} />
      <DialogFooter>
        <SubmitButton isPending={isPending} label="Guardar cuenta" />
      </DialogFooter>
    </form>
  );
}

function UsersSection({
  data,
  isAdmin,
  currentUserId,
}: {
  data: AdministrationData;
  isAdmin: boolean;
  currentUserId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios y acceso</CardTitle>
        <CardDescription>
          {isAdmin
            ? "Administra roles y asignaciones. Los cambios se aplican inmediatamente."
            : "Directorio de consulta. Solo un administrador puede cambiar roles y asignaciones."}
        </CardDescription>
        <CardAction>
          <Badge variant={isAdmin ? "secondary" : "outline"}>
            {isAdmin ? "Edición habilitada" : "Solo lectura"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Equipo</TableHead>
                {isAdmin ? <TableHead className="text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2">
                          <span className="max-w-56 truncate font-medium">
                            {member.name}
                          </span>
                          {member.id === currentUserId ? (
                            <Badge variant="outline">Tú</Badge>
                          ) : null}
                        </div>
                        <span className="max-w-72 truncate text-xs text-muted-foreground">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell>
                    {member.teamName ?? (
                      <span className="text-muted-foreground">Sin equipo</span>
                    )}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger render={<Button variant="outline" size="sm" />}>
                          <ShieldCheckIcon data-icon="inline-start" aria-hidden="true" />
                          Editar acceso
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Editar acceso</DialogTitle>
                            <DialogDescription>
                              Cambia el rol y la asignación de {member.name}.
                            </DialogDescription>
                          </DialogHeader>
                          <UserAccessForm
                            member={member}
                            teams={data.teams}
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <SectionEmpty
            icon={UserCogIcon}
            title="No hay usuarios registrados"
            description="Los usuarios aparecerán aquí cuando completen su registro."
          />
        )}
      </CardContent>
    </Card>
  );
}

function UserAccessForm({ member, teams }: { member: User; teams: Team[] }) {
  const [state, formAction, isPending] = useActionState(
    updateUserAccessAction,
    initialActionState,
  );
  const [role, setRole] = useState<UserRole>(member.role);
  const [teamId, setTeamId] = useState(member.teamId ?? "");
  const idPrefix = `access-${member.id}`;
  const roleErrors = getFieldErrors(state, "role");
  const teamErrors = getFieldErrors(state, "teamId");
  const canChooseTeam = role === "user" || role === "leader";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={member.id} />
      <FieldGroup>
        <Field data-invalid={Boolean(roleErrors?.length)}>
          <FieldLabel htmlFor={`${idPrefix}-role`}>Rol</FieldLabel>
          <NativeSelect
            id={`${idPrefix}-role`}
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="w-full"
            aria-invalid={Boolean(roleErrors?.length)}
          >
            {(Object.keys(roleLabels) as UserRole[]).map((candidateRole) => (
              <NativeSelectOption key={candidateRole} value={candidateRole}>
                {roleLabels[candidateRole]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={roleErrors} />
        </Field>
        <Field
          data-disabled={!canChooseTeam}
          data-invalid={Boolean(teamErrors?.length)}
        >
          <FieldLabel htmlFor={`${idPrefix}-team`}>Equipo</FieldLabel>
          <NativeSelect
            id={`${idPrefix}-team`}
            name="teamId"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            className="w-full"
            disabled={!canChooseTeam}
            required={role === "leader"}
            aria-invalid={Boolean(teamErrors?.length)}
          >
            <NativeSelectOption value="">
              {role === "leader" ? "Selecciona un equipo" : "Sin equipo"}
            </NativeSelectOption>
            {teams.map((team) => {
              const occupiedByAnotherLeader =
                role === "leader" &&
                Boolean(team.leaderId) &&
                team.leaderId !== member.id;

              return (
                <NativeSelectOption
                  key={team.id}
                  value={team.id}
                  disabled={occupiedByAnotherLeader}
                >
                  {team.name}
                  {occupiedByAnotherLeader ? " (ya tiene líder)" : ""}
                </NativeSelectOption>
              );
            })}
          </NativeSelect>
          <FieldDescription>
            {role === "leader"
              ? "Obligatorio: cada equipo admite un único líder."
              : role === "user"
                ? "Opcional para usuarios con acceso operativo."
                : "Los gestores y administradores no se asignan a un equipo."}
          </FieldDescription>
          <FieldError errors={teamErrors} />
        </Field>
      </FieldGroup>
      <ActionFeedback state={state} />
      <DialogFooter>
        <SubmitButton isPending={isPending} label="Actualizar acceso" />
      </DialogFooter>
    </form>
  );
}

function SubmitButton({
  isPending,
  label,
}: {
  isPending: boolean;
  label: string;
}) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? (
        <Spinner data-icon="inline-start" aria-label="Guardando" />
      ) : (
        <SaveIcon data-icon="inline-start" aria-hidden="true" />
      )}
      {isPending ? "Guardando..." : label}
    </Button>
  );
}

function ActionFeedback({
  state,
  compact = false,
}: {
  state: ActionState;
  compact?: boolean;
}) {
  if (state.status === "idle") {
    return null;
  }

  const isError = state.status === "error";
  const Icon = isError ? CircleAlertIcon : CheckCircle2Icon;

  return (
    <Alert
      variant={isError ? "destructive" : "default"}
      className={compact ? "max-w-72" : undefined}
      aria-live="polite"
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{isError ? "No se pudo guardar" : "Cambio guardado"}</AlertTitle>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={role === "admin" ? "default" : role === "manager" ? "secondary" : "outline"}>
      {roleLabels[role]}
    </Badge>
  );
}

function SectionEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UsersRoundIcon;
  title: string;
  description: string;
}) {
  return (
    <Empty className="min-h-56 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function getFieldErrors(state: ActionState, field: string) {
  return state.fieldErrors?.[field]?.map((message) => ({ message }));
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
