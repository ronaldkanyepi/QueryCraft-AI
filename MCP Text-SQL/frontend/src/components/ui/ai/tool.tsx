'use client';

import {
    CheckCircleIcon,
    ChevronDownIcon,
    CircleIcon,
    ClockIcon,
    WrenchIcon,
    XCircleIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type AIToolStatus = 'pending' | 'running' | 'completed' | 'error';

export const AITool = ({ className, ...props }: ComponentProps<typeof Collapsible>) => (
    <Collapsible className={cn('not-prose w-full rounded-md border', className)} {...props} />
);

export type AIToolHeaderProps = ComponentProps<typeof CollapsibleTrigger> & {
    status?: AIToolStatus;
    name: string;
    description?: string;
    executionTime?: number;
};

const getStatusBadge = (status: AIToolStatus) => {
    const labels = {
        pending: 'Pending',
        running: 'Running',
        completed: 'Completed',
        error: 'Error',
    } as const;

    const icons = {
        pending: <CircleIcon className="size-4" />,
        running: <ClockIcon className="size-4 animate-pulse" />,
        completed: <CheckCircleIcon className="size-4 text-green-600" />,
        error: <XCircleIcon className="size-4 text-red-600" />,
    } as const;

    return (
        <Badge className="rounded-full text-xs" variant="secondary">
            {icons[status]}
            {labels[status]}
        </Badge>
    );
};

export const AIToolHeader = ({
                                 className,
                                 status = 'pending',
                                 name,
                                 description,
                                 executionTime,
                                 ...props
                             }: AIToolHeaderProps) => (
    <CollapsibleTrigger
        className={cn(
            'group flex w-full items-center justify-between gap-4 p-3 text-left',
            className
        )}
        {...props}
    >
        <div className="flex items-center gap-3">
            <WrenchIcon className="size-4 flex-shrink-0 text-muted-foreground" />
            <div className="flex flex-col">
                <span className="font-medium text-sm">{name}</span>
                {description && (
                    <span className="text-xs text-muted-foreground">{description}</span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {status === 'completed' && executionTime !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon className="size-3" />
                    <span>{(executionTime / 1000).toFixed(2)}s</span>
                </div>
            )}
            {getStatusBadge(status)}
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </div>
    </CollapsibleTrigger>
);

export const AIToolContent = ({ className, ...props }: ComponentProps<typeof CollapsibleContent>) => (
    <CollapsibleContent
        className={cn('grid gap-4 overflow-hidden border-t p-4 text-sm', className)}
        {...props}
    />
);

export const AIToolParameters = ({
                                     className,
                                     parameters,
                                     ...props
                                 }: ComponentProps<'div'> & { parameters: Record<string, unknown> }) => (
    <div className={cn('space-y-2', className)} {...props}>
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Parameters
        </h4>
        <div className="rounded-md bg-muted/50 p-3">
      <pre className="overflow-x-auto text-muted-foreground text-xs">
        {JSON.stringify(parameters, null, 2)}
      </pre>
        </div>
    </div>
);

export const AIToolResult = ({
                                 className,
                                 result,
                                 error,
                                 ...props
                             }: ComponentProps<'div'> & { result?: ReactNode; error?: string; }) => {
    if (!(result || error)) {
        return null;
    }

    return (
        <div className={cn('space-y-2', className)} {...props}>
            <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {error ? 'Error' : 'Result'}
            </h4>
            <div
                className={cn(
                    'overflow-x-auto rounded-md p-3 text-xs',
                    error
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted/50 text-foreground'
                )}
            >
                {error ? <div>{error}</div> : <div>{result}</div>}
            </div>
        </div>
    );
};