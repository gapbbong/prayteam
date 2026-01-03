'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { gasClient } from '@/lib/gasClient';
import { useNotifications } from '@/hooks/useNotifications';
import PrayerNote from '@/components/prayer/PrayerNote';
import LoadingDots from '@/components/LoadingDots';
import LoginForm from '@/components/LoginForm';
import GroupList from '@/components/group/GroupList';
import MemberList from '@/components/group/MemberList';
import AddGroupModal from '@/components/group/AddGroupModal';
import NotificationSettingsModal from '@/components/NotificationSettingsModal';

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const { permission, requestPermission } = useNotifications();

  // State Refs for Event Listeners (avoids re-binding listeners)
  const groupPrayersRef = useRef({});
  const currentViewRef = useRef('groups');

  // Navigation State: 'groups' | 'members' | 'prayers'
  const [currentView, setCurrentView] = useState('groups');

  // Data State
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [groupPrayers, setGroupPrayers] = useState({});

  // Prayer Data
  const [prayers, setPrayers] = useState([]);
  const [responses, setResponses] = useState([]);
  const [comments, setComments] = useState([]);
  const [dates, setDates] = useState([]);
  const [visibilities, setVisibilities] = useState([]);
  const [indices, setIndices] = useState([]); // [NEW] 실제 슬롯 번호 저장용

  // Modal State
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isCurrentGroupNotiEnabled, setIsCurrentGroupNotiEnabled] = useState(false);

  // Loading Progress: e.g., "1/15"
  const [loadingProgress, setLoadingProgress] = useState('');

  // Update notification status only when group changes
  useEffect(() => {
    if (currentGroup?.groupId) {
      const isEnabled = localStorage.getItem(`prayteam_noti_${currentGroup.groupId}`) === 'true';
      setIsCurrentGroupNotiEnabled(isEnabled);
    }
  }, [currentGroup?.groupId]); // Group ID 변경 시에만 동기화

  // State for View All Prayers
  const [viewAllData, setViewAllData] = useState(null);

  /* ========================================================================= */
  /* 📌 통계 및 로그 (방문 기록)                                              */
  /* ========================================================================= */
  const logVisit = useCallback(async (pageName, extra = {}) => {
    try {
      const browserInfo = typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown';
      // Use explicit IDs from extra or current state purely for logging
      await gasClient.addLog({
        page: pageName,
        adminId: user?.id,
        groupId: extra.groupId || '',
        member: extra.member || '',
        from: document.referrer || '',
        device: 'Web',
        browser: browserInfo
      });
    } catch (e) {
      console.warn('Logging failed', e);
    }
  }, [user?.id]); // Only depend on User ID change
  /* 📌 주요 핸들러 함수 (초기화 순서 보장을 위해 최상단 배치)             */
  /* ========================================================================= */

  const loadGroups = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await gasClient.getGroups(user.adminId || user.id);
      const groupList = res.groups ? res.groups : (Array.isArray(res) ? res : []);
      const formattedGroups = groupList.map(g => ({
        groupId: g.그룹ID || g.groupId,
        name: g.그룹명 || g.name,
        members: g.구성원목록 || g.members || []
      }));
      setGroups(formattedGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.adminId]);

  const handleSelectGroup = useCallback(async (group) => {
    // 그룹명을 먼저 설정하여 로딩 중에도 헤더에 즉시 표시
    setCurrentGroup(group);

    // 알림 설정 상태 초기화
    const notiEnabled = localStorage.getItem(`prayteam_noti_${group.groupId}`) === 'true';
    setIsCurrentGroupNotiEnabled(notiEnabled);

    logVisit('member_list', { groupId: group.groupId });

    setCurrentView('members'); // 뷰도 먼저 전환하여 헤더가 그룹명을 표시하도록 함
    setIsLoading(true);
    try {
      const dataMap = {};
      const fetchPromises = group.members.map(async (member) => {
        try {
          const data = await gasClient.getPrayers(group.groupId, member);
          if (data) {
            const commonTime = data.time || '';
            const dates = (data.dates || []).map(d => d && d.trim() !== '' ? d : commonTime);
            dataMap[member] = {
              prayers: data.prayers ? data.prayers.filter(p => p && p.trim() !== '') : [],
              responses: data.responses || [],
              comments: data.comments || [],
              dates: dates,
              visibilities: data.visibilities || [],
              indices: data.indices || []
            };
          }
        } catch (e) {
          console.error(`Failed to fetch for ${member}`, e);
          dataMap[member] = { prayers: [], responses: [], comments: [], dates: [], visibilities: [] };
        }
      });
      await Promise.all(fetchPromises);
      setGroupPrayers(dataMap);
      window.history.pushState({ view: 'members', group }, '', '#members');
    } catch (error) {
      console.error('Group load failed', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleViewAllPrayers = useCallback(async () => {
    if (!groups || groups.length === 0) {
      alert('참여 중인 그룹이 없습니다.');
      return;
    }
    try {
      setCurrentView('all_prayers'); // 헤더 제목 즉시 변경을 위해 추가
      setIsLoading(true);
      setLoadingProgress('');
      const gradients = [
        'from-blue-500 to-purple-600', 'from-purple-500 to-pink-600',
        'from-green-500 to-teal-600', 'from-orange-500 to-red-600',
        'from-amber-400 to-orange-500', 'from-pink-500 to-rose-600',
        'from-cyan-500 to-blue-600', 'from-teal-400 to-emerald-600',
        'from-rose-500 to-red-600', 'from-amber-500 to-orange-600',
        'from-violet-500 to-purple-600', 'from-fuchsia-500 to-pink-600',
        'from-emerald-400 to-cyan-500', 'from-slate-500 to-gray-600',
      ];
      const groupIdsStr = groups.map(g => g.groupId).join(',');
      const bulkData = await gasClient.getPrayersAllGroups(groupIdsStr);

      if (bulkData && bulkData.error) {
        throw new Error(bulkData.error);
      }

      if (!bulkData || !Array.isArray(bulkData)) {
        const msg = bulkData && bulkData.message ? `: ${bulkData.message}` : '';
        throw new Error('데이터 형식이 올바르지 않습니다.' + msg);
      }
      const dataLookup = {};
      bulkData.forEach(item => {
        const gid = item.그룹ID;
        if (gid) {
          if (!dataLookup[gid]) dataLookup[gid] = {};
          dataLookup[gid][item.멤버이름] = item;
        }
      });
      const prayersList = [];
      const responsesList = [];
      const commentsList = [];
      const datesList = [];
      const visibilitiesList = [];
      const metadataList = [];
      // 중복 제거 로직 제거 - 같은 이름이라도 다른 그룹에 있으면 모두 표시
      groups.forEach((group, gIdx) => {
        const groupGradient = gradients[gIdx % gradients.length];
        if (group.members) {
          group.members.forEach(member => {
            const data = dataLookup[group.groupId] ? dataLookup[group.groupId][member] : null;
            if (data && data.prayers && data.prayers.length > 0) {
              data.prayers.forEach((prayer, pIdx) => {
                if (data.visibilities && data.visibilities[pIdx] === 'Hidden') return;
                prayersList.push(prayer);
                responsesList.push(data.responses ? data.responses[pIdx] : '');
                commentsList.push(data.comments ? data.comments[pIdx] : '');
                datesList.push(data.dates ? data.dates[pIdx] : '');
                visibilitiesList.push(data.visibilities ? data.visibilities[pIdx] : 'Show');
                metadataList.push({
                  groupName: group.name,
                  memberName: member,
                  gradientClass: groupGradient,
                  updatedAt: data.작성시간 // 멤버별 기본 작성시간 추가
                });
              });
            }
          });
        }
      });
      setViewAllData({
        prayers: prayersList, responses: responsesList,
        comments: commentsList, dates: datesList,
        visibilities: visibilitiesList, metadata: metadataList
      });
      setCurrentView('all_prayers');
      window.history.pushState({ view: 'all_prayers' }, '', '#all_prayers');
    } catch (error) {
      console.error('Failed to fetch all prayers:', error);
      alert('전체 기도제목을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
      setLoadingProgress('');
      logVisit('view_all_prayers');
    }
  }, [groups]);

  const handleSelectMember = useCallback((member) => {
    setCurrentMember(member);
    if (groupPrayersRef.current[member]) {
      const data = groupPrayersRef.current[member];
      setPrayers(data.prayers);
      setResponses(data.responses);
      setComments(data.comments);
      setDates(data.dates || []);
      setVisibilities(data.visibilities || []);
      setIndices(data.indices || []);
    } else {
      setPrayers([]); setResponses([]); setComments([]);
      setDates([]); setVisibilities([]); setIndices([]);
    }
    setCurrentView('prayers');
    logVisit('prayer_note', { member: member });
    window.history.pushState({ view: 'prayers', member, group: currentGroup }, '', '#prayers');
  }, [currentGroup, logVisit]);

  // ✅ New Handler: Share current group link
  const handleShareGroup = useCallback(() => {
    if (!currentGroup) return;
    const url = `${window.location.origin}/#members?groupId=${currentGroup.groupId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('그룹 링크가 복사되었습니다! 단톡방에 공유해보세요. 😊');
    }).catch(err => {
      console.error('Failed to copy', err);
    });
  }, [currentGroup]);

  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const handleAddGroup = async (groupName, memberList) => {
    if (!groupName || !groupName.trim()) {
      alert('그룹 이름을 입력해주세요.');
      return;
    }
    try {
      setIsLoading(true);
      const result = await gasClient.addGroup(user.id, groupName.trim());
      if (!result || !result.success) throw new Error(result?.message || '그룹 추가에 실패했습니다.');
      if (memberList && memberList.length > 0 && result.groupId) {
        for (const member of memberList) {
          try { await gasClient.addMember(result.groupId, member); } catch (err) { console.error(`Failed to add member ${member}:`, err); }
        }
      }
      await loadGroups();
      alert(`"${groupName}" 그룹이 성공적으로 만들어졌습니다!`);
    } catch (error) {
      alert(error.message || '그룹 추가에 실패했습니다.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sync Refs
  useEffect(() => {
    groupPrayersRef.current = groupPrayers;
  }, [groupPrayers]);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Initial Data Fetch (Groups)
  useEffect(() => {
    if (user && !authLoading) {
      loadGroups();
      // Only log once per session/initial load at this level
    }
  }, [user?.id, authLoading, loadGroups]);

  // Initial Visit Log
  useEffect(() => {
    if (user && groups.length > 0) {
      logVisit('group_list');
    }
  }, [user?.id, groups.length > 0]); // Log visit only when user and groups are ready, without depending on logVisit identity

  // Initial History State Check
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.history.state) {
      window.history.replaceState({ view: 'groups' }, '', '');
    }
  }, []);

  // History API Integration (Stable Listener)
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      const hash = window.location.hash;

      if (!state || !hash || hash === '' || hash === '#groups') {
        setCurrentView('groups');
        setCurrentGroup(null);
        setCurrentMember(null);
        setViewAllData(null);
      } else if (hash === '#members') {
        if (state.group) setCurrentGroup(state.group);
        setCurrentView('members');
        setCurrentMember(null);
      } else if (hash === '#prayers') {
        if (state.group) setCurrentGroup(state.group);
        if (state.member) {
          setCurrentMember(state.member);
          const data = groupPrayersRef.current[state.member];
          if (data) {
            setPrayers(data.prayers);
            setResponses(data.responses);
            setComments(data.comments);
            setDates(data.dates || []);
            setVisibilities(data.visibilities || []);
            setIndices(data.indices || []);
          }
        }
        setCurrentView('prayers');
      } else if (hash === '#all_prayers') {
        setCurrentView('all_prayers');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Run once on mount

  // Keyboard Navigation (Stable Listener)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Backspace') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          // If NOT in groups view, go back using history
          if (currentViewRef.current !== 'groups') {
            event.preventDefault();
            window.history.back();
          }
        }
      }
    };

    const handleMainShortcuts = (event) => {
      // input/textarea focus check
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (currentView === 'groups') {
        const key = event.key;
        if (key === '1') {
          handleViewAllPrayers();
        } else if (key >= '2' && key <= '9') {
          const idx = parseInt(key) - 2;
          if (groups && groups[idx]) {
            handleSelectGroup(groups[idx]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleMainShortcuts);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleMainShortcuts);
    };
  }, [currentView, groups, handleViewAllPrayers, handleSelectGroup]);
  // Run once on mount


  // Status & Comment Updaters
  const handleUpdateStatus = async (index, status, visibility) => {
    // 1. Update Responses State
    if (status !== undefined) {
      const newResponses = [...responses];
      newResponses[index] = status;
      setResponses(newResponses);
    }

    // 2. Update Visibility State
    if (visibility !== undefined) {
      const newVisibilities = [...visibilities];
      newVisibilities[index] = visibility;
      setVisibilities(newVisibilities);
    }

    try {
      const realIndex = indices[index]; // [수정] 실제 슬롯 인덱스 사용
      await gasClient.saveNote({
        groupId: currentGroup.groupId,
        member: currentMember,
        index: realIndex,
        answer: status !== undefined ? status : responses[index],
        comment: comments[index] || '',
        visibility: visibility // Optional param
      });
    } catch (error) {
      console.error('Update status failed', error);
      // Re-fetch to revert on error
      const data = await gasClient.getPrayers(currentGroup.groupId, currentMember);
      if (data) {
        setResponses(data.responses || []);
        setVisibilities(data.visibilities || []);
      }
    }
  };

  // ✅ New Handler: Add a new prayer
  const handleAddPrayer = async (newText) => {
    if (!newText || !newText.trim()) return;

    const newPrayers = [...prayers, newText];
    const newResponses = [...responses, '기대중'];
    const newComments = [...comments, ''];
    const newVisibilities = [...visibilities, 'Show'];
    // dates will be handled by backend, but optimistically set today with time
    const now = new Date();
    const today = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newDates = [...dates, today];

    // Optimistic UI Update
    setPrayers(newPrayers);
    setResponses(newResponses);
    setComments(newComments);
    setVisibilities(newVisibilities);
    setDates(newDates);

    try {
      await gasClient.savePrayer({
        groupId: currentGroup.groupId,
        groupName: currentGroup.name,
        member: currentMember,
        prayers: newPrayers,
        responses: newResponses,
        comments: newComments,
        visibilities: newVisibilities
      });
    } catch (error) {
      console.error('Add prayer failed', error);
      // Revert logic would go here (omitted for brevity)
    }
  };

  // ✅ New Handler: Edit existing prayer text
  const handleEditPrayer = async (index, newText) => {
    if (index < 0 || index >= prayers.length) return;

    const newPrayers = [...prayers];
    newPrayers[index] = newText;
    setPrayers(newPrayers);

    try {
      await gasClient.savePrayer({
        groupId: currentGroup.groupId,
        groupName: currentGroup.name,
        member: currentMember,
        prayers: newPrayers,
        responses: responses,
        comments: comments,
        visibilities: visibilities
      });
    } catch (error) {
      console.error('Edit prayer failed', error);
    }
  };

  const handleSaveComment = async (index, comment) => {
    const newComments = [...comments];
    newComments[index] = comment;
    setComments(newComments);

    try {
      const realIndex = indices[index]; // [수정] 실제 슬롯 인덱스 사용
      await gasClient.saveNote({
        groupId: currentGroup.groupId,
        member: currentMember,
        index: realIndex,
        answer: responses[index] || '',
        comment: comment
      });
    } catch (error) {
      console.error('Save comment failed', error);
      // Revert logic
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingDots label="자동 로그인 중입니다..." /></div>;

  if (!user) {
    return (
      <main className="container mx-auto px-4 py-12 min-h-screen flex flex-col items-center">
        <header className="text-center mb-12 space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            PRAY <span className="text-blue-600">TEAM</span>
          </h1>
          <p className="text-slate-500 font-bold text-lg italic">반드시 응답하시는 하나님</p>
        </header>
        <LoginForm />
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen">
      {/* Global Header */}
      <div className="relative flex items-center justify-between mb-0.5 px-1 h-10">
        {/* Left: Back Button or Version */}
        <div className="w-24 flex justify-start items-center">
          {currentView !== 'groups' ? (
            <button
              onClick={handleBack}
              className="text-slate-400 hover:text-slate-800 transition-colors bg-slate-100 p-2 rounded-full shadow-sm hover:bg-slate-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-300 ml-1"></span>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-black text-slate-800 tracking-tighter italic whitespace-nowrap cursor-pointer select-none" onClick={() => { if (currentView !== 'groups') handleBack(); }}>
          {currentView === 'groups' ? (
            <span>PRAY <span className="text-blue-600">TEAM</span></span>
          ) : currentView === 'all_prayers' ? (
            <span className="text-purple-600">전체 기도제목</span>
          ) : (
            currentGroup?.name || 'PRAY TEAM'
          )}
        </h1>

        {/* Right: User Info & Logout */}
        <div className="flex items-center gap-1.5 w-24 justify-end">
          {currentGroup && (currentView === 'members' || currentView === 'prayers') && (
            <button
              onClick={handleShareGroup}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg shadow-sm border border-slate-100"
              title="그룹 공유"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h6.528a2 2 0 011.789 1.106l3.5 7A2 2 0 0118.764 14H14v4a2 2 0 01-2 2h-2v-4z M10 14V11a2 2 0 012-2h0a2 2 0 012 2v3" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v8m0 0l-3-3m3 3l3-3" />
              </svg>
            </button>
          )}

          <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">{user.name}님</span>

          {(currentView === 'members' || currentView === 'prayers') && (
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className={`transition-all duration-300 p-1.5 rounded-lg relative group/noti ${isCurrentGroupNotiEnabled
                ? 'text-yellow-500 bg-yellow-50'
                : 'text-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
            >
              <svg className="w-5 h-5 shadow-sm" fill={isCurrentGroupNotiEnabled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                {!isCurrentGroupNotiEnabled && (
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="3" className="animate-in fade-in duration-300" />
                )}
              </svg>
              {isCurrentGroupNotiEnabled && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
              )}
            </button>
          )}

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-gray-500">3.7.2</span>
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors px-2 py-1 bg-slate-50 rounded-lg hover:bg-slate-100 whitespace-nowrap"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingDots label={loadingProgress ? `데이터를 불러오는 중입니다. 잠시만 기다려 주세요 (${loadingProgress})` : '데이터를 불러오는 중입니다. 잠시만 기다려 주세요'} />
        </div>
      ) : (
        <>
          {currentView === 'groups' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <GroupList
                groups={groups}
                onSelectGroup={handleSelectGroup}
                onAddGroup={() => setIsAddGroupModalOpen(true)}
                onViewAll={handleViewAllPrayers}
              />
            </div>
          )}

          {currentView === 'members' && currentGroup && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <MemberList
                members={currentGroup.members}
                groupPrayers={groupPrayers}
                groupName={currentGroup.name}
                onSelectMember={handleSelectMember}
                onBack={handleBack}
              />
            </div>
          )}

          {currentView === 'prayers' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <PrayerNote
                prayers={prayers}
                responses={responses}
                comments={comments}
                dates={dates}
                visibilities={visibilities}
                memberName={currentMember}
                onUpdateStatus={handleUpdateStatus}
                onSaveComment={handleSaveComment}
                onAddPrayer={handleAddPrayer}
                onEditPrayer={handleEditPrayer}
              />
            </div>
          )}

          {currentView === 'all_prayers' && viewAllData && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              {/* No local header here, using global header */}
              <PrayerNote
                prayers={viewAllData.prayers}
                responses={viewAllData.responses}
                comments={viewAllData.comments}
                dates={viewAllData.dates}
                visibilities={viewAllData.visibilities}
                metadata={viewAllData.metadata}
              />
            </div>
          )}
        </>
      )}

      {/* Add Group Modal */}
      <AddGroupModal
        isOpen={isAddGroupModalOpen}
        onClose={() => setIsAddGroupModalOpen(false)}
        onSubmit={handleAddGroup}
      />

      {/* Notification Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        groupName={currentGroup?.name}
        groupId={currentGroup?.groupId}
        user={user}
        onStatusChange={setIsCurrentGroupNotiEnabled}
      />
    </main>
  );
}

