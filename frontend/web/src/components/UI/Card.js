import React from 'react';
import { motion } from 'framer-motion';
import './Card.css';

const Card = ({ 
  children, 
  className = '', 
  variant = 'glass',
  hover = true,
  glow = false,
  ...props 
}) => {
  const baseClasses = 'card';
  const variantClasses = {
    glass: 'glass-card',
    solid: 'solid-card',
    outline: 'outline-card'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    hover && 'card-hover',
    glow && 'card-glow',
    className
  ].filter(Boolean).join(' ');

  const cardProps = hover ? {
    whileHover: { 
      scale: 1.02,
      y: -5,
      transition: { duration: 0.2 }
    },
    transition: { duration: 0.3 }
  } : {};

  return (
    <motion.div
      className={classes}
      {...cardProps}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;