import React from 'react';
import { ButtonProps } from '../types';
import { ButtonSpinner } from './LoadingSpinner';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  className = '',
  children
}) => {
  const getVariantClasses = (variant: ButtonProps['variant']) => {
    const baseClasses = 'font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300`;
      case 'secondary':
        return `${baseClasses} bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-400`;
      case 'destructive':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300`;
      case 'ghost':
        return `${baseClasses} bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-400`;
      default:
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300`;
    }
  };

  const getSizeClasses = (size: ButtonProps['size']) => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm rounded-md';
      case 'lg':
        return 'px-6 py-3 text-lg rounded-lg';
      case 'md':
      default:
        return 'px-4 py-2 text-sm rounded-md';
    }
  };

  const isDisabled = disabled || loading;
  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`${variantClasses} ${sizeClasses} ${className}`}
    >
      {loading && <ButtonSpinner />}
      {children}
    </button>
  );
};

// Icon Button variant
export const IconButton: React.FC<ButtonProps & { icon?: React.ReactNode }> = ({
  icon,
  children,
  ...props
}) => {
  return (
    <Button {...props}>
      {icon}
      {children}
    </Button>
  );
};

// Button Group
export const ButtonGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`inline-flex rounded-md shadow-sm ${className}`} role="group">
      {children}
    </div>
  );
};

// Link Button
export const LinkButton: React.FC<ButtonProps & { href?: string }> = ({
  href,
  ...props
}) => {
  if (href) {
    return (
      <a href={href} className="inline-block">
        <Button {...props} />
      </a>
    );
  }
  return <Button {...props} />;
};