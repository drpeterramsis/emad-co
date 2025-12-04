
import React from 'react';

interface LoadingProps {
  fullScreen?: boolean;
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({ fullScreen = false, text }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-[var(--color-bg-soft)] rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-[var(--color-primary)] rounded-full animate-spin border-t-transparent"></div>
      </div>
      {text && <p className="text-[var(--color-primary)] font-medium animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="flex justify-center p-4">{content}</div>;
};

export default Loading;
