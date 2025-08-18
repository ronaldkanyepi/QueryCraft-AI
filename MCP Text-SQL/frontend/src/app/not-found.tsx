import { Frown } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
            <Frown className="w-24 h-24 text-muted-foreground mb-8" />
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <h2 className="text-2xl font-semibold mt-4 mb-2">Page Not Found</h2>
            <p className="text-muted-foreground mb-8">
                Sorry, we couldn&#39;t find the page you&#39;re looking for.
            </p>
            <Link href="/">
                <button className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2">
                    Go back home
                </button>
            </Link>
        </div>
    );
}
