'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">문제가 발생했습니다</h2>
            <p className="text-slate-500 mb-6">앱 사용 중 오류가 감지되었습니다.</p>

            <div className="w-full max-w-md bg-slate-100 p-4 rounded-xl mb-8 text-left overflow-auto max-h-60 border border-slate-200">
                <p className="font-mono text-xs text-red-600 break-all whitespace-pre-wrap">
                    {error.message || JSON.stringify(error)}
                </p>
                {error.digest && (
                    <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-200 pt-2">
                        ID: {error.digest}
                    </p>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                    새로고침
                </button>
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
                >
                    다시 시도
                </button>
            </div>
        </div>
    );
}
