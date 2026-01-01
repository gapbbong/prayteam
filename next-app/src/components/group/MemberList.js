'use client';

export default function MemberList({ members = [], groupPrayers = {}, groupName = '멤버 목록', onSelectMember, onBack }) {
    if (!members || members.length === 0) {
        return (
            <div className="text-center py-16 animate-in fade-in duration-700">
                <div className="text-4xl animate-bounce mb-4">👥</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{groupName}</h3>
                <p className="text-slate-400 text-sm">그룹에 멤버를 초대해 보세요.</p>
                <button onClick={onBack} className="mt-8 text-blue-600 font-bold hover:underline">
                    ← 그룹 목록으로
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            {/* Header Removed - Managed by Global Header in page.js */}

            <div className="grid gap-6">
                {members.map((member) => {
                    const memberData = groupPrayers[member] || { prayers: [], responses: [] };
                    // Filter active prayers (not archived)
                    const activePrayers = memberData.prayers.filter((_, idx) => memberData.responses[idx] !== '보관됨');

                    return (
                        <div
                            key={member}
                            onClick={() => onSelectMember(member)}
                            className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                        >
                            <div className="px-5 pt-4 pb-1 flex items-center justify-between border-b border-slate-50 bg-slate-50/50 rounded-t-3xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 shadow-sm">
                                        {member.slice(0, 1)}
                                    </div>
                                    <span className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{member}</span>
                                </div>
                                <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>

                            <div className="px-5 pt-1 pb-5 space-y-2">
                                {activePrayers.length > 0 ? (
                                    activePrayers.map((prayer, idx) => (
                                        <div key={idx} className="flex gap-2 items-start">
                                            <span className="text-blue-600 font-black text-sm mt-0.5 shrink-0 tabular-nums">
                                                {idx + 1}.
                                            </span>
                                            <p className="text-black text-base leading-relaxed font-bold">{prayer}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-300 text-sm py-2 italic">
                                        공유된 기도제목이 없습니다.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
