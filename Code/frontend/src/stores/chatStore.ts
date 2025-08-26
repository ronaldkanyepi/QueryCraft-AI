import { create } from 'zustand';

export interface ChatMessage {
    id: string;
    type: 'user' | 'assistant' | 'thinking' | 'sql' | 'results';
    content: string;
    data?:any;
    timestamp: Date;
}

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    setLoading: (loading: boolean) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    isLoading: false,
    addMessage: (message) =>
        set((state) => ({
            messages: [
                ...state.messages,
                {
                    ...message,
                    id: crypto.randomUUID(),
                    timestamp: new Date(),
                },
            ],
        })),
    setLoading: (loading) => set({ isLoading: loading }),
    clearMessages: () => set({ messages: [] }),
}));
