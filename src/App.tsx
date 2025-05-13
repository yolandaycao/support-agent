import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './App.css';
import { FiSettings, FiPlus, FiLink, FiMic, FiChevronDown } from 'react-icons/fi';
import { BsCheckLg } from 'react-icons/bs';
import { Radio, Tooltip, Spin } from 'antd';
import 'antd/dist/reset.css';
import { useTicketStore } from './store/ticketStore';

const heroVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
};

const buttonVariants = {
  hover: { scale: 1.05, backgroundColor: "#2563eb", color: "#fff" }
};

const AIagents = {
  Best: { name: "Best", description: "Selects the best model for each query" },
  Network: { name: "Network & Connectivity", description: "An agent for all the Network & Connectivity needs!" },
  Microsoft365: { name: "Microsoft 365", description: "An agent for all your Microsoft Needs!" },
  Cybersec: { name: "Cybersecurity", description: "An agent for all your Cybersecurity Needs!" },
};

function App() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<keyof typeof AIagents>('Best');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get state and actions from the ticket store
  const { isLoading, error, ticketResponse, submitQuery, resetResponse } = useTicketStore();

  console.log('Ticket Response:', ticketResponse);

  // Quirk: rotating placeholder
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    "Ticket Content",
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setSubmitted(`[${priority}] ${query}`);
    
    // Reset previous response
    resetResponse();
    
    // Submit the query to the backend
    await submitQuery(query, priority, AIagents[selectedModel].name);
    
    setQuery("");
  };

  const toggleDropdown = () => setIsDropdownOpen(v => !v);

  const selectModel = (key: keyof typeof AIagents): void => {
    setSelectedModel(key);
    setIsDropdownOpen(false);
  };

  return (
    <div className="app-bg">
      <motion.section
        className="hero"
        initial="hidden"
        animate="visible"
        variants={heroVariants}
      >
        <h1 className="hero-title">MSP AI Dispatcher</h1>
        
        <form onSubmit={handleSearch} className="search-form">
          <div className="input-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder={placeholders[placeholderIndex]}
                className="search-input"
                style={{ flex: 1, marginBottom: 0 }}
              />
            </div>

            <div className="input-actions priorities-row">
              <div className="model-selector" ref={dropdownRef}>
                <button 
                  type="button" 
                  className="model-btn"
                  onClick={toggleDropdown}
                >
                  {AIagents[selectedModel].name} <FiChevronDown />
                </button>
                {isDropdownOpen && (
                  <div className="model-dropdown">
                    {Object.entries(AIagents).map(([key, model]) => (
                      <div
                        key={key}
                        className={`model-option ${key === selectedModel ? 'selected' : ''}`}
                        onClick={() => selectModel(key as keyof typeof AIagents)}
                      >
                        <div className="model-text">
                          <div className="model-name">{model.name}</div>
                          <div className="model-desc">{model.description}</div>
                        </div>
                        {key === selectedModel && <BsCheckLg className="check-icon" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <motion.button
                className="submit-btn"
                variants={buttonVariants}
                whileHover="hover"
                type="submit"
              >
                Dispatch
              </motion.button>
            </div>
          </div>
        </form>
        
        {isLoading && (
          <div className="loading-container">
            <Spin size="large" />
            <p>Processing your request...</p>
          </div>
        )}
        
        {error && (
          <div className="error-container">
            <p>Error: {error}</p>
          </div>
        )}
        
        {submitted && !isLoading && !ticketResponse && !error && (
          <div className="result-container">
            <span>You asked:</span>
            <strong>{' '}{submitted}</strong>
          </div>
        )}
        
        {ticketResponse && (
          <div className="response-container">
            <div className="response-header">
              <div className="response-metadata">
                <span className="priority-tag">Priority: {ticketResponse.assigned_priority}</span>
                <span className="category-tag">Category: {ticketResponse.assigned_category}</span>
                {/* <span className="routed-tag">Routed to: {ticketResponse.routed_to}</span> */}
                {ticketResponse.ai_dispatch && (
                  <span className="dispatch-tag">Dispatch: Ardence suggests assigning to: James</span>
                )}
              </div>
            </div>
            
            <div className="response-body" style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div className="justification-section">
                <h3>Analysis</h3>
                <p>{ticketResponse.justification}</p>
                <p>Scheduling reason: Both James and Dakota are responsible for M365. Dakota is booked till 8am tomorrow, James is open 2–5pm today. Assigning to James.</p>
              </div>
              <div className="scheduling-section">
                <h3>Scheduling</h3>
                <p>Assigned to James (available today 2–5pm). Please schedule via TimeZest.</p>
              </div>
              <div className="timezest-section" style={{ marginTop: '20px', textAlign: 'center' }}>
                <motion.button
                  className="timezest-btn"
                  variants={buttonVariants}
                  whileHover="hover"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FiLink /> Send TimeZest Request
                </motion.button>
              </div>
            </div>
            <div className="answer-section" style={{ 
              backgroundColor: '#fff', 
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              color: '#000000'
            }}>
              <h3>Ticket Answer</h3>
              <p style={{ color: '#000000' }}>{ticketResponse?.answer}</p>
              <p style={{ color: '#000000' }}>Source: Mark Construction Onboarding Process <a href="https://support.microsoft.com/excel-setup" style={{ color: '#2563eb', textDecoration: 'underline' }}>[1]</a>, M365 Onboarding Guide <a href="https://support.microsoft.com/m365-guide" style={{ color: '#2563eb', textDecoration: 'underline' }}>[2]</a></p>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}

export default App;
