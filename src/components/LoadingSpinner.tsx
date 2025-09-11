import React from 'react';
import { LoadingSpinnerProps } from '../types';

const SpinnerDefault: React.FC<{ size: string; className: string }> = ({ size, className }) => (
  <div
    className={`${size} border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin ${className}`}
    role="status"
    aria-hidden="true"
  />
);

const SpinnerDots: React.FC<{ size: string; className: string }> = ({ size, className }) => {
  const dotSize = size.includes('w-4') ? 'w-2 h-2' : size.includes('w-6') ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div className={`flex space-x-1 ${className}`} role="status" aria-hidden="true">
      <div className={`${dotSize} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`${dotSize} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`${dotSize} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

const SpinnerPulse: React.FC<{ size: string; className: string }> = ({ size, className }) => (
  <div
    className={`${size} bg-blue-500 rounded-full animate-pulse ${className}`}
    role="status"
    aria-hidden="true"
  />
);

const SpinnerRing: React.FC<{ size: string; className: string }> = ({ size, className }) => (
  <div className={`relative ${size} ${className}`} role="status" aria-hidden="true">
    <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
    <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
    <div 
      className="absolute inset-2 border-4 border-transparent border-b-blue-400 rounded-full animate-spin" 
      style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
    ></div>
  </div>
);

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  variant = 'default',
  text,
  className = '',
  children
}) => {
  const getSizeClasses = (size: LoadingSpinnerProps['size']) => {
    switch (size) {
      case 'small':
      case 'sm':
        return 'w-4 h-4';
      case 'large':
      case 'lg':
        return 'w-12 h-12';
      case 'medium':
      case 'md':
      default:
        return 'w-6 h-6';
    }
  };

  const sizeClass = getSizeClasses(size);

  const renderSpinner = () => {
    const spinnerClassName = '';
    
    switch (variant) {
      case 'dots':
        return <SpinnerDots size={sizeClass} className={spinnerClassName} />;
      case 'pulse':
        return <SpinnerPulse size={sizeClass} className={spinnerClassName} />;
      case 'ring':
        return <SpinnerRing size={sizeClass} className={spinnerClassName} />;
      case 'default':
      default:
        return <SpinnerDefault size={sizeClass} className={spinnerClassName} />;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
      case 'sm':
        return 'text-xs';
      case 'large':
      case 'lg':
        return 'text-lg';
      case 'medium':
      case 'md':
      default:
        return 'text-sm';
    }
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={text || 'Loading'}
    >
      {renderSpinner()}
      
      {text && (
        <div className={`${getTextSize()} text-gray-600 font-medium`}>
          {text}
        </div>
      )}
      
      {children && (
        <div className="text-center">
          {children}
        </div>
      )}
    </div>
  );
};

// Overlay Loading Spinner for full-screen loading
export const LoadingOverlay: React.FC<{
  isVisible: boolean;
  text?: string;
  variant?: LoadingSpinnerProps['variant'];
}> = ({ isVisible, text = 'Loading...', variant = 'ring' }) => {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Loading dialog"
    >
      <div className="bg-white rounded-lg p-8 shadow-xl">
        <LoadingSpinner
          size="large"
          variant={variant}
          text={text}
        />
      </div>
    </div>
  );
};

// Inline Loading Spinner for content areas
export const InlineLoader: React.FC<{
  text?: string;
  size?: LoadingSpinnerProps['size'];
}> = ({ text = 'Loading...', size = 'small' }) => {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner
        size={size}
        variant="dots"
        text={text}
      />
    </div>
  );
};

// Button Loading Spinner
export const ButtonSpinner: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div
      className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-hidden="true"
    />
  );
};

export default LoadingSpinner;