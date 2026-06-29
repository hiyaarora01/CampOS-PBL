import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CaretLeft, PaperPlaneRight, UploadSimple, Trash, Warning, Check, Cards, Info, List, CaretDown, NotePencil, Plus, Microphone, CheckSquare } from '@phosphor-icons/react';
import { API_BASE } from '../config/api';
import { getUsername, getAttendanceFromCache, getSemesterFromCache } from '../utils/cache';
import haptic from '../utils/haptic';
import M3ScreenHeader from './M3ScreenHeader';

export default function CampAi({ currentUser, setActiveTab }) {
  const [activeSubTab, setActiveSubTab] = useState('chat'); // 'chat' | 'flashcards'
  const [isDarkMode, setIsDarkMode] = useState(() => !document.body.classList.contains('mode-light'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(!document.body.classList.contains('mode-light'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Batch setup
  const [batchConfig, setBatchConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('timetable_selection') || 'null'); } catch { return null; }
  });
  const [showBatchSetup, setShowBatchSetup] = useState(false);
  const [setupMeta, setSetupMeta] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupCourse, setSetupCourse] = useState('btech-62');
  const [setupSem, setSetupSem] = useState('sem4');
  const [setupPhase, setSetupPhase] = useState('phase1');
  const [setupBatch, setSetupBatch] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback((e) => {
    setIsScrolled(e.target.scrollTop > 10);
  }, []);
  
  // Chat States
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: `Hey ${currentUser?.firstName || 'there'}! I'm CampAi, your personal college copilot.\n\nAsk me anything about your class timetable, attendance margins, today's mess menu, or upload a study PDF in the **Flashcards** tab to generate study cards instantly!`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const messageIdRef = useRef(1);

  // Flashcards States
  const [decks, setDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeDeck, setActiveDeck] = useState(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState(() => {
    try {
      const saved = localStorage.getItem('campos_mastered_cards');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('campos_mastered_cards', JSON.stringify(masteredCards));
  }, [masteredCards]);

  // Load saved decks on mount
  useEffect(() => {
    let active = true;
    const loadDecks = async () => {
      try {
        setLoadingDecks(true);
        const res = await fetch(`${API_BASE}/api/ai/flashcards`, { credentials: 'include' });
        if (res.ok && active) {
          const data = await res.json();
          if (data.success) {
            setDecks(data.decks || []);
          }
        }
      } catch (e) {
        console.error('Failed to load flashcard decks:', e);
      } finally {
        if (active) {
          setLoadingDecks(false);
        }
      }
    };
    loadDecks();
    return () => {
      active = false;
    };
  }, []);

  // Auto-scroll chat (only when batch setup is not showing)
  useEffect(() => {
    if (!showBatchSetup) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, showBatchSetup]);

  // Check batch config on mount — show setup if user hasn't explicitly set their batch
  useEffect(() => {
    const confirmed = localStorage.getItem('batch_confirmed');
    
    // First, try to get selection from timetable_selection
    let savedSelection = (() => {
      try {
        const saved = localStorage.getItem('timetable_selection');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    })();

    // Try to check if we can get batch/semester from student portal data (profileData)
    let portalSelection = null;
    try {
      const cachedProfile = localStorage.getItem('profileData');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        const profile = parsed.data || parsed;
        if (profile && profile.batch) {
          const branchRaw = (profile.branch || '').toLowerCase();
          const semRaw = (profile.semester || '').toLowerCase();
          const semNum = semRaw.match(/(\d+)/)?.[1] ||
            { 'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6', 'vii': '7', 'viii': '8' }[
              semRaw.replace(/[^ivx]/g, '').trim()
            ] || '4';
          
          const detectedSemester = profile.detectedSemester || `sem${semNum}`;
          let detectedCourse = profile.detectedCourse || 'btech-62';
          if (!profile.detectedCourse) {
            if (branchRaw.includes('128') || (branchRaw.includes('computer') && (semNum === '1' || semNum === '2'))) {
              detectedCourse = 'btech-128';
            } else if (branchRaw.includes('bca')) {
              detectedCourse = 'bca-62';
            }
          }

          portalSelection = {
            course: detectedCourse,
            semester: detectedSemester,
            phase: 'phase1',
            batch: profile.batch.toLowerCase()
          };
        }
      }
    } catch (e) {
      console.warn("Failed to check portal data for batch configuration:", e);
    }

    // If portal data exists, use it (and update if different from saved)
    if (portalSelection) {
      const isDifferent = !savedSelection || 
                          savedSelection.batch !== portalSelection.batch || 
                          savedSelection.semester !== portalSelection.semester ||
                          savedSelection.course !== portalSelection.course;
      if (isDifferent) {
        localStorage.setItem('timetable_selection', JSON.stringify(portalSelection));
        localStorage.setItem('batch_confirmed', 'true');
        setBatchConfig(portalSelection);
        setShowBatchSetup(false);
        return;
      } else {
        savedSelection = portalSelection;
      }
    }

    if (savedSelection && savedSelection.batch) {
      setBatchConfig(savedSelection);
      setShowBatchSetup(false);
      localStorage.setItem('batch_confirmed', 'true');
    } else if (!confirmed) {
      setShowBatchSetup(true);
      setSetupLoading(true);
      fetch(`${API_BASE}/api/timetable/metadata`)
        .then(r => r.json())
        .then(meta => { setSetupMeta(meta); setSetupLoading(false); })
        .catch(() => setSetupLoading(false));
    }
  }, []);

  const handleSaveBatch = useCallback(() => {
    if (!setupBatch) return;
    haptic.success();
    const config = { course: setupCourse, semester: setupSem, phase: setupPhase, batch: setupBatch };
    localStorage.setItem('timetable_selection', JSON.stringify(config));
    localStorage.setItem('batch_confirmed', 'true');
    setBatchConfig(config);
    setShowBatchSetup(false);
  }, [setupCourse, setupSem, setupPhase, setupBatch]);

  // Compile student context from localStorage
  const getStudentContext = useCallback(async () => {
    const context = {
      profile: {},
      attendance: [],
      timetable: [],
      messMenu: null,
      attendanceGoal: 75
    };

    try {
      // 1. Get profile data
      const cachedProfile = localStorage.getItem('profileData');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        context.profile = parsed.data || parsed;
      }

      // Get base username which is exactly what StudentDashboard uses for cache keys
      const baseUsername = getUsername(currentUser?.email) || (currentUser?.email ? currentUser.email.split('@')[0] : 'user');
      const enrollmentNo = (context.profile?.enrollment && context.profile.enrollment !== '—')
        ? context.profile.enrollment
        : baseUsername;

      // Ensure batch and semester from timetable_selection are populated in profile context
      const sel = (() => { try { return JSON.parse(localStorage.getItem('timetable_selection') || 'null'); } catch { return null; } })();
      if (sel) {
        if (sel.batch && !context.profile.batch) {
          context.profile.batch = sel.batch.toUpperCase();
        }
        if (sel.semester && !context.profile.semester) {
          context.profile.semester = sel.semester.toUpperCase();
        }
      }

      // 2. Get attendance goal
      const cachedGoal = localStorage.getItem('attendanceGoal');
      if (cachedGoal) {
        context.attendanceGoal = Number(cachedGoal);
      }

      // 3. Get active semester and attendance
      let cachedAtt = null;
      let sem = await getSemesterFromCache();
      
      if (sem) {
        // Construct potential keys to check directly
        const semKeys = [
          typeof sem === 'string' ? sem : null,
          sem?.registrationcode,
          sem?.registration_code,
          sem?.registrationid,
          sem?.registration_id,
          sem?.stynumber
        ].filter(Boolean);

        const usernames = [enrollmentNo, baseUsername].filter(Boolean);
        const keysToTry = [];
        for (const username of usernames) {
          for (const sKey of semKeys) {
            keysToTry.push(`attendance-${username}-${sKey}`);
          }
        }

        for (const key of keysToTry) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              const data = parsed?.data || parsed;
              if (Array.isArray(data) && data.length > 0) {
                cachedAtt = data;
                break;
              }
            }
          } catch (e) {}
        }
      }

      // Fallback 1: Scan semesters data to find key
      if (!cachedAtt) {
        try {
          let cachedSems = localStorage.getItem(`semesters-${enrollmentNo}`);
          if (!cachedSems) cachedSems = localStorage.getItem(`semesters-${baseUsername}`);
          
          if (cachedSems) {
            const parsed = JSON.parse(cachedSems);
            const list = parsed.data || parsed;
            if (Array.isArray(list)) {
              for (const s of list) {
                const semKeyVal = s.registrationcode || s.registrationid;
                if (!semKeyVal) continue;
                for (const username of [enrollmentNo, baseUsername]) {
                  const key = `attendance-${username}-${semKeyVal}`;
                  const raw = localStorage.getItem(key);
                  if (raw) {
                    const parsedAtt = JSON.parse(raw);
                    const data = parsedAtt?.data || parsedAtt;
                    if (Array.isArray(data) && data.length > 0) {
                      cachedAtt = data;
                      break;
                    }
                  }
                }
                if (cachedAtt) break;
              }
            }
          }
        } catch (e) {}
      }

      // Fallback 2: Scan all attendance keys in localStorage containing the username
      if (!cachedAtt) {
        try {
          const keys = Object.keys(localStorage);
          const attKeys = keys.filter(k => k.startsWith('attendance-') && (k.includes(enrollmentNo) || k.includes(baseUsername)));
          console.warn("CAMP_AI_DEBUG [getStudentContext] Fallback 2: enrollmentNo =", enrollmentNo, "baseUsername =", baseUsername, "matching attKeys =", attKeys, "all localStorage keys =", keys);
          
          for (const key of attKeys) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              const data = parsed?.data || parsed;
              if (Array.isArray(data) && data.length > 0) {
                console.warn("CAMP_AI_DEBUG [getStudentContext] Fallback 2: Found cached attendance data for key:", key, data);
                cachedAtt = data;
                break;
              }
            }
          }
        } catch (scanErr) {
          console.warn("Failed to scan localStorage for fallback attendance:", scanErr);
        }
      }

      // Fallback 3: Last resort, scan all attendance keys regardless of username
      if (!cachedAtt) {
        try {
          const keys = Object.keys(localStorage);
          const attKeys = keys.filter(k => k.startsWith('attendance-'));
          console.warn("CAMP_AI_DEBUG [getStudentContext] Fallback 3: all attKeys =", attKeys);
          for (const key of attKeys) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              const data = parsed?.data || parsed;
              if (Array.isArray(data) && data.length > 0) {
                console.warn("CAMP_AI_DEBUG [getStudentContext] Fallback 3: Found cached attendance data for key:", key, data);
                cachedAtt = data;
                break;
              }
            }
          }
        } catch (e) {}
      }

      if (Array.isArray(cachedAtt)) {
        context.attendance = cachedAtt;
      }

      // 4. Get real timetable from backend, filtered by the user's configured batch
      try {
        const sel = (() => { try { return JSON.parse(localStorage.getItem('timetable_selection') || 'null'); } catch { return null; } })();
        if (sel?.batch) {
          const classKey = `${sel.course}_${sel.semester}_${sel.phase}_${sel.batch}`;
          const ttRes = await fetch(`${API_BASE}/api/timetable/classes`);
          if (ttRes.ok) {
            const allClasses = await ttRes.json();
            const batchData = allClasses[classKey];
            if (batchData && batchData.classes) {
              const events = [];
              for (const [day, dayClasses] of Object.entries(batchData.classes)) {
                for (const cls of dayClasses) {
                  events.push({
                    day,
                    subject: cls.subject,
                    start: cls.start,
                    end: cls.end,
                    venue: cls.venue || 'N/A',
                    teacher: cls.teacher || 'Faculty',
                    type: cls.type === 'L' ? 'Lecture' : cls.type === 'T' ? 'Tutorial' : 'Practical',
                  });
                }
              }
              context.timetable = events;
              context.profile = { ...context.profile, batch: sel.batch.toUpperCase(), classKey };
            }
          }
        }
      } catch (ttErr) {
        console.warn('Failed to fetch timetable for AI context:', ttErr);
      }

      // 5. Get today's daily mess menu from database
      const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const menuRes = await fetch(`${API_BASE}/api/mess/daily?day=${todayDay}`, { credentials: 'include' });
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (Array.isArray(menuData)) {
          const mappedMenu = {};
          menuData.forEach(meal => {
            const title = meal.title || '';
            const itemsStr = Array.isArray(meal.items) ? meal.items.join(', ') : (meal.items || '');
            if (title.toLowerCase().includes('breakfast')) {
              mappedMenu.Breakfast = itemsStr;
            } else if (title.toLowerCase().includes('lunch')) {
              mappedMenu.Lunch = itemsStr;
            } else if (title.toLowerCase().includes('snack') || title.toLowerCase().includes('tea')) {
              mappedMenu.Snack = itemsStr;
            } else if (title.toLowerCase().includes('dinner')) {
              mappedMenu.Dinner = itemsStr;
            }
          });
          context.messMenu = mappedMenu;
        } else {
          context.messMenu = menuData;
        }
      }
    } catch (e) {
      console.warn('Failed to gather student context for AI:', e);
    }

    return context;
  }, [currentUser]);

  // ── Render AI markdown as JSX ──
  const renderMarkdown = useCallback((text) => {
    if (!text) return null;
    // Strip emoji characters
    const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '').trim();
    const lines = clean.split('\n');
    return lines.map((line, i) => {
      // Render bold with inline spans
      const parts = line.split(/\*\*([^*]+)\*\*/g);
      const rendered = parts.map((p, j) =>
        j % 2 === 1 ? <span key={j} className="font-bold text-m3-onSurface">{p}</span> : p
      );
      // Bullet point
      if (line.match(/^[*•-]\s/)) {
        return <div key={i} className="flex gap-1.5 items-start"><span className="text-m3-primary mt-0.5">•</span><span>{rendered.slice(1)}</span></div>;
      }
      // Heading (##)
      if (line.startsWith('## ')) {
        return <div key={i} className="font-black text-m3-onSurface text-sm mt-2 mb-0.5">{line.slice(3)}</div>;
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <div key={i}>{rendered}</div>;
    });
  }, []);

  // ── Visual schedule card for today/tomorrow ──
  const handleScheduleQuery = useCallback(async (dayLabel) => {
    messageIdRef.current += 1;
    const currentId = messageIdRef.current;
    setMessages(prev => [...prev, { id: 'msg-' + currentId, role: 'user', text: dayLabel === 'today' ? "Today's classes" : "Tomorrow's schedule", timestamp: new Date() }]);
    setIsTyping(true);
    try {
      const context = await getStudentContext();
      const now = new Date(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata' }).format(new Date()));
      const targetDate = new Date(now);
      if (dayLabel === 'tomorrow') targetDate.setDate(targetDate.getDate() + 1);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
      const classes = (context.timetable || []).filter(e => e.day === dayName);
      classes.sort((a, b) => a.start?.localeCompare(b.start));
      setMessages(prev => [...prev, {
        id: 'msg-' + currentId + '-schedule',
        role: 'model',
        type: 'schedule',
        scheduleDay: dayName,
        scheduleLabel: dayLabel === 'today' ? 'Today' : 'Tomorrow',
        scheduleClasses: classes,
        timestamp: new Date()
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: 'msg-' + currentId + '-err', role: 'model', text: 'Could not load your schedule. Try again.', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  }, [getStudentContext]);

  const handleSendMessage = useCallback(async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!textToSend) setInputText('');

    messageIdRef.current += 1;
    const currentId = messageIdRef.current;

    // Format user message properties before adding to state representation
    const userMessage = {
      id: 'msg-' + currentId,
      role: 'user',
      text: text.split('').reverse().join(''),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const context = await getStudentContext();
      console.warn("CAMP_AI_DEBUG [handleSendMessage] Sending Context to Backend:", context);
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.split('').reverse().join(''), context }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const userQueryLower = text.toLowerCase();
          const isAttendanceQuery = userQueryLower.includes('attendance') || 
                                     userQueryLower.includes('skip') || 
                                     userQueryLower.includes('miss') || 
                                     userQueryLower.includes('classes') ||
                                     userQueryLower.includes('class');

          setMessages(prev => [...prev, {
            id: 'msg-' + currentId + '-ai',
            role: 'model',
            text: data.reply,
            attendance: isAttendanceQuery ? context.attendance : undefined,
            attendanceGoal: isAttendanceQuery ? context.attendanceGoal : undefined,
            timestamp: new Date()
          }]);
        }
      } else if (res.status === 401) {
        setMessages(prev => [...prev, {
          id: 'msg-' + currentId + '-error',
          role: 'model',
          text: '🔒 Your session has expired. Please refresh the page and log back in to continue chatting!',
          timestamp: new Date()
        }]);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error ${res.status}`);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: 'msg-' + currentId + '-error',
        role: 'model',
        text: '❌ Oops! I had trouble connecting. Please check if the backend server is running and the Gemini API key is configured.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, getStudentContext]);

  const handlePdfUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      setUploadError('Only PDF files are supported.');
      return;
    }

    setUploadError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch(`${API_BASE}/api/ai/flashcards/generate`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDecks(prev => [data.deck, ...prev]);
        setActiveDeck(data.deck);
        setActiveCardIndex(0);
        setIsCardFlipped(false);
        setActiveSubTab('flashcards'); // stay on flashcard tab but open the viewer
      } else {
        setUploadError(data.message || 'Failed to generate flashcards.');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Network error uploading file. Verify backend settings.');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDeleteDeck = useCallback(async (deckId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this flashcard deck permanently?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/ai/flashcards/${deckId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setDecks(prev => prev.filter(d => d._id !== deckId));
        if (activeDeck?._id === deckId) {
          setActiveDeck(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete deck:', err);
    }
  }, [activeDeck]);

  const handleNewChat = useCallback(() => {
    haptic('medium');
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: `Hey ${currentUser?.firstName || 'there'}! I'm CampAi, your personal college copilot.\n\nAsk me anything about your class timetable, attendance margins, today's mess menu, or upload a study PDF in the **Flashcards** tab to generate study cards instantly!`,
        timestamp: new Date()
      }
    ]);
  }, [currentUser]);

  const starterPrompts = [
    { label: "Today's classes",       action: 'today' },
    { label: "Tomorrow's schedule",   action: 'tomorrow' },
    { label: "Can I skip tomorrow?",      action: 'chat' },
    { label: "Summarize my attendance",   action: 'chat' },
    { label: "What's for dinner?",        action: 'chat' },
    { label: "How many can I miss?",      action: 'chat' },
  ];

  const isZeroState = messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome');

  return (
    <div 
      className={`m3-screen relative transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
      style={{
        background: isDarkMode 
          ? 'radial-gradient(circle at bottom, color-mix(in srgb, var(--m3-primary) 14%, transparent) 0%, var(--m3-home-surface) 75%)' 
          : 'radial-gradient(circle at bottom, color-mix(in srgb, var(--m3-primary) 10%, transparent) 0%, var(--m3-home-surface) 100%)',
        color: isDarkMode ? '#ffffff' : '#1e1e20'
      }}
    >
      {/* Global SVG gradients definition */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--m3-primary) 35%, #ffffff)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--m3-primary)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--m3-primary) 65%, #000000)' }} />
          </linearGradient>
        </defs>
      </svg>

      {/* Batch Setup Overlay — always visible until batch is confirmed */}
      <AnimatePresence>
        {showBatchSetup && (
          <motion.div
            key="batch-setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col justify-end pb-6 px-4"
            style={{ background: 'var(--m3-surface, #0f0f13)' }}
          >
            {/* Header */}
            <div className="flex-1 flex flex-col justify-center items-center gap-2 pb-4">
              <span className="text-4xl">🎓</span>
              <h2 className="text-lg font-black text-m3-onSurface">What's your batch?</h2>
              <p className="text-xs text-m3-onSurfaceVariant text-center leading-relaxed max-w-[240px]">
                I'll use this to show your exact timetable. You only need to do this once.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-m3-outlineVariant/20 bg-m3-surfaceContainer p-4">
              {setupLoading ? (
                <p className="text-xs text-m3-onSurfaceVariant animate-pulse text-center py-4">Loading batches…</p>
              ) : setupMeta ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-m3-onSurfaceVariant uppercase tracking-widest">Course</span>
                      <select
                        value={setupCourse}
                        onChange={e => { setSetupCourse(e.target.value); setSetupSem('sem4'); setSetupBatch(''); }}
                        className="bg-m3-surfaceContainerHighest text-m3-onSurface text-xs rounded-lg px-2 py-2 border border-m3-outlineVariant/30 outline-none"
                      >
                        {(setupMeta.courses || []).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-m3-onSurfaceVariant uppercase tracking-widest">Semester</span>
                      <select
                        value={setupSem}
                        onChange={e => { setSetupSem(e.target.value); setSetupBatch(''); }}
                        className="bg-m3-surfaceContainerHighest text-m3-onSurface text-xs rounded-lg px-2 py-2 border border-m3-outlineVariant/30 outline-none"
                      >
                        {(setupMeta.semesters?.[setupCourse] || []).map(s => (
                          <option key={s.id} value={s.id}>Sem {s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-m3-onSurfaceVariant uppercase tracking-widest">Your Batch</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(setupMeta.batches?.[setupCourse]?.[setupSem]?.phase1 || []).map(b => (
                        <button
                          key={b.id}
                          onClick={() => setSetupBatch(b.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            setupBatch === b.id
                              ? 'bg-m3-primary text-m3-onPrimary scale-105'
                              : 'bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant'
                          }`}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveBatch}
                    disabled={!setupBatch}
                    className="mt-1 w-full py-2.5 rounded-xl bg-m3-primary text-m3-onPrimary text-sm font-black tracking-wide active:scale-95 transition-transform disabled:opacity-40 disabled:scale-100" data-haptic="medium"
                  >
                    {setupBatch ? `Confirm — I'm in ${setupBatch.toUpperCase()}` : 'Pick your batch above'}
                  </button>
                </>
              ) : (
                <p className="text-xs text-red-400 text-center py-2">Couldn't load batches. Check your connection.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {activeSubTab === 'chat' ? (
        <header className="flex items-center justify-between px-5 bg-transparent absolute top-0 left-0 right-0 z-30 h-16">
          {/* Left: Back button */}
          <button 
            type="button" 
            onClick={() => setActiveTab('home')} 
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
            aria-label="Go back"
            data-haptic="light"
          >
            <CaretLeft size={22} className={isDarkMode ? 'text-white' : 'text-[#1e1e20]'} />
          </button>
          
          {/* Center: Static title */}
          <span className={`text-[15px] font-semibold tracking-wide ${isDarkMode ? 'text-white' : 'text-[#1e1e20]'}`}>CampAi</span>
          
          {/* Right: Invisible spacer for centering */}
          <div className="w-10 h-10" />
        </header>
      ) : (
        <M3ScreenHeader
          title="CampAi"
          subtitle="Study flashcards"
          isScrolled={isScrolled}
          onBack={() => {
            if (activeDeck) {
              setActiveDeck(null);
            } else {
              setActiveTab('home');
            }
          }}
        />
      )}

      {/* Main Content Router */}
      <div 
        className="flex-1 overflow-hidden min-h-0 relative flex flex-col transition-all duration-300"
        style={{ paddingTop: activeSubTab === 'chat' ? '64px' : (isScrolled ? '96px' : '152px') }}
      >
        <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
          <AnimatePresence mode="wait">
            {activeSubTab === 'chat' ? (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 flex flex-col h-full overflow-hidden"
              >
                {/* Chat Message Thread */}
                <div 
                  onScroll={handleScroll} 
                  className={`flex-1 overflow-y-auto pt-[48px] px-4 pb-48 flex flex-col gap-4 scrollbar-none scroll-fade-top-only ${
                    isZeroState ? 'justify-center items-center' : ''
                  }`}
                >
                  {isZeroState ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center px-6 py-12 my-auto gap-5">
                      <style>{`
                        @keyframes geminiSparkle {
                          0% { transform: scale(1) rotate(0deg); opacity: 0.95; }
                          50% { transform: scale(1.08) rotate(6deg); opacity: 1; filter: drop-shadow(0 0 20px color-mix(in srgb, var(--m3-primary) 65%, transparent)) drop-shadow(0 0 8px color-mix(in srgb, var(--m3-primary) 35%, transparent)); }
                          100% { transform: scale(1) rotate(0deg); opacity: 0.95; }
                        }
                        .gemini-sparkle-logo {
                          animation: geminiSparkle 4s ease-in-out infinite;
                        }
                      `}</style>
                      {/* Colorful Sparkle Star */}
                      <div className="relative w-14 h-14 gemini-sparkle-logo">
                        <svg viewBox="0 0 24 24" className="w-full h-full">
                          <path 
                            fill="url(#gemini-grad)" 
                            d="M 12 2 C 12 7.5 7.5 12 2 12 C 7.5 12 12 16.5 12 22 C 12 16.5 16.5 12 22 12 C 16.5 12 12 7.5 12 2 Z" 
                          />
                        </svg>
                      </div>
                      
                      {/* Greeting Text */}
                      <h2 className={`text-[26px] font-medium tracking-tight leading-tight font-sans ${isDarkMode ? 'text-white' : 'text-[#1e1e20]'}`}>
                        What's next, {currentUser?.firstName || 'Vardaan'}?
                      </h2>
                    </div>
                  ) : (
                    messages
                      .filter((msg) => msg.id !== 'welcome')
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.role === 'user' ? 'self-end items-end max-w-[80%]' : 'self-start items-start w-full'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            /* ── User Bubble ── */
                            <div className={`p-3.5 rounded-[22px] text-sm leading-relaxed text-left flex flex-col gap-1 shadow-md border ${
                              isDarkMode ? 'bg-[#1e1e20] text-white border-white/5' : 'bg-[#e9eef6] text-[#1e1e20] border-black/5'
                            }`}>
                              {msg.text}
                            </div>
                          ) : (
                            /* ── Model Response with Sparkle Icon ── */
                            <div className="w-full flex gap-3.5 items-start">
                              {/* Small Sparkle Icon */}
                              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border mt-1 ${
                                isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                              }`}>
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                                  <path 
                                    fill="url(#gemini-grad)" 
                                    d="M 12 2 C 12 7.5 7.5 12 2 12 C 7.5 12 12 16.5 12 22 C 12 16.5 16.5 12 22 12 C 16.5 12 12 7.5 12 2 Z" 
                                  />
                                </svg>
                              </div>
                              
                              <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
                                {msg.type === 'schedule' ? (
                                  /* ── Visual Schedule Card ── */
                                  <div className="w-full flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-black text-m3-primary uppercase tracking-widest">{msg.scheduleLabel} · {msg.scheduleDay}</span>
                                      <span className="text-[10px] text-m3-onSurfaceVariant">{msg.scheduleClasses?.length || 0} classes</span>
                                    </div>
                                    {msg.scheduleClasses?.length === 0 ? (
                                      <div className="rounded-2xl bg-m3-surfaceContainer/60 border border-m3-outlineVariant/20 p-4 text-xs text-m3-onSurfaceVariant text-center">
                                        No classes {msg.scheduleLabel === 'Today' ? 'today' : 'tomorrow'} — enjoy your break.
                                      </div>
                                    ) : (
                                      msg.scheduleClasses.map((cls, i) => (
                                        <div key={i} className="flex gap-3 items-stretch">
                                          {/* Time column */}
                                          <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
                                            <span className="text-[9px] font-black text-m3-primary tabular-nums leading-none">{cls.start}</span>
                                            <div className="flex-1 w-px bg-m3-outlineVariant/30" />
                                            <span className="text-[9px] text-m3-onSurfaceVariant tabular-nums leading-none">{cls.end}</span>
                                          </div>
                                          {/* Class card */}
                                          <div className={`flex-1 rounded-2xl p-3 flex flex-col gap-1 border ${
                                            cls.type === 'Practical'
                                              ? 'bg-emerald-500/10 border-emerald-500/20'
                                              : cls.type === 'Tutorial'
                                                ? 'bg-amber-500/10 border-amber-500/20'
                                                : 'bg-m3-primary/10 border-m3-primary/20'
                                          }`}>
                                            <div className="flex items-start justify-between gap-2">
                                              <span className="text-xs font-bold text-m3-onSurface leading-tight">{cls.subject}</span>
                                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                                cls.type === 'Practical' ? 'bg-emerald-500/20 text-emerald-400'
                                                : cls.type === 'Tutorial' ? 'bg-amber-500/20 text-amber-400'
                                                : 'bg-m3-primary/20 text-m3-primary'
                                              }`}>{cls.type?.charAt(0)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-m3-onSurfaceVariant">
                                              <span>{cls.venue}</span>
                                              <span className="text-m3-outlineVariant">·</span>
                                              <span>{cls.teacher?.split(' ').slice(-1)[0]}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                ) : (
                                  /* ── Regular text bubble ── */
                                  <div className={`p-1 text-sm leading-relaxed text-left flex flex-col gap-1 ${
                                    isDarkMode ? 'text-white/95' : 'text-[#1e1e20]'
                                  }`}>
                                    {renderMarkdown(msg.text)}
                                  </div>
                                )}
                                
                                {/* Visual Attendance Card */}
                                {msg.attendance && msg.attendance.length > 0 && (
                                  <div className="w-full max-w-sm rounded-[24px] bg-m3-surfaceContainerLow/60 border border-m3-outlineVariant/20 p-4 mt-1 mb-2 flex flex-col gap-4 shadow-sm">
                                    <div className="flex justify-between items-center pb-2 border-b border-m3-outlineVariant/10">
                                      <span className="text-[10px] font-black text-m3-primary uppercase tracking-wider">Attendance Report</span>
                                      <span className="text-[9px] text-m3-onSurfaceVariant bg-m3-surfaceContainerHigh px-2.5 py-0.5 rounded-full font-bold">Goal: {msg.attendanceGoal || 75}%</span>
                                    </div>
                                    <div className="flex flex-col gap-3.5">
                                      {msg.attendance.map((sub, sIdx) => {
                                        const pct = Number(sub.percentage) || 0;
                                        const goal = Number(msg.attendanceGoal) || 75;
                                        const isSafe = pct >= goal;
                                        const isWarning = !isSafe && pct >= (goal - 5);
                                        const colorClass = isSafe 
                                          ? 'bg-emerald-500' 
                                          : isWarning 
                                            ? 'bg-amber-500' 
                                            : 'bg-red-500';
                                        const textClass = isSafe 
                                          ? 'text-emerald-400' 
                                          : isWarning 
                                            ? 'text-amber-400' 
                                            : 'text-red-400';

                                        return (
                                          <div key={sIdx} className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-start gap-2">
                                              <div className="flex flex-col min-w-0">
                                                <span className={`text-xs font-bold truncate leading-tight ${isDarkMode ? 'text-white' : 'text-[#1e1e20]'}`}>{sub.name}</span>
                                                <span className="text-[9px] text-m3-onSurfaceVariant/70 font-mono tracking-wider">{sub.code}</span>
                                              </div>
                                              <div className="flex flex-col items-end shrink-0 leading-none gap-0.5">
                                                <span className={`text-xs font-black ${textClass}`}>{pct.toFixed(2)}%</span>
                                                <span className="text-[9px] text-m3-onSurfaceVariant/80 tabular-nums">{sub.attended}/{sub.held} classes</span>
                                              </div>
                                            </div>
                                            {/* Progress Bar Track */}
                                            <div className="w-full h-1.5 bg-m3-surfaceContainerHighest rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                  )}

                  {isTyping && (
                    <div className="self-start flex flex-col items-start max-w-[80%]">
                      <div className="bg-transparent p-4 rounded-[22px] rounded-tl-none flex gap-1 items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-m3-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-m3-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-m3-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="flashcards-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex-1 flex flex-col h-full overflow-y-auto pt-4 px-4 pb-48 scrollbar-none"
                onScroll={handleScroll}
              >
                {activeDeck ? (() => {
                  const currentDeckMasteredCount = activeDeck.cards.reduce((acc, _, idx) => {
                    return acc + (masteredCards[`${activeDeck._id}_${idx}`] ? 1 : 0);
                  }, 0);
                  return (
                    /* FLASHCARD VIEWER WORKSPACE */
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4 min-h-[450px]">
                      <div className="flex justify-between items-center w-full max-w-sm mb-2">
                        <button
                          onClick={() => setActiveDeck(null)}
                          className="px-4 py-2 text-xs font-bold text-m3-primary hover:text-white bg-m3-surfaceContainerHigh rounded-full flex items-center gap-1.5 transition border-none shadow-sm cursor-pointer"
                        >
                          <CaretLeft size={14} /> Back to Decks
                        </button>
                        <span className="text-xs font-mono text-m3-onSurfaceVariant/70 bg-m3-surfaceContainerLow px-3 py-1 rounded-full">
                          Card {activeCardIndex + 1} of {activeDeck.cards.length}
                        </span>
                      </div>

                      {/* Gorgeous Progress Bar */}
                      <div className="w-full max-w-sm flex flex-col gap-1.5 text-left -mt-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-m3-onSurfaceVariant/80">
                          <span>Progress: {currentDeckMasteredCount} of {activeDeck.cards.length} Mastered</span>
                          <span>{Math.round((currentDeckMasteredCount / activeDeck.cards.length) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-m3-surfaceContainerHigh rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-m3-primary transition-all duration-300"
                            style={{ width: `${(currentDeckMasteredCount / activeDeck.cards.length) * 100}%` }}
                          />
                        </div>
                      </div>

                    {/* Gorgeous 3D Flippable Card */}
                    <div 
                      className="w-full max-w-sm h-64 cursor-pointer select-none perspective-card"
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                    >
                      <motion.div 
                        className="w-full h-full relative preserve-3d"
                        animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                        transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
                      >
                        {/* Front Side: Question */}
                        <div className="absolute inset-0 backface-hidden m3-surface-card bg-m3-surfaceContainerHigh border border-white/10 rounded-[32px] p-6 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden">
                          <div className="absolute top-4 left-6 flex items-center gap-1.5 text-m3-primary/80">
                            <Brain size={16} />
                            <span className="text-[9px] font-bold tracking-widest uppercase">Question</span>
                          </div>
                          <p className="text-base font-bold text-white leading-relaxed px-2">
                            {activeDeck.cards[activeCardIndex].question}
                          </p>
                          <span className="absolute bottom-4 text-[10px] text-m3-onSurfaceVariant/60 font-semibold tracking-wider uppercase bg-m3-surfaceContainerLowest/50 px-3 py-1 rounded-full border border-white/5">
                            Tap to flip
                          </span>
                        </div>

                        {/* Back Side: Answer */}
                        <div 
                          className="absolute inset-0 backface-hidden m3-surface-card bg-m3-surfaceContainerHigh border border-m3-primary/20 rounded-[32px] p-6 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden"
                          style={{ transform: 'rotateY(180deg)' }}
                        >
                          <div className="absolute top-4 left-6 flex items-center gap-1.5 text-m3-primary">
                            <Check size={16} />
                            <span className="text-[9px] font-bold tracking-widest uppercase">Answer</span>
                          </div>
                          <p className="text-base font-medium text-m3-onSurface leading-relaxed px-2">
                            {activeDeck.cards[activeCardIndex].answer}
                          </p>
                          <span className="absolute bottom-4 text-[10px] text-m3-primary/80 font-bold tracking-wider uppercase bg-m3-primary/10 px-3 py-1 rounded-full border border-m3-primary/20">
                            Tap to show question
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Mastered toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const key = `${activeDeck._id}_${activeCardIndex}`;
                        setMasteredCards(prev => ({
                          ...prev,
                          [key]: !prev[key]
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 w-full max-w-sm py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition border cursor-pointer ${
                        masteredCards[`${activeDeck._id}_${activeCardIndex}`]
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-m3-surfaceContainerHigh border-white/5 text-m3-onSurfaceVariant hover:bg-m3-surfaceContainerHighest'
                      }`}
                    >
                      <CheckSquare size={16} weight={masteredCards[`${activeDeck._id}_${activeCardIndex}`] ? "fill" : "regular"} />
                      {masteredCards[`${activeDeck._id}_${activeCardIndex}`] ? 'Mastered' : 'Mark as Mastered'}
                    </button>

                    {/* Card Navigation Controls */}
                    <div className="flex gap-4 w-full max-w-sm mt-2">
                      <button
                        disabled={activeCardIndex === 0}
                        onClick={() => {
                          setIsCardFlipped(false);
                          setTimeout(() => setActiveCardIndex(prev => prev - 1), 100);
                        }}
                        className="flex-1 py-3 bg-m3-surfaceContainerHigh hover:bg-m3-surfaceContainerHighest disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-xs uppercase tracking-wider transition border-none shadow-md cursor-pointer text-center text-white"
                      >
                        Prev
                      </button>
                      <button
                        disabled={activeCardIndex === activeDeck.cards.length - 1}
                        onClick={() => {
                          setIsCardFlipped(false);
                          setTimeout(() => setActiveCardIndex(prev => prev + 1), 100);
                        }}
                        className="flex-1 py-3 bg-m3-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-xs uppercase tracking-wider transition border-none shadow-md cursor-pointer text-center text-m3-onPrimary"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  );
                })()
                ) : (
                  /* FLASHCARD DECKS LIST WORKSPACE */
                  <div className="flex flex-col gap-6 w-full">
                    {/* File Upload Area */}
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf"
                        id="pdf-flashcard-uploader"
                        className="hidden"
                        onChange={handlePdfUpload}
                        disabled={uploading}
                      />
                      <label
                        htmlFor="pdf-flashcard-uploader"
                        className={`w-full py-8 px-6 rounded-[28px] border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-300 ${
                          uploading
                            ? 'border-m3-primary/30 bg-m3-surfaceContainerLow/30 cursor-wait'
                            : 'border-m3-outlineVariant/50 bg-m3-surfaceContainerLow hover:bg-m3-surfaceContainerHigh hover:border-m3-primary hover:shadow-lg'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-m3-primary/15 flex items-center justify-center text-m3-primary">
                          <UploadSimple size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Upload Study PDF</h4>
                          <p className="text-xs text-m3-onSurfaceVariant/70 mt-1 leading-relaxed">
                            Drag and drop or select a course PDF (max 10MB) to generate cards
                          </p>
                        </div>
                      </label>
                    </div>

                    {uploadError && (
                      <div className="p-4 bg-m3-errorContainer/10 border border-m3-error/20 rounded-[20px] flex items-start gap-3 text-m3-error">
                        <Warning size={18} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold leading-relaxed">{uploadError}</p>
                      </div>
                    )}

                    {uploading && (
                      <div className="p-8 m3-surface-card rounded-[28px] flex flex-col items-center justify-center gap-4 text-center border border-white/5 shadow-xl">
                        <div className="w-12 h-12 border-4 border-m3-primary border-t-transparent rounded-full animate-spin" />
                        <div>
                          <h4 className="text-sm font-bold text-white">Analyzing Syllabus...</h4>
                          <p className="text-xs text-m3-onSurfaceVariant/70 mt-1">
                            Our AI is extracting key topics to generate flashcards. Please hold on.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Decks Grid */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1 mt-2 flex items-center gap-1.5">
                        <Cards size={16} /> Saved Flashcard Decks
                      </h3>

                      {loadingDecks ? (
                        <div className="text-center py-8 text-m3-onSurfaceVariant/60 text-xs font-semibold">
                          Loading saved study decks...
                        </div>
                      ) : decks.length === 0 ? (
                        <div className="m3-surface-card rounded-[24px] p-6 text-center border border-dashed border-m3-outlineVariant/40 flex flex-col items-center justify-center gap-2">
                          <Info size={24} className="text-m3-onSurfaceVariant/40" />
                          <h4 className="text-sm font-bold text-m3-onSurfaceVariant/80">No decks generated yet</h4>
                          <p className="text-xs text-m3-onSurfaceVariant/50 leading-relaxed max-w-xs">
                            Upload a lecture slide or notes PDF above and we'll generate cards for your review.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {decks.map(deck => (
                            <div
                              key={deck._id}
                              onClick={() => {
                                setActiveDeck(deck);
                                setActiveCardIndex(0);
                                setIsCardFlipped(false);
                              }}
                              className="w-full p-4.5 rounded-[24px] bg-m3-surfaceContainerLow hover:bg-m3-surfaceContainerHigh border border-white/5 flex items-center justify-between text-left shadow-md cursor-pointer transition-all hover:scale-[1.01] group"
                            >
                              <div className="flex flex-col gap-1 pr-4 min-w-0">
                                <h4 className="font-bold text-sm text-white truncate group-hover:text-m3-primary transition-colors">
                                  {deck.title}
                                </h4>
                                <p className="text-xs text-m3-onSurfaceVariant/70">
                                  {deck.cards.length} flashcards • {new Date(deck.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={(e) => handleDeleteDeck(deck._id, e)}
                                className="w-9 h-9 rounded-full bg-m3-surfaceContainerLowest hover:bg-m3-errorContainer/20 hover:text-m3-error text-m3-onSurfaceVariant flex items-center justify-center transition border-none shadow-sm cursor-pointer"
                                title="Delete Deck"
                              >
                                <Trash size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Control Dock (Switcher + Chat Input) */}
        <div 
          className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-3 z-10"
          style={{
            background: isDarkMode 
              ? 'color-mix(in srgb, var(--m3-surface-container-low) 45%, transparent)' 
              : 'color-mix(in srgb, var(--m3-surface) 60%, transparent)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            borderTop: '1px solid color-mix(in srgb, var(--m3-outline-variant) 12%, transparent)',
          }}
        >
          {/* Chat-only controls: prompts & text field */}
          {activeSubTab === 'chat' && (
            <div className="flex flex-col gap-3">
              {/* Starter Prompts */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 py-1">
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (prompt.action === 'today') handleScheduleQuery('today');
                      else if (prompt.action === 'tomorrow') handleScheduleQuery('tomorrow');
                      else handleSendMessage(prompt.label);
                    }}
                    data-haptic="light"
                    className={`px-3.5 py-2 rounded-full border text-xs font-semibold shrink-0 shadow-sm transition-all active:scale-95 ${
                      isDarkMode
                        ? 'bg-[#1e1e20] hover:bg-[#2a2a2d] border-white/10 text-white/90'
                        : 'bg-[#e9eef6] hover:bg-[#dfe3eb] border-black/5 text-[#1e1e20]'
                    }`}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>

              {/* Chat Input Field */}
              <div className={`flex gap-2 items-center px-4 py-1.5 rounded-full border shadow-lg ${isDarkMode ? 'bg-[#131314] border-white/5' : 'bg-[#e9eef6] border-black/5'}`}>

                <input
                  type="text"
                  placeholder="Ask CampAi..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className={`flex-1 bg-transparent border-none outline-none text-sm py-1.5 font-medium ${
                    isDarkMode ? 'text-white placeholder-white/40' : 'text-slate-800 placeholder-slate-500'
                  }`}
                  disabled={isTyping}
                />
                {inputText.trim() && (
                  <button
                    onClick={handleSendMessage}
                    data-haptic="medium"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition border-none cursor-pointer active:scale-90 bg-m3-primary text-white"
                    disabled={isTyping}
                  >
                    <PaperPlaneRight size={18} weight="fill" />
                  </button>
                )}
              </div>


            </div>
          )}

          {/* Sub-tab segment slider */}
          <div className="m3-segmented-chips w-full">
            {[
              { id: 'chat', label: 'Chat' },
              { id: 'flashcards', label: 'Cards' }
            ].map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-haptic="light"
                  onClick={() => {
                    setActiveSubTab(tab.id);
                    if (tab.id === 'chat') setActiveDeck(null);
                  }}
                  className={`flex-1 px-6 py-2 text-xs font-extrabold cursor-pointer shrink-0 border relative transition-colors duration-200 ${
                    isActive
                      ? 'text-m3-onPrimary border-transparent !bg-transparent'
                      : activeSubTab === 'chat'
                        ? (isDarkMode 
                            ? 'bg-[#1e1e20] text-white/70 hover:bg-[#2a2a2d] border-white/5' 
                            : 'bg-[#e9eef6] text-slate-700/80 hover:bg-[#dfe3eb] border-black/5')
                        : 'bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant hover:bg-m3-surfaceContainerLow border-m3-outlineVariant/30'
                  }`}
                  style={{ borderRadius: '24px' }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-campai-subtab"
                      className="absolute inset-0 bg-m3-primary rounded-full z-0"
                      style={{ borderRadius: '24px' }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
      </div>
    </div>
  </div>
);
}
