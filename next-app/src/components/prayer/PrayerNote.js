'use client';

import { useState, useEffect } from 'react';

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
    onEditPrayer
}) {
    // Accordion State: storing index of currently expanded item
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [tempComment, setTempComment] = useState('');
    const [tempPrayerText, setTempPrayerText] = useState('');
    const [newPrayerText, setNewPrayerText] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const allPrayers = prayers.map((p, i) => ({
        text: p,
        index: i,
        response: responses[i],
        comment: comments[i],
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

    // Helper: Calculate relative time
    const getRelativeTime = (dateStr) => {
        if (!dateStr) return '';

        try {
            // Parse "YYYY.MM.DD HH:mm:ss" or "YYYY.MM.DD"
            const [datePart, timePart] = dateStr.split(' ');
            const [y, m, d] = datePart.split('.').map(Number);

            let date;
            if (timePart) {
                const [h, min, s] = timePart.split(':').map(Number);
                date = new Date(y, m - 1, d, h, min, s);
            } else {
                date = new Date(y, m - 1, d);
            }

            const now = new Date();
            const diffMs = now - date;
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
                    {visiblePrayers.map((prayer, index) =>
                        renderPrayerItem({
                            text: prayer,
                            index,
                            response: responses[index],
                            comment: comments[index],
                            localIndex: index
                        })
                    )}
                </div>
            );
        }

        // View All Mode: Group by Member, and organize by Group
        const content = [];
        let lastGroupName = '';
        let lastMemberId = '';
        let memberPrayerCount = 0;
        let memberItems = []; // Store items for current member to find latest date

        const pushMemberFooter = (items) => {
            // Find latest date among text strings
            let latestDate = '';
            let latestDateObj = new Date(0);

            items.forEach(item => {
                const dStr = dates[item.index];
                if (dStr) {
                    try {
                        const [datePart, timePart] = dStr.split(' ');
                        const [y, m, d] = datePart.split('.').map(Number);
                        let date;
                        if (timePart) {
                            const [h, min, s] = timePart.split(':').map(Number);
                            date = new Date(y, m - 1, d, h, min, s);
                        } else {
                            date = new Date(y, m - 1, d);
                        }
                        if (date > latestDateObj) {
                            latestDateObj = date;
                            latestDate = dStr;
                        }
                    } catch (e) { }
                }
            });

            if (latestDate) {
                content.push(
                    <div key={`date-${items[0].index}`} className="flex justify-end mt-1 mb-3 pr-1">
                        <span className="text-[10px] text-slate-400 font-medium">
                            {getRelativeTime(latestDate)}
                        </span>
                    </div>
                );
            } else {
                content.push(<div key={`spacer-${items[0].index}`} className="mb-3"></div>);
            }
        };

        visiblePrayers.forEach((item, idx) => {
            const memberId = item.meta.memberName; // Use only member name for deduplication
            const currentGroupName = item.meta.groupName;

            // Check for Group Change -> Insert Group Header
            if (currentGroupName !== lastGroupName) {
                // If we were in the middle of a member, flush footer (though group change usually implies member change too)
                if (memberItems.length > 0) {
                    pushMemberFooter(memberItems);
                    memberItems = [];
                }

                content.push(
                    <div key={`group-header-${currentGroupName}`} className="mt-10 mb-6 first:mt-2">
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 rounded-xl text-sm font-bold text-white bg-gradient-to-br ${item.meta.gradientClass || 'from-slate-400 to-slate-500'} shadow-sm`}>
                                {currentGroupName}
                            </span>
                            <div className="h-px bg-slate-100 flex-1"></div>
                        </div>
                    </div>
                );
                lastGroupName = currentGroupName;
                lastMemberId = ''; // Reset member tracking on group switch to ensure header prints
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

                // New Member Section Header (Without Group Badge)
                content.push(
                    <div key={`header-${memberId}`} className="mt-6 mb-2 first:mt-0">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-1">
                            <span className="text-xl font-black text-slate-800 tracking-tight pl-1">
                                {item.meta.memberName}
                            </span>
                        </div>
                    </div>
                );
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

    const renderPrayerItem = ({ text, index, response, comment, meta, localIndex }, isCompact = false) => {
        const isExpanded = expandedIndex === index;

        return (
            <div
                key={index}
                className={`transition-all duration-300 rounded-xl border overflow-hidden ${isExpanded
                    ? 'bg-slate-50 border-blue-200 shadow-md ring-2 ring-blue-50/50'
                    : 'bg-white border-transparent hover:border-slate-100 hover:bg-slate-50/50'
                    }`}
            >
                {/* Header (Click to Expand) */}
                <div
                    onClick={() => handleExpand(index, text, comment)}
                    className={`${isCompact ? 'pl-0 pr-2 py-1' : 'p-4'} cursor-pointer select-none ${isExpanded ? 'pb-2' : ''}`}
                >
                    <div className="flex items-start gap-2">
                        {/* Number Badge */}
                        <span className={`text-xs font-black mt-1 shrink-0 tabular-nums ${isExpanded ? 'text-blue-600' : 'text-slate-300'}`}>
                            {metadata ? localIndex + 1 : index + 1}.
                        </span>

                        <div className="flex-1">
                            {!isExpanded ? (
                                <div className="flex justify-between items-start gap-3">
                                    <p className={`text-slate-800 font-bold ${isCompact ? 'text-base' : 'text-lg'} leading-relaxed break-keep`}>
                                        {text}
                                    </p>

                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                        {/* Status Badge */}
                                        {response && response !== '기대중' && (
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${STATUS_OPTIONS.find(o => o.id === response)?.color || 'bg-slate-100 text-slate-400 border-slate-200'
                                                }`}>
                                                {response}
                                            </span>
                                        )}
                                        {/* Date Badge REMOVED */}
                                    </div>
                                </div>
                            ) : (
                                <div onClick={(e) => e.stopPropagation()}>
                                    {metadata ? (
                                        <p className="text-base font-bold text-slate-800 leading-relaxed px-1">
                                            {text}
                                        </p>
                                    ) : (
                                        <textarea
                                            value={tempPrayerText}
                                            onChange={(e) => setTempPrayerText(e.target.value)}
                                            onBlur={() => handlePrayerEditSubmit(index)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base font-bold text-slate-800 focus:border-blue-500 focus:outline-none resize-none"
                                            rows={2}
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
                        <div className="h-px bg-slate-100 w-full" />

                        {!metadata ? (
                            <>
                                {/* Status Toggles */}
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">상태 변경</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {STATUS_OPTIONS.map((status) => (
                                            <button
                                                key={status.id}
                                                onClick={() => handleStatusChange(index, status.id)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border active:scale-95 ${response === status.id
                                                    ? `${status.color.replace('border-', 'border-')} shadow-sm`
                                                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                                    }`}
                                            >
                                                {status.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">메모</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tempComment}
                                            onChange={(e) => setTempComment(e.target.value)}
                                            onBlur={() => handleCommentSubmit(index)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(index)}
                                            placeholder="메모를 입력하세요"
                                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-400 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-1 flex justify-between items-center">
                                    {showArchived ? (
                                        <button
                                            onClick={() => handleRestore(index)}
                                            className="text-[10px] font-bold text-blue-500 hover:text-blue-700 hover:underline px-1 py-1"
                                        >
                                            복원
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleArchive(index)}
                                            className="text-[10px] font-bold text-slate-300 hover:text-slate-500 hover:underline px-1 py-1"
                                        >
                                            보관
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setExpandedIndex(null)}
                                        className="px-3 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-md hover:bg-slate-900"
                                    >
                                        닫기
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Read-Only View
                            <div className="space-y-2">
                                {response && (
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_OPTIONS.find(o => o.id === response)?.color}`}>
                                            {response}
                                        </span>
                                    </div>
                                )}
                                {comment && (
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <p className="text-xs text-slate-600 font-medium">📝 {comment}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                    {/* Date in Expanded View */}
                                    {dates[index] && (
                                        <span className="text-[10px] text-slate-300">
                                            {dates[index]} ({getRelativeTime(dates[index])})
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setExpandedIndex(null)}
                                        className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg hover:bg-slate-200 ml-auto"
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
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 border border-gray-100 w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header - Only Show if NOT in View All Mode */}
            {!metadata && (
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">🙏 {memberName} 기도 노트</h2>
                            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Prayer Journal</p>
                        </div>
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${showArchived
                                ? 'bg-slate-600 text-white border-slate-600'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {showArchived ? '📝 활성 보기' : '📦 보관함 보기'}
                        </button>
                    </div>
                </div>
            )}

            {visiblePrayers.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                    <div className="text-4xl text-slate-300">🌱</div>
                    <p className="text-slate-400 font-bold tabular-nums">기도제목을 불러오는 중입니다...</p>
                </div>
            ) : (
                renderContent()
            )}

            {/* Add New Prayer Input - Hide in View All mode */}
            {!metadata && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                        <span className="pl-3 text-lg">✨</span>
                        <input
                            type="text"
                            value={newPrayerText}
                            onChange={(e) => setNewPrayerText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubmit()}
                            placeholder="새로운 기도제목을 추가해보세요..."
                            className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400 py-2"
                        />
                        <button
                            onClick={handleAddSubmit}
                            disabled={!newPrayerText.trim()}
                            className="p-2 bg-blue-600 text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
