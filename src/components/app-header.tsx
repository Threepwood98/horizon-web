"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsUpDownIcon,
  LoaderCircleIcon,
  LogOutIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import type { CurrentUser } from "@/lib/current-user";

const routeTitles = [
  ["/dashboard", "Panel financiero"],
  ["/reports", "Informes"],
  ["/history", "Historial"],
  ["/approvals", "Aprobaciones"],
  ["/statistics", "Estadísticas"],
  ["/administration", "Administración"],
] as const;

const roleLabels: Record<CurrentUser["role"], string> = {
  user: "Usuario",
  leader: "Líder",
  manager: "Gerencia",
  admin: "Administración",
};

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

export function AppHeader({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();
  const pageTitle =
    routeTitles.find(
      ([href]) => pathname === href || pathname.startsWith(`${href}/`),
    )?.[1] ?? "Horizon";

  function handleSignOut() {
    startSignOut(async () => {
      try {
        const { error } = await authClient.signOut();

        if (error) {
          throw new Error();
        }

        router.replace("/login");
      } catch {
        toast.add({
          type: "error",
          title: "No se pudo cerrar la sesión",
          description: "Inténtalo de nuevo en unos segundos.",
        });
      }
    });
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger
          className="-ml-1"
          aria-label="Alternar menú lateral"
          title="Alternar menú lateral"
        />
        <Separator orientation="vertical" className="h-4" />
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Área privada
          </p>
          <p className="truncate text-sm font-medium">{pageTitle}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="h-auto min-w-0 gap-2 px-2 py-1.5"
              aria-label={`Abrir menú de ${user.name}`}
            />
          }
        >
          <Avatar size="sm">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 text-left sm:grid">
            <span className="max-w-36 truncate text-xs font-medium">
              {user.name}
            </span>
            <span className="max-w-36 truncate text-[0.65rem] text-muted-foreground">
              {roleLabels[user.role]}
            </span>
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={isSigningOut}
              onClick={handleSignOut}
            >
              {isSigningOut ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <LogOutIcon data-icon="inline-start" aria-hidden="true" />
              )}
              {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
