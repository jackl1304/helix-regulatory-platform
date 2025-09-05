import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  showSubtext?: boolean;
  className?: string;
  linkTo?: string;
}

export function Logo({ 
  size = "medium", 
  showText = true, 
  showSubtext = false, 
  className,
  linkTo = "/" 
}: LogoProps) {
  const sizeClasses = {
    small: "h-24 w-24",
    medium: "h-36 w-36", 
    large: "h-48 w-48"
  };

  const textSizeClasses = {
    small: "text-sm",
    medium: "text-lg",
    large: "text-xl"
  };

  const content = (
    <div className={cn("flex items-center", className)}>
      {/* HELIX LOGO - IMMER SICHTBAR! */}
      <div className={cn(sizeClasses[size], "flex-shrink-0")}>
        <img 
          src="/helix-logo-final.jpg" 
          alt="Helix DNA Logo by Deltaways" 
          className="w-full h-full object-contain rounded-lg"
          style={{ display: 'block', minWidth: '40px', minHeight: '40px' }}
        />
      </div>
      
      {showText && (
        <div className="ml-3">
          <h1 className={cn(
            "font-bold text-gray-900 dark:text-gray-100",
            textSizeClasses[size]
          )}>
            Helix
          </h1>
          {showSubtext && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Regulatory Intelligence
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo}>
        <div className="cursor-pointer hover:opacity-80 transition-opacity">
          {content}
        </div>
      </Link>
    );
  }

  return content;
}

// Preset logo components for common use cases
export function HeaderLogo() {
  return (
    <Logo 
      size="medium" 
      showText={false} 
      showSubtext={false}
      className="hover:opacity-80 transition-opacity"
    />
  );
}

export function SidebarLogo() {
  return (
    <Logo 
      size="medium" 
      showText={false} 
      showSubtext={false}
      className="max-w-[180px] max-h-[180px]"
    />
  );
}

export function CompactLogo() {
  return (
    <Logo 
      size="small" 
      showText={true} 
      showSubtext={false}
    />
  );
}

export function FullLogo() {
  return (
    <Logo 
      size="large" 
      showText={true} 
      showSubtext={true}
      className="text-center"
    />
  );
}