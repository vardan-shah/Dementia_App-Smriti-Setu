import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    
    // Elder-friendly sizing (large tap targets)
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base min-h-[48px]', // Minimum 48px for accessibility
      lg: 'px-6 py-4 text-lg min-h-[56px]',
      xl: 'px-8 py-5 text-xl min-h-[64px]', // Very large for elders
    };

    const variantClasses = {
      primary: 'bg-primary text-surface hover:bg-opacity-90 active:scale-95',
      secondary: 'bg-secondary text-surface hover:bg-opacity-90 active:scale-95',
      outline: 'border-2 border-primary text-primary hover:bg-surface-dark active:scale-95',
      ghost: 'hover:bg-surface-dark text-primary active:scale-95',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-4 focus:ring-accent focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
