import React, { useState, useEffect } from 'react';
import { GraduationCap, Calendar, Plus, Pencil, Trash, ArrowsCounterClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import M3ScreenHeader from './M3ScreenHeader';
import { API_BASE } from '../config/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function AcademicCalendar({ currentUser, setActiveTab }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null means adding
  const [dateInput, setDateInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [themeInput, setThemeInput] = useState('teal');
  const [submitting, setSubmitting] = useState(false);

  const isEditable = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/calendar`);
      if (!res.ok) throw new Error("Failed to load academic calendar events.");
      const data = await res.json();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleScroll = (e) => {
    const currentScrollTop = e.target.scrollTop;
    setIsScrolled(currentScrollTop > 10);
  };

  const handleStartEdit = (event) => {
    setEditingEvent(event);
    setDateInput(event.date);
    setCategoryInput(event.category);
    setDescInput(event.desc);
    setTagsInput(event.tags ? event.tags.join(', ') : '');
    setThemeInput(event.theme || 'teal');
    setShowModal(true);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Are you sure you want to permanently delete this calendar event?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/calendar/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete event');
      }

      setEvents((prev) => prev.filter((e) => e._id !== eventId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!dateInput || !categoryInput || !descInput) return;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const eventPayload = {
      date: dateInput,
      category: categoryInput,
      desc: descInput,
      tags: parsedTags,
      theme: themeInput,
    };

    try {
      setSubmitting(true);
      const url = editingEvent 
        ? `${API_BASE}/api/calendar/${editingEvent._id}`
        : `${API_BASE}/api/calendar`;
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save event');
      }

      setShowModal(false);
      fetchEvents();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => setActiveTab && setActiveTab('home');

  const availableTags = React.useMemo(() => {
    const tagsSet = new Set();
    events.forEach(e => {
      if (e.tags) {
        e.tags.forEach(t => {
          if (t.toLowerCase() !== 'odd sem') {
            tagsSet.add(t.trim());
          }
        });
      }
    });
    // Dynamically detect common tags and sort them nicely
    const list = Array.from(tagsSet).filter(t => t.toLowerCase() !== 'exam' && t.toLowerCase() !== 'deadline');
    return ['All', 'Exam', 'Deadline', ...list.sort()];
  }, [events]);

  const filteredEvents = React.useMemo(() => {
    return events.filter((event) => {
      const matchesTag = 
        selectedFilter === 'All' || 
        (event.tags && event.tags.some(t => t.toLowerCase() === selectedFilter.toLowerCase())) ||
        event.category.toLowerCase().includes(selectedFilter.toLowerCase());
      
      const matchesSearch = 
        !searchQuery.trim() || 
        event.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
        event.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.tags && event.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
        
      return matchesTag && matchesSearch;
    });
  }, [events, selectedFilter, searchQuery]);

  return (
    <div className="m3-screen academic-calendar-dashboard">
      <M3ScreenHeader
        title="Academic Calendar"
        subtitle="Odd sem • 2025–26"
        isScrolled={isScrolled}
        onBack={goBack}
      />

      <div onScroll={handleScroll} className="m3-screen__scroll !gap-4 relative" style={{ paddingBottom: 88 }}>
        {/* Advanced Search Bar */}
        <div className="relative w-full text-left shrink-0">
          <input
            type="text"
            placeholder="Search events, dates, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="m3-filled-field w-full pl-10 pr-4 !h-11"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-m3-primary pointer-events-none">
            <MagnifyingGlass size={16} />
          </div>
        </div>

        {/* Dynamic Category/Tag Filter Chips */}
        <div className="m3-segmented-chips justify-center flex-wrap py-1 shrink-0">
          {availableTags.map((cat) => {
            const isActive = selectedFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                data-haptic="light"
                onClick={() => setSelectedFilter(cat)}
                className={`px-4 py-2 text-xs font-extrabold cursor-pointer shrink-0 border relative transition-colors duration-200 ${
                  isActive
                    ? 'text-m3-onPrimary border-transparent !bg-transparent'
                    : 'bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant hover:bg-m3-surfaceContainerLow border-m3-outlineVariant/30'
                }`}
                style={{ borderRadius: '24px' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-calendar-chip"
                    className="absolute inset-0 bg-m3-primary rounded-full z-0"
                    style={{ borderRadius: '24px' }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat}s</span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && events.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center select-none">
            <ArrowsCounterClockwise className="animate-spin text-m3-primary" size={24} />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading calendar events...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="m3-surface-card p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-semibold text-m3-onSurface">⚠️ {error}</p>
            <button className="m3-filled-button" style={{ maxWidth: 160 }} onClick={fetchEvents}>Retry</button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="m3-surface-card p-8 flex flex-col items-center justify-center gap-3 text-center select-none">
            <Calendar size={32} className="text-m3-primary" />
            <h4 className="text-sm text-m3-onSurface font-extrabold uppercase tracking-widest">No Events Scheduled</h4>
            <span className="text-xs text-slate-400 font-medium">The academic calendar is currently empty.</span>
          </div>
        )}

        {/* Empty State (No Filter Matches) */}
        {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
          <div className="m3-surface-card p-8 flex flex-col items-center justify-center gap-3 text-center select-none">
            <span className="text-3xl opacity-40">🔍</span>
            <h4 className="text-sm text-m3-onSurface font-extrabold uppercase tracking-widest">No Matches Found</h4>
            <span className="text-xs text-slate-400 font-medium">No events found matching category: "{selectedFilter}"</span>
          </div>
        )}

        {/* Events list */}
        {!loading && !error && filteredEvents.map((event) => {
          return (
            <article key={event._id} className="m3-surface-card flex flex-col gap-4 text-left relative overflow-hidden shrink-0">
              <div
                className="flex items-start justify-between gap-3 w-full pb-3.5"
                style={{ borderBottom: '1px solid color-mix(in srgb, var(--m3-outline-variant) 50%, transparent)' }}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="m3-icon-badge shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <h4 className="m3-title-medium truncate">{event.category}</h4>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {isEditable && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(event)}
                        className="w-8 h-8 rounded-full hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant flex items-center justify-center transition cursor-pointer"
                        title="Edit Event"
                        type="button"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(event._id)}
                        className="w-8 h-8 rounded-full hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant hover:text-m3-error flex items-center justify-center transition cursor-pointer"
                        title="Delete Event"
                        type="button"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="m3-body-medium m3-text-variant leading-relaxed pr-2">{event.desc}</p>

              <div className="flex items-center justify-between gap-3 w-full mt-1.5 flex-wrap">
                <div className="flex justify-start shrink-0">
                  <span className="m3-assist-chip gap-2 inline-flex whitespace-nowrap">
                    <Calendar size={12} className="text-m3-primary shrink-0" />
                    <span className="text-[11px] font-medium tracking-wide uppercase whitespace-nowrap">{event.date}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {event.tags && event.tags.map((tag) => (
                    <span key={tag} className="m3-assist-chip text-[9px] py-0.5 uppercase shrink-0 whitespace-nowrap">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* FAB button for edit */}
      {isEditable && (
        <button
          onClick={() => {
            setEditingEvent(null);
            setDateInput('');
            setCategoryInput('');
            setDescInput('');
            setTagsInput('');
            setThemeInput('teal');
            setShowModal(true);
          }}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl bg-m3-primary text-m3-onPrimary flex items-center justify-center shadow-lg transition hover:brightness-110 active:scale-95 cursor-pointer z-30" data-haptic="medium"
          type="button"
          title="Schedule Event"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Floating Event Form Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="absolute inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full max-w-md m3-frosted-dialog p-6 rounded-[28px] flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderBottomColor: 'color-mix(in srgb, var(--m3-outline-variant) 55%, transparent)' }}>
                <h3 className="m3-title-medium font-bold text-m3-onSurface">
                  {editingEvent ? 'Edit Event' : 'Create Event'}
                </h3>
                <button
                  className="w-8 h-8 rounded-full hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant flex items-center justify-center transition cursor-pointer font-bold"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Category / Title</span>
                  <input
                    type="text"
                    placeholder="e.g. Project / Dissertation"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    required
                    className="m3-filled-field !h-11"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Scheduled Date Description</span>
                  <input
                    type="text"
                    placeholder="e.g. Tuesday, November 18, 2025"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    required
                    className="m3-filled-field !h-11"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Event Description Details</span>
                  <textarea
                    placeholder="Detailed explanation of the deadline or exam event..."
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    required
                    rows={3}
                    className="m3-filled-field !h-auto !py-2.5 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Tags (Comma-separated)</span>
                  <input
                    type="text"
                    placeholder="e.g. Odd Sem, Deadline, Exam"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="m3-filled-field !h-11"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Theme Accent</span>
                  <div className="m3-select-wrap">
                    <select
                      value={themeInput}
                      onChange={(e) => setThemeInput(e.target.value)}
                      className="m3-select !h-11"
                    >
                      <option value="teal">Teal (Project/Dissertation)</option>
                      <option value="rose">Rose (Feedback)</option>
                      <option value="amber">Amber (Attendance)</option>
                      <option value="magenta">Magenta (Classes Finish)</option>
                      <option value="purple">Purple (Council Meetings)</option>
                    </select>
                    <div className="absolute -translate-y-1/2 pointer-events-none text-m3-onSurfaceVariant right-4 top-1/2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 select-none">
                  <button
                    type="button"
                    className="flex-1 h-[48px] rounded-full border-none bg-m3-surfaceContainer hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="m3-filled-button flex-1"
                    style={{ minHeight: 48 }}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
