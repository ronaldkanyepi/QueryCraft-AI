import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserDropdown } from "@/components/ui/logout";
import { Toaster } from "@/components/ui/sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="w-full">
                <header className="flex h-16 items-center justify-between border-b p-4 shrink-0">
                    <SidebarTrigger />
                    <div className="flex items-center gap-1">
                        <ModeToggle />
                        <UserDropdown />
                    </div>
                </header>

                <main className="h-[calc(100vh-4rem)]">
                    {children}
                </main>
            </SidebarInset>
            <Toaster position="bottom-right" richColors />
        </SidebarProvider>
    );
}
