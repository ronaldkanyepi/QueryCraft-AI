'use client';

import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    BarChart3,
    Bot,
    ChevronDown,
    Database,
    Loader2,
    LucideBotMessageSquare,
    LucideChartCandlestick,
    Plus,
    Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    AIConversation,
    AIConversationContent,
    AIConversationScrollButton,
} from '@/components/ui/ai/conversation';
import { AIMessage, AIMessageContent } from '@/components/ui/ai/message';
import {
    AIReasoning,
    AIReasoningContent,
    AIReasoningTrigger,
} from '@/components/ui/ai/reasoning';
import { AIResponse } from '@/components/ui/ai/response';
import {
    AITool,
    AIToolContent,
    AIToolHeader,
    AIToolParameters,
    AIToolResult,
    type AIToolStatus,
} from '@/components/ui/ai/tool';
import {
    AIInput,
    AIInputButton,
    AIInputTextarea,
    AIInputToolbar,
    AIInputTools,
} from '@/components/ui/ai/input';
import {
    CodeBlock,
    CodeBlockBody,
    CodeBlockContent,
    CodeBlockFilename,
    CodeBlockFiles,
    CodeBlockHeader,
    CodeBlockItem,
} from '@/components/ui/shadcn-io/code-block';
import { ChatApiPayload } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { useSession, signOut } from "next-auth/react";

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    status?: string;
    reasoning?: string;
    tools?: ToolCall[];
    sql?: string;
    results?: any[];
};

type ToolCall = {
    name: string;
    description: string;
    status: AIToolStatus;
    parameters?: Record<string, unknown>;
    result?: string;
    error?: string;
    startTime?: number;
    executionTime?: number;
};

export default function IntegratedAIChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { data: session, status } = useSession();


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);




    const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (!text.trim() || isStreaming) return;

        setIsStreaming(true);

        const userMessage: ChatMessage = {
            id: uuidv4(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        const currentText = text;
        setText('');

        const assistantMessageId = uuidv4();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            timestamp: new Date(),
            content: '',
            reasoning: '',
            status: 'Connecting...',
            tools: [],
        };
        setMessages((prev) => [...prev, initialAssistantMessage]);


        try {

            const payload: ChatApiPayload = {
                messages: [currentText],
                thread_id: uuidv4(),
                user_id: session?.user?.id|| 'default_user',
                session_id: session?.user?.id || 'fallback'
            };


            const response = await apiClient.streamChatMessage(payload);
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === assistantMessageId ? { ...msg, status: 'Finished' } : msg
                        )
                    );
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonString = line.substring(6);
                        if (!jsonString) continue;

                        try {
                            const eventData = JSON.parse(jsonString);

                            setMessages((prev) =>
                                prev.map((msg) => {
                                    if (msg.id === assistantMessageId) {
                                        const updatedMsg = { ...msg };

                                        if (eventData.status === 'running') {
                                            updatedMsg.status = `Running: ${eventData.stage}`;

                                            const isTool = eventData.stage.includes('sql') || eventData.stage.includes('query');

                                            //select the tools I want to display using the shadcn.io AI tool display or else every node I display as a text in the reasoning step
                                            if (isTool) {
                                                updatedMsg.tools?.push({
                                                    name: eventData.stage,
                                                    description: 'Executing data query...',
                                                    status: 'running',
                                                    startTime: Date.now(),
                                                });
                                            }


                                            const newReasoningStep = `\n\nStarting : **${eventData.stage}**...`;
                                            updatedMsg.reasoning = (updatedMsg.reasoning || '') + newReasoningStep;
                                        }

                                        else if (eventData.status === 'completed') {
                                            updatedMsg.status = `Completed: ${eventData.stage}`;

                                            const toolIndex = updatedMsg.tools?.findIndex(t => t.name === eventData.stage && t.status === 'running');

                                            if (toolIndex !== undefined && toolIndex > -1) {
                                                const tool = updatedMsg.tools![toolIndex];
                                                tool.status = 'completed';
                                                tool.parameters = eventData.result?.input;
                                                tool.result = JSON.stringify(eventData.result?.output, null, 2);
                                                if (tool.startTime) {
                                                    tool.executionTime = Date.now() - tool.startTime;
                                                }

                                                updatedMsg.sql = tool.parameters?.query as string || JSON.stringify(tool.parameters, null, 2);
                                                try {
                                                    updatedMsg.results = typeof tool.result === 'string' ? JSON.parse(tool.result) : tool.result;
                                                } catch {
                                                    updatedMsg.results = [];
                                                }
                                            }


                                            const completionStep = `\n\nCompleted : **${eventData.stage}**`;
                                            updatedMsg.reasoning = (updatedMsg.reasoning || '') + completionStep;

                                           //This code is necessary to know that I have reached my final node
                                            if (eventData.stage === 'Text-to-SQL Agent') {
                                                updatedMsg.status = 'Finished';
                                                updatedMsg.reasoning += `\n\n\n **All processing complete now returning the user output!**`;

                                                const finalState = eventData.result;
                                                if (finalState?.messages?.length > 0) {
                                                    // This is the final output from my text-to-sql agent
                                                    updatedMsg.content = finalState.messages[finalState.messages.length - 1].content;
                                                }
                                                // Handle other fields if available
                                                if (finalState?.sql_query) {
                                                    updatedMsg.sql = finalState.sql_query;
                                                }
                                                if (finalState?.results) {
                                                    updatedMsg.results = finalState.results;
                                                }
                                            }
                                        }

                                        else if (eventData.stage === 'llm_stream' && eventData.chunk?.content) {
                                            updatedMsg.content += eventData.chunk.content;
                                            updatedMsg.status = 'Generating response...';
                                        }

                                        return updatedMsg;
                                    }
                                    return msg;
                                })
                            );
                        } catch (parseError) {
                            console.error('Failed to parse JSON:', parseError, 'Line:', jsonString);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming Error:', error);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessageId
                        ? { ...msg, content: 'Sorry, an error occurred.', status: 'Error' }
                        : msg
                )
            );
        } finally {
            setIsStreaming(false);
            setTimeout(() => {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantMessageId && msg.status !== ''
                            ? { ...msg, status: '' }
                            : msg
                    )
                );
            }, 3000);
        }
    };

    const renderMessage = (message: ChatMessage) => {
        const isLastMessage = messages[messages.length - 1]?.id === message.id;
        const isStreamingNow = isStreaming && isLastMessage;
        const hasTools = message.tools && message.tools.length > 0;
        const hasResults = message.results && Array.isArray(message.results) && message.results.length > 0;
        const keyNames = hasResults && message.results[0] ? Object.keys(message.results[0]) : [];

        if (message.role === 'user') {
            return (
                <AIMessage key={message.id} from="user">
                    <AIMessageContent>{message.content}</AIMessageContent>
                </AIMessage>
            );
        }

        return (
            <AIMessage key={message.id} from="assistant">
                <div className="flex w-full flex-col space-y-4">
                    {(message.reasoning || hasTools) && (
                        <AIReasoning className="mb-4" isStreaming={isStreamingNow}>
                            <AIReasoningTrigger>
                                <div className="flex w-full items-center justify-between">
                                    <span>{hasTools ? 'Thinking Process & Tools' : 'Thinking Process'}</span>
                                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                            </AIReasoningTrigger>
                            <AIReasoningContent>
                                {message.reasoning && <AIResponse>{message.reasoning}</AIResponse>}
                                {message.tools?.map((tool, idx) => (
                                    <AITool key={idx} className="mt-4">
                                        <AIToolHeader
                                            description={tool.description}
                                            name={tool.name}
                                            status={tool.status}
                                            executionTime={tool.executionTime}
                                        />
                                        <AIToolContent>
                                            {tool.parameters && <AIToolParameters parameters={tool.parameters} />}
                                            {(tool.result || tool.error) && (
                                                <AIToolResult
                                                    error={tool.error}
                                                    result={<AIResponse>{tool.result}</AIResponse>}
                                                />
                                            )}
                                        </AIToolContent>
                                    </AITool>
                                ))}
                            </AIReasoningContent>
                        </AIReasoning>
                    )}

                    {message.sql && (
                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    <h3 className="font-semibold">Generated SQL Query</h3>
                                </div>
                                <CodeBlock data={[{ language: 'sql', code: message.sql, filename: 'query.sql' }]} defaultValue="sql">
                                    <CodeBlockHeader>
                                        <CodeBlockFiles>{(item) => <CodeBlockFilename>{item.filename}</CodeBlockFilename>}</CodeBlockFiles>
                                    </CodeBlockHeader>
                                    <CodeBlockBody>{(item) => <CodeBlockItem><CodeBlockContent>{item.code}</CodeBlockContent></CodeBlockItem>}</CodeBlockBody>
                                </CodeBlock>
                            </CardContent>
                        </Card>
                    )}

                    {hasResults && (
                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-4 flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" />
                                    <h3 className="font-semibold">Query Results</h3>
                                </div>
                                <div className="max-h-80 overflow-y-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>{keyNames.map(key => <TableHead key={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableHead>)}</TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {message.results!.map((row: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    {keyNames.map((key, i) => (
                                                        <TableCell key={i}>
                                                            {key === 'revenue' ? `$${Number(row[key]).toLocaleString()}` : String(row[key])}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {hasResults && keyNames.includes('date') && keyNames.includes('total_orders') && (
                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-4 flex items-center gap-2">
                                    <LucideChartCandlestick className="h-4 w-4" />
                                    <h3 className="font-semibold">Visualization</h3>
                                </div>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={message.results} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip contentStyle={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                                            <Line type="monotone" dataKey="total_orders" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {message.content && (
                        <AIMessageContent>
                            <div className="mb-4 flex items-center gap-2">
                                <LucideBotMessageSquare className="h-4 w-4" />
                                <h3 className="font-semibold">Summary</h3>
                            </div>
                            <AIResponse>{message.content}</AIResponse>
                        </AIMessageContent>
                    )}

                    {isStreamingNow && message.status && <div className="mt-2 text-sm text-muted-foreground">{message.status}</div>}
                </div>
            </AIMessage>
        );
    };

    return (
        <div className="flex h-full max-h-screen flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl p-6">
                    <AIConversation>
                        <AIConversationContent>
                            {messages.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
                                    <Bot className="h-12 w-12 mb-4" />
                                    <h2 className="text-lg font-semibold">Data Agent Assistant</h2>
                                    <p className="text-sm">You can ask me anything about your data.</p>
                                </div>
                            ) : (
                                messages.map(renderMessage)
                            )}
                            <div ref={messagesEndRef} />
                        </AIConversationContent>
                        <AIConversationScrollButton />
                    </AIConversation>
                </div>
            </div>
            <div className="flex-shrink-0 border-t bg-background">
                <div className="mx-auto max-w-4xl p-3">
                    <AIInput onSubmit={handleSubmit}>
                        <AIInputTextarea
                            onChange={(e) => setText(e.target.value)}
                            value={text}
                            placeholder="Ask a question about your data..."
                            disabled={isStreaming}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e as any);
                                }
                            }}
                        />
                        <AIInputToolbar>
                            <AIInputTools><AIInputButton><Plus size={16} /></AIInputButton></AIInputTools>
                            <Button type="submit" disabled={isStreaming || !text.trim()} className="p-1 m-1">
                                {isStreaming ? (<Loader2 className="h-4 w-4 animate-spin" />) : (<Send className="h-4 w-4" />)}
                            </Button>
                        </AIInputToolbar>
                    </AIInput>
                </div>
            </div>
        </div>
    );
}
