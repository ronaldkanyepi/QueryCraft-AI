"use client";

import {ChangeEvent, useCallback, useEffect, useRef, useState} from "react";
import { useSession } from "next-auth/react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {ScrollArea} from "@/components/ui/scroll-area";
import {toast} from "sonner";
import {BadgeCheckIcon, FileText, Folder, MoreHorizontal, Pencil, Plus, Trash2, Upload, Menu, Settings, X, Search} from "lucide-react";
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
import type {Collection, Document, MetadataField, SearchResult} from "@/lib/types";
import {columns as documentColumns, DocumentResponse} from "./columns";
import {DataTable} from "@/components/ui/data-table";
import {TypingText} from "@/components/ui/shadcn-io/typing-text";


export default function SettingsPage() {
    const { data: session } = useSession();
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
    const [isSystemCollection, setIsSystemCollection] = useState(false);

    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchLimit, setSearchLimit] = useState(4);

    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
    const [pendingUpload, setPendingUpload] = useState<{
        type: 'file' | 'text';
        files?: FileList;
        textContent?: string;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const confirmationDialogRef = useRef<ControllableAlertDialogHandle>(null);

    const handleError = (error: unknown): void => {
        if (error instanceof Error) {
            toast.error(error.message);
        } else {
            toast.error("An unknown error occurred.");
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim() || !selectedCollection) {
            toast.error("Please enter a search query.");
            return;
        }

        setIsSearching(true);
        try {
            const results = await apiClient.searchDocuments(selectedCollection.uuid, searchQuery, searchLimit) as unknown as SearchResult[];
            setSearchResults(results);

            if (results.length === 0) {
                toast.info("No results found for your search query.");
            }
        } catch (err) {
            handleError(err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    const openSearchModal = () => {
        if (!selectedCollection) {
            toast.error("Please select a collection first.");
            return;
        }
        setShowSearchModal(true);
        clearSearch();
    };

    const formatScore = (score: number) => {
        return (1 - score).toFixed(3);
    };

    useEffect(() => {
        if (session?.user?.id && metadataFields.length === 0) {
            setMetadataFields([{
                key: 'owner_id',
                value: session.user.id,
                readonly: true
            }]);
        }
    }, [session?.user?.id, metadataFields.length]);

    const addMetadataField = (): void => {
        setMetadataFields(prev => [...prev, { key: '', value: '' }]);
    };

    const updateMetadataField = (index: number, field: 'key' | 'value', newValue: string): void => {
        setMetadataFields(prev => prev.map((item, i) =>
            i === index && !item.readonly ? { ...item, [field]: newValue } : item
        ));
    };

    const removeMetadataField = (index: number): void => {
        setMetadataFields(prev => prev.filter((item, i) => i !== index || item.readonly));
    };

    const getMetadataObject = (): Record<string, string> | undefined => {
        const metadata: Record<string, string> = {};
        metadataFields.forEach(field => {
            if (field.key.trim() && field.value.trim()) {
                metadata[field.key.trim()] = field.value.trim();
            }
        });
        return Object.keys(metadata).length > 0 ? metadata : undefined;
    };

    const hasValidCustomMetadata = (): boolean => {
        return metadataFields.some(field =>
            !field.readonly && field.key.trim() && field.value.trim()
        );
    };

    const resetCustomMetadata = (): void => {
        const readonlyFields = metadataFields.filter(field => field.readonly);
        setMetadataFields(readonlyFields);
    };

    const handleMetadataSubmit = async (): Promise<void> => {
        if (!hasValidCustomMetadata()) {
            toast.error("Please add at least one custom metadata field.");
            return;
        }

        if (!pendingUpload || !selectedCollection) return;

        setIsUploading(true);
        setShowMetadataModal(false);

        try {
            const cmetadata = getMetadataObject();

            if (pendingUpload.type === 'file' && pendingUpload.files) {
                const fd = new FormData();
                Array.from(pendingUpload.files).forEach(file => fd.append("files", file));

                if (cmetadata) {
                    const metadataArray = Array.from(pendingUpload.files).map(() => cmetadata);
                    fd.append("metadatas_json", JSON.stringify(metadataArray));
                    console.log("FormData metadatas_json:", JSON.stringify(metadataArray));
                }
                const response = await apiClient.createDocuments(selectedCollection.uuid, fd);
                toast.success(response.message);

            } else if (pendingUpload.type === 'text' && pendingUpload.textContent) {
                const textBlob = new Blob([pendingUpload.textContent], {type: "text/plain"});
                const formData = new FormData();
                formData.append("files", textBlob, `text-document-${Date.now()}.txt`);

                if (cmetadata) {
                    const metadataArray = [cmetadata];
                    formData.append("metadatas_json", JSON.stringify(metadataArray));
                    console.log("FormData metadatas_json:", JSON.stringify(metadataArray));
                }
                await apiClient.createDocuments(selectedCollection.uuid, formData);
                toast.success("Text document added successfully.");
                setShowAddText(false);
                setNewDocumentText('');
            }

            await refreshDocumentsAndCount();
            resetCustomMetadata();

            if (session?.user?.id) {
                setMetadataFields([{
                    key: 'owner_id',
                    value: session.user.id,
                    readonly: true
                }]);
            }
        } catch (err) {
            handleError(err);
        } finally {
            setIsUploading(false);
            setPendingUpload(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
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

    const refreshDocumentsAndCount = useCallback(async () => {
        if (selectedCollection) {
            await loadDocuments(selectedCollection.uuid);
        }
    }, [selectedCollection, loadDocuments]);

    const handleDirectUpload = useCallback(async (uploadType: 'file' | 'text', content?: any) => {
        if (!selectedCollection) return;
        setIsUploading(true);
        try {
            if (uploadType === 'file' && content) {
                const fd = new FormData();
                Array.from(content).forEach((file: File) => fd.append("files", file));
                await apiClient.createDocuments(selectedCollection.uuid, fd);
                toast.success("Files uploaded successfully.");
            } else if (uploadType === 'text' && content) {
                const textBlob = new Blob([content], {type: "text/plain"});
                const formData = new FormData();
                formData.append("files", textBlob, `text-document-${Date.now()}.txt`);
                await apiClient.createDocuments(selectedCollection.uuid, formData);
                toast.success("Text document added successfully.");
                setShowAddText(false);
                setNewDocumentText('');
            }
            await refreshDocumentsAndCount();
        } catch (err) {
            handleError(err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [selectedCollection, refreshDocumentsAndCount, handleError]);

    useEffect(() => {
        void loadCollections();
    }, [loadCollections]);

    useEffect(() => {
        if (selectedCollection) {
            void loadDocuments(selectedCollection.uuid);
            setIsSystemCollection(selectedCollection.metadata?.owner_id === 'root');
        } else {
            setDocuments([]);
            setIsSystemCollection(false);
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

    const handleUpdateCollection = async (collectionId: string, newName: string): Promise<void> => {
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

    const handleRemoveCollection = async (collection: Collection): Promise<void> => {
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

        if (isSystemCollection) {
            void handleDirectUpload('file', files);
        } else {
            setPendingUpload({ type: 'file', files });
            setShowMetadataModal(true);
        }
    }, [selectedCollection, isSystemCollection, handleDirectUpload]);

    const handleAddTextClick = useCallback(() => {
        if (!newDocumentText.trim() || !selectedCollection) {
            toast.error("Please enter some text content first.");
            return;
        }

        if (isSystemCollection) {
            void handleDirectUpload('text', newDocumentText);
        } else {
            setPendingUpload({ type: 'text', textContent: newDocumentText });
            setShowMetadataModal(true);
        }
    }, [newDocumentText, selectedCollection, isSystemCollection, handleDirectUpload]);

    const handleDeleteDocument = useCallback(async (doc: DocumentResponse) =>  {
        const isConfirmed = await confirmationDialogRef.current?.confirm({
            title: "Delete this document?",
            description: "This action is permanent and cannot be undone.",
            confirmText: "Delete",
        });
        if (!isConfirmed || !selectedCollection) return;

        const fileId:unknown = doc.metadata?.file_id;
        if (!fileId) {
            toast.error("Unable to delete: file_id not found in document metadata");
            return;
        }

        try {
            await apiClient.deleteDocument(selectedCollection.uuid, fileId);
            toast.success("Document deleted successfully.");
            await refreshDocumentsAndCount();
        } catch (err) {
            handleError(err);
        }
    }, [selectedCollection, refreshDocumentsAndCount]);

    const handleViewDocument = useCallback((doc: DocumentResponse) => {
        setViewingDoc(doc);
    }, []);

    const customMetadataCount = metadataFields.filter(f => !f.readonly && f.key.trim() && f.value.trim()).length;

    return (
        <div className="flex h-full bg-background text-foreground overflow-hidden">
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
                                autoComplete="off"
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
                                                                        autoComplete="off"
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
                                                    onClick={() => void handleRemoveCollection(collection)}
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

            <div className="flex-1 flex flex-col min-w-0">
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

                        {selectedCollection && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={openSearchModal}
                                className="hidden sm:flex items-center gap-2"
                            >
                                <Search className="h-4 w-4"/>
                                Search
                            </Button>
                        )}

                        {customMetadataCount > 0 && (
                            <Badge variant="outline" className="hidden sm:flex items-center gap-1">
                                <Settings className="h-3 w-3"/>
                                {customMetadataCount} metadata fields set
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-2 sm:p-4 flex-1 flex flex-col overflow-y-auto">

                        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors flex-shrink-0">
                            <CardContent className="p-1 sm:p-2">
                                <div className="text-center">
                                    <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mx-auto mb-1"/>
                                    <h3 className="text-xs sm:text-sm font-semibold mb-1">Upload Files or Add Text</h3>
                                    <p className="text-muted-foreground text-[10px] sm:text-xs mb-2">Drag and drop files or click a
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
                                    <div className="flex flex-col sm:flex-row gap-1 justify-center">
                                        {isSystemCollection ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    asChild
                                                    disabled={isUploading || !selectedCollection}
                                                    className="text-xs"
                                                >
                                                    <label htmlFor="file-upload" className="cursor-pointer">
                                                        <Upload className="h-3 w-3 mr-1"/>
                                                        Upload Files
                                                    </label>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (newDocumentText.trim()) {
                                                            void handleDirectUpload('text', newDocumentText);
                                                        } else {
                                                            setShowAddText(p => !p);
                                                        }
                                                    }}
                                                    disabled={!selectedCollection}
                                                    className="text-xs"
                                                >
                                                    <FileText className="h-3 w-3 mr-1"/>
                                                    Add Text
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button size="sm" asChild disabled={isUploading || !selectedCollection} className="text-xs">
                                                    <label htmlFor="file-upload" className="cursor-pointer">
                                                        {isUploading ? 'Processing...' : 'Select Files'}
                                                    </label>
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setShowAddText(true)}
                                                        disabled={!selectedCollection} className="text-xs">
                                                    <FileText className="h-3 w-3 mr-1"/>
                                                    Add Text
                                                </Button>
                                            </>
                                        )}
                                        {selectedCollection && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={openSearchModal}
                                                className="sm:hidden text-xs"
                                            >
                                                <Search className="h-3 w-3 mr-1"/>
                                                Search
                                            </Button>
                                        )}
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
                                        <Button
                                            size="sm"
                                            onClick={handleAddTextClick}
                                            disabled={isUploading || !newDocumentText.trim()}
                                            className="text-xs"
                                        >
                                            Add Metadata
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => {
                                            setShowAddText(false);
                                            setNewDocumentText('');
                                        }} className="text-xs">
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
                                <div className="min-h-0 flex-1">
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

            <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
                <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl h-[85vh] sm:h-[80vh] flex flex-col mx-2 sm:mx-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg flex items-center gap-2">
                            <Search className="h-5 w-5"/>
                            Search Documents in {selectedCollection?.name}
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Search through your documents using semantic similarity matching.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter your search query..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="flex-1"
                                disabled={isSearching}
                            />
                            <div className="flex items-center gap-1">
                                <Label htmlFor="search-limit" className="text-xs whitespace-nowrap">Limit:</Label>
                                <Input
                                    id="search-limit"
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={searchLimit}
                                    onChange={(e) => setSearchLimit(Number(e.target.value))}
                                    className="w-16 text-sm"
                                    disabled={isSearching}
                                />
                            </div>
                            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                                {isSearching ? (
                                    <>
                                        <Spinner className="h-4 w-4 mr-2"/>
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4 mr-2"/>
                                        Search
                                    </>
                                )}
                            </Button>
                            {searchResults.length > 0 && (
                                <Button variant="outline" onClick={clearSearch}>
                                    <X className="h-4 w-4 mr-2"/>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0">
                        {searchResults.length > 0 ? (
                            <ScrollArea className="h-full">
                                <div className="space-y-4 pr-4">
                                    <div className="text-sm text-muted-foreground mb-4">
                                        Found {searchResults.length} results for `{searchQuery}`
                                    </div>
                                    {searchResults.map((result) => (
                                        <Card key={result.id} className="border hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <FileText className="h-5 w-4"/>
                                                        {`Document ${result.id.slice(0, 15)}...`}
                                                    </CardTitle>
                                                    <Badge variant="secondary" className="text-xs">
                                                        Score: {formatScore(result.score)}
                                                    </Badge>
                                                </div>
                                                {Object.keys(result.metadata).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {Object.entries(result.metadata).map(([key, value]) => (
                                                            key !== 'file_name' && (
                                                                <Badge key={key} variant="outline" className="text-xs">
                                                                    {key}: {String(value).slice(0, 20)}
                                                                    {String(value).length > 20 ? '...' : ''}
                                                                </Badge>
                                                            )
                                                        ))}
                                                    </div>
                                                )}
                                            </CardHeader>
                                            <CardContent>
                                                <div className="bg-muted/30 rounded-lg p-3">
                                                    <pre className="text-sm whitespace-pre-wrap break-words text-foreground">
                                                        {result.page_content.slice(0, 500)}
                                                        {result.page_content.length > 500 && (
                                                            <span className="text-muted-foreground">... (truncated)</span>
                                                        )}
                                                    </pre>
                                                </div>
                                                {result.page_content.length > 500 && (
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="mt-2 p-0 h-auto text-xs"
                                                        onClick={() => {
                                                            const mockDoc: DocumentResponse = {
                                                                id: result.id,
                                                                content: result.page_content,
                                                                metadata: result.metadata
                                                            };
                                                            setViewingDoc(mockDoc);
                                                            setShowSearchModal(false);
                                                        }}
                                                    >
                                                        View Full Content →
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : searchQuery && !isSearching ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Search className="h-12 w-12 text-muted-foreground mb-4"/>
                                <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                                <p className="text-muted-foreground text-sm max-w-md">
                                    No documents match your search query. Try using different keywords or check your spelling.
                                </p>
                            </div>
                        ) : !isSearching ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Search className="h-12 w-12 text-muted-foreground mb-4"/>
                                <h3 className="text-lg font-semibold mb-2">Search Your Documents</h3>
                                <p className="text-muted-foreground text-sm max-w-md">
                                    Enter a search query to find relevant documents using semantic similarity matching.
                                    Press Enter or click the Search button to begin.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Spinner className="h-8 w-8 mb-4"/>
                                <p className="text-muted-foreground">Searching documents...</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSearchModal(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showMetadataModal} onOpenChange={setShowMetadataModal}>
                <DialogContent className="w-full max-w-[95vw] sm:max-w-lg mx-2 sm:mx-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg flex items-center gap-2">
                            <Settings className="h-5 w-5"/>
                            Add Metadata
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Add custom metadata that will be attached to your {pendingUpload?.type === 'file' ? 'files' : 'document'}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-80 overflow-y-auto py-4">
                        <div className="space-y-3">
                            {metadataFields.map((field, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <Input
                                        placeholder="Key"
                                        value={field.key}
                                        onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                                        className={`flex-1 text-sm h-9 ${field.readonly ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'text-foreground'}`}
                                        disabled={field.readonly}
                                        readOnly={field.readonly}
                                    />
                                    <Input
                                        placeholder="Value"
                                        value={field.value}
                                        onChange={(e) => updateMetadataField(index, 'value', e.target.value)}
                                        className={`flex-1 text-sm h-9 ${field.readonly ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'text-foreground'}`}
                                        disabled={field.readonly}
                                        readOnly={field.readonly}
                                    />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeMetadataField(index)}
                                        className={`h-9 w-9 p-0 flex-shrink-0 ${field.readonly ? 'invisible' : 'text-muted-foreground hover:text-destructive'}`}
                                        disabled={field.readonly}
                                    >
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={addMetadataField}
                                className="w-full text-sm h-9"
                            >
                                <Plus className="h-4 w-4 mr-2"/>
                                Add Custom Field
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowMetadataModal(false);
                                setPendingUpload(null);
                            }}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleMetadataSubmit}
                            disabled={!hasValidCustomMetadata() || isUploading}
                            className="w-full sm:w-auto"
                        >
                            {isUploading ? (
                                <>
                                    <Spinner className="h-4 w-4 mr-2"/>
                                    Uploading...
                                </>
                            ) : (
                                `Upload ${pendingUpload?.type === 'file' ? 'Files' : 'Document'}`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
