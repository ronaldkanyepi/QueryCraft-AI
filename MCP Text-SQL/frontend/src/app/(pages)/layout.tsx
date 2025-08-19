import {ModeToggle} from "@/components/ui/mode-toggle";
import {UserDropdown} from "@/components/ui/logout";
import Link from "next/link";
import {MessageSquare} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Toaster} from "@/components/ui/sonner";


export default function Layout({children}: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-screen bg-background">

            <header className="flex items-center justify-between p-4 border-b shrink-0 bg-background z-10">
                <Link href="/chat">
                    <Button variant="outline" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <MessageSquare className="h-4 w-4"/>
                        Return to Chat
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <ModeToggle/>
                    <UserDropdown/>
                </div>
            </header>


            <main className="flex-1 overflow-hidden">
                {children}
            </main>

            <Toaster position="top-right" richColors/>
        </div>
    )
}
