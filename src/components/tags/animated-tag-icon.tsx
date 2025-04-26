"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface AnimatedTagIconProps {
  color?: string;
  size?: number;
  className?: string;
}

export function AnimatedTagIcon({
  color = "#2196F3",
  size = 48,
  className = "",
}: AnimatedTagIconProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ rotate: 0 }}
      animate={isHovered ? { rotate: [0, -10, 10, -5, 5, 0], scale: 1.1 } : {}}
      transition={{ duration: 0.5 }}
    >
      <motion.path
        d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
        stroke={color}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ 
          duration: 1.5,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
          repeatDelay: 0.5
        }}
      />
      <motion.circle
        cx="7"
        cy="7"
        r="2"
        stroke={color}
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ 
          scale: isHovered ? [0.8, 1.2, 0.8] : 0.8,
          opacity: isHovered ? [0.5, 1, 0.5] : 0.5
        }}
        transition={{ 
          duration: 0.8,
          repeat: isHovered ? Infinity : 0,
          repeatType: "reverse"
        }}
      />
    </motion.svg>
  );
}