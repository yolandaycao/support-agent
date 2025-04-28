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
      console.log('Submitting ticket:', { query, priority, model }); // Debug log
      
      const response = await fetch('/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket: query
          // Backend only requires 'ticket' parameter
        }),
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to submit ticket');
        } catch (parseError) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      return data;
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  };
  