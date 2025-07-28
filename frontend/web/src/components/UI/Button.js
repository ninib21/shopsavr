import React from 'react';
import { motion } from 'framer-motion';
import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  className = '', 
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props 
}) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'neon-button',
    secondary: 'neon-outline-button',
    ghost: 'btn-ghost',
    danger: 'btn-danger'
  };
  
  const sizeClasses = {
    small: 'btn-sm',
    medium: 'btn-md',
    large: 'btn-lg'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled && 'btn-disabled',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <motion.button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {loading && (
        <div className="btn-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      )}
      <span className={loading ? 'btn-content-hidden' : 'btn-content'}>
        {children}
      </span>
    </motion.button>
  );
};

export default Button;