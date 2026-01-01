export default function LoadingDots({ label = '처리 중' }) {
    return (
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
            <div className="flex space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-gray-400 font-bold text-sm">
                {label}
            </span>
        </div>
    );
}
