"use client";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {useState} from "react";

export function UserDropdown() {
    const { data: session, status } = useSession();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    if (status === "loading") {
        return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
    }

    if (status === "unauthenticated") {
        return (
            <Button variant="outline" size="sm" asChild>
                <Link href="/api/auth/signin">
                    <User className="mr-2 h-4 w-4" />
                    Sign In
                </Link>
            </Button>
        );
    }

    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleSignOut = async () => {
        try {
            console.log("Starting logout process...");
            const idToken = session?.idToken;
            const issuer = process.env.NEXT_PUBLIC_ZITADEL_ISSUER;
            const redirectUri = window.location.origin;

            await signOut({ redirect: false });

            if (idToken && issuer) {
                const logoutUrl = new URL(`${issuer}/oidc/v1/end_session`);
                logoutUrl.searchParams.set("id_token_hint", idToken);
                logoutUrl.searchParams.set("post_logout_redirect_uri", redirectUri);
                window.location.href = logoutUrl.toString();
            } else {
                window.location.href = "/";
            }
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/";
        }
    };



    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all">
                    <AvatarImage
                        src={session?.user?.image || undefined}
                        alt={session?.user?.name || "User"}
                    />
                    <AvatarFallback>
                        {getInitials(session?.user?.name)}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {session?.user?.name || "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {session?.user?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/chat" className="cursor-pointer">
                        <Home className="mr-2 h-4 w-4" />
                        Chat
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/rag" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        RAG
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}