# QSA Ticket Processing Agent (Node.js)

A Managed Service Provider (MSP) ticket processing agent that categorizes, prioritizes, and answers IT support tickets using OpenAI and a local knowledge base. Migrated from Python/Flask to Node.js/Express.

## Features
- Categorizes tickets using OpenAI (gpt-3.5-turbo)
- Looks up answers in a local knowledge base (text files)
- Assigns priority and routes to the correct specialist
- Provides concise, elementary-style answers

## Setup

1. **Clone the repo and install dependencies:**
   ```bash
   npm install
   ```
2. **Configure API key:**
   - Copy `.env.example` to `.env` and fill in your OpenAI API key.
3. **Ensure KB files exist:**
   - `kb_m365_productivity.txt`
   - `kb_cybersecurity.txt`
   - `kb_network_connectivity.txt`

4. **Run the server:**
   ```bash
   npm start
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000)

## API
### POST `/analyze`
- **Request:** `{ ticket: "..." }`
- **Response:**
  ```json
  {
    "assigned_priority": "High",
    "assigned_category": "Network & Connectivity",
    "routed_to": "Network & Connectivity Specialist",
    "justification": "...",
    "answer": "..."
  }
  ```

## Frontend
- Place your `index.html` in the `frontend/` directory. The server will serve this file at `/`.

## Environment Variables
- `OPENAI_API_KEY` (required)
- `PORT` (optional, default: 3000)

## License
MIT
