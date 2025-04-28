// src/store/ticketStore.ts
import { create } from 'zustand';
import { submitTicket, TicketResponse } from '../services/apiService';

interface TicketState {
  isLoading: boolean;
  error: string | null;
  ticketResponse: TicketResponse | null;
  submitQuery: (query: string, priority: string, model: string) => Promise<void>;
  resetResponse: () => void;
}

export const useTicketStore = create<TicketState>((set) => ({
  isLoading: false,
  error: null,
  ticketResponse: null,
  
  submitQuery: async (query: string, priority: string, model: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const response: TicketResponse = await submitTicket(query, priority, model);
      set({ ticketResponse: response, isLoading: false });
    } catch (error: unknown) {
      console.error('Submit query error:', error);
      // Improve error message handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  resetResponse: (): void => {
    set({ ticketResponse: null, error: null });
  },
}));
