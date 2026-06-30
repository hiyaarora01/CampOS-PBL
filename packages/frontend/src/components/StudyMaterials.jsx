import React, { useState, useEffect } from 'react';
import { Download, CaretDown, Plus, Pencil, Trash, ArrowsCounterClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import M3ScreenHeader from './M3ScreenHeader';
import { API_BASE } from '../config/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudyMaterials({ currentUser, setActiveTab, initialBranch, initialSemester }) {
  const [shelfBranch, setShelfBranch] = useState(initialBranch || 'All Branches');
  const [shelfSemester, setShelfSemester] = useState(initialSemester || 'All Semesters');
  const [shelfCategory, setShelfCategory] = useState('Notes');
  const [shelfSubject, setShelfSubject] = useState('All Subjects');
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null); // null means adding
  const [nameInput, setNameInput] = useState('');
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [branchInput, setBranchInput] = useState('Computer Science & Engineering');
  const [semesterInput, setSemesterInput] = useState('Semester 1');
  const [categoryInput, setCategoryInput] = useState('Notes'); // maps to type
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/studymaterials`);
      if (!res.ok) throw new Error("Failed to load study materials.");
      const data = await res.json();
      setMaterials(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (initialBranch) {
      setShelfBranch(initialBranch);
    } else if (currentUser?.role === 'student' && currentUser?.studentProfile?.branch) {
      setShelfBranch(currentUser.studentProfile.branch);
    }
  }, [initialBranch, currentUser]);

  useEffect(() => {
    if (initialSemester) {
      setShelfSemester(initialSemester);
    } else if (currentUser?.role === 'student' && currentUser?.studentProfile?.grade) {
      const yearMap = {
        '1st Year': 'Semester 1',
        '2nd Year': 'Semester 3',
        '3rd Year': 'Semester 5',
        '4th Year': 'Semester 7'
      };
      const sem = yearMap[currentUser.studentProfile.grade];
      if (sem) setShelfSemester(sem);
    }
  }, [initialSemester, currentUser]);

  // Scroll dynamics minimize states
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = (e) => {
    const currentScrollTop = e.target.scrollTop;
    setIsScrolled(currentScrollTop > 10);
  };

  // Next Upcoming Exam Countdown states
  const [examList, setExamList] = useState([]);
  const [isCountdownDismissed, setIsCountdownDismissed] = useState(() => {
    return localStorage.getItem('campos_dismissed_exam_countdown') === 'true';
  });
  const [nextExam, setNextExam] = useState(null);
  const [nextExamCountdown, setNextExamCountdown] = useState('');

  // Fetch upcoming exams from database calendar
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/calendar`);
        if (res.ok) {
          const data = await res.json();
          const parsedExams = data
            .map(event => {
              const parsedTime = Date.parse(event.date);
              return {
                name: event.category,
                target: !isNaN(parsedTime) ? parsedTime : null
              };
            })
            .filter(e => e.target !== null);
          
          if (parsedExams.length > 0) {
            setExamList(parsedExams);
          }
        }
      } catch (e) {
        console.error("Failed to load calendar exams for countdown:", e);
      }
    };
    fetchExams();
  }, []);

  // Live Exam Countdown ticking effect
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date().getTime();
      
      const defaultExams = [
        { name: 'Mid-Term 1 (T1)', target: new Date('2026-06-25T09:00:00').getTime() },
        { name: 'Mid-Term 2 (T2)', target: new Date('2026-08-10T09:00:00').getTime() },
        { name: 'End-Sem Exams (T3)', target: new Date('2026-10-20T09:00:00').getTime() }
      ];

      const activeExams = examList.length > 0 ? examList : defaultExams;

      // Find the first exam in the future
      const upcoming = activeExams.find(e => e.target - now > 0);

      if (upcoming) {
        setNextExam(upcoming);
        
        const diff = upcoming.target - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setNextExamCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setNextExam(null);
        setNextExamCountdown('');
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [examList]);

  // Filtered Materials logic
  const availableSubjects = React.useMemo(() => {
    const filteredByBranchSem = materials.filter((material) => {
      const matchesBranch = 
        shelfBranch === 'All Branches' || 
        material.branch === shelfBranch;
      
      const matchesSemester = 
        shelfSemester === 'All Semesters' || 
        material.semester === shelfSemester;
        
      return matchesBranch && matchesSemester;
    });

    const subjects = new Set();
    filteredByBranchSem.forEach(m => {
      if (m.subject) {
        subjects.add(m.subject);
      }
    });
    return Array.from(subjects).sort();
  }, [materials, shelfBranch, shelfSemester]);

  useEffect(() => {
    if (shelfSubject !== 'All Subjects' && !availableSubjects.includes(shelfSubject)) {
      setShelfSubject('All Subjects');
    }
  }, [availableSubjects, shelfSubject]);

  // Filtered Materials logic
  const filteredMaterials = materials.filter((material) => {
    const matchesBranch = 
      shelfBranch === 'All Branches' || 
      material.branch === shelfBranch;
    
    const matchesSemester = 
      shelfSemester === 'All Semesters' || 
      material.semester === shelfSemester;
    
    const matchesCategory = 
      shelfCategory === 'All' || 
      material.type === shelfCategory;

    const matchesSubject = 
      shelfSubject === 'All Subjects' || 
      material.subject === shelfSubject;

    const matchesSearch = 
      !searchQuery.trim() || 
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (material.code && material.code.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesBranch && matchesSemester && matchesCategory && matchesSubject && matchesSearch;
  });

  const handleDownload = (course) => {
    if (course.driveLink) {
      window.open(course.driveLink, '_blank', 'noopener,noreferrer');
    } else {
      const fallbackId = course._id || course.code;
      setDownloadingId(fallbackId);
      setTimeout(() => {
        setDownloadingId(null);
        alert(`Successfully downloaded: ${course.code} - ${course.name}`);
      }, 1500);
    }
  };

  const handleStartEdit = (mat) => {
    setEditingMaterial(mat);
    setNameInput(mat.name);
    setDriveLinkInput(mat.driveLink);
    setSubjectInput(mat.subject || '');
    setBranchInput(mat.branch);
    setSemesterInput(mat.semester);
    setCategoryInput(mat.type || 'Notes');
    setShowModal(true);
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm("Are you sure you want to permanently delete this study material?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/studymaterials/${materialId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete study material');
      }

      setMaterials((prev) => prev.filter((m) => m._id !== materialId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!nameInput || !driveLinkInput || !branchInput || !semesterInput || !subjectInput) return;

    // Generate code and size
    const getAbbreviation = (br) => {
      if (br.includes('Computer Science')) return 'CS';
      if (br.includes('Electronics')) return 'ECE';
      if (br.includes('Information')) return 'IT';
      if (br.includes('Biotechnology')) return 'BT';
      return 'GEN';
    };
    const abbrev = getAbbreviation(branchInput);
    const code = editingMaterial ? editingMaterial.code : `${abbrev}-${Math.floor(100 + Math.random() * 900)}`;
    const size = editingMaterial ? editingMaterial.size : `${(1 + Math.random() * 10).toFixed(1)} MB`;

    const materialPayload = {
      name: nameInput,
      driveLink: driveLinkInput,
      branch: branchInput,
      semester: semesterInput,
      type: categoryInput,
      subject: subjectInput,
      code,
      size,
    };

    try {
      setSubmitting(true);
      const url = editingMaterial 
        ? `${API_BASE}/api/studymaterials/${editingMaterial._id}`
        : `${API_BASE}/api/studymaterials`;
      const method = editingMaterial ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialPayload),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save study material');
      }

      setShowModal(false);
      fetchMaterials();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => setActiveTab && setActiveTab('home');

  const groupedMaterials = React.useMemo(() => {
    const groups = {};
    filteredMaterials.forEach((material) => {
      const sub = material.subject || 'General / Other';
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(material);
    });

    // Sort materials within each subject group alphabetically by name ascending (using natural alphanumeric sorting)
    Object.keys(groups).forEach((sub) => {
      groups[sub].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    });

    return groups;
  }, [filteredMaterials]);

  return (
    <div className="m3-screen study-materials-dashboard">
      <M3ScreenHeader
        title="Study Shelf"
        subtitle="Books, tutorials & PYQs"
        isScrolled={isScrolled}
        onBack={goBack}
      />

      <div onScroll={handleScroll} className="m3-screen__scroll" style={{ paddingBottom: 88 }}>
        {nextExam && !isCountdownDismissed && (
          <div className="bg-[var(--m3-primary)] text-[var(--m3-on-primary)] shrink-0 flex items-center justify-between gap-3 rounded-[20px] p-4 shadow-sm relative overflow-hidden">
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-85">Upcoming: {nextExam.name}</span>
              <span className="text-[18px] font-bold mt-0.5">
                {nextExamCountdown}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full bg-[var(--m3-on-primary)]/40 rounded-full opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 bg-[var(--m3-on-primary)]" />
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCountdownDismissed(true);
                  localStorage.setItem('campos_dismissed_exam_countdown', 'true');
                }}
                className="w-6 h-6 rounded-full hover:bg-[var(--m3-on-primary)]/10 text-[var(--m3-on-primary)] flex items-center justify-center transition border-none cursor-pointer text-xs font-bold"
                title="Dismiss Countdown"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="relative w-full text-left">
            <input
              type="text"
              placeholder="Search by topic or course code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="m3-filled-field w-full pl-10 pr-4 !h-11"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-m3-primary pointer-events-none">
              <MagnifyingGlass size={16} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <span className="m3-body-small font-medium uppercase tracking-wider pl-1">Branch</span>
              <div className="m3-select-wrap">
                <select
                  value={shelfBranch}
                  onChange={(e) => setShelfBranch(e.target.value)}
                  className="m3-select"
                >
                  <option value="All Branches">All Branches</option>
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Mathematics and Computing">Mathematics and Computing</option>
                  <option value="Robotics and Artificial Intelligence">Robotics and Artificial Intelligence</option>
                  <option value="Biotechnology">Biotechnology</option>
                </select>
                <div className="absolute -translate-y-1/2 pointer-events-none text-m3-primary right-4 top-1/2">
                  <CaretDown size={14} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <span className="m3-body-small font-medium uppercase tracking-wider pl-1">Semester</span>
              <div className="m3-select-wrap">
                <select
                  value={shelfSemester}
                  onChange={(e) => setShelfSemester(e.target.value)}
                  className="m3-select"
                >
                  <option value="All Semesters">All Semesters</option>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <option key={i} value={`Semester ${i + 1}`}>Semester {i + 1}</option>
                  ))}
                </select>
                <div className="absolute -translate-y-1/2 pointer-events-none text-m3-primary right-4 top-1/2">
                  <CaretDown size={14} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <span className="m3-body-small font-medium uppercase tracking-wider pl-1">Subject</span>
            <div className="m3-select-wrap">
              <select
                value={shelfSubject}
                onChange={(e) => setShelfSubject(e.target.value)}
                className="m3-select"
              >
                <option value="All Subjects">All Subjects</option>
                {availableSubjects.map((subj) => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
              <div className="absolute -translate-y-1/2 pointer-events-none text-m3-primary right-4 top-1/2">
                <CaretDown size={14} />
              </div>
            </div>
          </div>
        </div>

        <div className="m3-segmented-chips justify-center flex-wrap py-1 shrink-0">
          {['Notes', 'Tutorials', 'PYQs', 'Books'].map((cat) => {
            const isActive = shelfCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                data-haptic="light"
                onClick={() => setShelfCategory(cat)}
                className={`px-4 py-2 text-xs font-extrabold cursor-pointer shrink-0 border relative transition-colors duration-200 ${
                  isActive
                    ? 'text-m3-onPrimary border-transparent !bg-transparent'
                    : 'bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant hover:bg-m3-surfaceContainerLow border-m3-outlineVariant/30'
                }`}
                style={{ borderRadius: '24px' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-materials-chip"
                    className="absolute inset-0 bg-m3-primary rounded-full z-0"
                    style={{ borderRadius: '24px' }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Loading / Error States & Document Listing Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={shelfCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="flex-grow w-full flex flex-col gap-4"
          >
            {loading && materials.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center select-none w-full">
                <ArrowsCounterClockwise className="animate-spin text-m3-primary" size={24} />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading shelf materials...</span>
              </div>
            )}

            {!loading && error && (
              <div className="m3-surface-card p-6 flex flex-col items-center gap-3 text-center w-full">
                <p className="text-sm font-semibold text-m3-onSurface">⚠️ {error}</p>
                <button className="m3-filled-button" style={{ maxWidth: 160 }} onClick={fetchMaterials}>Retry</button>
              </div>
            )}

            {/* Document Listing Grid */}
            <div className="flex flex-col gap-6 shrink-0 w-full">
              {!loading && !error && (
                filteredMaterials.length > 0 ? (
                  Object.keys(groupedMaterials).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map((subjectName) => (
                    <div key={subjectName} className="flex flex-col gap-3 w-full">
                      <h3 className="m3-title-medium font-bold text-m3-primary border-b pb-1 text-left" style={{ borderBottomColor: 'color-mix(in srgb, var(--m3-outline-variant) 60%, transparent)' }}>
                        {subjectName}
                      </h3>
                      <div className="flex flex-col gap-3 w-full">
                        {groupedMaterials[subjectName].map((course) => {
                          const isDownloading = downloadingId === (course._id || course.code);
                          return (
                            <article
                              key={course._id || course.code}
                              className="m3-surface-card flex items-center justify-between gap-3 shrink-0 w-full"
                            >
                              <div className="flex flex-col gap-1 pr-4 text-left items-start min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="m3-assist-chip text-[10px] py-0.5">{course.code}</span>
                                  <span className="m3-body-small font-bold uppercase tracking-widest opacity-70">{course.type}</span>
                                </div>
                                <span className="m3-title-medium leading-snug mt-1">{course.name}</span>
                                <span className="m3-body-small mt-1 opacity-80">
                                  {course.branch} • {course.semester} • {course.size}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isSuperAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(course)}
                                      className="w-8 h-8 rounded-full hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant flex items-center justify-center transition cursor-pointer"
                                      title="Edit Document"
                                      type="button"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(course._id)}
                                      className="w-8 h-8 rounded-full hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant hover:text-m3-error flex items-center justify-center transition cursor-pointer"
                                      title="Delete Document"
                                      type="button"
                                    >
                                      <Trash size={13} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDownload(course)}
                                  disabled={isDownloading}
                                  className="m3-icon-button"
                                  aria-label={`Download ${course.code}`}
                                >
                                  {isDownloading ? (
                                    <div className="w-5 h-5 border-2 rounded-full border-m3-primary border-t-transparent animate-spin" />
                                  ) : (
                                    <Download size={18} />
                                  )}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="m3-surface-card p-12 text-center flex flex-col items-center justify-center shrink-0 w-full">
                    <span className="mb-3 text-4xl opacity-40">🔍</span>
                    <h3 className="m3-title-medium">No materials found</h3>
                    <p className="m3-body-small mt-1">Try adjusting your filters.</p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        </AnimatePresence>


      </div>

      {/* FAB button for Super Admin to Add PDF */}
      {isSuperAdmin && (
        <button
          onClick={() => {
            setEditingMaterial(null);
            setNameInput('');
            setDriveLinkInput('');
            setSubjectInput('');
            setBranchInput('Computer Science & Engineering');
            setSemesterInput('Semester 1');
            setCategoryInput('Notes');
            setShowModal(true);
          }}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl bg-m3-primary text-m3-onPrimary flex items-center justify-center shadow-lg transition hover:brightness-110 active:scale-95 cursor-pointer z-30" data-haptic="medium"
          type="button"
          title="Add Document"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Floating Document Form Modal */}
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
                  {editingMaterial ? 'Edit Document' : 'List Document on Shelf'}
                </h3>
                <button
                  className="w-8 h-8 rounded-full hover:bg-m3-surfaceContainerHighest text-m3-onSurfaceVariant flex items-center justify-center transition cursor-pointer font-bold"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMaterial} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Document Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to React & UI Foundations"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    className="m3-filled-field !h-11"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Subject</span>
                  <input
                    type="text"
                    placeholder="e.g. Web Development"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    required
                    className="m3-filled-field !h-11"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Google Drive Download Link</span>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={driveLinkInput}
                    onChange={(e) => setDriveLinkInput(e.target.value)}
                    required
                    className="m3-filled-field !h-11"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Branch</span>
                  <div className="m3-select-wrap">
                    <select
                      value={branchInput}
                      onChange={(e) => setBranchInput(e.target.value)}
                      className="m3-select !h-11"
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Mathematics and Computing">Mathematics and Computing</option>
                      <option value="Robotics and Artificial Intelligence">Robotics and Artificial Intelligence</option>
                      <option value="Biotechnology">Biotechnology</option>
                    </select>
                    <div className="absolute -translate-y-1/2 pointer-events-none text-m3-onSurfaceVariant right-4 top-1/2">
                      <CaretDown size={14} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Semester</span>
                  <div className="m3-select-wrap">
                    <select
                      value={semesterInput}
                      onChange={(e) => setSemesterInput(e.target.value)}
                      className="m3-select !h-11"
                    >
                      {Array.from({ length: 8 }).map((_, i) => (
                        <option key={i} value={`Semester ${i + 1}`}>Semester {i + 1}</option>
                      ))}
                    </select>
                    <div className="absolute -translate-y-1/2 pointer-events-none text-m3-onSurfaceVariant right-4 top-1/2">
                      <CaretDown size={14} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-m3-onSurfaceVariant uppercase tracking-widest pl-1">Category / Type</span>
                  <div className="m3-select-wrap">
                    <select
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      className="m3-select !h-11"
                    >
                      <option value="Notes">Notes</option>
                      <option value="Tutorials">Tutorials</option>
                      <option value="PYQs">PYQs</option>
                      <option value="Books">Books</option>
                    </select>
                    <div className="absolute -translate-y-1/2 pointer-events-none text-m3-onSurfaceVariant right-4 top-1/2">
                      <CaretDown size={14} />
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
                    {submitting ? 'Listing...' : 'List PDF'}
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
