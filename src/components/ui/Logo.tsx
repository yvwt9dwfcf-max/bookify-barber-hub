import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
  showText?: boolean;
  align?: 'left' | 'center';
}

export const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, size = 'md', linkTo = '/', align = 'left' }, ref) => {
    const sizeClasses = {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    };

    const content = (
      <div ref={ref} className={cn(
        'flex items-center',
        align === 'center' ? 'justify-center w-full' : 'justify-start',
        className
      )}>
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
