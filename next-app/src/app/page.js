'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { gasClient } from '@/lib/gasClient';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/context/ToastContext';
import PrayerNote from '@/components/prayer/PrayerNote';
import LoadingDots from '@/components/LoadingDots';
import LoginForm from '@/components/LoginForm';
import GroupList from '@/components/group/GroupList';
import MemberList from '@/components/group/MemberList';
import AddGroupModal from '@/components/group/AddGroupModal';
import NotificationSettingsModal from '@/components/NotificationSettingsModal';
import Sidebar from '@/components/Sidebar';
// import html2canvas from 'html2canvas'; // 동적 import로 변경

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const { permission, requestPermission } = useNotifications();
  const { showToast } = useToast();

  // State Refs for Event Listeners (avoids re-binding listeners)
  const groupPrayersRef = useRef({});
  const currentViewRef = useRef('groups');

  // Navigation State: 'groups' | 'members' | 'prayers'
  const [currentView, setCurrentView] = useState('groups');

  // Data State
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.includes('groupId=');
    }
    return false;
  });
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prayteam_theme') === 'dark';
    }
    return false;
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // [추가] 다크모드 초기화 로직 (새로고침 시 적용 보장)
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // v3.7.6 Guest Mode State (URL 파라미터 기반 초기화로 깜빡임 방지)
  const [isGuestMode, setIsGuestMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.includes('groupId=');
    }
    return false;
  });

  // [NEW] Capture Result State for Preview Modal
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedFileName, setCapturedFileName] = useState('');

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
      showToast('참여 중인 그룹이 없습니다.', 'info');
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
      showToast('전체 기도제목을 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
      setLoadingProgress('');
      logVisit('view_all_prayers');
    }
  }, [groups, showToast]);
  const handleViewAllPrayersForGroup = useCallback(async (targetGroup) => {
    if (!targetGroup) return;
    try {
      setIsLoading(true);
      setLoadingProgress('');
      const groupGradient = 'from-blue-500 to-purple-600';
      const bulkData = await gasClient.getPrayersAllGroups(targetGroup.groupId);

      if (bulkData && bulkData.error) throw new Error(bulkData.error);
      if (!bulkData || !Array.isArray(bulkData)) throw new Error('데이터 형식이 올바르지 않습니다.');

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

      if (targetGroup.members) {
        targetGroup.members.forEach(member => {
          const data = dataLookup[targetGroup.groupId] ? dataLookup[targetGroup.groupId][member] : null;
          if (data && data.prayers && data.prayers.length > 0) {
            data.prayers.forEach((prayer, pIdx) => {
              if (data.visibilities && data.visibilities[pIdx] === 'Hidden') return;
              prayersList.push(prayer);
              responsesList.push(data.responses ? data.responses[pIdx] : '');
              commentsList.push(data.comments ? data.comments[pIdx] : '');
              datesList.push(data.dates ? data.dates[pIdx] : '');
              visibilitiesList.push(data.visibilities ? data.visibilities[pIdx] : 'Show');
              metadataList.push({
                groupName: targetGroup.name,
                memberName: member,
                gradientClass: groupGradient,
                updatedAt: data.작성시간
              });
            });
          }
        });
      }

      setViewAllData({
        prayers: prayersList, responses: responsesList,
        comments: commentsList, dates: datesList,
        visibilities: visibilitiesList, metadata: metadataList
      });
      setCurrentView('all_prayers');
    } catch (error) {
      console.error('Failed to fetch group prayers:', error);
      showToast('기도제목을 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  /* 📌 초기화 로직 (URL 파라미터 체크 및 게스트 모드)               */
  /* ========================================================================= */
  useEffect(() => {
    const initView = async () => {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.split('?')[1]);
      const groupId = params.get('groupId');
      const targetMember = params.get('member') ? decodeURIComponent(params.get('member')) : null;

      if (groupId) {
        // [Guest Mode Logic]
        // 로그인 여부와 상관없이, URL에 groupId가 있으면 해당 그룹을 우선 표시
        if (groupId) {
          setIsLoading(true);
          try {
            const res = await gasClient.getGroupById(groupId);
            if (res.group) {
              const formattedGroup = {
                groupId: res.group.그룹ID,
                name: res.group.그룹명,
                members: res.group.구성원목록
              };
              setIsGuestMode(true);
              setCurrentGroup(formattedGroup);

              // 데이터 로드
              const prayersData = await gasClient.getPrayersAll(groupId);

              // 1. 전체 보기 데이터 설정
              const prayersList = []; const responsesList = [];
              const commentsList = []; const datesList = [];
              const visibilitiesList = []; const metadataList = [];

              // groupPrayersRef 업데이트 (나중에 멤버 전환 시 사용)
              // 배열(prayersData)을 맵으로 변환
              const newGroupPrayers = {};
              if (Array.isArray(prayersData)) {
                prayersData.forEach(pData => {
                  newGroupPrayers[pData.멤버이름] = pData;
                });
              }

              groupPrayersRef.current = newGroupPrayers;
              setGroupPrayers(newGroupPrayers); // [NEW] MemberList 렌더링을 위해 state 업데이트

              // 데이터 순회 (배열이므로 forEach 사용)
              if (Array.isArray(prayersData)) {
                prayersData.forEach(pData => {
                  const member = pData.멤버이름;
                  if (pData.prayers) {
                    pData.prayers.forEach((p, idx) => {
                      if (pData.visibilities && pData.visibilities[idx] === 'Hidden') return;
                      prayersList.push(p);
                      responsesList.push(pData.responses ? pData.responses[idx] : '');
                      commentsList.push(pData.comments ? pData.comments[idx] : '');
                      datesList.push(pData.dates ? pData.dates[idx] : '');
                      visibilitiesList.push('Show');
                      metadataList.push({ member, originalIndex: idx });
                    });
                  }
                });
              }

              setViewAllData({
                prayers: prayersList, responses: responsesList,
                comments: commentsList, dates: datesList,
                visibilities: visibilitiesList, metadata: metadataList
              });

              // 2. 타겟 멤버가 있고 유효한 경우 해당 멤버 뷰로 이동
              if (targetMember && newGroupPrayers[targetMember]) {
                setCurrentMember(targetMember);
                const tmData = newGroupPrayers[targetMember];
                setPrayers(tmData.prayers);
                setResponses(tmData.responses);
                setComments(tmData.comments);
                setDates(tmData.dates || []);
                setVisibilities(tmData.visibilities || []);
                setIndices(tmData.indices || []);
                setCurrentView('prayers');
                logVisit('prayer_note_direct', { groupId, member: targetMember });
              } else {
                setCurrentView('members'); // [NEW] 기본적으로 멤버 목록 표시 (관리자 화면과 동일)
                logVisit('guest_view_members', { groupId });
              }
            }
          } catch (e) {
            console.error('Guest access failed', e);
            showToast('그룹 정보를 불러오는데 실패했습니다.', 'error');
          } finally {
            setIsLoading(false);
            setIsInitialLoad(false);
          }
        } else {
          setIsInitialLoad(false);
        }
      } else {
        setIsInitialLoad(false);
      }
    };

    if (!authLoading) {
      initView();
    }
  }, [user, authLoading, logVisit]);

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
  // ✅ New Handler: Share current group link
  const handleShareGroup = useCallback(() => {
    if (!currentGroup) return;

    let url = `https://praygroup.creat1324.com/#members?groupId=${currentGroup.groupId}`;

    // 특정 멤버의 기도제목을 보고 있다면 해당 멤버 링크 생성
    if (currentView === 'prayers' && currentMember) {
      url += `&member=${encodeURIComponent(currentMember)}`;
    }

    navigator.clipboard.writeText(url).then(() => {
      const msg = currentView === 'prayers' && currentMember
        ? `✨ ${currentMember}님의 기도제목 링크를 복사했습니다!`
        : '✨ 그룹 링크를 복사했습니다. 소중한 분들께 전해보세요!';
      showToast(msg, 'success');
    }).catch(err => {
      console.error('Failed to copy', err);
      showToast('링크 복사에 실패했습니다.', 'error');
    });
  }, [currentGroup, currentView, currentMember, showToast]);

  // ✅ Helper: Robust Copy to Clipboard
  const copyToClipboard = useCallback((text, successMsg) => {
    // 1. Try Navigator API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => showToast(successMsg, 'success'))
        .catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }

    function fallbackCopy(textToCopy, msg) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;

        // Ensure textarea is not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          showToast(msg, 'success');
        } else {
          showToast('텍스트 복사에 실패했습니다.', 'error');
        }
      } catch (err) {
        showToast('텍스트 복사 중 오류가 발생했습니다.', 'error');
      }
    }
  }, [showToast]);

  // ✅ New Handler: Share all prayers as one text string
  const handleShareAllPrayersText = useCallback(() => {
    if (!currentGroup) {
      showToast('선택된 그룹이 없습니다.', 'error');
      return;
    }

    const members = currentGroup.members || [];
    if (members.length === 0) {
      showToast('공유할 멤버가 없습니다.', 'info');
      return;
    }

    let text = `🙏 [${currentGroup.name}] 기도제목\n\n`;
    let hasData = false;

    members.forEach(member => {
      const data = groupPrayers[member];
      if (data && data.prayers && data.prayers.length > 0) {
        hasData = true;
        text += `[${member}]\n`;
        data.prayers.forEach((p, idx) => {
          if (data.visibilities && data.visibilities[idx] === 'Hidden') return;
          text += `- ${p}\n`;
        });
        text += `\n`;
      }
    });

    if (!hasData) {
      showToast('불러온 기도제목이 없습니다. 먼저 멤버들을 클릭하여 내용을 확인해주세요.', 'info');
      return;
    }

    text += `✨ 우리 기도를 반드시 응답하시는 하나님을 찬양합니다.\n`;
    text += `https://praygroup.creat1324.com`;

    const successMsg = '클립보드에 복사되었습니다. 단톡방에 붙여넣어주세요';

    // Always use clipboard as requested by user
    copyToClipboard(text, successMsg);
  }, [currentGroup, groupPrayers, showToast, copyToClipboard]);

  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('prayteam_theme', newMode ? 'dark' : 'light');
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newMode;
    });
  }, []);

  const handleAddGroup = async (groupName, memberList) => {
    if (!groupName || !groupName.trim()) {
      showToast('그룹 이름을 입력해주세요.', 'error');
      return;
    }
    try {
      setIsLoading(true);
      const result = await gasClient.addGroup(user.id, groupName.trim(), memberList);
      if (!result || !result.success) throw new Error(result?.message || '그룹 추가에 실패했습니다.');

      await loadGroups();
      showToast(`"${groupName}" 그룹이 성공적으로 만들어졌습니다!`, 'success');
    } catch (error) {
      showToast(error.message || '그룹 추가에 실패했습니다.', 'error');
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
      } else if (hash.startsWith('#members')) {
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
    let newResponses = responses;
    if (status !== undefined) {
      newResponses = [...responses];
      newResponses[index] = status;
      setResponses(newResponses);
    }

    // 2. Update Visibility State
    let newVisibilities = visibilities;
    if (visibility !== undefined) {
      newVisibilities = [...visibilities];
      newVisibilities[index] = visibility;
      setVisibilities(newVisibilities);
    }

    // [Fix] Update Parent State (groupPrayers) for MemberList synchronization
    setGroupPrayers(prev => {
      const next = { ...prev };
      next[currentMember] = {
        ...next[currentMember],
        responses: newResponses,
        visibilities: newVisibilities
      };
      groupPrayersRef.current = next; // Sync Ref
      return next;
    });

    // Mark as unsaved
    setHasUnsavedChanges(true);

    // [Policy] Save immediately when archiving or restoring for best UX
    if (status === '보관됨' || status === '기대중') {
      setIsSaving(true);
      try {
        await gasClient.savePrayer({
          groupId: currentGroup.groupId,
          groupName: currentGroup.name,
          member: currentMember,
          prayers: prayers,
          responses: newResponses,
          comments: comments,
          visibilities: newVisibilities
        });
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Auto save on status update failed:', error);
        showToast('❌ 실시간 저장에 실패했습니다. (나중에 수동 저장 가능)', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // ✅ New Handler: Add a new prayer
  // ✅ New Handler: Add a new prayer & Save Immediately
  const handleAddPrayer = async (newText) => {
    if (!newText || !newText.trim()) return false;

    const newPrayers = [...prayers, newText];
    const newResponses = [...responses, '기대중'];
    const newComments = [...comments, ''];
    const newVisibilities = [...visibilities, ''];
    const newDates = [...dates, '']; // Date handled by backend

    // Optimistic UI Update
    setPrayers(newPrayers);
    setResponses(newResponses);
    setComments(newComments);
    setVisibilities(newVisibilities);
    setDates(newDates);

    // [Fix] Update Parent State (groupPrayers) for MemberList synchronization
    setGroupPrayers(prev => {
      const next = { ...prev };
      next[currentMember] = {
        ...next[currentMember],
        prayers: newPrayers,
        responses: newResponses,
        comments: newComments,
        dates: newDates,
        visibilities: newVisibilities,
        indices: indices // Keep indices as is or update if needed
      };
      groupPrayersRef.current = next; // Sync Ref
      return next;
    });

    // Save Immediately
    setIsSaving(true);
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

      setHasUnsavedChanges(false);
      showToast('✅ 저장되었습니다!', 'success');
      return true;
    } catch (error) {
      console.error('Save failed:', error);
      showToast('❌ 저장에 실패했습니다.', 'error');
      setHasUnsavedChanges(true); // Revert to unsaved if failed
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ New Handler: Edit existing prayer text
  const handleEditPrayer = async (index, newText) => {
    if (index < 0 || index >= prayers.length) return;

    const newPrayers = [...prayers];
    newPrayers[index] = newText;
    setPrayers(newPrayers);

    setHasUnsavedChanges(true);
  };

  const handleSaveComment = async (index, comment) => {
    const newComments = [...comments];
    newComments[index] = comment;
    setComments(newComments);
    setHasUnsavedChanges(true);
  };

  // 💾 Save All Changes
  const handleSaveAll = async () => {
    if (!hasUnsavedChanges || isSaving) return;

    setIsSaving(true);
    try {
      await gasClient.savePrayer({
        groupId: currentGroup.groupId,
        groupName: currentGroup.name,
        member: currentMember,
        prayers: prayers,
        responses: responses,
        comments: comments,
        visibilities: visibilities
      });

      // [Fix] Sync Parent State (groupPrayers) on Save All
      setGroupPrayers(prev => {
        const next = { ...prev };
        next[currentMember] = {
          ...next[currentMember],
          prayers: prayers,
          responses: responses,
          comments: comments,
          visibilities: visibilities,
          dates: dates, // Keep current dates
          indices: indices
        };
        groupPrayersRef.current = next; // Sync Ref
        return next;
      });

      setHasUnsavedChanges(false);
      showToast('✅ 저장되었습니다!', 'success');
    } catch (error) {
      console.error('Save all failed:', error);
      showToast('❌ 저장에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const captureAsImage = async () => {
    // 캡처 모드 전환 대기
    try {
      setIsCapturing(true);      // 캡처 모드 전환 대기 (User Activation 유지를 위해 시간 단축)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 최후의 수단: 특정 요소를 못 찾으면 body 전체를 캡처 시도
      let captureElement = document.getElementById('prayer-note-container');
      if (!captureElement) {
        console.warn('Id not found, fallback to body');
        captureElement = document.body;
      }

      // 동적으로 html2canvas import
      let html2canvas;
      try {
        html2canvas = (await import('html2canvas')).default;
      } catch (importError) {
        showToast('html2canvas 로드 실패');
        return;
      }

      const canvas = await html2canvas(captureElement, {
        backgroundColor: isDarkMode ? '#000000' : '#ffffff',
        scale: 2,
        logging: false, // 로깅 비활성화
        useCORS: true,
        allowTaint: true,
        ignoreElements: (node) => {
          // 사이드바, 토스트, 버튼 등 불필요한 요소 제외 시도 (클래스나 태그로)
          return node.classList?.contains('fixed') || node.tagName === 'BUTTON';
        }
      });

      // Canvas를 이미지로 변환 및 처리
      try {
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas to Blob conversion failed'));
          }, 'image/png');
        });

        // 파일 이름 생성
        const safeMemberName = currentMember || '전체';
        const fileName = `${currentGroup?.name || '기도팀'}_${safeMemberName}_${new Date().toISOString().split('T')[0]}.png`;

        // 1. 공유 API 시도 (모바일)
        if (navigator.share && navigator.canShare({ files: [new File([blob], fileName, { type: 'image/png' })] })) {
          try {
            const file = new File([blob], fileName, { type: 'image/png' });
            await navigator.share({
              files: [file],
              title: `${safeMemberName}님의 기도제목`,
              text: `${currentGroup?.name || '기도팀'} - ${safeMemberName}님의 기도제목`
            });
            showToast('공유가 완료되었습니다!', 'success');
          } catch (shareError) {
            console.warn('Share canceled/failed, open preview modal', shareError);
            // 공유 실패 시 Data URL로 변환하여 모달 띄우기 (Blob URL보다 호환성 좋음)
            const dataUrl = canvas.toDataURL('image/png');
            setCapturedImage(dataUrl);
            setCapturedFileName(fileName);
          }
        }
        // 2. 공유 미지원 시 (PC, 인앱브라우저 등) -> Data URL 모달 띄우기
        else {
          // Base64 Data URL 생성
          const dataUrl = canvas.toDataURL('image/png');
          setCapturedImage(dataUrl);
          setCapturedFileName(fileName);
        }

      } catch (blobError) {
        console.error('Blob creation error:', blobError);
        showToast('이미지 처리 중 오류가 발생했습니다.');
      }

    } catch (error) {
      console.error('Image capture failed:', error);
      showToast('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  // copyToClipboard 함수 제거됨

  const downloadImage = (url, fileName) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cleanup is simpler for data URLs (no revoke needed usually, but good practice to clear state)
  const closeCaptureModal = () => {
    setCapturedImage(null);
    setCapturedFileName('');
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingDots label="자동 로그인 중입니다..." /></div>;

  if (!user && !isGuestMode) {
    return (
      <main className="container mx-auto px-4 min-h-[100dvh] flex flex-col justify-between py-10">
        <header className="text-center space-y-2 pt-8">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            PRAY <span className="text-blue-600">TEAM</span>
          </h1>
          <p className="text-slate-500 font-bold text-lg italic">반드시 응답하시는 하나님</p>
        </header>

        <div className="w-full flex justify-center my-6">
          <LoginForm />
        </div>

        <div className="text-center pb-6">
          <p className="text-slate-400 text-sm font-medium">아직 회원이 아니신가요?</p>
          <button
            onClick={() => window.location.href = '/signup'}
            className="text-blue-600 font-bold mt-2 text-lg hover:underline animate-pulse"
          >
            🕊️ 회원가입 하러가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen bg-transparent dark:bg-black">
      {/* Global Header */}
      <div className="relative flex items-center justify-between mb-0.5 px-1 h-10">
        {/* Left: Back Button */}
        <div className="w-10 flex justify-start">
          {currentView !== 'groups' && (
            <button
              onClick={handleBack}
              className="p-2 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center"
              title="뒤로 가기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter italic whitespace-nowrap cursor-pointer select-none" onClick={() => { if (currentView !== 'groups') handleBack(); }}>
          {currentView === 'groups' ? (
            <span>PRAY <span className="text-blue-600 dark:text-blue-400">TEAM</span></span>
          ) : (currentView === 'all_prayers' || currentView === 'members' || currentView === 'prayers') ? (
            currentGroup?.name || (currentView === 'all_prayers' ? '전체 기도제목' : 'PRAY TEAM')
          ) : (
            <span>PRAY <span className="text-blue-600 dark:text-blue-400">TEAM</span></span>
          )}
        </h1>

        {/* Right: Menu Only */}
        <div className="w-10 flex justify-end">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center group"
            title="메뉴"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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
            <div id="prayer-note-container" className="animate-in fade-in slide-in-from-right-8 duration-500">
              <PrayerNote
                prayers={prayers}
                responses={responses}
                comments={comments}
                dates={dates}
                visibilities={visibilities}
                memberName={currentMember}
                isReadOnly={false}
                onUpdateStatus={handleUpdateStatus}
                onSaveComment={handleSaveComment}
                onAddPrayer={handleAddPrayer}
                onEditPrayer={handleEditPrayer}
                onSave={handleSaveAll}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                isCapturing={isCapturing}
              />
            </div>
          )}

          {currentView === 'all_prayers' && viewAllData && (
            <div id="prayer-note-container" className="animate-in fade-in slide-in-from-right-8 duration-500">
              {/* No local header here, using global header */}
              <PrayerNote
                prayers={viewAllData.prayers}
                responses={viewAllData.responses}
                comments={viewAllData.comments}
                dates={viewAllData.dates}
                visibilities={viewAllData.visibilities}
                metadata={viewAllData.metadata}
                isCapturing={isCapturing}
              />
            </div>
          )}
        </>
      )}

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

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={logout}
        isGuestMode={isGuestMode}
        currentGroup={currentGroup}
        onShareGroup={handleShareGroup}
        onOpenNotificationSettings={() => setIsNotificationModalOpen(true)}
        isCurrentGroupNotiEnabled={isCurrentGroupNotiEnabled}
        onCaptureImage={captureAsImage}
        onShareText={handleShareAllPrayersText}
        currentMember={currentMember}
        currentView={currentView}
        onStatusChange={setIsCurrentGroupNotiEnabled}
      />

      {/* Capture Preview Modal (For Manual Save) */}
      {capturedImage && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300" onClick={closeCaptureModal}>
          <div className="relative max-w-full max-h-[80vh] bg-transparent rounded-lg overflow-visible" onClick={e => e.stopPropagation()}>
            <img src={capturedImage} alt="Captured Prayer Note" className="max-w-full max-h-[70vh] object-contain rounded-md shadow-2xl border border-white/20" />

            <div className="mt-6 flex flex-col items-center gap-3 w-full">
              <p className="text-white text-lg font-bold animate-pulse text-center">
                👇 이미지를 꾹 길게 눌러<br />
                <span className="text-yellow-400 text-xl">'사진 앱에 저장'</span>을 선택하세요!
              </p>
              <div className="flex gap-3 w-full justify-center">
                <button
                  onClick={() => downloadImage(capturedImage, capturedFileName)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <span>💾 다운로드</span>
                </button>
                <button
                  onClick={closeCaptureModal}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

