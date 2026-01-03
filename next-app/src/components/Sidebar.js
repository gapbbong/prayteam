'use client';

export default function Sidebar({
    isOpen,
    onClose,
    user,
    isDarkMode,
    onToggleDarkMode,
    onLogout,
    isGuestMode,
    currentGroup,
    onShareGroup,
    onOpenNotificationSettings,
    isCurrentGroupNotiEnabled,
    onCaptureImage,
    currentMember,
    currentView
}) {
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed top-0 right-0 h-full w-60 bg-white dark:bg-black shadow-2xl z-50 overflow-y-auto
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="닫기"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="p-6 pt-16 space-y-6">
                    {/* User Info */}
                    <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {user?.name?.[0] || '?'}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-800 dark:text-white">{user?.name || '게스트'}님</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">{user?.id || '환영합니다'}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right">v3.9.2</p>
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-2">
                        {/* Share Group (조건부) */}
                        {currentGroup && !isGuestMode && (
                            <button
                                onClick={() => {
                                    onShareGroup();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">📤</span>
                                <div className="flex-1 text-left">
                                    <span className="font-bold text-slate-700 dark:text-slate-100 block">그룹 공유</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">{currentGroup.name}</span>
                                </div>
                            </button>
                        )}

                        {/* Notification Settings (조건부) */}
                        {currentGroup && !isGuestMode && (
                            <button
                                onClick={() => {
                                    onOpenNotificationSettings();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">
                                    {isCurrentGroupNotiEnabled ? '🔔' : '🔕'}
                                </span>
                                <div className="flex-1 text-left">
                                    <span className="font-bold text-slate-700 dark:text-slate-100 block">알림 설정</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                        {isCurrentGroupNotiEnabled ? '알림 켜짐' : '알림 꺼짐'}
                                    </span>
                                </div>
                            </button>
                        )}

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={onToggleDarkMode}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">
                                {isDarkMode ? '☀️' : '🌙'}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-100">
                                {isDarkMode ? '라이트 모드' : '다크 모드'}
                            </span>
                        </button>

                        {/* Image Capture (항상 노출, 클릭 시 내부 로직으로 제어) */}
                        <button
                            onClick={() => {
                                onCaptureImage();
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform">📸</span>
                            <div className="flex-1 text-left">
                                <span className="font-bold text-slate-700 dark:text-slate-100 block">이미지로 공유</span>
                                <span className="text-xs text-slate-400 dark:text-slate-500">기도 노트 저장</span>
                            </div>
                        </button>

                    </div>

                    {/* Logout */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        {isGuestMode ? (
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all font-bold group hover:shadow-md"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">🔑</span>
                                <span>로그인하기</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    onLogout();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all font-bold group hover:shadow-md"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">🚪</span>
                                <span>로그아웃</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
