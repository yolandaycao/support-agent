require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
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
    "You help IT support answer customer questions. Give advice to IT staff what to do.\n" +
    "\n2. Recommended Actions:\n" +
    "   - List specific troubleshooting steps for the technician\n" +
    "   - Highlight required tools or access needed\n" +
    "   - Suggest relevant documentation or KB articles to reference\n" +
    "\n3. Client Communication:\n" +
    "   - Recommend key questions to ask the client\n" +
    "   - Suggest what information to collect\n" +
    "   - Note any potential business impact to discuss\n" +
    "\n4. Resolution Path:\n" +
    "   - Outline estimated time for resolution\n" +
    "   - Flag if escalation might be needed\n" +
    "   - Suggest preventive measures for future\n" +
    "\nResponse Format:\n" +
    "- Structure your response in numbered list\n" +
    "- Be specific and technical - this is for MSP staff\n" +
    "- If escalation is needed, specify which team or expertise is required\n" +
    kbContent +
    "\nAnswer the following support ticket using the above knowledge base and instructions.";
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4",
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

async function predictDispatch(ticket) {
  try {
    const response = await fetch('http://localhost:8001/predict/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: ticket,
        problem_type: '',
        comments: []
      })
    });
    
    if (!response.ok) {
      console.error('ML API error:', await response.text());
      return null;
    }
    
    const prediction = await response.json();
    return prediction;
  } catch (error) {
    console.error('Error calling ML API:', error);
    return null;
  }
}

async function processTicket(ticket, openai) {
  const priority = assessPriority(ticket);
  const category = await categorize(ticket, openai);
  const specialist = routeSpecialist(category);
  const justification = getJustification(priority, category);
  answer = await getLlmAnswer(ticket, category, openai);
  
  // Get dispatch prediction from ML API
  // const dispatchPrediction = await predictDispatch(ticket);
  // const aiDispatch = dispatchPrediction ? `Ardence suggests assigning to: ${dispatchPrediction.tech}` : '';
  const aiDispatch = `Ardence suggests assigning to: James`;
// TODO: revert this

return {
    assigned_priority: priority,
    assigned_category: category,
    routed_to: specialist,
    justification,
    answer,
    ai_dispatch: aiDispatch
  };
}

module.exports = { processTicket };
