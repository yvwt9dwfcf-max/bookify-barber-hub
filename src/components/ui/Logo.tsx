import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
  showText?: boolean;
}

export const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, size = 'md', linkTo = '/', showText = true }, ref) => {
    const sizeClasses = {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-4xl',
    };

    const imgSizes = {
      sm: 28,
      md: 36,
      lg: 52,
    };

    const content = (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        <img src={logoImg} alt="Bookify" width={imgSizes[size]} height={imgSizes[size]} className="rounded-lg" />
        {showText && (
          <span className={cn('font-display font-bold text-foreground', sizeClasses[size])}>
            Bookify
          </span>
        )}
      </div>
    );

    if (linkTo) {
      return <Link to={linkTo}>{content}</Link>;
    }

    return content;
  }
);
Logo.displayName = 'Logo';
