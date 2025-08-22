"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Bot, Calendar, MoreHorizontal, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export interface DocumentResponse {
    id: string;
    content?: string | null;
    metadata?: {
        creator?: string;
        producer?: string;
        moddate?: string;
        creationdate?: string;
        file_id?: string;
        [key: string]: unknown;
    } | null;
}

// Add proper typing for the table meta
interface TableMeta {
    handleDeleteDocument?: (doc: DocumentResponse) => void;
    handleViewDocument?: (doc: DocumentResponse) => void;
}

function formatDate(dateString?: string | null): string {
    if (!dateString) return 'N/A';
    try {
        let date: Date;
        if (dateString.startsWith("D:")) {
            const cleaned = dateString.substring(2, 16);
            const isoString = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}T${cleaned.slice(8, 10)}:${cleaned.slice(10, 12)}:${cleaned.slice(12, 14)}Z`;
            date = new Date(isoString);
        } else {
            date = new Date(dateString);
        }
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

export const columns: ColumnDef<DocumentResponse>[] = [
    {
        accessorKey: "ID",
        header: "ID",
        cell: ({ row }) => {
            const id = row.original.id || "";
            return (
                <div className="font-medium">
                    {id}
                </div>
            );
        },
    },
    {
        accessorKey: "content",
        header: "Content Preview",
        cell: ({ row }) => {
            const content = row.original.content || "";
            const preview = content.substring(0, 50);
            return (
                <div className="flex items-center space-x-2" title={content}>
                    {preview}{content.length > 50? '...' : ''}
                </div>
            );
        },
    },
    {
        accessorKey: "metadata.creator",
        header: "Source",
        cell: ({ row }) => {
            const creator = row.original.metadata?.creator;
            const producer = row.original.metadata?.producer;
            const source = (creator && creator.length > 3) ? creator : producer;
            return (
                <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                    <span className="truncate">{source || 'Text'}</span>
                </div>
            )
        },
    },
    {
        id: "characterCount",
        header: () => <div className="text-right">Characters</div>,
        cell: ({ row }) => {
            const charCount = row.original.content?.length || 0;
            return <div className="text-right font-medium">{charCount.toLocaleString()}</div>;
        },
    },
    {
        accessorKey: "metadata.moddate",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="w-full justify-start px-0"
            >
                Date Modified
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const dateToDisplay = row.original.metadata?.moddate || row.original.metadata?.creationdate;
            return <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{formatDate(dateToDisplay)}</span>
            </div>;
        }
    },
    {
        id: "actions",
        cell: ({ row, table }) => {
            const doc = row.original;
            const meta = table.options.meta as TableMeta | undefined;
            const handleDelete = meta?.handleDeleteDocument;
            const handleViewDocument = meta?.handleViewDocument;

            return (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDocument?.(doc)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Full Text
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10"
                                onClick={() => handleDelete?.(doc)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    },
];
