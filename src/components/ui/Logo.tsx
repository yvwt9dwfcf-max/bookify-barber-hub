import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
  showText?: boolean;
}

export function Logo({ className, size = 'md', linkTo = '/', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const imgSizes = {
    sm: 56,
    md: 64,
    lg: 96,
  };

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
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
