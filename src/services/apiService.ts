// src/services/apiService.ts
export interface TicketResponse {
    assigned_priority: string;
    assigned_category: string;
    routed_to: string;
    justification: string;
    answer: string;
  }
  
  const priorityMapping: Record<string, string> = {
    'P0': 'Low',
    'P1': 'Medium',
    'P2': 'High'
  };
  
  export const submitTicket = async (query: string, priority: string, model: string): Promise<TicketResponse> => {
    try {
      // Looking at ticketAgent.js, the backend only needs the ticket content
      // The backend will handle priority assessment and categorization internally
      const response = await fetch('/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket: query
          // The backend ignores priority_level and model, so we can remove them
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit ticket');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  };
  