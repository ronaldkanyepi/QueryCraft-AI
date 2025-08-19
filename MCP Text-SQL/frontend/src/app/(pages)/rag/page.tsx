"use client";

import {ChangeEvent, useCallback, useEffect, useRef, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {ScrollArea} from "@/components/ui/scroll-area";
import {toast} from "sonner";
import {BadgeCheckIcon, FileText, Folder, MoreHorizontal, Pencil, Plus, Trash2, Upload, Menu} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {ControllableAlertDialog, ControllableAlertDialogHandle} from "@/components/ui/ControllableAlertDialog";
import {Spinner} from '@/components/ui/shadcn-io/spinner';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {apiClient} from "@/lib/apiClient";
import type {Collection, Document} from "@/lib/types";
import {columns as documentColumns, DocumentResponse} from "./columns";
import {DataTable} from "@/components/ui/data-table";
import {TypingText} from "@/components/ui/shadcn-io/typing-text";

export default function SettingsPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoadingCollections, setIsLoadingCollections] = useState(true);
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [editingName, setEditingName] = useState("");
    const [showNewCollection, setShowNewCollection] = useState(false);
    const [newDocumentText, setNewDocumentText] = useState('');
    const [showAddText, setShowAddText] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<DocumentResponse | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const confirmationDialogRef = useRef<ControllableAlertDialogHandle>(null);

    const handleError = (error: unknown) => {
        if (error instanceof Error) {
            toast.error(error.message);
        } else {
            toast.error("An unknown error occurred.");
        }
    };

    const loadCollections = useCallback(async () => {
        try {
            const cols = await apiClient.listCollections();
            setCollections(cols);
            if (cols.length > 0) {
                setSelectedCollection(prev => prev ?? cols[0]);
            }
        } catch (err) {
            handleError(err);
        } finally {
            setIsLoadingCollections(false);
        }
    }, []);

    const loadDocuments = useCallback(async (collectionId: string) => {
        setIsLoadingDocuments(true);
        try {
            const docsFromApi = await apiClient.listDocuments(collectionId);
            const normalized: Document[] = docsFromApi.map(d => ({
                ...d,
                fileName: d.metadata?.file_name || d.id,
                fileType: (d.metadata?.file_name as string)?.includes('.') ? 'file' : 'text',
                fileSize: d.metadata?.file_size || 0,
                uploadDate: d.created_at ? new Date(d.created_at).toLocaleString() : 'N/A',
            }));
            setDocuments(normalized);
            setCollections(prev =>
                prev.map(c =>
                    c.uuid === collectionId ? {...c, documentCount: docsFromApi.length} : c
                )
            );
        } catch (err) {
            handleError(err);
            setDocuments([]);
        } finally {
            setIsLoadingDocuments(false);
        }
    }, []);

    useEffect(() => {
        void loadCollections();
    }, [loadCollections]);

    useEffect(() => {
        if (selectedCollection) {
            void loadDocuments(selectedCollection.uuid);
        } else {
            setDocuments([]);
        }
    }, [selectedCollection, loadDocuments]);

    const refreshDocumentsAndCount = useCallback(async () => {
        if (selectedCollection) {
            await loadDocuments(selectedCollection.uuid);
        }
    }, [selectedCollection, loadDocuments]);

    const handleCreateCollection = useCallback(async () => {
        if (!newCollectionName.trim()) return;
        try {
            const newCollection = await apiClient.createCollection({name: newCollectionName.trim()});
            toast.success("Collection created successfully.");
            setNewCollectionName("");
            setShowNewCollection(false);
            const newCollectionWithCount = {...newCollection, documentCount: 0};
            setCollections(prev => [...prev, newCollectionWithCount]);
            setSelectedCollection(newCollectionWithCount);
        } catch (err) {
            handleError(err);
        }
    }, [newCollectionName]);

    const handleUpdateCollection = async (collectionId: string, newName: string) => {
        try {
            const updatedCollection = await apiClient.updateCollection(collectionId, {name: newName});
            toast.success("Collection updated successfully.");
            setCollections(prev =>
                prev.map(c => c.uuid === collectionId ? {...c, name: updatedCollection.name} : c)
            );
        } catch (err) {
            handleError(err);
        }
    };

    const handleRemoveCollection = async (collection: Collection) => {
        const isConfirmed = await confirmationDialogRef.current?.confirm({
            title: "Are you absolutely sure?",
            description: `This will permanently delete the collection "${collection.name}" and all of its documents.`,
            confirmText: "Delete",
        });
        if (!isConfirmed) return;
        try {
            await apiClient.deleteCollection(collection.uuid);
            toast.success(`Collection "${collection.name}" deleted successfully`);
            setCollections(prev => {
                const remaining = prev.filter(c => c.uuid !== collection.uuid);
                if (selectedCollection?.uuid === collection.uuid) {
                    setSelectedCollection(remaining.length > 0 ? remaining[0] : null);
                }
                return remaining;
            });
        } catch (err) {
            handleError(err);
        }
    };

    const handleFileUpload = useCallback(async (ev: ChangeEvent<HTMLInputElement>) => {
        const files = ev.target.files;
        if (!files || files.length === 0 || !selectedCollection) return;
        setIsUploading(true);
        const fd = new FormData();
        Array.from(files).forEach(file => fd.append("files", file));
        try {
            const response = await apiClient.createDocuments(selectedCollection.uuid, fd);
            toast.success(response.message);
            await refreshDocumentsAndCount();
        } catch (err) {
            handleError(err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [selectedCollection, refreshDocumentsAndCount]);

    const handleAddText = useCallback(async () => {
        if (!newDocumentText.trim() || !selectedCollection) return;
        setIsUploading(true);
        try {
            const textBlob = new Blob([newDocumentText], {type: "text/plain"});
            const formData = new FormData();
            formData.append("files", textBlob, `text-document-${Date.now()}.txt`);
            await apiClient.createDocuments(selectedCollection.uuid, formData);
            toast.success("Text document added successfully.");
            setNewDocumentText("");
            setShowAddText(false);
            await refreshDocumentsAndCount();
        } catch (err) {
            handleError(err);
        } finally {
            setIsUploading(false);
        }
    }, [newDocumentText, selectedCollection, refreshDocumentsAndCount]);

    const handleDeleteDocument = useCallback(async (documentId: string) => {
        const isConfirmed = await confirmationDialogRef.current?.confirm({
            title: "Delete this document?",
            description: "This action is permanent and cannot be undone.",
            confirmText: "Delete",
        });
        if (!isConfirmed || !selectedCollection) return;
        try {
            await apiClient.deleteDocument(selectedCollection.uuid, documentId);
            toast.success("Document deleted successfully.");
            await refreshDocumentsAndCount();
        } catch (err) {
            handleError(err);
        }
    }, [selectedCollection, refreshDocumentsAndCount]);

    const handleViewDocument = useCallback((doc: DocumentResponse) => {
        setViewingDoc(doc);
    }, []);

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}


            <div className={`
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
                fixed md:static
                inset-y-0 left-0 z-50
                w-64 md:w-64 md:min-w-64 md:max-w-64
                border-r bg-muted/30
                flex flex-col
                transition-transform duration-300 ease-in-out
            `}>
                <div className="p-2 sm:p-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base sm:text-lg font-semibold">Collections</h2>
                        <Button size="sm" variant="outline" onClick={() => setShowNewCollection(p => !p)}>
                            <Plus className="h-4 w-4"/>
                        </Button>
                    </div>
                    {showNewCollection && (
                        <div className="space-y-2 mb-4">
                            <Input
                                placeholder="New collection name..."
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                                className="text-sm"
                            />
                            <div className="flex space-x-2">
                                <Button size="sm" onClick={handleCreateCollection}>Create</Button>
                                <Button size="sm" variant="ghost"
                                        onClick={() => setShowNewCollection(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1">
                    {isLoadingCollections ? (
                        <div className="flex justify-center items-center h-32 p-4">
                            <Spinner className="h-6 w-6"/>
                        </div>
                    ) : (
                        <div className="p-2">
                            {collections.map((collection) => (
                                <div
                                    key={collection.uuid}
                                    className={`flex items-center justify-between p-2 mb-1 rounded-lg cursor-pointer transition-colors ${
                                        selectedCollection?.uuid === collection.uuid ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                    }`}
                                    onClick={() => {
                                        setSelectedCollection(collection);
                                        setIsMobileMenuOpen(false);
                                    }}
                                >
                                    <div className="flex items-center space-x-2 truncate min-w-0 flex-1">
                                        <Folder className="h-4 w-4 flex-shrink-0"/>
                                        <span className="font-medium truncate text-sm">{collection.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                            {collection.documentCount ?? '...'}
                                        </Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                    <MoreHorizontal className="h-3 w-3"/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => {
                                                            e.preventDefault();
                                                            setEditingName(collection.name);
                                                        }}>
                                                            <Pencil className="h-4 w-4 mr-2"/>
                                                            Edit
                                                        </DropdownMenuItem>
                                                    </DialogTrigger>
                                                    <DialogContent className="w-full max-w-[90vw] sm:max-w-[425px] mx-2 sm:mx-auto">
                                                        <form onSubmit={(e) => {
                                                            e.preventDefault();
                                                            void handleUpdateCollection(collection.uuid, editingName);
                                                        }}>
                                                            <DialogHeader>
                                                                <DialogTitle className="text-base sm:text-lg">Edit Collection</DialogTitle>
                                                                <DialogDescription className="text-xs sm:text-sm">
                                                                    Make changes to your collection name here. Click
                                                                    save when you&apos;re done.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="grid gap-4 py-4">
                                                                <div className="grid grid-cols-4 items-center gap-4">
                                                                    <Label htmlFor="name"
                                                                           className="text-right text-xs sm:text-sm">Name</Label>
                                                                    <Input
                                                                        id="name"
                                                                        value={editingName}
                                                                        onChange={(e) => setEditingName(e.target.value)}
                                                                        className="col-span-3 text-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <DialogClose asChild><Button type="submit" size="sm">Save
                                                                    changes</Button></DialogClose>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                                <DropdownMenuItem
                                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                    onClick={() => handleRemoveCollection(collection)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2"/>
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>


            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="p-2 sm:p-4 border-b flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="md:hidden"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="h-4 w-4" />
                        </Button>

                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg sm:text-xl font-semibold truncate">
                                {selectedCollection ? selectedCollection.name : "Select a Collection"}
                            </h1>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                                {selectedCollection ? "Manage documents in this collection." : "Create or select a collection to get started."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-2 sm:p-4 flex-1 flex flex-col min-h-0">

                        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors flex-shrink-0">
                            <CardContent className="p-2 sm:p-4">
                                <div className="text-center">
                                    <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground mx-auto mb-2"/>
                                    <h3 className="text-xs sm:text-sm font-semibold mb-1">Upload Files or Add Text</h3>
                                    <p className="text-muted-foreground text-[10px] sm:text-xs mb-3">Drag and drop files or click a
                                        button below</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="file-upload"
                                        disabled={isUploading || !selectedCollection}
                                    />
                                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                        <Button size="sm" asChild disabled={isUploading || !selectedCollection} className="text-xs">
                                            <label htmlFor="file-upload" className="cursor-pointer">
                                                {isUploading ? 'Uploading...' : 'Select Files'}
                                            </label>
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setShowAddText(true)}
                                                disabled={!selectedCollection} className="text-xs">
                                            <FileText className="h-3 w-3 mr-1"/>
                                            Add Text
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {showAddText && (
                            <Card className="mt-4 flex-shrink-0">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm sm:text-base">Add Text Document</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Label htmlFor="document-text" className="text-xs sm:text-sm">Document Content</Label>
                                    <Textarea
                                        id="document-text"
                                        placeholder="Enter your text content here..."
                                        value={newDocumentText}
                                        onChange={(e) => setNewDocumentText(e.target.value)}
                                        rows={4}
                                        className="resize-none text-sm"
                                    />
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                        <Button size="sm" onClick={handleAddText} disabled={isUploading} className="text-xs">
                                            Add Document
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setShowAddText(false)} className="text-xs">
                                            Cancel
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Separator className="my-4 flex-shrink-0"/>

                        <div className="flex flex-col min-h-0 flex-1">
                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                <h3 className="text-sm sm:text-base font-semibold">Documents</h3>
                                <Badge variant="secondary" className="text-xs">
                                    <BadgeCheckIcon className="h-3 w-3 mr-1"/>
                                    {documents.length} documents
                                </Badge>
                            </div>

                            {isLoadingDocuments ? (
                                <div className="flex justify-center items-center py-8">
                                    <Spinner className="h-6 w-6"/>
                                </div>
                            ) : (
                                <div className="overflow-auto">
                                    <DataTable
                                        columns={documentColumns}
                                        data={documents}
                                        meta={{
                                            handleDeleteDocument: handleDeleteDocument,
                                            handleViewDocument: handleViewDocument,
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ControllableAlertDialog ref={confirmationDialogRef}/>

            <Dialog open={!!viewingDoc} onOpenChange={(isOpen) => !isOpen && setViewingDoc(null)}>
                <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl h-[85vh] sm:h-[80vh] flex flex-col mx-2 sm:mx-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">Document Full Text</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Complete content of the selected document.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                        <ScrollArea className="h-full rounded-md border p-2 sm:p-4">
                            <pre className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                                <TypingText
                                    className="text-xs sm:text-sm"
                                    text={viewingDoc?.content || "No content available."}
                                    cursor
                                    cursorClassName="text-xs sm:text-sm"
                                    duration={0.0007}
                                />
                            </pre>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
