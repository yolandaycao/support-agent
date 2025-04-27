// src/App.tsx
import React from 'react';
import { motion, useAnimate, stagger } from 'framer-motion';
import './App.css';
import myPhoto from './pfp.png';

const heroVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
};

const buttonVariants = {
  hover: { scale: 1.1, backgroundColor: "#2563eb", color: "#fff" }
};

function App() {
  const [scope, animate] = useAnimate();

  const handleButtonClick = async () => {
    // Much cooler sequence animation
    await animate([
      // First animate letters upward with stagger
      [".hero-title span", { y: -48, opacity: 0 }, { duration: 0.2, delay: stagger(0.05) }],
      // Then animate the button
      [".cta-btn", { scale: 0.8, opacity: 0 }, { duration: 0.3 }],
      // Then animate the whole hero section
      [".hero", { scale: 1.2, opacity: 0, y: -30 }, { duration: 0.5 }]
    ]);
  };

  return (
    <div ref={scope} className="app-bg">
      <motion.section
        className="hero"
        initial="hidden"
        animate="visible"
        variants={heroVariants}
      >
        <h1 className="hero-title">
          {Array.from("Looking to Join a Project").map((letter, i) => (
            <span key={i}>{letter}</span>
          ))}
        </h1>
        <img src={myPhoto} />
        <p className="hero-subtitle">
          Hi, my name is Joshua Shongwe. <br />
          I specialize in Typescript Programming and Front End Software Development. <br />
          I developed this landing page yesterday as a starter for today's AI Jam hackathon.
        </p>
        <motion.button
          className="cta-btn"
          variants={buttonVariants}
          whileHover="hover"
          onClick={handleButtonClick}
        >
          Let's Get to Work!
        </motion.button>
      </motion.section>
    </div>
  );
}

export default App;
