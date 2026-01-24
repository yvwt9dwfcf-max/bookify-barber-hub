import { Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
}

export function Logo({ className, size = 'md', linkTo = '/' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 36,
  };

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
        <div className="relative bg-primary rounded-full p-2">
          <Scissors className="text-primary-foreground" size={iconSizes[size]} />
        </div>
      </div>
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
