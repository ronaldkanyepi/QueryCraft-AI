"use client";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, LogOut, Settings, User, UserCircle } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatRelative } from 'date-fns';

export function UserDropdown() {
    const { data: session, status } = useSession();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const authTimestamp = session?.user?.auth_time;
    const lastLoggedIn = authTimestamp
        ? formatRelative(new Date(authTimestamp * 1000), new Date())
        : 'N/A';

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
            sessionStorage.removeItem('wasAuthenticated');
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

    const ProfileModal = () => (
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5" />
                        User Profile
                    </DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-auto">
                        <TabsTrigger value="profile" className="text-xs sm:text-sm">Profile</TabsTrigger>
                        <TabsTrigger value="account" className="text-xs sm:text-sm">Account</TabsTrigger>
                        <TabsTrigger value="security" className="text-xs sm:text-sm">Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>
                                    Your personal profile details.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 bg-muted/30 rounded-lg">
                                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background shadow-lg">
                                        <AvatarImage
                                            src={session?.user?.image || undefined}
                                            alt={session?.user?.name || "User"}
                                        />
                                        <AvatarFallback className="text-lg sm:text-xl font-semibold">
                                            {getInitials(session?.user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1 text-center sm:text-left">
                                        <h3 className="text-xl sm:text-2xl font-bold">
                                            {session?.user?.name || "User"}
                                        </h3>
                                        <p className="text-muted-foreground text-sm sm:text-base break-all sm:break-normal">
                                            {session?.user?.email}
                                        </p>
                                        <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                                            <div className={`w-2 h-2 rounded-full ${session?.user?.email_verified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                            <span className="text-muted-foreground">
                                                {session?.user?.email_verified ? 'Verified Account' : 'Unverified Account'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">First Name</p>
                                        <p className="text-base font-medium">
                                            {session?.user?.given_name || "Not provided"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                                        <p className="text-base font-medium">
                                            {session?.user?.family_name || "Not provided"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Username</p>
                                        <p className="text-base font-medium">
                                            {session?.user?.preferred_username || "Not set"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Language</p>
                                        <p className="text-base font-medium">
                                            {session?.user?.locale || "Default"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="account">
                        <Card>
                            <CardHeader>
                                <CardTitle>Account Details</CardTitle>
                                <CardDescription>
                                    Your account information and activity.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="font-medium">User ID</p>
                                            <p className="text-sm text-muted-foreground font-mono break-all">
                                                {session?.user?.id || "N/A"}
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" className="shrink-0">
                                            Copy ID
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-3 p-4 border rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${session?.user?.email_verified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                <p className="font-medium">Email Status</p>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {session?.user?.email_verified ? 'Verified' : 'Unverified'}
                                            </p>
                                        </div>

                                        <div className="space-y-3 p-4 border rounded-lg">
                                            <p className="font-medium">Gender</p>
                                            <p className="text-sm text-muted-foreground">
                                                {session?.user?.gender || "Not specified"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-medium">Activity Timeline</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                                                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">Last Login</p>
                                                    <p className="text-xs text-muted-foreground break-words">{lastLoggedIn}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">Profile Updated</p>
                                                    <p className="text-xs text-muted-foreground break-words">
                                                        {session?.user?.updated_at
                                                            ? formatRelative(new Date(session.user.updated_at * 1000), new Date())
                                                            : 'N/A'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>Security & Permissions</CardTitle>
                                <CardDescription>
                                    Your roles and access permissions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Settings className="h-4 w-4" />
                                        Assigned Roles
                                    </h4>
                                    <div className="space-y-3">
                                        {session?.user?.roles && Object.keys(session.user.roles).length > 0 ? (
                                            Object.entries(session.user.roles).map(([org, roles]) => (
                                                <div key={org} className="p-4 border rounded-lg space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                                        <span className="font-medium text-sm break-words">{org}</span>
                                                    </div>
                                                    <div className="pl-4 text-sm text-muted-foreground">
                                                        <div className="flex flex-wrap gap-2">
                                                            {Array.isArray(roles)
                                                                ? roles.map((role, index) => (
                                                                    <span key={index} className="inline-block bg-muted px-2 py-1 rounded text-xs break-words">
                                                                        {role}
                                                                    </span>
                                                                ))
                                                                : typeof roles === 'string'
                                                                    ? <span className="inline-block bg-muted px-2 py-1 rounded text-xs break-words">{roles}</span>
                                                                    : <span className="inline-block bg-muted px-2 py-1 rounded text-xs font-mono break-all">
                                                                        {/*{JSON.stringify(roles)}*/}
                                                                    </span>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 border rounded-lg text-center">
                                                <p className="text-sm text-muted-foreground">No roles assigned</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="font-medium">Security Settings</p>
                                            <p className="text-sm text-muted-foreground">
                                                Manage your account security and permissions
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" className="shrink-0 w-full sm:w-auto">
                                            Manage
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );

    return (
        <>
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


                    <DropdownMenuItem
                        onClick={() => setIsProfileOpen(true)}
                        className="cursor-pointer"
                    >
                        <UserCircle className="mr-2 h-4 w-4" />
                        Profile
                    </DropdownMenuItem>
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

            <ProfileModal />
        </>
    );
}
