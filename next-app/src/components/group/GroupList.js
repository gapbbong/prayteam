'use client';

export default function GroupList({ groups, onSelectGroup, onAddGroup, onViewAll }) {
    if (!groups || groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6 animate-bounce-subtle">
                    <span className="text-4xl">✨</span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">아직 그룹이 없습니다</h3>
                <p className="text-slate-400 font-bold mb-8 text-center max-w-xs leading-relaxed">
                    새로운 기도 그룹을 만들고<br />멤버들을 초대해보세요!
                </p>
                <button
                    onClick={onAddGroup}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group"
                >
                    <span className="text-xl">➕</span>
                    새 그룹 만들기
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">기도 그룹</h2>
                <p className="text-slate-400 font-bold mt-2 tracking-wide text-sm">함께 기도할 그룹을 선택해주세요</p>
            </div>

            {/* Group Buttons Grid */}
            <div className={`grid gap-3 ${groups.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {groups.map((group, idx) => {
                    // Gradient colors for variety
                    const gradients = [
                        'from-blue-500 to-purple-600', // Reverted (Worship)
                        'from-purple-500 to-pink-600',
                        'from-green-500 to-teal-600',
                        'from-orange-500 to-red-600',
                        'from-amber-400 to-orange-500', // Index 4: Yellow/Amber (Sinwu-hoe)
                        'from-pink-500 to-rose-600',
                        'from-cyan-500 to-blue-600',
                        'from-teal-400 to-emerald-600',
                        'from-rose-500 to-red-600',
                        'from-amber-500 to-orange-600',
                        'from-violet-500 to-purple-600',
                        'from-fuchsia-500 to-pink-600',
                        'from-emerald-400 to-cyan-500',
                        'from-slate-500 to-gray-600',
                    ];
                    const gradient = gradients[idx % gradients.length];

                    // Different icons for each group
                    const icons = ['🙏', '✝️', '⛪', '📖', '🕊️', '💒'];
                    const icon = icons[idx % icons.length];

                    return (
                        <button
                            key={group.groupId}
                            onClick={() => onSelectGroup(group)}
                            className="group relative w-full overflow-hidden rounded-[2rem] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95"
                        >
                            {/* Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />

                            {/* Content */}
                            <div className="relative p-3">
                                <div className="flex items-start gap-3">
                                    {/* Icon - spans full height */}
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 self-start">
                                        <span className="text-2xl">{icon}</span>
                                    </div>

                                    {/* Text content stacked vertically */}
                                    <div className="flex-1 flex flex-col justify-start items-start gap-2 pt-0.5">
                                        <h3 className="text-2xl font-black text-white drop-shadow-md truncate w-full">
                                            {group.name}
                                        </h3>

                                        {/* Member Count */}
                                        <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full w-fit">
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-xs font-bold text-white">{group.members?.length || 0}명</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Action Buttons - Always at bottom, horizontal layout */}
            <div className={`grid gap-3 mt-6 ${groups.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Add Group Button */}
                <button
                    onClick={onAddGroup}
                    className="group relative w-full text-left p-3 bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-300 hover:border-blue-400 hover:shadow-lg transition-all active:scale-95 flex items-center gap-3"
                >
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
                        <svg className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold text-slate-500 group-hover:text-blue-600 transition-colors">새 그룹 만들기</span>
                </button>

                {/* View All Prayers Button */}
                {groups.length >= 2 && (
                    <button
                        onClick={onViewAll}
                        className="group relative w-full overflow-hidden rounded-[2rem] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95"
                    >
                        {/* Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 opacity-95 group-hover:opacity-100 transition-opacity" />

                        {/* Content */}
                        <div className="relative p-3 flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
                                <span className="text-3xl">📋</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-black text-white drop-shadow-sm">전체 기도제목</span>
                                <span className="text-xs font-bold text-white/70">모든 그룹의 기도 소식</span>
                            </div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
