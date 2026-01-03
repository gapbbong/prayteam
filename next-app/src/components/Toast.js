'use client';

export default function Toast({ message, type = 'success', onClose }) {
    const typeStyles = {
        success: 'bg-white/80 border-blue-100 text-blue-800',
        error: 'bg-red-50/80 border-red-100 text-red-800',
        info: 'bg-white/80 border-slate-100 text-slate-800'
    };

    const icons = {
        success: (
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in fade-in zoom-in-95 duration-300">
            <div className={`px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 min-w-[320px] max-w-[90vw] ${typeStyles[type]}`}>
                <div className="flex-shrink-0 bg-white/50 p-1.5 rounded-xl shadow-sm">
                    {icons[type]}
                </div>
                <p className="text-sm font-bold tracking-tight flex-grow leading-tight">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
