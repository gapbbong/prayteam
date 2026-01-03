'use client';

import { useState, useEffect } from 'react';
import { gasClient } from '@/lib/gasClient';

export default function NotificationSettingsModal({ isOpen, onClose, groupName, groupId, user, onStatusChange }) {
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('default');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && isOpen) {
            setPermissionStatus(Notification.permission);
            // Check LocalStorage
            const stored = localStorage.getItem(`prayteam_noti_${groupId}`);
            if (stored === 'true' && Notification.permission === 'granted') {
                setIsEnabled(true);
                if (onStatusChange) onStatusChange(true);
            } else {
                setIsEnabled(false);
                if (onStatusChange) onStatusChange(false);
            }
        }
    }, [groupId, isOpen]); // isOpen이 true가 될 때 초기 동기화

    const handleToggle = async () => {
        if (loading) return;

        const previousState = isEnabled;
        const newState = !previousState;

        // 0. 즉각적인 상태 반영 (Optimistic + LocalStorage 반영)
        setIsEnabled(newState);
        if (onStatusChange) onStatusChange(newState);

        if (newState) {
            localStorage.setItem(`prayteam_noti_${groupId}`, 'true');
        } else {
            localStorage.removeItem(`prayteam_noti_${groupId}`);
        }

        if (!previousState) {
            // Turning ON
            setLoading(true);
            try {
                // 1. Request Permission
                const permission = await Notification.requestPermission();
                setPermissionStatus(permission);

                if (permission !== 'granted') {
                    alert('알림 권한이 허용되지 않았습니다. 브라우저 설정에서 알림을 허용해주세요.');
                    setIsEnabled(false);
                    if (onStatusChange) onStatusChange(false);
                    localStorage.removeItem(`prayteam_noti_${groupId}`);
                    setLoading(false);
                    return;
                }

                // 2. SW 준비 대기
                try {
                    await Promise.race([
                        navigator.serviceWorker.ready,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('SW Timeout')), 3000))
                    ]);
                } catch (swError) {
                    console.warn('ServiceWorker ready timeout or error:', swError);
                }
            } catch (error) {
                console.error('Notification Subscribe Error:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 pb-4">
                    <div className="text-center mb-8">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border transition-all duration-500 shadow-sm relative ${isEnabled ? 'bg-yellow-100 border-yellow-200 rotate-0' : 'bg-slate-100 border-slate-200'}`}>
                            <svg
                                className={`w-10 h-10 transition-all duration-500 ${isEnabled ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400 fill-none'}`}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                {!isEnabled && (
                                    <line
                                        x1="1" y1="1" x2="23" y2="23"
                                        className="stroke-slate-500 animate-in fade-in duration-500"
                                        strokeWidth="2.5"
                                    />
                                )}
                            </svg>
                            {isEnabled && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
                                </span>
                            )}
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">알림 설정</h3>
                        <p className="text-sm font-medium text-slate-400 mt-2">{groupName}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:bg-slate-100/50">
                        <div className="flex-1 pr-4">
                            <p className="font-bold text-slate-700 text-base mb-1">새 기도제목 알림</p>
                            <p className="text-xs text-slate-400 leading-relaxed">기도팀원들의 따끈따끈한 기도제목<br />알림을 즉시 받아보세요!</p>
                        </div>
                        <button
                            onClick={handleToggle}
                            disabled={loading}
                            className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-in-out focus:outline-none shadow-inner ${isEnabled ? 'bg-blue-500 shadow-blue-200' : 'bg-slate-300 shadow-slate-200'}`}
                        >
                            <span
                                className={`absolute top-1 left-1 w-6 h-6 transform bg-white rounded-full shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                </div>

                <div className="p-6 pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-200"
                    >
                        설정 완료
                    </button>
                    <p className="text-[10px] text-slate-300 text-center mt-4">언제든지 브라우저 설정에서 알림을 끌 수 있습니다.</p>
                </div>
            </div>

            <style jsx>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
