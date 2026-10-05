export default function LoadingDots({ label = '처리 중' }) {
    return (
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
            <div className="flex space-x-1">
                <div className="loading-dot w-3 h-3 bg-blue-500 rounded-full" style={{ animationDelay: '0s' }}></div>
                <div className="loading-dot w-3 h-3 bg-blue-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                <div className="loading-dot w-3 h-3 bg-blue-500 rounded-full" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-gray-400 font-bold text-base">
                {label}
            </span>
            <style jsx>{`
                .loading-dot {
                    animation: loading-bounce 1s infinite;
                }
                @keyframes loading-bounce {
                    0%, 100% { transform: translateY(4px); }
                    50% { transform: translateY(-12px); }
                }
            `}</style>
        </div>
    );
}
