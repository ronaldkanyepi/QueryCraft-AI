export interface CollectionCreate {
    name: string;
    metadata?: Record<string, unknown>;
}

export interface CollectionUpdate {
    name?: string;
    metadata?: Record<string, unknown>;
}

export interface CollectionResponse {
    uuid: string;
    name: string;
    metadata?: Record<string, unknown>;
}


export interface Collection extends CollectionResponse {
    documentCount?: number;
}

export interface DocumentResponse {
    id: string;
    collection_id: string;
    document?: string | null;
    metadata?: {
        file_name?: string;
        file_size?: number;
        author?: string;
        source?: string | null;
        creator?: string;
        file_id?: string;
        moddate?: string;
        producer?: string;
        total_pages?: number;
        creationdate?: string;
        [key: string]: unknown;
    } | null;
    created_at?: string | null;
    updated_at?: string | null;
}


export interface Document extends DocumentResponse {
    fileName: string;
    fileType: 'file' | 'text';
    fileSize: number;
    uploadDate: string;
}

export interface UploadDocumentResponse {
    added_chunk_ids: string[];
    message: string;
    success: boolean;
}

export interface ChatApiPayload  {
    messages: string[];
    thread_id: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    status?: string;
    // ... other fields like sql, results, etc.
}
