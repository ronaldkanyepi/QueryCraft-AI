'use client';

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams?.get("callbackUrl") || "/";
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async () => {
        setIsLoading(true);
        try {
            await signIn("zitadel", { callbackUrl });
        } catch (error) {
            console.error("Sign-in error:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
            <Shield className="w-16 h-16 text-primary mb-8" />

            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold">Welcome to QueryCraft AI</CardTitle>
                    <CardDescription className="text-base">
                        Please sign in to access your data analysis dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Button
                        onClick={handleSignIn}
                        disabled={isLoading}
                        className="w-full h-12 text-base cursor-pointer"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connecting to Zitadel...
                            </>
                        ) : (
                            <>
                                Continue with Zitadel
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>

                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>You'll be securely redirected to Zitadel for authentication</p>
                        {callbackUrl !== "/" && (
                            <p className="text-xs bg-muted p-2 rounded">
                                After signing in, you'll return to: {decodeURIComponent(callbackUrl)}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8">
                <Link href="/">
                    <Button variant="ghost" className="text-muted-foreground cursor-pointer">
                        Go back home
                    </Button>
                </Link>
            </div>
        </div>
    );
}
