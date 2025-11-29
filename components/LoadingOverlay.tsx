
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4 text-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
        <div>
          <h3 className="text-lg font-bold text-slate-800">Processing</h3>
          <p className="text-slate-500 text-sm mt-1">Please wait while we update your records...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
