'use client';

import { useState } from 'react';

export default function AddGroupModal({ isOpen, onClose, onSubmit }) {
    const [groupName, setGroupName] = useState('');
    const [members, setMembers] = useState(['']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddMemberField = () => {
        setMembers([...members, '']);
    };

    const handleMemberChange = (index, value) => {
        const newMembers = [...members];
        newMembers[index] = value;
        setMembers(newMembers);
    };

    const handleRemoveMember = (index) => {
        if (members.length > 1) {
            const newMembers = members.filter((_, i) => i !== index);
            setMembers(newMembers);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) {
            alert('그룹 이름을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            const memberList = members
                .map(m => m.trim())
                .filter(m => m !== '');

            await onSubmit(groupName.trim(), memberList);
            setGroupName('');
            setMembers(['']);
            onClose();
        } catch (error) {
            console.error('Failed to create group:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                        <span className="text-4xl">➕</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 text-center">새 그룹 만들기</h2>
                    <p className="text-sm text-slate-400 text-center mt-2">함께 기도할 그룹을 만들어보세요</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Group Name */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            그룹 이름 *
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="예: 청년부 기도팀"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Members */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            멤버
                        </label>
                        <div className="space-y-2">
                            {members.map((member, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={member}
                                        onChange={(e) => handleMemberChange(index, e.target.value)}
                                        placeholder={`멤버 ${index + 1}`}
                                        className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                        disabled={isSubmitting}
                                    />
                                    {members.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMember(index)}
                                            className="px-3 py-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                                            disabled={isSubmitting}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddMemberField}
                                className="w-full px-4 py-2.5 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors font-bold text-sm"
                                disabled={isSubmitting}
                            >
                                + 멤버 추가
                            </button>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '만드는 중...' : '만들기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
