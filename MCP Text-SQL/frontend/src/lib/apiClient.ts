// lib/api-client.ts
import {
    ChatApiPayload,
    ChatMessage,
    CollectionCreate,
    CollectionResponse,
    CollectionUpdate,
    DocumentResponse,
    UploadDocumentResponse
} from "@/lib/types";
import { getSession } from "next-auth/react";

const PROXY_BASE_URL = "/api/backend";

async function getAuthHeaders(): Promise<HeadersInit> {
    const session = await getSession();
    const headers: HeadersInit = {};

    if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
    }

    return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        if (response.status === 401) {
            // Handle unauthorized - could trigger re-authentication
            throw new Error("Authentication required. Please sign in again.");
        }

        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        const message = errorData.detail?.[0]?.msg || errorData.detail || errorData.message || `API Error: ${response.status}`;
        throw new Error(String(message));
    }
    if (response.status === 204) {
        return undefined as T;
    }
    return response.json();
}

export const apiClient = {
    async listCollections(): Promise<CollectionResponse[]> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/collections`, {
            headers: authHeaders
        });
        return handleResponse<CollectionResponse[]>(response);
    },

    async createCollection(data: CollectionCreate): Promise<CollectionResponse> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/collections`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders
            },
            body: JSON.stringify(data),
        });
        return handleResponse<CollectionResponse>(response);
    },

    async updateCollection(
        collectionId: string,
        data: CollectionUpdate
    ): Promise<CollectionResponse> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/collections/${collectionId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders
            },
            body: JSON.stringify(data),
        });
        return handleResponse<CollectionResponse>(response);
    },

    async deleteCollection(collectionId: string): Promise<void> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/collections/${collectionId}`, {
            method: "DELETE",
            headers: authHeaders
        });
        return handleResponse<void>(response);
    },

    async listDocuments(collectionId: string): Promise<DocumentResponse[]> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/documents/${collectionId}`, {
            headers: authHeaders
        });
        return handleResponse<DocumentResponse[]>(response);
    },

    async createDocuments(collectionId: string, formData: FormData): Promise<UploadDocumentResponse> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/documents/${collectionId}`, {
            method: "POST",
            headers: authHeaders,
            body: formData,
        });
        return handleResponse<UploadDocumentResponse>(response);
    },

    async deleteDocument(collectionId: string, documentId: string): Promise<{ [key: string]: boolean }> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/documents/${collectionId}/${documentId}`, {
            method: "DELETE",
            headers: authHeaders
        });
        return handleResponse<{ [key: string]: boolean }>(response);
    },

    async sendMessage(data: ChatApiPayload): Promise<ChatMessage> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/chat/test`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders
            },
            body: JSON.stringify(data),
        });
        return handleResponse<ChatMessage>(response);
    },

    async streamChatMessage(data: ChatApiPayload): Promise<Response> {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${PROXY_BASE_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Authentication required. Please sign in again.");
            }
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            const message = errorData.detail || `API Error: ${response.status}`;
            throw new Error(String(message));
        }

        return response;
    }
};
