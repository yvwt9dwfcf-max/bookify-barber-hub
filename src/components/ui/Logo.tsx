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
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
    };

    const imgSizes = {
      sm: 48,
      md: 72,
      lg: 96,
    };

    const content = (
      <div ref={ref} className={cn('flex items-center gap-3', className)}>
        <img
          src={logoImg}
          alt="Bookify"
          width={imgSizes[size]}
          height={imgSizes[size]}
          className="rounded-lg"
          loading="lazy"
          decoding="async"
        />
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
