require('dotenv').config();
const fs = require('fs');
const path = require('path');
// Change this line in ticketAgent.js
const { OpenAI } = require('openai');

const categories = [
  "M365 & Productivity",
  "Cybersecurity",
  "Network & Connectivity"
];

const categoryKeywords = {
  "M365 & Productivity": [
    "microsoft", "office", "email", "outlook", "teams", "sharepoint", "onedrive", "collaboration", "document", "word", "excel", "powerpoint"
  ],
  "Cybersecurity": [
    "security", "compliance", "cyber", "breach", "phish", "ransomware", "regulatory", "data protection", "access", "gdpr", "hipaa", "mfa", "2fa", "password", "encryption"
  ],
  "Network & Connectivity": [
    "network", "vpn", "hardware", "server", "router", "switch", "latency", "performance", "connectivity", "internet", "wifi", "system down", "crash", "slow", "printer"
  ]
};

function assessPriority(ticket) {
  const t = ticket.toLowerCase();
  if (["breach", "ransomware", "phish", "security incident", "data leak", "compliance violation", "system down", "all users", "cannot access", "urgent", "critical", "regulatory"].some(w => t.includes(w))) return "High";
  if (["multiple users", "several users", "performance", "slow", "degraded", "intermittent", "issues", "not working as expected"].some(w => t.includes(w))) return "Medium";
  return "Low";
}

function getKbFilename(category) {
  if (category === "TBD") return null;
  return {
    "M365 & Productivity": "kb_m365_productivity.txt",
    "Cybersecurity": "kb_cybersecurity.txt",
    "Network & Connectivity": "kb_network_connectivity.txt"
  }[category] || null;
}

function routeSpecialist(category) {
  if (category === "TBD") return "Manual Specialist Assignment Required";
  return `${category} Specialist`;
}

function getJustification(priority, category) {
  const justifications = {
    "High": "The ticket describes a critical issue with potential security, compliance, or widespread business impact.",
    "Medium": "The ticket affects multiple users or system performance but is not immediately business critical.",
    "Low": "The ticket affects a single user or is a minor/non-urgent issue."
  };
  const catJustifications = {
    "M365 & Productivity": "The issue relates to Microsoft or productivity applications.",
    "Cybersecurity": "The ticket involves security, data protection, or regulatory concerns.",
    "Network & Connectivity": "The problem pertains to network, hardware, or connectivity.",
    "TBD": "The category could not be determined automatically. Manual review is required."
  };
  return `${justifications[priority]} ${catJustifications[category] || ''}`;
}

function searchKb(category, ticket) {
  const kbFile = getKbFilename(category);
  if (!kbFile) return "escalation needed";
  const kbPath = path.join(__dirname, kbFile);
  if (!fs.existsSync(kbPath)) return "escalation needed";
  const kbContent = fs.readFileSync(kbPath, 'utf-8');
  const qaPairs = Array.from(kbContent.matchAll(/Q: (.*?)\nA: (.*?)(?=\nQ: |\Z)/gs));
  const t = ticket.toLowerCase().trim();
  for (const [_, q, a] of qaPairs) {
    const ql = q.toLowerCase().trim();
    if (t.includes(ql) || ql.includes(t)) return a.trim();
  }
  return "escalation needed";
}

async function categorize(ticket, openai) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "TBD";
  const systemPrompt =
    "You are an expert IT support classifier. " +
    "Given a support ticket or a question about IT topics, classify it into one of these categories: ['M365 & Productivity', 'Cybersecurity', 'Network & Connectivity']. " +
    "If the ticket or question does not fit any category, respond with 'TBD'. Respond ONLY with the category name or 'TBD'. Do not provide any explanation. " +
    "Examples:\n" +
    "Q: What is VPN?\nA: Network & Connectivity\n" +
    "Q: How do I reset my Outlook password?\nA: M365 & Productivity\n" +
    "Q: How do I enable MFA?\nA: Cybersecurity\n";
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: ticket }
      ],
      max_tokens: 10,
      temperature: 0
    });
    const cat = resp.choices[0].message.content.trim();
    if (categories.includes(cat)) return cat;
    return "TBD";
  } catch {
    return "TBD";
  }
}

async function getLlmAnswer(ticket, category, openai) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "[LLM unavailable: OPENAI_API_KEY not set]";
  let kbContent = "";
  const kbFile = getKbFilename(category);
  if (kbFile) {
    const kbPath = path.join(__dirname, kbFile);
    if (fs.existsSync(kbPath)) {
      kbContent = fs.readFileSync(kbPath, 'utf-8');
    }
  }
  const systemPrompt =
    "You are TechSupport Assistant, an AI support specialist for an MSP (Managed Service Provider). Your goal is to provide helpful, accurate, and efficient IT support solutions.\n" +
    "\nKNOWLEDGE BASE USAGE:\n" +
    "- ALWAYS refer to the knowledge base first for answers to customer inquiries\n" +
    "- Match customer questions to similar questions in the knowledge base\n" +
    "- If an exact match exists, use that answer as your primary response\n" +
    "- If a partial match exists, adapt the knowledge base answer to the specific question\n" +
    "- If NO relevant information exists in the knowledge base, clearly mark your response with 'ESCALATION NEEDED' at the beginning and suggest what information a human agent would need to resolve this\n" +
    "\nApproach every question with these principles:\n" +
    "1. Be concise - Get to the point quickly without unnecessary explanations\n" +
    "2. Be practical - Provide specific, actionable steps that solve the problem\n" +
    "3. Be friendly - Use a supportive, patient tone without being overly casual\n" +
    "4. Be confident - Express solutions with clarity and certainty when appropriate\n" +
    "\nWhen responding:\n" +
    "- Keep answers to 2-3 sentences unless detailed steps are required\n" +
    "- Treat end users as elementary school students. Use simple, clear language and avoid technical jargons\n" +
    "- If the ticket is not directly about a bug or error, always end your answer with a clarifying question to help resolve the user's issue.\n" +
    kbContent +
    "\nAnswer the following support ticket using the above knowledge base and instructions.";
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: ticket }
      ],
      max_tokens: 400,
      temperature: 0.2
    });
    return resp.choices[0].message.content.trim();
  } catch (e) {
    return `[LLM error: ${e}]`;
  }
}

async function processTicket(ticket, openai) {
  const priority = assessPriority(ticket);
  const category = await categorize(ticket, openai);
  const specialist = routeSpecialist(category);
  const justification = getJustification(priority, category);
  let answer = searchKb(category, ticket);
  if (answer === "escalation needed") {
    answer = await getLlmAnswer(ticket, category, openai);
  }
  return {
    assigned_priority: priority,
    assigned_category: category,
    routed_to: specialist,
    justification,
    answer
  };
}

module.exports = { processTicket };
