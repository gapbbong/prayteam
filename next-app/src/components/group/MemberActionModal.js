'use client';

import { useState, useEffect } from 'react';

export default function MemberActionModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    description,
    placeholder = "이름을 입력하세요",
    confirmText = "확인",
    cancelText = "취소",
    showInput = false,
    initialValue = "",
    icon = "👤"
}) {
    const [inputValue, setInputValue] = useState(initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setInputValue(initialValue);
            setIsSubmitting(false);
        }
    }, [isOpen, initialValue]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (showInput && !inputValue.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(showInput ? inputValue.trim() : true);
            onClose();
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto shadow-xl shadow-blue-500/20">
                        <span className="text-4xl">{icon}</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{title}</h2>
                    {description && (
                        <p className="text-slate-500 dark:text-slate-400 font-bold mt-3 leading-relaxed break-keep">
                            {description}
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {showInput && (
                        <div className="relative group">
                            <input
                                autoFocus
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={placeholder}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-lg font-bold text-slate-800 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                disabled={isSubmitting}
                            />
                            <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (showInput && !inputValue.trim())}
                            className="flex-[1.5] px-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="animate-pulse">처리 중...</span>
                                </span>
                            ) : confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
