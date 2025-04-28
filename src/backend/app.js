require('dotenv').config();
const express = require('express');
const path = require('path');
const { OpenAI } = require('openai/index.mjs');
const { processTicket } = require('./ticketAgent');

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.post('/analyze', async (req, res) => {
  const ticket = req.body.ticket || '';
  try {
    const result = await processTicket(ticket, openai);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ticket Processing Agent running on port ${PORT}`);
});
