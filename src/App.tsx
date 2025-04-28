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
  Cybersec: { name: "Cyber Security", description: "An agent for all your Cybersecurity Needs!" },
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
    "Ask anything...",
    "How do I set up a SoC Network in Azure?",
    "How do I speed up my internet?",
    "How do I select the odd columns in Microsoft Excel?",
    "How do I set up a SoC Network in AWS?",
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
        <h1 className="hero-title">What do you want to know?</h1>
        
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
              <div className="tool-icons">
                <button type="button" className="icon-btn" title="Settings">
                  <FiSettings />
                </button>
                <button type="button" className="icon-btn" title="Add feature">
                  <FiPlus />
                </button>
                <button type="button" className="icon-btn" title="Attach link">
                  <FiLink />
                </button>
                <button type="button" className="icon-btn" title="Voice input">
                  <FiMic />
                </button>
              </div>
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
              <div className="priority-radio-row">
                <Tooltip title="Select your priority" placement="bottom">
                  <div className="priority-label">
                    Priority
                  </div>
                </Tooltip>
                <Radio.Group
                  options={[
                    { label: 'Low', value: 'P0' },
                    { label: 'Medium', value: 'P1' },
                    { label: 'High', value: 'P2' },
                  ]}
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                  className="priority-radio"
                />
              </div>
              <motion.button
                className="submit-btn"
                variants={buttonVariants}
                whileHover="hover"
                type="submit"
              >
                Answer
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
                <span className="routed-tag">Routed to: {ticketResponse.routed_to}</span>
              </div>
            </div>
            
            <div className="response-body">
              <div className="justification-section">
                <h3>Analysis</h3>
                <p>{ticketResponse.justification}</p>
              </div>
              
              <div className="answer-section">
                <h3>Answer</h3>
                <p>{ticketResponse?.answer}</p>
              </div>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}

export default App;
