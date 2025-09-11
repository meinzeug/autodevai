import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

export function Card({
  variant = 'default',
  className,
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white bg-gray-800',
    bordered: 'bg-white bg-gray-800 border border-gray-200 border-gray-700',
    elevated: 'bg-white bg-gray-800 shadow-lg',
  };

  return (
    <div
      className={cn('rounded-lg p-6', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}