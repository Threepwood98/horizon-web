import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/current-user";
import { getTodayDate } from "@/lib/domain";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const today = getTodayDate();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">
        <AppHeader user={user} today={today} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
