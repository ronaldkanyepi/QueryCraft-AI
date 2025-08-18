"use client";
import { useState, useEffect } from "react";
import { Search, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Status, StatusIndicator } from "@/components/ui/shadcn-io/status"
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type Conversation = {
    id: number;
    title: string;
};

const LOCAL_STORAGE_KEY = "craftsql-conversations";

const defaultConversations: Conversation[] = [
    { id: 1, title: "SQL for Sales Data" },
    { id: 2, title: "Optimizing User Queries" },
];

export function AppSidebar() {
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        try {
            const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
            return saved ? (JSON.parse(saved) as Conversation[]) : defaultConversations;
        } catch {
            return defaultConversations;
        }
    });

    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [conversationToRename, setConversationToRename] = useState<Conversation | null>(null);
    const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
    const [newTitle, setNewTitle] = useState("");

    useEffect(() => {
        try {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(conversations));
        } catch (error) {
            console.error("Failed to save conversations to localStorage:", error);
        }
    }, [conversations]);

    const handleNewConversation = () => {
        const newConversation: Conversation = { id: Date.now(), title: "New Conversation" };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
        setSearchQuery("");
    };

    const openRenameDialog = (convo: Conversation) => {
        setConversationToRename(convo);
        setNewTitle(convo.title);
        setIsRenameDialogOpen(true);
    };

    const handleRename = () => {
        if (!conversationToRename || !newTitle.trim()) return;
        setConversations(prev =>
            prev.map(c => (c.id === conversationToRename.id ? { ...c, title: newTitle.trim() } : c))
        );
        setIsRenameDialogOpen(false);
    };

    const openDeleteDialog = (convo: Conversation) => {
        setConversationToDelete(convo);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = () => {
        if (!conversationToDelete) return;
        setConversations(prev => prev.filter(c => c.id !== conversationToDelete.id));
        if (activeConversationId === conversationToDelete.id) {
            setActiveConversationId(null);
        }
        setIsDeleteDialogOpen(false);
    };

    const filteredConversations = conversations.filter(convo =>
        convo.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Sidebar>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>
                            <Status status="online"><StatusIndicator /></Status>CraftSQLAI
                        </SidebarGroupLabel>
                    </SidebarGroup>

                    <SidebarGroup className="flex flex-col flex-1 overflow-hidden">
                        <SidebarGroupLabel className="flex justify-between items-center">
                            Chats
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewConversation}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <div className="relative p-2">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search chats..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <SidebarMenu>
                                {filteredConversations.map((convo) => (
                                    <SidebarMenuItem key={convo.id}>
                                        <SidebarMenuButton
                                            className={`justify-between w-full h-10 ${activeConversationId === convo.id ? "bg-secondary text-secondary-foreground" : ""}`}
                                            onClick={() => setActiveConversationId(convo.id)}
                                        >
                                            <span className="truncate pr-2">{convo.title}</span>
                                            <div className="opacity-0 group-hover:opacity-100">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <div
                                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7 cursor-pointer"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </div>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuItem onClick={() => openRenameDialog(convo)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Rename
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openDeleteDialog(convo)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>

            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Rename Conversation</DialogTitle>
                        <DialogDescription>
                            Enter a new name for this conversation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="name" className="text-left">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" onClick={handleRename}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your conversation titled "{conversationToDelete?.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}