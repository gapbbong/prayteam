'use client';

import { useState, useEffect } from 'react';

export default function ErrorOverlay() {
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleError = (e) => {
            setError(e.detail || e.message);
            // Auto hide after 10 seconds
            setTimeout(() => setError(null), 10000);
        };

        window.addEventListener('app-error', handleError);
        window.addEventListener('error', (e) => handleError(e));

        return () => {
            window.removeEventListener('app-error', handleError);
        };
    }, []);

    if (!error) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-red-500 text-white p-4 rounded-xl shadow-2xl border-2 border-red-400 flex items-start space-x-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">Error Detected</h4>
                    <p className="text-red-50 text-sm break-all font-mono bg-black/10 p-2 rounded">
                        {error}
                    </p>
                    <p className="mt-2 text-xs text-red-200 italic">
                        Please screenshot this screen and send it to the developer.
                    </p>
                </div>
                <button
                    onClick={() => setError(null)}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
