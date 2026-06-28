import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, PaperPlaneRight, ChatCircle, X, MagnifyingGlass, Trash, Flag, CheckCircle, ArrowsCounterClockwise, ChatTeardropText, Handshake } from '@phosphor-icons/react';
import { API_BASE } from '../config/api';
import M3ScreenHeader from './M3ScreenHeader';

export default function SkillSwapGrid({ currentUser, onUpdate, setActiveTab, onStartChat, hasReportedChats }) {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState('listings');
  const [isScrolled, setIsScrolled] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const [promptDialog, setPromptDialog] = useState(null); // { title, message, value, onConfirm }

  // Reported chats state (super_admin only)
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [activeReportForChat, setActiveReportForChat] = useState(null);
  const [reportedChatMessages, setReportedChatMessages] = useState([]);
  const [loadingReportedChat, setLoadingReportedChat] = useState(false);
  
  // Started chats tracker to dynamically flag matches & move them to ongoing
  const [startedChats, setStartedChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cp_started_chats') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [chatPartners, setChatPartners] = useState([]);

  const handleScroll = (e) => {
    setIsScrolled(e.target.scrollTop > 12);
  };

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const res = await fetch(`${API_BASE}/api/messages/reports`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reported chats');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleDismissReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to dismiss this report?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to resolve report');
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReviewChat = async (report) => {
    setActiveReportForChat(report);
    try {
      setLoadingReportedChat(true);
      const res = await fetch(
        `${API_BASE}/api/messages/reported-history?reporter=${encodeURIComponent(
          report.ReporterName
        )}&reported=${encodeURIComponent(report.ReportedName)}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to load reported chat log');
      const data = await res.json();
      setReportedChatMessages(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingReportedChat(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && viewTab === 'reports') {
      fetchReports();
    }
  }, [viewTab]);

  const handleStartChat = (studentName) => {
    if (!startedChats.includes(studentName)) {
      const updated = [...startedChats, studentName];
      setStartedChats(updated);
      localStorage.setItem('cp_started_chats', JSON.stringify(updated));
      if (onUpdate) onUpdate();
    }
    if (onStartChat) {
      onStartChat(studentName);
    }
  };

  // New Gig Form State (Offer a Skill inline panel!)
  const [skillOffered, setSkillOffered] = useState('');
  const [skillWanted, setSkillWanted] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isModerator = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isStudent = currentUser?.role === 'student';

  const fetchGigs = async (searchVal = '') => {
    try {
      setLoading(true);
      const url = searchVal 
        ? `${API_BASE}/api/skillgigs?search=${encodeURIComponent(searchVal)}` 
        : `${API_BASE}/api/skillgigs`;
      
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load skill gigs');
      const data = await res.json();
      // Format and map exchange fields for normalized UI grid layout
      const formattedGigs = (data || []).map(g => ({
        ...g,
        SkillOffered: g.SkillWanted || 'Nothing',
        SkillWanted: g.SkillOffered || 'Nothing',
        StudentName: (g.StudentName || '').split('').reverse().join('')
      }));
      setGigs(formattedGigs);
      setError(null);
      if (currentUser?.role === 'student') {
        fetchChatPartners();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatPartners = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/partners`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setChatPartners(data);
      }
    } catch (err) {
      console.error('Failed to fetch chat partners:', err);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'student' && viewTab === 'ongoing') {
      fetchChatPartners();
    }
  }, [viewTab, currentUser]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchGigs(searchQuery);
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleCreateGig = async (e) => {
    e.preventDefault();
    if (!skillOffered || !skillWanted || !currentUser) return;

    try {
      setSubmitting(true);
      const studentName = currentUser.firstName;
      
      const res = await fetch(`${API_BASE}/api/skillgigs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          StudentName: studentName,
          SkillOffered: skillOffered,
          SkillWanted: skillWanted,
          Status: 'Active',
          ContactInfo: 'chat_only_private',
        }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to post skill swap profile');
      
      setSkillOffered('');
      setSkillWanted('');
      
      fetchGigs(searchQuery);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Are you sure you want to permanently delete this skill swap listing?',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/skillgigs/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to remove skill swap');
          }
          
          fetchGigs(searchQuery);
          if (onUpdate) onUpdate();
        } catch (err) {
          alert(err.message);
        }
      }
    });
  };

  const handleMarkAsDone = (id) => {
    setConfirmDialog({
      message: 'Mark this skill swap match as successfully completed/done?',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/skillgigs/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Status: 'Completed' }),
            credentials: 'include',
          });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to complete swap');
          }
          
          fetchGigs(searchQuery);
          if (onUpdate) onUpdate();
        } catch (err) {
          alert(err.message);
        }
      }
    });
  };

  const handleReport = (id) => {
    setPromptDialog({
      title: 'Report Listing',
      message: 'Please enter the reason for reporting this listing:',
      value: '',
      onConfirm: async (reason) => {
        try {
          const res = await fetch(`${API_BASE}/api/skillgigs/${id}/report`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ReportReason: reason }),
            credentials: 'include',
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to report listing');
          }

          alert('Thank you. The listing has been reported.');
          fetchGigs(searchQuery);
          if (onUpdate) onUpdate();
        } catch (err) {
          alert(err.message);
        }
      }
    });
  };

  // Helper to color circles dynamically using Material 3 containers
  const getAvatarBg = (name) => {
    const letter = name.charAt(0).toUpperCase();
    if (letter === 'V' || letter === 'S') return 'bg-m3-primaryContainer text-m3-onPrimaryContainer';
    if (letter === 'K' || letter === 'R') return 'bg-m3-surfaceContainerHighest text-m3-primary';
    if (letter === 'D' || letter === 'A') return 'bg-m3-tertiaryContainer text-m3-onTertiaryContainer';
    return 'bg-m3-secondaryContainer text-m3-onSecondaryContainer';
  };

  // Cache of avatars: Map of firstName -> avatar
  const [avatars, setAvatars] = useState(() => {
    try {
      const cached = localStorage.getItem('cp_all_users_avatars');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/avatars`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setAvatars(data);
          localStorage.setItem('cp_all_users_avatars', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Failed to fetch avatars:', err);
      }
    };
    fetchAvatars();
    const interval = setInterval(fetchAvatars, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderAvatar = (name, sizeClass = "w-12 h-12 text-xs") => {
    if (!name) return null;
    const cleanName = name.trim().toLowerCase();
    const firstName = cleanName.split(/\s+/)[0];
    const av = avatars[cleanName] || avatars[firstName];
    if (av) {
      return (
        <img 
          src={av} 
          alt={name} 
          className={`${sizeClass} rounded-full object-cover shadow-inner border border-m3-outlineVariant/20 shrink-0`}
        />
      );
    }
    const firstLetter = name.charAt(0).toUpperCase();
    return (
      <div className={`${sizeClass} ${getAvatarBg(name)} rounded-full flex items-center justify-center font-bold shadow-inner border border-m3-outlineVariant/10 shrink-0`}>
        {firstLetter}
      </div>
    );
  };

  const currentStudentName = currentUser?.firstName?.toLowerCase() || 'kunal';

  const listingsGigs = gigs.filter(gig => gig.Status === 'Active');

  const ongoingGigs = isSuperAdmin
    ? gigs.filter(gig => gig.Status === 'Ongoing')
    : gigs.filter(gig => 
        (gig.Status === 'Active' || gig.Status === 'Ongoing') && 
        (gig.StudentName.toLowerCase() === currentStudentName || startedChats.includes(gig.StudentName))
      );

  const historyGigs = gigs.filter(gig => 
    gig.Status === 'Completed' && 
    (gig.StudentName.toLowerCase() === currentStudentName || 
     gig.SwappedWith?.toLowerCase() === currentStudentName)
  );

  const displayedGigs = viewTab === 'listings' 
    ? listingsGigs 
    : viewTab === 'history' 
      ? historyGigs 
      : ongoingGigs;

  return (
    <div className="m3-screen skillgigs-module">
      {/* M3 Header */}
      <M3ScreenHeader
        title="Skill Swap"
        subtitle="Learn & teach with peers"
        isScrolled={isScrolled}
        onBack={() => setActiveTab && setActiveTab('home')}
      />

      {/* Main Scroll Area */}
      <div onScroll={handleScroll} className="m3-screen__scroll">
        
        {/* Segmented Chips Switcher */}
        {isStudent && (
          <div className="flex justify-center w-full py-1 shrink-0 select-none">
            <div className="m3-segmented-chips">
              {[
                { id: 'listings', label: 'Listings' },
                { id: 'ongoing', label: 'Chats' },
                { id: 'history', label: 'History' }
              ].map((sub) => {
                const isActive = viewTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    data-haptic="light"
                    onClick={() => setViewTab(sub.id)}
                    className={`px-4 py-2.5 text-xs font-extrabold cursor-pointer shrink-0 border relative transition-colors duration-200 ${
                      isActive
                        ? 'text-m3-onPrimary border-transparent !bg-transparent'
                        : 'bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant hover:bg-m3-surfaceContainerLow border-m3-outlineVariant/30'
                    }`}
                    style={{ borderRadius: '24px' }}
                    type="button"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-skillswap-chip"
                        className="absolute inset-0 bg-m3-primary rounded-full z-0"
                        style={{ borderRadius: '24px' }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="flex justify-center w-full py-1 shrink-0 select-none">
            <div className="m3-segmented-chips">
              {[
                { id: 'listings', label: 'Listings' },
                { id: 'ongoing', label: 'Ongoing Swaps' },
                { id: 'reports', label: 'Reported Chats', count: reports.length }
              ].map((sub) => {
                const isActive = viewTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    data-haptic="light"
                    onClick={() => setViewTab(sub.id)}
                    className={`px-4 py-2.5 text-xs font-extrabold cursor-pointer shrink-0 border relative transition-colors duration-200 ${
                      isActive
                        ? 'text-m3-onPrimary border-transparent !bg-transparent'
                        : 'bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant hover:bg-m3-surfaceContainerLow border-m3-outlineVariant/30'
                    }`}
                    style={{ borderRadius: '24px' }}
                    type="button"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-skillswap-admin-chip"
                        className="absolute inset-0 bg-m3-primary rounded-full z-0"
                        style={{ borderRadius: '24px' }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span>{sub.label}</span>
                      {sub.count !== undefined && sub.count > 0 && (
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                          isActive ? 'bg-white text-m3-primary' : 'bg-m3-error text-m3-onError'
                        }`}>
                          {sub.count}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={viewTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="flex flex-col gap-4 w-full"
          >
            {/* Offer a Skill Form Panel */}
            {viewTab === 'listings' && isStudent && (
          <div className="m3-surface-card p-5 flex flex-col gap-4 text-left shadow-sm">
            <div className="flex items-center gap-2 border-b border-m3-onSurfaceVariant/10 pb-3">
              <UserPlus size={18} className="text-m3-onSurfaceVariant" />
              <h3 className="m3-title-small text-m3-onSurface">Offer a Skill</h3>
            </div>

            <form onSubmit={handleCreateGig} className="flex flex-col gap-3">
              {/* Input 1: What can you teach */}
              <input
                type="text"
                placeholder="What can you teach? (e.g. Guitar)"
                value={skillOffered}
                onChange={(e) => setSkillOffered(e.target.value)}
                required
                className="m3-filled-field !h-[48px] text-sm"
              />

              {/* Row combining Input 2 and Purple send button */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="What do you want to learn?"
                  value={skillWanted}
                  onChange={(e) => setSkillWanted(e.target.value)}
                  required
                  className="m3-filled-field flex-1 !h-[48px] text-sm"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-12 h-12 bg-m3-primary text-m3-onPrimary hover:brightness-110 active:scale-95 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 transform shrink-0 disabled:opacity-50 cursor-pointer" data-haptic="medium"
                >
                  <PaperPlaneRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MagnifyingGlass Input Filter */}
        {viewTab === 'listings' && (
          <div className="relative w-full shrink-0">
            <span className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-m3-outline z-10">
              <MagnifyingGlass size={16} />
            </span>
            <input
              type="text"
              className="m3-filled-field !pl-12 !pr-10 !rounded-full !h-[48px] text-sm"
              placeholder="Search for skills, listings, or students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-m3-onSurfaceVariant hover:text-m3-onSurface cursor-pointer"
                onClick={() => setSearchQuery('')}
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content Listings Feed */}
        {viewTab === 'reports' ? (
          <div className="w-full flex flex-col gap-4">
            {reportsLoading && reports.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3.5 select-none py-16 text-center">
                <ArrowsCounterClockwise className="animate-spin text-m3-primary" size={28} />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Syncing chat reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="m3-surface-card p-8 flex flex-col items-center justify-center gap-3 text-center select-none">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-m3-primary shadow-md" style={{ backgroundColor: 'color-mix(in srgb, var(--m3-primary-container) 30%, transparent)' }}>
                  <Flag size={22} />
                </div>
                <h4 className="text-sm text-m3-onSurface font-extrabold uppercase tracking-widest">No chat reports</h4>
                <span className="text-xs text-slate-400 font-medium leading-relaxed max-w-[240px]">
                  Excellent! There are no reported chat logs requiring moderator review.
                </span>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report._id}
                  className="m3-surface-card p-5 flex flex-col gap-3.5 text-left transition-all relative border border-transparent"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full text-m3-error flex items-center justify-center font-bold text-lg shrink-0 select-none bg-m3-errorContainer/30"
                    >
                      <Flag size={20} />
                    </div>
                    <div className="flex-1 min-w-0 pr-12">
                      <h4 className="text-sm font-extrabold text-m3-onSurface tracking-wide truncate">
                        Reported Chat
                      </h4>
                      <span className="text-xs text-m3-onSurfaceVariant block mt-0.5">
                        Between <span className="font-bold text-m3-onSurface">{report.ReporterName}</span> &amp; <span className="font-bold text-m3-onSurface">{report.ReportedName}</span>
                      </span>
                    </div>
                    <span className="absolute top-5 right-5 text-[9px] text-m3-onSurfaceVariant/60 font-mono">
                      {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="bg-m3-surfaceContainerHigh/60 rounded-xl p-3 text-xs text-m3-onSurfaceVariant border border-m3-outline-variant/20">
                    <span className="text-[9px] font-black uppercase text-m3-error tracking-wider block mb-1">Reason for Report</span>
                    <p className="leading-relaxed font-semibold italic">"{report.Reason}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                    <button
                      className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-m3-onPrimaryContainer bg-m3-primaryContainer hover:brightness-110 transition cursor-pointer uppercase tracking-wider py-2.5 rounded-xl border-none"
                      onClick={() => handleReviewChat(report)}
                      type="button"
                    >
                      Review Chat
                    </button>
                    <button
                      className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-m3-onErrorContainer bg-m3-errorContainer hover:brightness-110 transition cursor-pointer uppercase tracking-wider py-2.5 rounded-xl border-none"
                      onClick={() => handleDismissReport(report._id)}
                      type="button"
                    >
                      Dismiss Report
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : viewTab === 'history' ? (
          <div className="flex flex-col gap-4">
            {historyGigs.length === 0 ? (
              <div className="m3-surface-card p-8 flex flex-col items-center justify-center gap-3 text-center select-none">
                <div className="w-12 h-12 rounded-2xl bg-m3-secondaryContainer text-m3-onSecondaryContainer flex items-center justify-center shadow-md animate-fade-in">
                  <CheckCircle size={22} />
                </div>
                <p className="text-sm font-semibold text-m3-onSurface">No completed swaps in your history.</p>
              </div>
            ) : (
              historyGigs.map((gig) => {
                const isLister = gig.StudentName.toLowerCase() === currentUser?.firstName?.toLowerCase();
                const partner = isLister ? gig.SwappedWith : gig.StudentName;
                return (
                  <div
                    key={gig.id || gig._id}
                    className="m3-surface-card p-5 flex flex-col gap-4 text-left shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      {renderAvatar(partner || 'Peer', "w-12 h-12 text-base")}
                      <div>
                        <h4 className="m3-title-medium text-m3-onSurface leading-tight">
                          {gig.SkillOffered}
                        </h4>
                        <span className="text-[10px] font-bold text-m3-onSurfaceVariant font-mono tracking-widest uppercase block mt-1 font-semibold">
                          SWAPPED WITH {partner || 'Peer'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-m3-surfaceContainerLow p-3.5 rounded-2xl w-full text-left">
                      <p className="m3-body-small text-m3-onSurfaceVariant">
                        {isLister ? 'You received: ' : 'You taught: '} <span className="text-m3-primary font-bold">{gig.SkillWanted}</span>
                      </p>
                    </div>

                    <div className="w-full flex justify-between items-center mt-1">
                      <span className="text-[9px] font-black uppercase text-m3-secondary tracking-wider bg-m3-secondaryContainer/50 px-2.5 py-1 rounded-full">
                        ✓ Swap Completed
                      </span>
                      <span className="text-[9px] text-m3-onSurfaceVariant/60 font-mono">
                        {new Date(gig.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : isStudent && viewTab === 'ongoing' ? (
          <div className="flex flex-col gap-4">
            {chatPartners.length === 0 ? (
              <div className="m3-surface-card p-8 flex flex-col items-center justify-center gap-3 text-center select-none animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-m3-primaryContainer/30 flex items-center justify-center text-m3-primary shadow-md">
                  <ChatTeardropText size={22} />
                </div>
                <p className="text-sm font-semibold text-m3-onSurface">No active chats.</p>
                <span className="text-xs text-m3-onSurfaceVariant">Start a chat from the Listings board to discuss a skill swap!</span>
              </div>
            ) : (
              chatPartners.map(partner => {
                const gig = gigs.find(g => 
                  (g.StudentName.toLowerCase() === currentUser?.firstName?.toLowerCase() && 
                   (g.Status === 'Active' || (g.Status === 'Ongoing' && g.SwappedWith?.toLowerCase() === partner.toLowerCase()))) ||
                  (g.StudentName.toLowerCase() === partner.toLowerCase() && 
                   (g.Status === 'Active' || (g.Status === 'Ongoing' && g.SwappedWith?.toLowerCase() === currentUser?.firstName?.toLowerCase())))
                );
                
                const isLister = gig && gig.StudentName.toLowerCase() === currentUser?.firstName?.toLowerCase();
                const isOngoing = gig && gig.Status === 'Ongoing';
                
                return (
                  <div key={partner} className="m3-surface-card p-5 flex flex-col gap-4 text-left shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.01]">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        {renderAvatar(partner, "w-12 h-12 text-base")}
                        <div>
                          <h4 className="m3-title-medium text-m3-onSurface leading-tight">
                            {partner}
                          </h4>
                          <span className="text-[9px] font-black uppercase tracking-wider block mt-1 select-none">
                            {isOngoing ? (
                              <span className="text-m3-primary bg-m3-primaryContainer/50 px-2.5 py-1 rounded-full">
                                Ongoing Swap
                              </span>
                            ) : (
                              <span className="text-m3-onSurfaceVariant bg-m3-surfaceContainerHigh px-2.5 py-1 rounded-full">
                                In Discussion
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {gig ? (
                      <div className="bg-m3-surfaceContainerLow p-3.5 rounded-2xl w-full text-left flex flex-col gap-1 border border-m3-outline-variant/10">
                        <span className="text-[9px] font-black uppercase text-m3-onSurfaceVariant/70 tracking-widest block mb-0.5 font-mono select-none">
                          {isLister ? 'Your listing trade' : `${partner}'s listing trade`}
                        </span>
                        <p className="m3-body-small text-m3-onSurfaceVariant font-medium">
                          Offered: <span className="text-m3-primary font-bold">{gig.SkillOffered}</span>
                        </p>
                        <p className="m3-body-small text-m3-onSurfaceVariant font-medium">
                          Wanted: <span className="text-m3-secondary font-bold">{gig.SkillWanted}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="bg-m3-surfaceContainerLow p-3.5 rounded-2xl w-full text-left border border-m3-outline-variant/10">
                        <p className="m3-body-small text-m3-onSurfaceVariant italic font-medium">
                          Direct conversation
                        </p>
                      </div>
                    )}

                    <div className="w-full mt-1">
                      <button
                        onClick={() => handleStartChat(partner)}
                        className="m3-filled-button bg-m3-secondaryContainer text-m3-onSecondaryContainer hover:brightness-110 !min-h-[44px] flex items-center justify-center gap-2 font-bold text-xs"
                        type="button"
                      >
                        <ChatCircle size={15} /> Open Chat
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : isSuperAdmin && viewTab === 'ongoing' ? (
          <div className="flex flex-col gap-4">
            {ongoingGigs.length === 0 ? (
              <div className="m3-surface-card p-8 flex flex-col items-center justify-center gap-3 text-center select-none">
                <div className="w-12 h-12 rounded-2xl bg-m3-primaryContainer/30 flex items-center justify-center text-m3-primary shadow-md">
                  <Handshake size={22} />
                </div>
                <p className="text-sm font-semibold text-m3-onSurface">No ongoing swaps found.</p>
              </div>
            ) : (
              ongoingGigs.map((gig) => (
                <div
                  key={gig.id || gig._id}
                  className="m3-surface-card p-5 flex flex-col gap-3.5 text-left transition-all relative border border-transparent shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-m3-primaryContainer text-m3-onPrimaryContainer flex items-center justify-center font-bold text-lg shrink-0 select-none">
                      🤝
                    </div>
                    <div className="flex-1 min-w-0 pr-12">
                      <h4 className="text-sm font-extrabold text-m3-onSurface tracking-wide truncate">
                        Confirmed Swap Match
                      </h4>
                      <span className="text-xs text-m3-onSurfaceVariant block mt-0.5 font-medium">
                        Between <span className="font-bold text-m3-onSurface">{gig.StudentName}</span> &amp; <span className="font-bold text-m3-onSurface">{gig.SwappedWith || 'Peer'}</span>
                      </span>
                    </div>
                    <span className="absolute top-5 right-5 text-[9px] text-m3-onSurfaceVariant/60 font-mono">
                      {new Date(gig.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="bg-m3-surfaceContainerLow p-3.5 rounded-2xl w-full text-left flex flex-col gap-1.5 border border-m3-outline-variant/10">
                    <p className="text-xs text-m3-onSurfaceVariant font-medium">
                      {gig.StudentName} offered: <span className="text-m3-primary font-bold">{gig.SkillOffered}</span>
                    </p>
                    <p className="text-xs text-m3-onSurfaceVariant font-medium">
                      {gig.StudentName} wanted: <span className="text-m3-secondary font-bold">{gig.SkillWanted}</span>
                    </p>
                  </div>

                  <div className="w-full pt-1 flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-m3-primary tracking-wider bg-m3-primaryContainer/30 px-2.5 py-1 rounded-full">
                      Status: Swapped
                    </span>
                    <button
                      onClick={() => handleDelete(gig.id || gig._id)}
                      className="m3-filled-button hover:brightness-110 !min-h-[36px] !py-1 px-3 text-xs w-auto"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--m3-error) 15%, transparent)', color: 'var(--m3-error)' }}
                      type="button"
                    >
                      <Trash size={14} className="mr-1" /> Delete Swap
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3.5 select-none py-16 text-center">
              <ArrowsCounterClockwise className="animate-spin text-m3-primary" size={28} />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading board...</span>
            </div>
          ) : error ? (
            <div className="m3-surface-card p-6 flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-semibold text-m3-onSurface">{error}</p>
              <button 
                className="m3-filled-button" 
                style={{ maxWidth: 160 }} 
                onClick={() => fetchGigs(searchQuery)}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : displayedGigs.length === 0 ? (
            <div className="m3-surface-card p-8 flex flex-col items-center justify-center gap-3 text-center select-none">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-m3-primary shadow-md"
                style={{ backgroundColor: 'color-mix(in srgb, var(--m3-primary-container) 30%, transparent)' }}
              >
                <UserPlus size={22} />
              </div>
              <p className="text-sm font-semibold text-m3-onSurface">
                {viewTab === 'listings' 
                  ? 'No active listings found.' 
                  : viewTab === 'history' 
                    ? 'No completed swaps found.' 
                    : 'No ongoing chats found.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {displayedGigs.map((gig) => {
                const isOwnListing = gig.StudentName.toLowerCase() === currentStudentName;
                const isAccepted = gig.Status === 'Ongoing';

                return (
                  <div 
                    key={gig.id || gig._id} 
                    className="m3-surface-card p-5 flex flex-col gap-4 text-left shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                  >
                    {/* Header Row */}
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        {renderAvatar(gig.StudentName, "w-12 h-12 text-base")}
                        <div>
                          <h4 className="m3-title-medium text-m3-onSurface leading-tight">
                            {gig.SkillOffered}
                          </h4>
                          <span className="text-[10px] font-bold text-m3-onSurfaceVariant font-mono tracking-widest uppercase block mt-1 font-semibold">
                            BY {gig.StudentName}
                          </span>
                        </div>
                      </div>

                      {/* Flag report button for peer listings */}
                      {!isOwnListing && !isModerator && (
                        <button
                          onClick={() => handleReport(gig.id || gig._id)}
                          className="text-m3-onSurfaceVariant hover:text-m3-tertiary p-1.5 transition-colors cursor-pointer animate-none"
                          title="Report Listing"
                          type="button"
                        >
                          <Flag size={14} />
                        </button>
                      )}
                    </div>

                    {/* Looking for Wanted Skill Pill */}
                    <div className="bg-m3-surfaceContainerLow p-3.5 rounded-2xl w-full text-left">
                      <p className="m3-body-small text-m3-onSurfaceVariant">
                        Looking for: <span className="text-m3-primary font-bold ml-1">{gig.SkillWanted}</span>
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="w-full mt-1">
                      {isModerator ? (
                        <button
                          onClick={() => handleDelete(gig.id || gig._id)}
                          className="m3-filled-button hover:brightness-110 !min-h-[44px]"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--m3-error) 15%, transparent)', color: 'var(--m3-error)' }}
                          type="button"
                        >
                          <Trash size={16} /> Moderate (Delete Listing)
                        </button>
                      ) : isOwnListing ? (
                        <button
                          onClick={() => handleDelete(gig.id || gig._id)}
                          className="m3-filled-button hover:brightness-110 !min-h-[44px]"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--m3-error) 15%, transparent)', color: 'var(--m3-error)' }}
                          type="button"
                        >
                          <Trash size={16} /> Delete Post
                        </button>
                      ) : isAccepted ? (
                        <div className="bg-m3-surfaceContainerHigh rounded-2xl p-4 flex flex-col items-center gap-3 w-full">
                          <span className="text-m3-onSurfaceVariant font-bold text-[10px] uppercase tracking-widest block text-center font-mono">
                            {gig.Status === 'Ongoing' ? '✓ SWAP CONFIRMED' : 'REQUEST ACCEPTED!'}
                          </span>
                          
                          {gig.Status === 'Completed' ? (
                            <div className="w-full py-3 bg-m3-secondaryContainer text-m3-onSecondaryContainer rounded-2xl text-xs font-bold flex items-center justify-center gap-2 select-none shadow-sm">
                              <CheckCircle size={15} /> Swap Completed!
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2.5 w-full">
                              <button
                                onClick={() => handleStartChat(gig.StudentName)}
                                className="m3-filled-button bg-m3-primary text-m3-onPrimary hover:brightness-110 !min-h-[44px] flex items-center justify-center gap-2 font-bold text-xs"
                                type="button"
                              >
                                <ChatCircle size={15} /> Open Chat with {gig.StudentName}
                              </button>
                              <button
                                onClick={() => handleMarkAsDone(gig.id || gig._id)}
                                className="m3-filled-button !bg-m3-secondaryContainer !text-m3-onSecondaryContainer hover:brightness-110 !min-h-[40px] flex items-center justify-center gap-1.5 font-bold text-xs"
                                type="button"
                              >
                                Mark as Done ✓
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartChat(gig.StudentName)}
                          className="m3-filled-button bg-m3-secondaryContainer text-m3-onSecondaryContainer hover:brightness-110 !min-h-[44px] flex items-center justify-center gap-2 font-bold text-xs"
                          type="button"
                        >
                          <ChatCircle size={15} /> Chat with {gig.StudentName}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Custom Confirm Dialog */}
      {confirmDialog && (
        <div className="absolute inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
          <div className="m3-frosted-dialog p-6 flex flex-col gap-4 text-left max-w-[280px] w-full shadow-2xl animate-fade-in">
            <h3 className="m3-title-medium text-m3-onSurface">Confirm Action</h3>
            <p className="m3-body-small text-m3-onSurfaceVariant">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="m3-filled-button bg-m3-surfaceVariant text-m3-onSurfaceVariant !min-h-[36px] text-xs !py-1 px-3 w-auto"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="m3-filled-button bg-m3-primary text-m3-onPrimary !min-h-[36px] text-xs !py-1 px-3 w-auto"
                type="button"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Prompt Dialog */}
      {promptDialog && (
        <div className="absolute inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
          <div className="m3-frosted-dialog p-6 flex flex-col gap-4 text-left max-w-[280px] w-full shadow-2xl animate-fade-in">
            <h3 className="m3-title-medium text-m3-onSurface">{promptDialog.title}</h3>
            <p className="m3-body-small text-m3-onSurfaceVariant">{promptDialog.message}</p>
            <input
              type="text"
              value={promptDialog.value}
              onChange={(e) => setPromptDialog(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Reason..."
              className="m3-filled-field !h-[40px] text-xs"
              autoFocus
            />
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setPromptDialog(null)}
                className="m3-filled-button bg-m3-surfaceVariant text-m3-onSurfaceVariant !min-h-[36px] text-xs !py-1 px-3 w-auto"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (promptDialog.value.trim()) {
                    promptDialog.onConfirm(promptDialog.value.trim());
                    setPromptDialog(null);
                  } else {
                    alert('Reason is required.');
                  }
                }}
                className="m3-filled-button bg-m3-primary text-m3-onPrimary !min-h-[36px] text-xs !py-1 px-3 w-auto"
                type="button"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Chat Log Modal */}
      {activeReportForChat && (
        <div className="absolute inset-0 bg-black/70 z-[99999] flex items-center justify-center p-6" onClick={() => { setActiveReportForChat(null); setReportedChatMessages([]); }}>
          <div
            className="w-full max-w-md h-[80%] rounded-[var(--m3-shape-2xl)] bg-m3-surfaceContainer border border-transparent p-6 shadow-2xl flex flex-col gap-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderBottomColor: 'color-mix(in srgb, var(--m3-outline-variant) 55%, transparent)' }}>
              <div className="flex flex-col">
                <h3 className="m3-title-medium">Review Chat Log</h3>
                <span className="text-[10px] text-m3-onSurfaceVariant mt-0.5">
                  Between <span className="font-bold">{activeReportForChat.ReporterName}</span> &amp; <span className="font-bold">{activeReportForChat.ReportedName}</span>
                </span>
              </div>
              <button className="w-8 h-8 rounded-full hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant flex items-center justify-center transition cursor-pointer font-bold border-none bg-transparent" onClick={() => { setActiveReportForChat(null); setReportedChatMessages([]); }}>✕</button>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 py-2 bg-m3-surfaceContainerHigh/40 rounded-2xl p-4 min-h-0 border border-m3-outline-variant/10">
              {loadingReportedChat ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3.5 select-none text-center">
                  <ArrowsCounterClockwise className="animate-spin text-m3-primary" size={24} />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Loading conversation history...</span>
                </div>
              ) : reportedChatMessages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center gap-2 text-center select-none py-8">
                  <span className="text-xs text-m3-outline italic">No messages found in this conversation</span>
                </div>
              ) : (
                reportedChatMessages.map((msg) => {
                  const isReporter = msg.SenderName === activeReportForChat.ReporterName;
                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col w-full ${isReporter ? 'items-start' : 'items-end'}`}
                    >
                      <span className="text-[9px] text-m3-onSurfaceVariant/60 font-semibold mb-0.5 px-2">
                        {msg.SenderName}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-[18px] px-3.5 py-2.5 shadow-sm text-xs ${
                          isReporter
                            ? 'bg-m3-primaryContainer text-m3-onPrimaryContainer rounded-tl-none'
                            : 'bg-m3-surfaceContainerHighest text-m3-onSurface rounded-tr-none'
                        }`}
                      >
                        {msg.Content.startsWith('data:image/') ? (
                          <img src={msg.Content} className="rounded-lg max-w-full max-h-[160px] object-cover" alt="Attachment" />
                        ) : msg.Content.startsWith('data:audio/') ? (
                          <audio src={msg.Content} controls className="w-[180px] h-8" style={{ filter: 'invert(1) hue-rotate(180deg)' }} />
                        ) : (
                          <p className="leading-relaxed break-words">{msg.Content}</p>
                        )}
                        <span className="text-[8px] opacity-60 block text-right mt-1.5 font-sans">
                          {new Date(msg.Timestamp || msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="flex-1 h-[44px] rounded-full border-none bg-m3-surfaceContainerHighest hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                onClick={() => { setActiveReportForChat(null); setReportedChatMessages([]); }}
              >
                Close Log
              </button>
              <button
                type="button"
                className="flex-1 h-[44px] rounded-full border-none bg-m3-errorContainer text-m3-onErrorContainer hover:brightness-110 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                onClick={() => {
                  handleDismissReport(activeReportForChat._id);
                  setActiveReportForChat(null);
                  setReportedChatMessages([]);
                }}
              >
                Dismiss Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
