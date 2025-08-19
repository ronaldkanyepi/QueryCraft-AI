"use client";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ArrowRight, BrainCircuit, FileText, User } from "lucide-react";
import Link from "next/link";
import { RotatingText } from "@/components/ui/shadcn-io/rotating-text";
import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Redirect to /chat if user is signed in
    useEffect(() => {
        if (status !== "loading" && session) {
            router.push("/chat");
        }
    }, [session, status, router]);

    // Show loading while checking session or redirecting
    if (status === "loading" || session) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                        {session ? "Redirecting to chat..." : "Loading..."}
                    </p>
                </div>
            </div>
        );
    }

    const handleSignIn = () => {
        signIn("zitadel"); // Specify your Zitadel provider
    };

    const handleGetStarted = () => {
        signIn("zitadel"); // Redirect to sign in since user is not authenticated
    };

    return (
        <div className="flex flex-col min-h-screen bg-background font-sans overflow-x-hidden">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="font-bold">QueryCraft AI</span>
                    </Link>
                    <div className="flex items-center space-x-4">
                        <ModeToggle />
                        <button
                            onClick={handleSignIn}
                            className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <section className="w-full py-24 sm:py-32 md:py-40">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
                            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                                <RotatingText
                                    className="text-5xl font-semibold"
                                    text={['Ask a Question.', 'Get Instant Data Insights.', 'Blazing Fast']}
                                />
                            </h1>
                            <p className="max-w-[700px] text-muted-foreground text-lg md:text-xl leading-relaxed">
                                Our intelligent data agent understands your questions, generates SQL, and delivers results, analysis, and interactive charts.
                            </p>
                            <div className="pt-4">
                                <button
                                    onClick={handleGetStarted}
                                    className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 py-3 text-base"
                                >
                                    Get Started for Free
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="w-full pb-24">
                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto">
                            <div className="relative rounded-xl bg-muted/40 p-4 lg:p-6 border backdrop-blur-sm shadow-2xl">
                                <div className="flex gap-4 items-start mb-6">
                                    <User className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-1" />
                                    <p className="font-medium text-left">
                                        Show me a breakdown of monthly sales by product category for the last 6 months
                                    </p>
                                </div>

                                <div className="bg-background border rounded-lg p-6 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-lg font-semibold">
                                            Here are the insights from your data:
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                        <div className="lg:col-span-2">
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                Analysis
                                            </h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Sales for 'Electronics' peaked in May, driven by the new headphone launch. 'Apparel' shows consistent month-over-month growth, while 'Home Goods' sales remain stable.
                                            </p>
                                        </div>

                                        <div className="lg:col-span-3">
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                Visualization
                                            </h4>
                                            <div className="w-full h-48 p-4 rounded-md border bg-muted/50">
                                                <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="xMidYMid meet">
                                                    <defs>
                                                        <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                                            <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 0.8}} />
                                                            <stop offset="100%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 0.2}} />
                                                        </linearGradient>
                                                        <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                                                            <stop offset="0%" style={{stopColor: '#8b5cf6', stopOpacity: 0.8}} />
                                                            <stop offset="100%" style={{stopColor: '#8b5cf6', stopOpacity: 0.2}} />
                                                        </linearGradient>
                                                        <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
                                                            <stop offset="0%" style={{stopColor: '#ec4899', stopOpacity: 0.8}} />
                                                            <stop offset="100%" style={{stopColor: '#ec4899', stopOpacity: 0.2}} />
                                                        </linearGradient>
                                                    </defs>
                                                    <g className="grid-lines" stroke="hsl(var(--border))" strokeWidth="0.5">
                                                        <line x1="30" y1="10" x2="280" y2="10" />
                                                        <line x1="30" y1="40" x2="280" y2="40" />
                                                        <line x1="30" y1="70" x2="280" y2="70" />
                                                        <line x1="30" y1="100" x2="280" y2="100" />
                                                    </g>
                                                    <g className="bars">
                                                        <rect x="40" y="70" width="30" height="30" fill="url(#grad1)" rx="2">
                                                            <animate attributeName="height" from="0" to="30" dur="0.5s" fill="freeze" />
                                                            <animate attributeName="y" from="100" to="70" dur="0.5s" fill="freeze" />
                                                        </rect>
                                                        <rect x="80" y="50" width="30" height="50" fill="url(#grad2)" rx="2">
                                                            <animate attributeName="height" from="0" to="50" dur="0.5s" begin="0.1s" fill="freeze" />
                                                            <animate attributeName="y" from="100" to="50" dur="0.5s" begin="0.1s" fill="freeze" />
                                                        </rect>
                                                        <rect x="120" y="55" width="30" height="45" fill="url(#grad3)" rx="2">
                                                            <animate attributeName="height" from="0" to="45" dur="0.5s" begin="0.2s" fill="freeze" />
                                                            <animate attributeName="y" from="100" to="55" dur="0.5s" begin="0.2s" fill="freeze" />
                                                        </rect>
                                                        <rect x="160" y="25" width="30" height="75" fill="url(#grad1)" rx="2">
                                                            <animate attributeName="height" from="0" to="75" dur="0.5s" begin="0.3s" fill="freeze" />
                                                            <animate attributeName="y" from="100" to="25" dur="0.5s" begin="0.3s" fill="freeze" />
                                                        </rect>
                                                        <rect x="200" y="40" width="30" height="60" fill="url(#grad2)" rx="2">
                                                            <animate attributeName="height" from="0" to="60" dur="0.5s" begin="0.4s" fill="freeze" />
                                                            <animate attributeName="y" from="100" to="40" dur="0.5s" begin="0.4s" fill="freeze" />
                                                        </rect>
                                                        <rect x="240" y="45" width="30" height="55" fill="url(#grad3)" rx="2">
                                                            <animate attributeName="height" from="0" to="55" dur="0.5s" begin="0.5s" fill="freeze" />
                                                            <animate attributeName="y" from="100" to="45" dur="0.5s" begin="0.5s" fill="freeze" />
                                                        </rect>
                                                    </g>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            Raw Data
                                        </h4>
                                        <div className="overflow-x-auto rounded-lg border">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted">
                                                <tr>
                                                    <th className="p-3 text-left font-medium">Month</th>
                                                    <th className="p-3 text-left font-medium">Category</th>
                                                    <th className="p-3 text-left font-medium">Sales</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                <tr className="border-t">
                                                    <td className="p-3 font-mono">2025-07</td>
                                                    <td className="p-3">Apparel</td>
                                                    <td className="p-3 font-mono">$55,200</td>
                                                </tr>
                                                <tr className="border-t bg-muted/50">
                                                    <td className="p-3 font-mono">2025-07</td>
                                                    <td className="p-3">Electronics</td>
                                                    <td className="p-3 font-mono">$89,500</td>
                                                </tr>
                                                <tr className="border-t">
                                                    <td className="p-3 font-mono">2025-08</td>
                                                    <td className="p-3">Apparel</td>
                                                    <td className="p-3 font-mono">$58,100</td>
                                                </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="w-full py-24">
                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl mx-auto text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">
                                A Smarter Way to Query Data
                            </h2>
                            <p className="text-muted-foreground text-lg">
                                Go from question to insight in seconds. Here's how QueryCraft AI empowers your team.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            <div className="flex flex-col items-center text-center p-6 space-y-4">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                                    <User className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-semibold">Natural Language Input</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Ask questions in plain English, just like you would to a colleague. No technical jargon required.
                                </p>
                            </div>

                            <div className="flex flex-col items-center text-center p-6 space-y-4">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                                    <FileText className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-semibold">Instant SQL Generation</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Our AI instantly translates your request into efficient, accurate SQL code, ready to be executed.
                                </p>
                            </div>

                            <div className="flex flex-col items-center text-center p-6 space-y-4">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                                    <BrainCircuit className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-semibold">Automated Analysis</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Beyond just data, get automated summaries and key takeaways to understand the story behind the numbers.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="w-full border-t border-border/40 py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            © 2025 QueryCraft AI. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
