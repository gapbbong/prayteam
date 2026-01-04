'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { gasClient } from '@/lib/gasClient';

const STATUS_OPTIONS = [
    { id: '기대중', label: '⏳ 기대중', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: '응답됨', label: '✅ 응답됨', color: 'bg-green-100 text-green-700 border-green-200' },
    { id: '다른 방향으로 이끌심', label: '🕊️ 다른 방향으로 이끌심', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: '거절하심', label: '❌ 거절하심', color: 'bg-red-100 text-red-700 border-red-200' },
];

export default function PrayerNote({
    prayers = [],
    responses = [],
    comments = [],
    dates = [],
    visibilities = [],
    memberName = '',
    metadata = null, // Array of { groupName, memberName } for View All mode
    onUpdateStatus,
    onSaveComment,
    onAddPrayer,
    onEditPrayer,
    onSave,
    hasUnsavedChanges = false,
    isSaving = false,
    isReadOnly = false,
    isCapturing = false
}) {
    // Accordion State: storing index of currently expanded item
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [tempPrayerText, setTempPrayerText] = useState('');
    const [tempComment, setTempComment] = useState('');
    const textareaRef = useRef(null);

    // Auto-expand textarea height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [tempPrayerText, expandedIndex]);
    const [newPrayerText, setNewPrayerText] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const allPrayers = prayers.map((p, i) => ({
        text: p,
        index: i,
        response: responses[i],
        comment: comments[i],
        date: dates[i],
        meta: metadata ? metadata[i] : null
    }));

    const activePrayers = allPrayers.filter(item => {
        const isLegacyHidden = item.response === '보관됨' || item.response === '숨김';
        const isNewHidden = visibilities[item.index] === 'Hidden';
        return !(isLegacyHidden || isNewHidden);
    });

    const archivedPrayers = allPrayers.filter(item => {
        const isLegacyHidden = item.response === '보관됨' || item.response === '숨김';
        const isNewHidden = visibilities[item.index] === 'Hidden';
        return isLegacyHidden || isNewHidden;
    });

    const visiblePrayers = showArchived ? archivedPrayers : activePrayers;

    const handleExpand = (originalIndex, text, comment) => {
        if (expandedIndex === originalIndex) {
            setExpandedIndex(null); // Collapse
        } else {
            setExpandedIndex(originalIndex);
            setTempPrayerText(text);
            setTempComment(comment || '');
        }
    };

    const handleAddSubmit = () => {
        if (!newPrayerText.trim()) return;
        onAddPrayer(newPrayerText);
        setNewPrayerText('');
    };

    const handlePrayerEditSubmit = (index) => {
        if (tempPrayerText.trim() !== prayers[index]) {
            onEditPrayer(index, tempPrayerText);
        }
    };

    const handleStatusChange = (index, statusId) => {
        onUpdateStatus(index, statusId);
    };

    const handleCommentSubmit = (index) => {
        onSaveComment(index, tempComment);
    };

    const handleArchive = (index) => {
        onUpdateStatus(index, '보관됨');
    };

    const handleRestore = (index) => {
        onUpdateStatus(index, '기대중');
    };

    // Helper: Robust Date Parser for Korean/GAS formats
    const parseSafeDate = (dateStr) => {
        if (!dateStr) return null;
        try {
            let cleanStr = String(dateStr).trim();
            // 2. Check for AM/PM
            let isPM = cleanStr.includes('오후') || cleanStr.includes('PM');
            let isAM = cleanStr.includes('오전') || cleanStr.includes('AM');

            // 3. Split Date and Time
            let [datePart, timePart] = cleanStr.split(/\s+(?:오전|오후|AM|PM)?\s*/);

            if (!timePart && cleanStr.includes(' ')) {
                const part = cleanStr.split(' ');
                datePart = part[0];
                timePart = part.slice(1).join(' ').replace(/(?:오전|오후|AM|PM)/, '').trim();
            }

            const separator = datePart.includes('.') ? '.' : '-';
            const [y, m, d] = datePart.split(separator).map(Number);

            if (!y || !m || !d) return null;

            let h = 0, min = 0, s = 0;
            if (timePart) {
                const [hStr, mStr, sStr] = timePart.split(':');
                h = parseInt(hStr) || 0;
                min = parseInt(mStr) || 0;
                s = parseInt(sStr) || 0;

                if (isPM && h < 12) h += 12;
                if (isAM && h === 12) h = 0;
            }

            return new Date(y, m - 1, d, h, min, s);
        } catch (e) {
            return null;
        }
    };

    // Helper: Robust Date Parser (Regex Improved)
    const parseSafeDateRegex = (dateStr) => {
        if (!dateStr) return null;
        try {
            const cleanStr = String(dateStr).trim();
            const dateRegex = /(\d{4})[./-\s.]+(\d{1,2})[./-\s.]+(\d{1,2})/;
            const match = cleanStr.match(dateRegex);
            if (!match) return null;

            const y = parseInt(match[1]);
            const m = parseInt(match[2]);
            const d = parseInt(match[3]);

            let h = 0, min = 0, s = 0;
            const isPM = cleanStr.includes('오후') || cleanStr.includes('PM');
            const isAM = cleanStr.includes('오전') || cleanStr.includes('AM');

            const timeMatch = cleanStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (timeMatch) {
                h = parseInt(timeMatch[1]);
                min = parseInt(timeMatch[2]);
                s = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
                if (isPM && h < 12) h += 12;
                if (isAM && h === 12) h = 0;
            }
            return new Date(y, m - 1, d, h, min, s);
        } catch (e) { return null; }
    };

    const getRelativeTime = (dateStr) => {
        const date = parseSafeDateRegex(dateStr);
        // Fallback: If parsing fails, return original string
        if (!date || isNaN(date.getTime())) return dateStr;

        const now = new Date();
        const diffMs = now - date;
        if (isNaN(diffMs)) return dateStr;

        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return '방금 전';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;

        const diffDays = Math.floor(diffSec / 86400);
        if (diffDays < 30) return `${diffDays}일 전`;
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths}개월 전`;
        return `${Math.floor(diffMonths / 12)}년 전`;
    };

    // Helper: Calculate relative time (DEPRECATED)
    const _deprecated_getRelativeTime = (dateStr) => {
        if (!dateStr) return '';

        try {
            // Parse "YYYY.MM.DD HH:mm:ss" or "YYYY.MM.DD"
            const [datePart, timePart] = dateStr.split(' ');
            const [y, m, d] = datePart.split('.').map(Number);

            let date;
            if (timePart) {
                // Handle "오전/오후" if present (GAS Format: yyyy.MM.dd a h:mm:ss)
                let [p1, p2, p3] = timePart.split(' ');
                let h, min, s;

                // If format is "HH:mm:ss"
                if (!p2) {
                    [h, min, s] = p1 ? p1.split(':').map(Number) : [0, 0, 0];
                } else {
                    // If format is "a h:mm:ss" (e.g. "오전 10:30:20")
                    // timePart might actually be passed as just "10:30:20" if split(' ') logic above was simple.
                    // But wait, split(' ') on "2024.01.01 오전 10:00" gives ["2024.01.01", "오전", "10:00"]
                    // Let's re-parse correctly below.
                }
                // Simpler re-parse logic inside try block:
                const fullStr = dateStr.replace('오전', 'AM').replace('오후', 'PM');
                const parsedDate = new Date(fullStr);
                if (!isNaN(parsedDate)) {
                    date = parsedDate;
                } else {
                    // Fallback to manual parse
                    const [hStr, mStr, sStr] = timePart.split(':');
                    h = parseInt(hStr) || 0;
                    min = parseInt(mStr) || 0;
                    s = parseInt(sStr) || 0;
                    date = new Date(y, m - 1, d, h, min, s);
                }
            } else {
                date = new Date(y, m - 1, d);
            }

            if (isNaN(date.getTime())) return ''; // Invalid Date check

            const now = new Date();
            const diffMs = now - date;

            if (isNaN(diffMs)) return ''; // Safety check

            const diffSec = Math.floor(diffMs / 1000);

            if (diffSec < 60) return '방금 전';
            if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
            if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;

            const diffDays = Math.floor(diffSec / 86400);
            if (diffDays < 30) return `${diffDays}일 전`;

            const diffMonths = Math.floor(diffDays / 30);
            if (diffMonths < 12) return `${diffMonths}개월 전`;

            return `${Math.floor(diffMonths / 12)}년 전`;
        } catch (e) {
            return dateStr;
        }
    };

    // Helper to group prayers by member for View All view
    const renderContent = () => {
        if (!metadata) {
            // Default View (Single Member) - Reduced spacing
            return (
                <div className="space-y-3">
                    {visiblePrayers.map((pObj, idx) =>
                        renderPrayerItem({
                            ...pObj,
                            localIndex: idx
                        })
                    )}
                </div>
            );
        }

        // View All Mode: Group by Member, and organize by Group
        const content = [];
        let lastGroupName = '';
        let lastMemberId = '';
        let memberItems = [];
        let memberPrayerCount = 0;
        let isFirstMemberInGroup = true;
        const pushMemberFooter = (items) => {
            // Find latest date among text strings or fallback to member update time
            let latestDate = '';
            let latestDateObj = new Date(0);

            // 1. Check individual prayer dates
            items.forEach(item => {
                const dStr = dates[item.index];
                if (dStr) {
                    const d = parseSafeDateRegex(dStr);
                    if (d && !isNaN(d) && d > latestDateObj) {
                        latestDateObj = d;
                        latestDate = dStr;
                    }
                }
            });

            // 2. If no valid prayer date, use member's updatedAt from metadata
            if (!latestDate && items.length > 0 && items[0].meta && items[0].meta.updatedAt) {
                // Always fallback to member update time even if parsing fails (getRelativeTime handles it)
                latestDate = items[0].meta.updatedAt;
            }

            if (latestDate) {
                content.push(
                    <div key={`date-${items[0].index}`} className="flex justify-end mt-1 mb-3 pr-1">
                        <span className="text-[10px] text-slate-400 font-medium">
                            {getRelativeTime(latestDate)}
                        </span>
                    </div>
                );
            } else {
                // content.push(<div key={`spacer-${items[0].index}`} className="mb-3"></div>);
            }
        };

        visiblePrayers.forEach((item, idx) => {
            const memberId = item.meta.memberName;
            const currentGroupName = item.meta.groupName;

            // Check for Group Change -> Flash previous member & Insert Divider
            if (currentGroupName !== lastGroupName) {
                if (memberItems.length > 0) {
                    pushMemberFooter(memberItems);
                    memberItems = [];
                }

                if (lastGroupName !== '') {
                    content.push(<div key={`divider-${currentGroupName}`} className="h-4" />);
                }
                lastGroupName = currentGroupName;
                lastMemberId = '';
                isFirstMemberInGroup = true;
            }

            if (memberId !== lastMemberId) {
                // If previous member had items, render their footer date
                if (lastMemberId !== '' && memberItems.length > 0) {
                    pushMemberFooter(memberItems);
                }

                // Reset for new member
                memberItems = [];
                lastMemberId = memberId;
                memberPrayerCount = 0;


                // New Member Section Header with Group Name (Only for first member)
                content.push(
                    <div key={`header-${memberId}-${item.meta.groupName}`} className="pt-8 mt-2 mb-4 border-t border-dashed border-slate-200 dark:border-slate-700 first:pt-0 first:mt-0 first:border-0">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-1">
                            <span className="text-xl font-black text-slate-800 dark:text-white tracking-tight pl-1">
                                {item.meta.memberName}
                                {isFirstMemberInGroup && (
                                    <span className={`text-sm font-bold ml-2 bg-gradient-to-r ${item.meta.gradientClass} bg-clip-text text-transparent`}>
                                        ({item.meta.groupName})
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                );
                isFirstMemberInGroup = false; // 이후 멤버는 표시 안 함
            }

            content.push(renderPrayerItem({ ...item, localIndex: memberPrayerCount }, true));
            memberItems.push(item);
            memberPrayerCount++;
        });

        // Flush last member
        if (memberItems.length > 0) {
            pushMemberFooter(memberItems);
        }

        // Spacing: Reduced to space-y-1 based on user feedback
        return <div className="space-y-1">{content}</div>;
    };

    const renderPrayerItem = ({ text, index, response, comment, date, meta, localIndex }, isCompact = false) => {
        const isExpanded = expandedIndex === index;

        return (
            <div
                key={index}
                className={`bg-white dark:bg-black rounded-2xl border border-slate-100 dark:border-slate-800 transition-all duration-300 overflow-hidden ${isExpanded
                    ? 'shadow-2xl ring-2 ring-blue-400 dark:ring-blue-500'
                    : 'shadow-md hover:shadow-lg'
                    }`}
            >
                {/* Header (Click to Expand) */}
                <div
                    onClick={() => handleExpand(index, text, comment)}
                    className={`${isCompact ? 'pl-0 pr-2 py-1' : 'p-4'} cursor-pointer select-none ${isExpanded ? 'pb-2' : ''}`}
                >
                    <div className="flex items-start gap-2">
                        {/* Number Badge */}
                        <span className={`text-2xl font-black mt-0.5 shrink-0 tabular-nums ${isExpanded ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`}>
                            {metadata ? localIndex + 1 : index + 1}.
                        </span>

                        <div className="flex-1">
                            {!isExpanded ? (
                                <div className="flex justify-between items-start gap-4">
                                    <p className={`text-slate-800 dark:text-white font-black ${isCompact ? 'text-xl' : 'text-2xl'} leading-relaxed break-keep whitespace-pre-wrap`}>
                                        {text}
                                    </p>

                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {/* Status Badge */}
                                        {response && response !== '기대중' && (
                                            <span className={`px-2 py-1 rounded-lg text-sm md:text-base font-black border shadow-sm ${STATUS_OPTIONS.find(o => o.id === response)?.color || 'bg-slate-100 text-slate-400 border-slate-200'
                                                }`}>
                                                {response}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div onClick={(e) => e.stopPropagation()}>
                                    {metadata ? (
                                        <p className="text-xl font-black text-slate-800 dark:text-slate-100 leading-relaxed px-1">
                                            {text}
                                        </p>
                                    ) : (
                                        <textarea
                                            ref={textareaRef}
                                            value={tempPrayerText}
                                            onChange={(e) => setTempPrayerText(e.target.value)}
                                            onBlur={() => handlePrayerEditSubmit(index)}
                                            className="w-full bg-white dark:bg-black border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xl font-black text-slate-800 dark:text-white focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none resize-none shadow-inner transition-all overflow-hidden"
                                            rows={1}
                                            placeholder="기도제목을 입력하세요"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-3 animate-in slide-in-from-top-1 duration-200">
                        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />

                        {(!metadata && !isReadOnly) ? (
                            <>
                                {/* Status Toggles - 2x2 Grid */}
                                <div className="space-y-3">
                                    <p className="text-sm md:text-base font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider ml-1">상태 변경</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {STATUS_OPTIONS.map((status) => (
                                            <button
                                                key={status.id}
                                                onClick={() => handleStatusChange(index, status.id)}
                                                className={`px-3 py-3 rounded-xl text-sm font-black transition-all border break-keep active:scale-95 flex items-center justify-center text-center ${response === status.id
                                                    ? `${status.color.replace('border-', 'border-')} shadow-md scale-[1.02] ring-2 ring-blue-100 dark:ring-blue-900`
                                                    : 'bg-white dark:bg-black text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                                    }`}
                                            >
                                                {status.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm md:text-base font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">메모</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tempComment}
                                            onChange={(e) => setTempComment(e.target.value)}
                                            onBlur={() => handleCommentSubmit(index)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(index)}
                                            placeholder="여기에 메모를 입력하세요"
                                            className="flex-1 px-4 py-3 bg-white dark:bg-black border-2 border-slate-100 dark:border-slate-800 rounded-xl text-sm md:text-base font-bold text-slate-800 dark:text-white focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-between items-center gap-2">
                                    {showArchived ? (
                                        <button
                                            onClick={() => handleRestore(index)}
                                            className="text-base md:text-lg font-black text-blue-600 hover:text-blue-800 hover:underline px-2 py-2"
                                        >
                                            🔄 다시 꺼내기
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleArchive(index)}
                                            className="text-base md:text-lg font-black text-slate-400 hover:text-slate-600 hover:underline px-2 py-2"
                                        >
                                            📦 보관함으로 이동
                                        </button>
                                    )}
                                    <div className="flex gap-2">
                                        {hasUnsavedChanges && !isReadOnly && (
                                            <button
                                                onClick={onSave}
                                                disabled={isSaving}
                                                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-base md:text-lg font-black rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                            >
                                                {isSaving ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        <span className="animate-pulse">저장 중...</span>
                                                    </span>
                                                ) : (
                                                    '💾 저장하기'
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setExpandedIndex(null)}
                                            className="px-5 py-2 bg-slate-800 dark:bg-slate-700 text-white text-base md:text-lg font-black rounded-xl hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            닫기
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // Read-Only View (or Multi-View)
                            <div className="space-y-3">
                                {response && (
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-lg text-sm md:text-base font-black border ${STATUS_OPTIONS.find(o => o.id === response)?.color}`}>
                                            {response}
                                        </span>
                                    </div>
                                )}
                                {comment && (
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <p className="text-sm md:text-base text-slate-700 font-bold">📝 {comment}</p>
                                    </div>
                                )}
                                <div className="flex flex-col gap-3 mt-2">
                                    {/* Date in Expanded View */}
                                    {dates[index] && (
                                        <span className="text-sm font-bold text-slate-400">
                                            🕒 {dates[index]} ({getRelativeTime(dates[index])})
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setExpandedIndex(null)}
                                        className="px-5 py-2 bg-slate-100 text-slate-600 text-sm md:text-base font-black rounded-xl hover:bg-slate-200 transition-colors w-full sm:w-auto ml-auto"
                                    >
                                        닫기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div data-prayer-note className="bg-white dark:bg-black rounded-[2.5rem] shadow-2xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header - Only Show if NOT in View All Mode */}
            {!metadata && (
                <div className="mb-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                                🙏 {memberName}
                            </h2>
                            <span className="text-xl sm:text-2xl font-black text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">기도 노트</span>
                        </div>
                        {!isCapturing && (
                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className={`px-4 py-2 rounded-2xl text-sm font-black transition-all border-2 shadow-sm whitespace-nowrap shrink-0 ${showArchived
                                    ? 'bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                                    }`}
                            >
                                {showArchived ? '📝 활성' : '📦 보관함'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* v3.6.0: Guidance Text - Optimized for single line */}
            {!isCapturing && (
                <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl px-4 py-4 mb-8 mt-4 overflow-hidden">
                    <p className="text-amber-700 dark:text-amber-400 font-black flex items-center gap-2 whitespace-nowrap tracking-tighter text-[13.5px] min-[380px]:text-sm sm:text-base md:text-lg">
                        <span className="text-xl shrink-0">👉</span>
                        기도제목을 누르면 응답을 표시하고, 수정할 수 있습니다.
                    </p>
                </div>
            )}

            {visiblePrayers.length === 0 ? (
                <div className="text-center py-20 space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="text-5xl animate-bounce-subtle">
                        {showArchived ? '📦' : '🌱'}
                    </div>
                    <div className="space-y-1">
                        <p className="text-slate-500 dark:text-slate-400 font-black text-xl">
                            {showArchived ? '보관된 기도제목이 없습니다' : '아직 기도제목이 없습니다'}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">
                            {showArchived
                                ? '보관함이 비어있네요!'
                                : '첫 기도를 입력하고 응답을 기다려보세요!'}
                        </p>
                    </div>
                </div>
            ) : (
                renderContent()
            )}

            {/* Add New Prayer Input - Hide in View All mode or Read Only mode */}
            {!metadata && !isReadOnly && !isCapturing && (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-4">
                    <div className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 dark:focus-within:ring-blue-900/50 transition-all shadow-inner">
                        <span className="pl-2 text-2xl">✨</span>
                        <input
                            type="text"
                            value={newPrayerText}
                            onChange={(e) => setNewPrayerText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubmit()}
                            placeholder="새로운 기도를 여기에 입력하세요..."
                            className="flex-1 bg-transparent border-none outline-none text-base md:text-lg font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 py-2"
                        />
                        <button
                            onClick={handleAddSubmit}
                            disabled={!newPrayerText.trim()}
                            className="p-3 bg-blue-600 dark:bg-blue-700 text-white rounded-2xl disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
