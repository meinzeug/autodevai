import React from 'react';
import { ButtonProps } from '../types';
import { ButtonSpinner } from './LoadingSpinner';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
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
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300`;
      case 'success':
        return `${baseClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300`;
      case 'ghost':
        return `${baseClasses} bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-400`;
      default:
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300`;
    }
  };

  const getSizeClasses = (size: ButtonProps['size']) => {
    switch (size) {
      case 'small':
        return 'px-3 py-1.5 text-sm rounded-md';
      case 'large':
        return 'px-6 py-3 text-lg rounded-lg';
      case 'medium':
      default:
        return 'px-4 py-2 text-sm rounded-md';
    }
  };

  const isDisabled = disabled || loading;
  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled && onClick) {
      onClick(event);
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2
        ${variantClasses}
        ${sizeClasses}
        ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
        ${className}
      `}
      aria-disabled={isDisabled}
      aria-busy={loading}
    >
      {loading && (
        <ButtonSpinner className="mr-1" />
      )}
      
      {children}
    </button>
  );
};

// Icon Button variant
export const IconButton: React.FC<{
  icon: React.ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  'aria-label': string;
}> = ({
  icon,
  variant = 'ghost',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  'aria-label': ariaLabel
}) => {
  const getSizeClasses = (size: ButtonProps['size']) => {
    switch (size) {
      case 'small':
        return 'p-1.5';
      case 'large':
        return 'p-3';
      case 'medium':
      default:
        return 'p-2';
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      className={`${getSizeClasses(size)} ${className}`}
      aria-label={ariaLabel}
    >
      {!loading && icon}
    </Button>
  );
};

// Button Group component
export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div 
      className={`inline-flex rounded-md shadow-sm ${className}`}
      role="group"
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const isFirst = index === 0;
          const isLast = index === React.Children.count(children) - 1;
          
          return React.cloneElement(child as React.ReactElement<any>, {
            className: `
              ${(child.props as any).className || ''}
              ${!isFirst ? '-ml-px' : ''}
              ${isFirst ? 'rounded-r-none' : isLast ? 'rounded-l-none' : 'rounded-none'}
              focus:z-10
            `.trim()
          });
        }
        return child;
      })}
    </div>
  );
};

// Link Button (appears as button but functions as link)
export const LinkButton: React.FC<{
  href: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  disabled?: boolean;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({
  href,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  external = false,
  className = '',
  children
}) => {
  const getVariantClasses = (variant: ButtonProps['variant']) => {
    const baseClasses = 'font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center gap-2 no-underline';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300`;
      case 'secondary':
        return `${baseClasses} bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-400`;
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300`;
      case 'success':
        return `${baseClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300`;
      case 'ghost':
        return `${baseClasses} bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-400`;
      default:
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300`;
    }
  };

  const getSizeClasses = (size: ButtonProps['size']) => {
    switch (size) {
      case 'small':
        return 'px-3 py-1.5 text-sm rounded-md';
      case 'large':
        return 'px-6 py-3 text-lg rounded-lg';
      case 'medium':
      default:
        return 'px-4 py-2 text-sm rounded-md';
    }
  };

  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);

  const buttonClasses = `
    ${variantClasses}
    ${sizeClasses}
    ${disabled ? 'pointer-events-none opacity-60 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  const linkProps = external ? {
    target: '_blank',
    rel: 'noopener noreferrer'
  } : {};

  return (
    <a
      href={disabled ? undefined : href}
      className={buttonClasses}
      aria-disabled={disabled}
      {...linkProps}
    >
      {children}
      {external && !disabled && (
        <svg 
          className="w-4 h-4 ml-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </a>
  );
};

export default Button;