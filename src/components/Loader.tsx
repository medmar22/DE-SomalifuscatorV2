import React from 'react';

interface LoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string; // Allow passing custom classes
}

function Loader({ text, size = 'md', className = '' }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-transparent border-solid ${sizeClasses[size]} border-teal-400`}
        role="status"
      >
         <span className="sr-only">Loading...</span>
      </div>
      {text && <p className="mt-2 text-sm text-gray-300">{text}</p>}
    </div>
  );
}

export default Loader;