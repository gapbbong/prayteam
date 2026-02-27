'use client';

export default function MemberList({ members = [], groupPrayers = {}, groupName = '멤버 목록', onSelectMember, onBack }) {
    if (!members || members.length === 0) {
        return (
            <div className="text-center py-16 animate-in fade-in duration-700">
                <div className="text-4xl animate-bounce mb-4">👥</div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{groupName}</h3>
                <p className="text-slate-400 dark:text-slate-500 text-sm">그룹에 멤버를 초대해 보세요.</p>
                <button onClick={onBack} className="mt-8 text-blue-600 dark:text-blue-400 font-bold hover:underline">
                    ← 그룹 목록으로
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500 mb-2">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl px-4 py-1.5 animate-pulse mt-4">
                <p className="text-blue-600 dark:text-blue-400 font-bold text-xs md:text-sm flex items-center gap-1.5">
                    <span className="text-lg">💡</span>
                    기도제목을 터치해 보세요, 기도 노트가 열립니다.
                </p>
            </div>

            <div className="grid gap-6">
                {members.map((member) => {
                    const memberData = groupPrayers[member] || { prayers: [], responses: [] };
                    // Filter active prayers (not archived/hidden)
                    const activePrayers = memberData.prayers.filter((_, idx) => {
                        const response = memberData.responses?.[idx];
                        const visibility = memberData.visibilities?.[idx];
                        return response !== '보관됨' && response !== '숨김' && visibility !== 'Hidden';
                    });

                    return (
                        <div
                            key={member}
                            onClick={() => onSelectMember(member)}
                            className="bg-white dark:bg-black rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                        >
                            <div className="px-5 pt-4 pb-1 flex items-center justify-between border-b border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-3xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center font-black text-slate-400 dark:text-slate-300 shadow-sm">
                                        {member.slice(0, 1)}
                                    </div>
                                    <span className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">{member}</span>
                                </div>
                                <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>

                            <div className="px-5 pt-1 pb-5 space-y-2">
                                {activePrayers.length > 0 ? (
                                    activePrayers.map((prayer, idx) => (
                                        <div key={idx} className="flex gap-2 items-start">
                                            <span className="text-blue-600 dark:text-blue-400 font-black text-lg mt-1 shrink-0 tabular-nums">
                                                {idx + 1}.
                                            </span>
                                            <p className="text-black dark:text-white text-xl leading-relaxed font-black break-keep">{prayer}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-300 dark:text-slate-600 text-sm py-2 italic">
                                        공유된 기도제목이 없습니다.
                                    </p>
                                )}

                                {/* Latest Update Time */}
                                {memberData.dates && memberData.dates.length > 0 && (
                                    <div className="text-right mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                            {getRelativeTime(
                                                [...memberData.dates]
                                                    .filter((_, i) => {
                                                        const response = memberData.responses?.[i];
                                                        const visibility = memberData.visibilities?.[i];
                                                        return response !== '보관됨' && response !== '숨김' && visibility !== 'Hidden';
                                                    })
                                                    .reverse()[0]
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Relative Time Helper
function getRelativeTime(dateStr) {
    if (!dateStr) return '시간 정보 없음';
    try {
        const parts = dateStr.match(/(\d+)/g);
        if (!parts || parts.length < 3) return dateStr;

        const date = new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
            parseInt(parts[3] || 0),
            parseInt(parts[4] || 0),
            parseInt(parts[5] || 0)
        );
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return '방금 전';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}시간 전`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return `${diffInDays}일 전`;
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return `${diffInMonths}개월 전`;
        const diffInYears = Math.floor(diffInMonths / 12);
        return `${diffInYears}년 전`;
    } catch (e) {
        return dateStr;
    }
}
