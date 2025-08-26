"use client";

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    meta?: any;
}

export function DataTable<TData, TValue>({
                                             columns,
                                             data,
                                             meta,
                                         }: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState("");

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        meta,
        state: {
            sorting,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageSize: 5,
            },
        },
    });


    const shouldShowPagination = table.getPageCount() > 1;

    return (
        <div className="w-full">
            <div className="flex items-center py-4">
                <Input
                    placeholder="Filter documents..."
                    value={globalFilter ?? ""}
                    onChange={(event) => setGlobalFilter(String(event.target.value))}
                    className="max-w-sm text-sm"
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-xs sm:text-sm">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="text-xs sm:text-sm">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-xs sm:text-sm">
                                    No documents found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>


            {shouldShowPagination && (
                <div className="flex flex-col items-center justify-center gap-2 py-4 sm:flex-row sm:justify-between sm:gap-4">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                        Showing page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        {/*{data.length > 0 && (*/}
                        {/*    <span className="block sm:inline sm:ml-2">*/}
                        {/*        ({data.length} total documents)*/}
                        {/*    </span>*/}
                        {/*)}*/}
                    </div>


                    <div className="flex items-center justify-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="h-8 px-3 text-xs sm:text-sm"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Previous</span>
                        </Button>

                        <span className="text-xs sm:text-sm text-muted-foreground px-2">
                            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="h-8 px-3 text-xs sm:text-sm"
                        >
                            <span className="hidden sm:inline mr-1">Next</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}


            {!shouldShowPagination && data.length > 0 && (
                <div className="py-2 text-center">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                        {data.length} document{data.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}
        </div>
    );
}
