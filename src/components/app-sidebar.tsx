"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2Icon,
  ChartNoAxesCombinedIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { CurrentUser } from "@/lib/current-user";

type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: readonly CurrentUser["role"][];
};

const navigation: readonly NavigationItem[] = [
  {
    title: "Panel",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Informes",
    href: "/reports",
    icon: FileTextIcon,
    roles: ["user", "leader"],
  },
  {
    title: "Aprobaciones",
    href: "/approvals",
    icon: ClipboardCheckIcon,
    roles: ["leader"],
  },
  {
    title: "Estadísticas",
    href: "/statistics",
    icon: ChartNoAxesCombinedIcon,
  },
  {
    title: "Administración",
    href: "/administration",
    icon: ShieldCheckIcon,
    roles: ["manager", "admin"],
  },
];

const roleLabels: Record<CurrentUser["role"], string> = {
  user: "Usuario",
  leader: "Líder",
  manager: "Gerencia",
  admin: "Administración",
};

export function AppSidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const visibleNavigation = navigation.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Horizon"
              render={
                <Link
                  href="/dashboard"
                  aria-label="Horizon, control financiero"
                  onClick={() => setOpenMobile(false)}
                />
              }
            >
              <LandmarkIcon data-icon="inline-start" aria-hidden="true" />
              <span className="grid min-w-0 leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  Horizon
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  Control financiero
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavigation.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setOpenMobile(false)}
                        />
                      }
                    >
                      <item.icon
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Building2Icon
            className="size-4 shrink-0 text-sidebar-foreground/60"
            aria-hidden="true"
          />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium">
              {user.team?.name ?? "Sin equipo asignado"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {roleLabels[user.role]}
            </p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail
        aria-label="Alternar barra lateral"
        title="Alternar barra lateral"
      />
    </Sidebar>
  );
}
