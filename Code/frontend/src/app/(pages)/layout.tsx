"use client";

import {ModeToggle} from "@/components/ui/mode-toggle";
import {UserDropdown} from "@/components/ui/logout";
import Link from "next/link";
import {MessageSquare} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useEffect} from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Layout({children}: { children: React.ReactNode }) {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        }
    }, [status, router]);

    return (
        <div className="h-screen bg-background grid grid-rows-[auto_1fr]">
            <header className="flex items-center justify-between p-4 border-b bg-background z-10 flex-shrink-0">
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

            <main className="min-h-0 flex-1">
                {children}
            </main>

        </div>
    )
}
