import { ModeToggle } from "@/components/ui/mode-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, BotMessageSquare, BrainCircuit, FileText, User } from "lucide-react";
import Link from "next/link";

const chartData = [
    { x: 40, y: 70, value: "58k", label: "Mar" },
    { x: 80, y: 50, value: "78k", label: "Apr" },
    { x: 120, y: 55, value: "72k", label: "May" },
    { x: 160, y: 25, value: "95k", label: "Jun" },
    { x: 200, y: 40, value: "85k", label: "Jul" },
    { x: 240, y: 45, value: "82k", label: "Aug" },
];

export function InteractiveLineChart() {
    return (
        <div className="w-full h-48 p-4 rounded-md border bg-muted/50">
            <TooltipProvider>
                <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <g className="grid-lines" stroke="hsl(var(--border))" strokeWidth="0.5">
                        <line x1="30" y1="10" x2="280" y2="10" />
                        <line x1="30" y1="40" x2="280" y2="40" />
                        <line x1="30" y1="70" x2="280" y2="70" />
                        <line x1="30" y1="100" x2="280" y2="100" />
                    </g>
                    <g className="axis-labels" fill="hsl(var(--muted-foreground))" fontSize="8">
                        <text x="25" y="14" textAnchor="end">100k</text>
                        <text x="25" y="44" textAnchor="end">75k</text>
                        <text x="25" y="74" textAnchor="end">50k</text>
                        <text x="25" y="104" textAnchor="end">25k</text>
                        <text x="15" y="60" transform="rotate(-90 15,60)" textAnchor="middle">Sales</text>
                    </g>
                    <g className="x-axis-labels" fill="hsl(var(--muted-foreground))" fontSize="8">
                        {chartData.map(point => (
                            <text key={point.label} x={point.x} y="115" textAnchor="middle">{point.label}</text>
                        ))}
                    </g>
                    <path
                        d="M 40 70 C 60 60, 70 40, 80 50 S 100 65, 120 55 S 140 15, 160 25 S 180 50, 200 40 S 220 30, 240 45"
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                    >
                        <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="2s" fill="freeze" />
                    </path>
                    <path
                        d="M 40 70 C 60 60, 70 40, 80 50 S 100 65, 120 55 S 140 15, 160 25 S 180 50, 200 40 S 220 30, 240 45 L 240 100 L 40 100 Z"
                        fill="url(#areaGradient)"
                    >
                         <animate attributeName="opacity" from="0" to="1" dur="2s" begin="0.5s" fill="freeze" />
                    </path>
                    <g className="data-points">
                        {chartData.map((point, i) => (
                            <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                    <circle cx={point.x} cy={point.y} r="4" fill="hsl(var(--background))" stroke="url(#lineGradient)" strokeWidth="2">
                                        <animate attributeName="r" from="0" to="4" dur="0.3s" begin={`${0.5 + i * 0.1}s`} fill="freeze" />
                                    </circle>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Sales: {point.value}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </g>
                </svg>
            </TooltipProvider>
        </div>
    );
}
