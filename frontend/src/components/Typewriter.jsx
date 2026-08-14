import React, { useState, useEffect } from 'react';

/**
 * Typewriter Component
 * Sequences printing of letters to create a vintage typewriter animation.
 * 
 * Props:
 *   - text: The string to type out.
 *   - speed: Typing speed per character in ms.
 *   - delay: Pre-animation delay in ms.
 *   - className: Custom classes for styling.
 */
const Typewriter = ({ text, speed = 60, delay = 100, className = "" }) => {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (index >= text.length) return;
    
    const timer = setTimeout(() => {
      setIndex((prev) => prev + 1);
    }, speed);
    
    return () => clearTimeout(timer);
  }, [started, index, text, speed]);

  return (
    <span className={className}>
      {text.substring(0, index)}
      {index < text.length && (
        <span className="animate-ping bg-emerald-500 w-1.5 h-4 inline-block ml-0.5 align-middle" />
      )}
    </span>
  );
};

export default Typewriter;
