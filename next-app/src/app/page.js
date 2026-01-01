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

  // Modal State
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);

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
    }
  }, [user, authLoading]);

  // History API Integration (Stable Listener)
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      if (!state || state.view === 'groups') {
        setCurrentView('groups');
        setCurrentGroup(null);
        setCurrentMember(null);
        setViewAllData(null);
      } else if (state.view === 'members') {
        if (state.group) setCurrentGroup(state.group);
        setCurrentView('members');
        setCurrentMember(null);
      } else if (state.view === 'prayers') {
        if (state.group) setCurrentGroup(state.group);
        if (state.member) {
          setCurrentMember(state.member);
          // Use Ref to access latest data without re-binding listener
          const data = groupPrayersRef.current[state.member];
          if (data) {
            setPrayers(data.prayers);
            setResponses(data.responses);
            setComments(data.comments);
            setDates(data.dates || []);
            setVisibilities(data.visibilities || []);
          }
        }
        setCurrentView('prayers');
      } else if (state.view === 'all_prayers') {
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
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        const isInput = ['INPUT', 'TEXTAREA'].includes(activeTag);
        const isEditable = document.activeElement && document.activeElement.isContentEditable;

        if (!isInput && !isEditable) {
          // Use Ref to check view
          if (currentViewRef.current !== 'groups') {
            event.preventDefault();
            window.history.back();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // Run once on mount

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      // gasClient.getGroups returns { groups: [...] } or array, let's allow for normalization
      const res = await gasClient.getGroups(user.adminId || user.id);

      const groupList = res.groups ? res.groups : (Array.isArray(res) ? res : []);

      // Normalize keys if needed
      const formattedGroups = groupList.map(g => ({
        groupId: g.그룹ID || g.groupId,
        name: g.그룹명 || g.name,
        members: g.구성원목록 || g.members || []
      }));

      setGroups(formattedGroups);

      // Replace initial state to ensure 'groups' is in history state if needed, 
      // but usually initial load is state-less or null. 
      // We can explicitly replace it to be sure.
      if (!window.history.state) {
        window.history.replaceState({ view: 'groups' }, '', '');
      }

      setCurrentView('groups');
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMember = (member) => {
    setCurrentMember(member);
    // Use cached data
    if (groupPrayers[member]) {
      setPrayers(groupPrayers[member].prayers);
      setResponses(groupPrayers[member].responses);
      setComments(groupPrayers[member].comments);
      setDates(groupPrayers[member].dates || []);
      setVisibilities(groupPrayers[member].visibilities || []);
    } else {
      setPrayers([]);
      setResponses([]);
      setComments([]);
      setDates([]);
      setVisibilities([]);
    }
    setCurrentView('prayers');
    window.history.pushState({ view: 'prayers', member, group: currentGroup }, '', '');
  };

  const handleSelectGroup = async (group) => {
    setCurrentGroup(group);
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
              visibilities: data.visibilities || []
            };
          }
        } catch (e) {
          console.error(`Failed to fetch for ${member}`, e);
          dataMap[member] = { prayers: [], responses: [], comments: [], dates: [], visibilities: [] };
        }
      });

      await Promise.all(fetchPromises);

      setGroupPrayers(dataMap);
      setCurrentView('members');
      window.history.pushState({ view: 'members', group }, '', '');
    } catch (error) {
      console.error('Group load failed', error);
    } finally {
      setIsLoading(false);
    }
  };

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

      // Create group
      const result = await gasClient.addGroup(user.id, groupName.trim());

      if (!result || !result.success) {
        throw new Error(result?.message || '그룹 추가에 실패했습니다.');
      }

      // Add members if provided
      if (memberList && memberList.length > 0 && result.groupId) {
        for (const member of memberList) {
          try {
            await gasClient.addMember(result.groupId, member);
          } catch (err) {
            console.error(`Failed to add member ${member}:`, err);
          }
        }
      }

      // Reload groups
      await loadGroups();
      alert(`"${groupName}" 그룹이 성공적으로 만들어졌습니다!`);
    } catch (error) {
      console.error('Failed to add group:', error);
      alert(error.message || '그룹 추가에 실패했습니다.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // State for View All Prayers
  const [viewAllData, setViewAllData] = useState(null);

  const handleViewAllPrayers = async () => {
    if (!groups || groups.length === 0) {
      alert('참여 중인 그룹이 없습니다.');
      return;
    }

    try {
      setIsLoading(true);

      // Gradients for group badges (must match GroupList.js)
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

      const allDataPromises = [];

      // Create a promise for each member in each group
      // Create a promise for each member in each group
      groups.forEach((group, groupIdx) => {
        if (group.members) {
          group.members.forEach(member => {
            // Fetch fresh data to avoid cache collisions between groups (since cache is keyed by member name only)
            allDataPromises.push(
              gasClient.getPrayers(group.groupId, member)
                .then(data => ({
                  ...data,
                  groupName: group.name,
                  memberName: member,
                  gradientClass: gradients[groupIdx % gradients.length]
                }))
                .catch(err => {
                  console.error(`Failed to fetch for ${member}:`, err);
                  return null;
                })
            );
          });
        }
      });

      const results = await Promise.all(allDataPromises);

      // Process results with Deduplication
      const validResults = results.filter(r => r !== null);

      // Strict Sorting: Group Name ASC -> Member Name ASC
      // This ensures that all members of the same group stay together
      validResults.sort((a, b) => {
        if (a.groupName < b.groupName) return -1;
        if (a.groupName > b.groupName) return 1;
        return a.memberName.localeCompare(b.memberName);
      });

      const uniqueMembers = new Set();

      const prayersList = [];
      const responsesList = [];
      const commentsList = [];
      const datesList = [];
      const visibilitiesList = [];
      const metadataList = [];

      validResults.forEach(data => {
        // Normalize name for deduplication (remove all spaces to handle 'Name' vs 'Name ')
        const normalizedName = String(data.memberName).replace(/\s+/g, '').trim();

        // Prevent processing the same member multiple times (Deduplication)
        if (uniqueMembers.has(normalizedName)) return;
        uniqueMembers.add(normalizedName);

        if (data.prayers && data.prayers.length > 0) {
          data.prayers.forEach((prayer, idx) => {
            // Only add visible prayers (logic can be adjusted)
            prayersList.push(prayer);
            responsesList.push(data.responses ? data.responses[idx] : '');
            commentsList.push(data.comments ? data.comments[idx] : '');
            datesList.push(data.dates ? data.dates[idx] : '');
            visibilitiesList.push(data.visibilities ? data.visibilities[idx] : 'Show');
            metadataList.push({
              groupName: data.groupName,
              memberName: data.memberName,
              gradientClass: data.gradientClass // Pass color to metadata
            });
          });
        }
      });

      setViewAllData({
        prayers: prayersList,
        responses: responsesList,
        comments: commentsList,
        dates: datesList,
        visibilities: visibilitiesList,
        metadata: metadataList
      });

      setCurrentView('all_prayers');
      window.history.pushState({ view: 'all_prayers' }, '', '');
    } catch (error) {
      console.error('Failed to fetch all prayers:', error);
      alert('전체 기도제목을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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
      await gasClient.saveNote({
        groupId: currentGroup.groupId,
        member: currentMember,
        index: index + 1,
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
      await gasClient.saveNote({
        groupId: currentGroup.groupId,
        member: currentMember,
        index: index + 1,
        answer: responses[index] || '',
        comment: comment
      });
    } catch (error) {
      console.error('Save comment failed', error);
      // Revert logic
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingDots label="시작하는 중" /></div>;

  if (!user) {
    return (
      <main className="container mx-auto px-4 py-12 min-h-screen flex flex-col items-center">
        <header className="text-center mb-12 space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            PRAY <span className="text-blue-600">TEAM</span>
          </h1>
          <p className="text-slate-500 font-bold text-lg italic">기대중, 응답됨, 인도하심</p>
        </header>
        <LoginForm />
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen">
      {/* Global Header */}
      <div className="relative flex items-center justify-between mb-8 px-1 h-10">
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
            <span className="text-xs font-bold text-slate-300 ml-1">v3.0</span>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-black text-slate-800 tracking-tighter italic whitespace-nowrap cursor-pointer select-none" onClick={() => { if (currentView !== 'groups') handleBack(); }}>
          {currentView === 'groups' ? (
            <span>PRAY <span className="text-blue-600">TEAM</span></span>
          ) : (
            currentGroup?.name || 'PRAY TEAM'
          )}
        </h1>

        {/* Right: User Info & Logout */}
        <div className="flex items-center gap-2 w-24 justify-end">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">{user.name}님</span>
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors px-2 py-1 bg-slate-50 rounded-lg hover:bg-slate-100 whitespace-nowrap"
          >
            로그아웃
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingDots label="데이터를 불러오는 중입니다" />
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
              <div className="mb-4 flex items-center gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{currentMember}</h2>
                  <p className="text-xs text-slate-400 font-bold">{currentGroup.name}</p>
                </div>
              </div>
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
    </main>
  );
}

