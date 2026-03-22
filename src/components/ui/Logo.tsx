import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
  showText?: boolean;
}

export const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, size = 'md', linkTo = '/' }, ref) => {
    const sizeClasses = {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
    };

    const content = (
      <div ref={ref} className={cn('flex items-center justify-center', className)}>
        <span className={cn('font-display font-bold text-foreground', sizeClasses[size])}>
          Bookify
        </span>
      </div>
    );

    if (linkTo) {
      return <Link to={linkTo}>{content}</Link>;
    }

    return content;
  }
);
Logo.displayName = 'Logo';
