'use client';

import { useState, useEffect } from 'react';
import { api, User, Subject, Topic, Exam, StudySession, PlanItem, PlanResponse } from './lib/api';

interface ExtractedTopicPreview {
  tempId: string;
  name: string;
  difficulty: number;
  priority: number;
}

interface PreviewSyllabusData {
  subject_name: string;
  topics: ExtractedTopicPreview[];
}

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // App Data State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [aiPlan, setAiPlan] = useState<PlanResponse | null>(null);

  // UI Tabs: 'planner' | 'quick' | 'timer' | 'subjects' | 'calendar' | 'history'
  const [activeTab, setActiveTab] = useState<'planner' | 'quick' | 'timer' | 'subjects' | 'calendar' | 'history'>('planner');

  // AI Planner Form State
  const [availableHours, setAvailableHours] = useState(4);
  const [studyStyle, setStudyStyle] = useState('Pomodoro (25/5)');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState('');

  // Quick Planner State
  const [quickHours, setQuickHours] = useState<number>(4);
  const [quickStudyStyle, setQuickStudyStyle] = useState('Pomodoro (25/5)');

  // Subject / Topic Creation & Inline Edit State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicSubjectId, setNewTopicSubjectId] = useState<number | null>(null);
  const [newTopicDifficulty, setNewTopicDifficulty] = useState(3);
  const [newTopicPriority, setNewTopicPriority] = useState(3);
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editTopicName, setEditTopicName] = useState('');
  const [editTopicDifficulty, setEditTopicDifficulty] = useState(3);
  const [editTopicPriority, setEditTopicPriority] = useState(3);

  // Syllabus Analyzer & Edit Syllabus State
  const [subjectEntryMode, setSubjectEntryMode] = useState<'manual' | 'analyzer'>('manual');
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [analyzingSyllabus, setAnalyzingSyllabus] = useState(false);
  const [analyzerError, setAnalyzerError] = useState('');
  const [analyzerSuccess, setAnalyzerSuccess] = useState('');
  const [previewSyllabus, setPreviewSyllabus] = useState<PreviewSyllabusData | null>(null);
  const [savingPreviewSyllabus, setSavingPreviewSyllabus] = useState(false);

  // Academic Calendar / Event Creation State
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newEventType, setNewEventType] = useState<'exam' | 'assignment' | 'quiz' | 'project'>('exam');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamSubjectId, setNewExamSubjectId] = useState<number | null>(null);
  const [newExamNotes, setNewExamNotes] = useState('');
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'exam' | 'assignment' | 'quiz' | 'project'>('all');

  // Timer State
  const [timerSubject, setTimerSubject] = useState('');
  const [timerTopic, setTimerTopic] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

  // Check current auth status on mount
  useEffect(() => {
    checkUser();
  }, []);

  // Timer tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      if (timerMode === 'work') {
        handleCompleteSession();
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds, timerMode]);

  const checkUser = async () => {
    setInitialLoading(true);
    try {
      const u = await api.getMe();
      setUser(u);
      loadAllData();
    } catch {
      setUser(null);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      const [subjRes, topRes, exRes, sessRes] = await Promise.all([
        api.getSubjects().catch(() => []),
        api.getTopics().catch(() => []),
        api.getExams().catch(() => []),
        api.getSessions().catch(() => []),
      ]);
      setSubjects(subjRes);
      setTopics(topRes);
      setExams(exRes);
      setSessions(sessRes);
      if (subjRes.length > 0) {
        if (!newTopicSubjectId) setNewTopicSubjectId(subjRes[0].id);
        if (!newExamSubjectId) setNewExamSubjectId(subjRes[0].id);
        if (selectedSubjectIds.length === 0) {
          setSelectedSubjectIds(subjRes.map((s) => s.id));
        }
      }
      if (topRes.length > 0 && selectedTopicIds.length === 0) {
        setSelectedTopicIds(topRes.map((t) => t.id));
      }
    } catch (e) {
      console.error('Failed to load user data', e);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        await api.login(username, password);
      } else {
        await api.register(username, email, password);
        await api.login(username, password);
      }
      await checkUser();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setSubjects([]);
    setTopics([]);
    setExams([]);
    setSessions([]);
    setAiPlan(null);
    setSelectedSubjectIds([]);
    setSelectedTopicIds([]);
  };

  // Subject & Topic Selection logic
  const toggleSubjectSelection = (id: number) => {
    const subjectTopicIds = topics.filter((t) => t.subject_id === id).map((t) => t.id);
    if (selectedSubjectIds.includes(id)) {
      setSelectedSubjectIds(selectedSubjectIds.filter((sid) => sid !== id));
      setSelectedTopicIds(selectedTopicIds.filter((tid) => !subjectTopicIds.includes(tid)));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, id]);
      setSelectedTopicIds(Array.from(new Set([...selectedTopicIds, ...subjectTopicIds])));
    }
  };

  const toggleTopicSelection = (topicId: number) => {
    if (selectedTopicIds.includes(topicId)) {
      setSelectedTopicIds(selectedTopicIds.filter((tid) => tid !== topicId));
    } else {
      setSelectedTopicIds([...selectedTopicIds, topicId]);
    }
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjectIds(subjects.map((s) => s.id));
    setSelectedTopicIds(topics.map((t) => t.id));
  };

  const handleDeselectAllSubjects = () => {
    setSelectedSubjectIds([]);
    setSelectedTopicIds([]);
  };

  // Generate Standard AI Plan
  const handleGeneratePlan = async () => {
    if (subjects.length > 0 && selectedSubjectIds.length === 0) {
      setPlanError('Please select at least one subject to generate your study plan.');
      return;
    }
    setGeneratingPlan(true);
    setPlanError('');
    try {
      const res = await api.generatePlan(
        availableHours,
        studyStyle,
        selectedSubjectIds,
        selectedTopicIds,
        autoMode,
        false,
        customInstructions
      );
      setAiPlan(res);
    } catch (err: any) {
      setPlanError(err.message || 'Failed to generate plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Generate Quick Proportional Plan
  const handleGenerateQuickPlan = async (hours: number) => {
    setGeneratingPlan(true);
    setPlanError('');
    try {
      const res = await api.generatePlan(
        hours,
        quickStudyStyle,
        undefined, // All subjects
        undefined, // All topics
        true,
        true, // isQuickPlanner = true
        'Proportional Subject Hour Allocation'
      );
      setAiPlan(res);
      setActiveTab('planner'); // Switch to view generated plan
    } catch (err: any) {
      setPlanError(err.message || 'Failed to generate quick plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Calculate Proportional Distribution Preview
  const getProportionalPreview = (hours: number) => {
    if (subjects.length === 0) return [];
    let numSubjects = 1;
    if (hours <= 2) numSubjects = minVal(2, subjects.length);
    else if (hours <= 5) numSubjects = minVal(3, subjects.length);
    else if (hours <= 8) numSubjects = minVal(4, subjects.length);
    else numSubjects = minVal(5, subjects.length);

    const targetSubjs = subjects.slice(0, numSubjects);
    const perSubjHours = maxVal(0.75, Math.round((hours / targetSubjs.length) * 2) / 2);
    return targetSubjs.map((s) => ({
      name: s.name,
      hours: perSubjHours,
      percent: Math.round((perSubjHours / hours) * 100),
    }));
  };

  function minVal(a: number, b: number) {
    return a < b ? a : b;
  }
  function maxVal(a: number, b: number) {
    return a > b ? a : b;
  }

  // Start Session from Plan Item
  const handleStartSessionFromPlan = (item: PlanItem) => {
    setTimerSubject(item.subject);
    setTimerTopic(item.topic);
    setTimerMode('work');
    const seconds = (item.duration_hours || 1) * 3600;
    setTimerInitialSeconds(seconds);
    setTimerSeconds(seconds);
    setTimerRunning(true);
    setSessionStartTime(new Date().toISOString());
    setActiveTab('timer');
  };

  // Timer Controls
  const toggleTimer = () => {
    if (!timerRunning && !sessionStartTime) {
      setSessionStartTime(new Date().toISOString());
    }
    setTimerRunning(!timerRunning);
  };

  const resetTimer = (mode: 'work' | 'shortBreak' | 'longBreak', minutes: number) => {
    setTimerRunning(false);
    setTimerMode(mode);
    const secs = minutes * 60;
    setTimerInitialSeconds(secs);
    setTimerSeconds(secs);
    setSessionStartTime(null);
  };

  const handleCompleteSession = async () => {
    setTimerRunning(false);
    const elapsedMinutes = Math.max(1, Math.round((timerInitialSeconds - timerSeconds) / 60));
    try {
      await api.createSession({
        start_time: sessionStartTime || new Date(Date.now() - elapsedMinutes * 60000).toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: elapsedMinutes,
        subject_name: timerSubject || 'General Study',
        topic_name: timerTopic || 'Focus Session',
        notes: sessionNotes || `Completed ${timerMode} session`,
      });
      setSessionNotes('');
      setSessionStartTime(null);
      await loadAllData();
      alert(`🎉 Great job! Logged ${elapsedMinutes} minute study session.`);
    } catch (err: any) {
      alert('Failed to log session: ' + err.message);
    }
  };

  // Subject Management
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      const created = await api.createSubject(newSubjectName.trim());
      setSubjects([...subjects, created]);
      setSelectedSubjectIds((prev) => [...prev, created.id]);
      if (!newTopicSubjectId) setNewTopicSubjectId(created.id);
      if (!newExamSubjectId) setNewExamSubjectId(created.id);
      setNewSubjectName('');
    } catch (err: any) {
      alert('Failed to create subject: ' + err.message);
    }
  };

  // Syllabus Analyzer: Upload & Extract for Preview
  const handleAnalyzeSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabusFile) return;
    setAnalyzingSyllabus(true);
    setAnalyzerError('');
    setAnalyzerSuccess('');
    setPreviewSyllabus(null);
    try {
      const res = await api.analyzeSyllabus(syllabusFile);
      const previewTopics: ExtractedTopicPreview[] = res.topics.map((t, idx) => ({
        tempId: `extracted-${idx}-${Date.now()}`,
        name: t.name,
        difficulty: t.difficulty || 3,
        priority: t.priority || 3,
      }));
      setPreviewSyllabus({
        subject_name: res.subject.name,
        topics: previewTopics,
      });
      setAnalyzerSuccess(`✨ AI extracted subject '${res.subject.name}' with ${res.topics.length} units! You can edit topics below before saving.`);
      setSyllabusFile(null);
    } catch (err: any) {
      setAnalyzerError(err.message || 'Failed to analyze syllabus');
    } finally {
      setAnalyzingSyllabus(false);
    }
  };

  // Preview Syllabus Topic Editing
  const updatePreviewTopic = (tempId: string, field: 'name' | 'difficulty' | 'priority', value: any) => {
    if (!previewSyllabus) return;
    setPreviewSyllabus({
      ...previewSyllabus,
      topics: previewSyllabus.topics.map((t) => (t.tempId === tempId ? { ...t, [field]: value } : t)),
    });
  };

  const removePreviewTopic = (tempId: string) => {
    if (!previewSyllabus) return;
    setPreviewSyllabus({
      ...previewSyllabus,
      topics: previewSyllabus.topics.filter((t) => t.tempId !== tempId),
    });
  };

  const addPreviewTopic = () => {
    if (!previewSyllabus) return;
    setPreviewSyllabus({
      ...previewSyllabus,
      topics: [
        ...previewSyllabus.topics,
        {
          tempId: `custom-${Date.now()}`,
          name: 'New Custom Topic',
          difficulty: 3,
          priority: 3,
        },
      ],
    });
  };

  // Save Customized Preview Syllabus
  const handleSavePreviewSyllabus = async () => {
    if (!previewSyllabus || !previewSyllabus.subject_name.trim()) return;
    setSavingPreviewSyllabus(true);
    try {
      const createdSubject = await api.createSubject(previewSyllabus.subject_name.trim());
      const createdTopicsList: Topic[] = [];
      for (const t of previewSyllabus.topics) {
        if (t.name.trim()) {
          const createdTopic = await api.createTopic({
            name: t.name.trim(),
            subject_id: createdSubject.id,
            difficulty: t.difficulty,
            priority: t.priority,
          });
          createdTopicsList.push(createdTopic);
        }
      }
      setSubjects((prev) => [...prev, createdSubject]);
      setSelectedSubjectIds((prev) => [...prev, createdSubject.id]);
      setTopics((prev) => [...prev, ...createdTopicsList]);
      setSelectedTopicIds((prev) => [...prev, ...createdTopicsList.map((ct) => ct.id)]);
      if (!newTopicSubjectId) setNewTopicSubjectId(createdSubject.id);
      if (!newExamSubjectId) setNewExamSubjectId(createdSubject.id);
      setAnalyzerSuccess(`🎉 Successfully saved '${createdSubject.name}' with ${createdTopicsList.length} customized topics to your account!`);
      setPreviewSyllabus(null);
    } catch (err: any) {
      alert('Failed to save edited syllabus: ' + err.message);
    } finally {
      setSavingPreviewSyllabus(false);
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm('Are you sure? Delete subject and its topics/exams?')) return;
    try {
      await api.deleteSubject(id);
      setSubjects(subjects.filter((s) => s.id !== id));
      setSelectedSubjectIds(selectedSubjectIds.filter((sid) => sid !== id));
      setTopics(topics.filter((t) => t.subject_id !== id));
    } catch (err: any) {
      alert('Failed to delete subject: ' + err.message);
    }
  };

  // Topic Management & Inline Editing
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !newTopicSubjectId) return;
    try {
      const created = await api.createTopic({
        name: newTopicName.trim(),
        subject_id: newTopicSubjectId,
        difficulty: newTopicDifficulty,
        priority: newTopicPriority,
      });
      setTopics([...topics, created]);
      setSelectedTopicIds((prev) => [...prev, created.id]);
      setNewTopicName('');
    } catch (err: any) {
      alert('Failed to create topic: ' + err.message);
    }
  };

  const startEditTopic = (t: Topic) => {
    setEditingTopicId(t.id);
    setEditTopicName(t.name);
    setEditTopicDifficulty(t.difficulty);
    setEditTopicPriority(t.priority);
  };

  const cancelEditTopic = () => {
    setEditingTopicId(null);
  };

  const handleSaveTopicEdit = async (id: number) => {
    try {
      const updated = await api.updateTopic(id, {
        name: editTopicName.trim(),
        difficulty: editTopicDifficulty,
        priority: editTopicPriority,
      });
      setTopics(topics.map((tp) => (tp.id === id ? updated : tp)));
      setEditingTopicId(null);
    } catch (err: any) {
      alert('Failed to save topic edit: ' + err.message);
    }
  };

  const handleToggleTopicCompleted = async (t: Topic) => {
    try {
      const updated = await api.updateTopic(t.id, { completed: !t.completed });
      setTopics(topics.map((tp) => (tp.id === t.id ? updated : tp)));
    } catch (err: any) {
      alert('Failed to update topic: ' + err.message);
    }
  };

  const handleDeleteTopic = async (id: number) => {
    try {
      await api.deleteTopic(id);
      setTopics(topics.filter((t) => t.id !== id));
      setSelectedTopicIds(selectedTopicIds.filter((tid) => tid !== id));
    } catch (err: any) {
      alert('Failed to delete topic: ' + err.message);
    }
  };

  // Academic Calendar & Event Management
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim() || !newExamDate || !newExamSubjectId) return;
    try {
      const created = await api.createExam({
        title: newExamTitle.trim(),
        event_type: newEventType,
        date: new Date(newExamDate).toISOString(),
        subject_id: newExamSubjectId,
        notes: newExamNotes.trim() || undefined,
      });
      setExams([...exams, created]);
      setNewExamTitle('');
      setNewExamDate('');
      setNewExamNotes('');
    } catch (err: any) {
      alert('Failed to schedule academic event: ' + err.message);
    }
  };

  const handleDeleteExam = async (id: number) => {
    try {
      await api.deleteExam(id);
      setExams(exams.filter((e) => e.id !== id));
    } catch (err: any) {
      alert('Failed to delete academic event: ' + err.message);
    }
  };

  // Format helper functions
  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((target - now) / (1000 * 3600 * 24));
    if (diffDays < 0) return 'Passed';
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Tomorrow!';
    return `In ${diffDays} days`;
  };

  const getEventTypeIcon = (type?: string) => {
    switch (type) {
      case 'assignment':
        return '📝 Assignment';
      case 'quiz':
        return '⏱️ Quiz';
      case 'project':
        return '🚀 Project';
      default:
        return '🎯 Exam';
    }
  };

  // Recommendations for Study Studio
  const getAcademicRecommendations = () => {
    const now = new Date().getTime();
    const upcoming = exams
      .map((e) => {
        const diffDays = Math.ceil((new Date(e.date).getTime() - now) / (1000 * 3600 * 24));
        return { ...e, diffDays };
      })
      .filter((e) => e.diffDays >= 0 && e.diffDays <= 7)
      .sort((a, b) => a.diffDays - b.diffDays);
    return upcoming;
  };

  const upcomingRecommendations = getAcademicRecommendations();
  const lastStudiedSession = sessions.length > 0 ? sessions[0] : null;

  const handleSelectRecommendedSubjects = async () => {
    const recommendedSubjectIds = Array.from(
      new Set(upcomingRecommendations.map((e) => e.subject_id))
    );
    if (recommendedSubjectIds.length > 0) {
      setSelectedSubjectIds(recommendedSubjectIds);
      const recTopicIds = topics
        .filter((t) => recommendedSubjectIds.includes(t.subject_id))
        .map((t) => t.id);
      setSelectedTopicIds(recTopicIds);

      // Instantly generate the AI study plan for the recommended subjects!
      setGeneratingPlan(true);
      setPlanError('');
      try {
        const res = await api.generatePlan(
          availableHours,
          studyStyle,
          recommendedSubjectIds,
          recTopicIds,
          autoMode,
          false,
          'Prioritized for upcoming academic recommendations'
        );
        setAiPlan(res);
      } catch (err: any) {
        setPlanError(err.message || 'Failed to generate plan for recommended subjects');
      } finally {
        setGeneratingPlan(false);
      }
    }
  };


  // Loading Screen
  if (initialLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#090d16] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-slate-400 font-medium animate-pulse">Initializing AI Study Planner...</p>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#090d16] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-[#090d16] to-[#090d16]">
        <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
              ✨ AI-Powered Academic Assistant
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Study<span className="gradient-text">Planner AI</span>
            </h1>
            <p className="text-sm text-slate-400">Organize academic calendars, edit syllabi, and generate intelligent subject study plans.</p>
          </div>

          <div className="flex rounded-xl bg-slate-900/60 p-1 border border-white/5">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                authMode === 'login' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                authMode === 'register' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_student"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl gradient-btn text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : authMode === 'login' ? (
                'Sign In to Dashboard'
              ) : (
                'Create Free Account'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs text-slate-500">
              Demo account? You can register any username & password to start!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Main View
  const completedTopicsCount = topics.filter((t) => t.completed).length;
  const totalHoursStudied = (sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / 60).toFixed(1);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090d16]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
              🧠
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Study<span className="gradient-text">Planner AI</span>
              </h1>
              <span className="text-xs text-slate-400">Smart Academic Assistant</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Logged in as <strong className="text-white">{user.username}</strong></span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Academic Calendar Events</div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-2xl font-bold text-white">{exams.length}</div>
              <div className="text-xs text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-full">
                {exams.length > 0 ? getDaysUntil(exams[0].date) : 'No events'}
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Topics Mastered</div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-2xl font-bold text-emerald-400">{completedTopicsCount} <span className="text-xs font-normal text-slate-400">/ {topics.length}</span></div>
              <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {topics.length > 0 ? Math.round((completedTopicsCount / topics.length) * 100) : 0}%
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Total Study Hours</div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-2xl font-bold text-cyan-400">{totalHoursStudied}h</div>
              <div className="text-xs text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full">
                {sessions.length} sessions
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Active Subjects</div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-2xl font-bold text-amber-400">{subjects.length}</div>
              <div className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                Tracked
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('planner')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'planner'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            🤖 AI Study Studio
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'quick'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            ⚡ Quick Proportional Planner
          </button>
          <button
            onClick={() => setActiveTab('timer')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'timer'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            ⏱️ Pomodoro Timer {timerRunning && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>}
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'subjects'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            📚 Subjects & Syllabus Analyzer
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            📅 Academic Calendar ({exams.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            📜 Study History
          </button>
        </div>

        {/* TAB 1: AI STUDY STUDIO */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            {/* Academic Calendar Recommendation Banner */}
            {upcomingRecommendations.length > 0 && (
              <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-900 border border-amber-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl p-2 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
                    💡
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                      Academic Calendar Smart Recommendation
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      You have an upcoming <strong>{upcomingRecommendations[0].title}</strong> ({getEventTypeIcon(upcomingRecommendations[0].event_type)}) scheduled <strong>{getDaysUntil(upcomingRecommendations[0].date)}</strong> for <em>{subjects.find((s) => s.id === upcomingRecommendations[0].subject_id)?.name || 'your subject'}</em>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSelectRecommendedSubjects}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all whitespace-nowrap"
                >
                  ⚡ Select Recommended Subject(s)
                </button>
              </div>
            )}

            {/* AI History Memory Indicator */}
            {lastStudiedSession && (
              <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between text-xs text-indigo-300">
                <div className="flex items-center gap-2">
                  <span>🧠 <strong>AI Study History Memory:</strong> Last session completed: <em>"{lastStudiedSession.subject_name} - {lastStudiedSession.topic_name}"</em> ({lastStudiedSession.duration_minutes}m).</span>
                </div>
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Continuity Mode Active
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Input Panel */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 h-fit">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    ✨ Generate AI Study Plan
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Select target subject(s) and specific topic(s). AI will check past logs and continue seamlessly.
                  </p>
                </div>

                {planError && (
                  <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl">
                    ⚠️ {planError}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Auto AI Continuity Switch */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-purple-500/20">
                    <div>
                      <span className="text-xs font-bold text-white block">🤖 Auto AI Continuity Mode</span>
                      <span className="text-[10px] text-slate-400 block">Sequence next continuous topic from past logs</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoMode}
                      onChange={(e) => setAutoMode(e.target.checked)}
                      className="h-5 w-5 accent-purple-500 cursor-pointer"
                    />
                  </div>

                  {/* Subject & Topic Selection List */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Target Subjects & Topics ({selectedSubjectIds.length} subjects, {selectedTopicIds.length} topics)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllSubjects}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                        >
                          Select All
                        </button>
                        <span className="text-[10px] text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllSubjects}
                          className="text-[10px] text-slate-400 hover:text-slate-300"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {subjects.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto space-y-2 p-2 rounded-2xl bg-slate-900/80 border border-white/10 scrollbar-thin">
                        {subjects.map((s) => {
                          const isSelected = selectedSubjectIds.includes(s.id);
                          const subjectTopics = topics.filter((t) => t.subject_id === s.id);
                          const isExpanded = expandedSubjectId === s.id;

                          return (
                            <div
                              key={s.id}
                              className={`rounded-xl transition-all border ${
                                isSelected
                                  ? 'bg-purple-950/40 border-purple-500/50'
                                  : 'bg-slate-900/40 border-white/5'
                              }`}
                            >
                              <div className="flex items-center justify-between p-2 text-xs">
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSubjectSelection(s.id)}
                                    className="h-4 w-4 rounded accent-purple-500 cursor-pointer"
                                  />
                                  <span className="font-bold text-white">📚 {s.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setExpandedSubjectId(isExpanded ? null : s.id)}
                                  className="text-[10px] text-purple-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-white/10"
                                >
                                  {isExpanded ? 'Hide Topics ▲' : `View Topics (${subjectTopics.length}) ▼`}
                                </button>
                              </div>

                              {isExpanded && subjectTopics.length > 0 && (
                                <div className="p-2 pt-0 space-y-1 bg-slate-950/50 rounded-b-xl border-t border-white/5">
                                  {subjectTopics.map((t) => {
                                    const isTopicSelected = selectedTopicIds.includes(t.id);
                                    return (
                                      <label
                                        key={t.id}
                                        className="flex items-center justify-between pl-6 pr-2 py-1 text-[11px] cursor-pointer hover:bg-purple-900/20 rounded"
                                      >
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isTopicSelected}
                                            onChange={() => toggleTopicSelection(t.id)}
                                            className="h-3.5 w-3.5 rounded accent-purple-500 cursor-pointer"
                                          />
                                          <span className={t.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                                            {t.name}
                                          </span>
                                        </div>
                                        <span className="text-[9px] text-amber-400">Diff {t.difficulty}/5</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-center text-xs text-slate-400">
                        No subjects added yet. Add subjects in the "Subjects & Syllabus Analyzer" tab first.
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">Available Study Time Today</label>
                      <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                        {availableHours} Hours
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="0.5"
                      value={availableHours}
                      onChange={(e) => setAvailableHours(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>1h (Sprint)</span>
                      <span>6h (Standard)</span>
                      <span>12h (Marathon)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Learning Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Pomodoro (25/5)',
                        'Deep Work (50/10)',
                        'Active Recall',
                        'Exam Sprint'
                      ].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setStudyStyle(style)}
                          className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                            studyStyle === style
                              ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-md'
                              : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                    className="w-full py-3.5 rounded-xl gradient-btn text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2"
                  >
                    {generatingPlan ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating Subject & Continuity Schedule...</span>
                      </>
                    ) : (
                      <>
                        <span>🤖 Generate AI Schedule</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Plan Output Panel */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                {aiPlan ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20">
                      <div>
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">AI Execution Strategy</span>
                        <p className="text-xs text-slate-200 mt-0.5">{aiPlan.ai_summary}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
                          {aiPlan.study_style}
                        </span>
                        <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                          {aiPlan.total_hours} Hours Total
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Scheduled Time Blocks</h3>
                      {aiPlan.plan.map((item, idx) => (
                        <div
                          key={idx}
                          className="glass-panel-interactive p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/10"
                        >
                          <div className="flex items-start gap-4">
                            <div className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-center shrink-0">
                              <span className="block text-xs font-bold text-purple-400">{item.scheduled_start}</span>
                              <span className="block text-[10px] text-slate-500">to {item.scheduled_end}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  {item.subject}
                                </span>
                                <h4 className="text-sm font-bold text-white">{item.topic}</h4>
                              </div>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.reason}</p>
                              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1 text-amber-400">
                                  🎯 Strategy: <strong>{item.study_strategy}</strong>
                                </span>
                                <span className="text-slate-500">•</span>
                                <span className="text-cyan-400 font-semibold">
                                  🍅 {item.pomodoros} Pomodoros
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleStartSessionFromPlan(item)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5"
                          >
                            <span>⚡ Start Session</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-4">
                    <div className="text-5xl">📅</div>
                    <h3 className="text-lg font-bold text-white">No Active Plan Generated Yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Select your target subjects on the left and click "Generate AI Schedule" to get a tailored study roadmap.
                    </p>
                    <button
                      onClick={handleGeneratePlan}
                      className="px-6 py-2.5 rounded-xl gradient-btn text-white text-xs font-bold shadow-lg"
                    >
                      Generate Study Schedule
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: QUICK PROPORTIONAL PLANNER */}
        {activeTab === 'quick' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-950/20 space-y-4">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">⚡ Instant Proportional Allocator</span>
                <h2 className="text-2xl font-extrabold text-white mt-1">Quick Study Planner</h2>
                <p className="text-xs text-slate-300 mt-1">
                  Select your available study duration below. The AI automatically distributes hours <strong>proportionally across subjects</strong> based on priority scores and exam urgency.
                </p>
              </div>

              {/* Preset Duration Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { hours: 2, label: '⚡ 2 Hours', desc: '1 - 2 Subjects' },
                  { hours: 4, label: '⚡ 4 Hours', desc: '2 Subjects (Proportional)' },
                  { hours: 6, label: '⚡ 6 Hours', desc: '3 Subjects (Proportional)' },
                  { hours: 8, label: '⚡ 8 Hours', desc: '4 Subjects (Proportional)' },
                ].map((item) => (
                  <button
                    key={item.hours}
                    onClick={() => setQuickHours(item.hours)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      quickHours === item.hours
                        ? 'bg-purple-600 border-purple-400 text-white shadow-xl scale-[1.02]'
                        : 'bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="block text-base font-extrabold">{item.label}</span>
                    <span className="block text-[11px] opacity-80 mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>

              {/* Proportional Distribution Live Preview */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-200">
                    Proportional Hour Distribution Preview ({quickHours} Hours Total)
                  </span>
                  <span className="text-purple-400 font-semibold">{subjects.length} Total Subjects Tracked</span>
                </div>

                {subjects.length > 0 ? (
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded-full bg-slate-800 flex overflow-hidden p-0.5 border border-white/5">
                      {getProportionalPreview(quickHours).map((item, idx) => {
                        const colors = ['bg-purple-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500'];
                        return (
                          <div
                            key={idx}
                            style={{ width: `${item.percent}%` }}
                            className={`${colors[idx % colors.length]} h-full first:rounded-l-full last:rounded-r-full transition-all`}
                            title={`${item.name}: ${item.hours}h`}
                          ></div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {getProportionalPreview(quickHours).map((item, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-slate-950 border border-white/5 text-xs">
                          <span className="block font-bold text-white truncate">📚 {item.name}</span>
                          <span className="block text-[11px] text-purple-300 font-semibold">
                            {item.hours} Hours ({item.percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Add subjects to view live proportional allocations.</p>
                )}
              </div>

              <button
                onClick={() => handleGenerateQuickPlan(quickHours)}
                disabled={generatingPlan || subjects.length === 0}
                className="w-full py-4 rounded-2xl gradient-btn text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2"
              >
                {generatingPlan ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating Proportional Schedule...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Generate {quickHours}-Hour Proportional Quick Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE POMODORO TIMER */}
        {activeTab === 'timer' && (
          <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl border border-white/10 space-y-8 text-center">
            <div>
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Live Focus Companion</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                {timerSubject ? `${timerSubject} - ${timerTopic}` : 'Pomodoro Study Session'}
              </h2>
            </div>

            <div className="inline-flex p-1 rounded-2xl bg-slate-900/80 border border-white/10 gap-1">
              <button
                onClick={() => resetTimer('work', 25)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'work' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                🍅 Work (25m)
              </button>
              <button
                onClick={() => resetTimer('shortBreak', 5)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'shortBreak' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                ☕ Short Break (5m)
              </button>
              <button
                onClick={() => resetTimer('longBreak', 15)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'longBreak' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                🌿 Long Break (15m)
              </button>
            </div>

            <div className="py-6 flex flex-col items-center justify-center">
              <div
                className={`relative h-64 w-64 rounded-full border-4 flex items-center justify-center transition-all ${
                  timerRunning
                    ? 'border-purple-500 active-timer-glow bg-purple-950/20'
                    : 'border-slate-800 bg-slate-900/50'
                }`}
              >
                <div className="text-6xl font-black tracking-tight text-white font-mono">
                  {formatTimerDisplay(timerSeconds)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={timerSubject}
                  onChange={(e) => setTimerSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Topic / Task</label>
                <input
                  type="text"
                  value={timerTopic}
                  onChange={(e) => setTimerTopic(e.target.value)}
                  placeholder="e.g. Calculus Derivatives"
                  className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Notes / Reflection</label>
                <input
                  type="text"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Key takeaways or formulas revised during this session..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={toggleTimer}
                className={`px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-xl ${
                  timerRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'gradient-btn text-white'
                }`}
              >
                {timerRunning ? '⏸ Pause Timer' : '▶ Start Timer'}
              </button>
              <button
                onClick={handleCompleteSession}
                className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl transition-all"
              >
                ✅ Save & Complete Session
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SUBJECTS & EDIT SYLLABUS ANALYZER */}
        {activeTab === 'subjects' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="flex p-1 rounded-2xl bg-slate-900/80 border border-white/10">
                <button
                  type="button"
                  onClick={() => setSubjectEntryMode('manual')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    subjectEntryMode === 'manual'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✍️ Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => setSubjectEntryMode('analyzer')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    subjectEntryMode === 'analyzer'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📄 AI Syllabus Analyzer
                </button>
              </div>

              {subjectEntryMode === 'manual' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
                  <h3 className="text-base font-bold text-white">➕ Add New Subject</h3>
                  <form onSubmit={handleCreateSubject} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
                    >
                      Add Subject
                    </button>
                  </form>
                </div>
              )}

              {subjectEntryMode === 'analyzer' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      ✨ AI Syllabus Analyzer
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload your course syllabus PDF/Image. AI extracts the syllabus into an editable list so you can update priority, difficulty, and names before saving!
                    </p>
                  </div>

                  {analyzerError && (
                    <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl">
                      ⚠️ {analyzerError}
                    </div>
                  )}

                  {analyzerSuccess && (
                    <div className="p-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                      {analyzerSuccess}
                    </div>
                  )}

                  <form onSubmit={handleAnalyzeSyllabus} className="space-y-4">
                    <div className="border-2 border-dashed border-white/15 hover:border-purple-500/50 rounded-2xl p-6 text-center transition-all bg-slate-900/40">
                      <input
                        type="file"
                        id="syllabus-file-input"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => setSyllabusFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label htmlFor="syllabus-file-input" className="cursor-pointer block space-y-2">
                        <div className="text-3xl">📄</div>
                        <span className="block text-xs font-bold text-purple-300">
                          {syllabusFile ? syllabusFile.name : 'Click to Upload Syllabus PDF or Image'}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          Supports PDF, PNG, JPG, WEBP (Max 10MB)
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!syllabusFile || analyzingSyllabus}
                      className="w-full py-3 rounded-xl gradient-btn text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {analyzingSyllabus ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Extracting Syllabus Units...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡ Analyze & Preview Syllabus</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Add Topic Manually */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
                <h3 className="text-base font-bold text-white">📌 Add Topic to Subject</h3>
                <form onSubmit={handleCreateTopic} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Select Subject</label>
                    <select
                      value={newTopicSubjectId || ''}
                      onChange={(e) => setNewTopicSubjectId(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Topic Name</label>
                    <input
                      type="text"
                      required
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="e.g. Binary Search Trees"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty (1-5)</label>
                      <select
                        value={newTopicDifficulty}
                        onChange={(e) => setNewTopicDifficulty(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Level {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Priority (1-5)</label>
                      <select
                        value={newTopicPriority}
                        onChange={(e) => setNewTopicPriority(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Priority {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={subjects.length === 0}
                    className="w-full py-2.5 rounded-xl gradient-btn text-white font-bold text-xs shadow-md"
                  >
                    Add Topic
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* EDIT SYLLABUS PREVIEW PANEL */}
              {previewSyllabus && (
                <div className="glass-panel p-6 rounded-3xl border-2 border-purple-500/40 bg-purple-950/20 space-y-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
                    <div>
                      <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">
                        ✏️ Edit Extracted Syllabus Before Saving
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">Customize Subject & Topics</h3>
                    </div>
                    <button
                      onClick={() => setPreviewSyllabus(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">Subject Name</label>
                      <input
                        type="text"
                        value={previewSyllabus.subject_name}
                        onChange={(e) => setPreviewSyllabus({ ...previewSyllabus, subject_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-500/30 text-white text-sm font-bold"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Extracted Units / Topics ({previewSyllabus.topics.length})
                        </label>
                        <button
                          onClick={addPreviewTopic}
                          className="text-xs text-purple-300 hover:text-purple-200 font-bold bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30"
                        >
                          ➕ Add Custom Topic
                        </button>
                      </div>

                      {previewSyllabus.topics.map((t, idx) => (
                        <div
                          key={t.tempId}
                          className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-purple-400">{idx + 1}.</span>
                            <input
                              type="text"
                              value={t.name}
                              onChange={(e) => updatePreviewTopic(t.tempId, 'name', e.target.value)}
                              placeholder="Topic Name"
                              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white font-medium"
                            />
                            <button
                              onClick={() => removePreviewTopic(t.tempId)}
                              className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pl-6">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">Difficulty Level (1-5)</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => updatePreviewTopic(t.tempId, 'difficulty', lvl)}
                                    className={`flex-1 py-1 text-[10px] font-bold rounded-md border ${
                                      t.difficulty === lvl
                                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                                        : 'bg-slate-800 text-slate-400 border-white/5'
                                    }`}
                                  >
                                    L{lvl}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">Priority Rating (1-5)</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => updatePreviewTopic(t.tempId, 'priority', lvl)}
                                    className={`flex-1 py-1 text-[10px] font-bold rounded-md border ${
                                      t.priority === lvl
                                        ? 'bg-purple-600 text-white border-purple-400'
                                        : 'bg-slate-800 text-slate-400 border-white/5'
                                    }`}
                                  >
                                    P{lvl}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleSavePreviewSyllabus}
                      disabled={savingPreviewSyllabus || !previewSyllabus.subject_name.trim()}
                      className="w-full py-3.5 rounded-xl gradient-btn text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2"
                    >
                      {savingPreviewSyllabus ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving Customized Syllabus...</span>
                        </>
                      ) : (
                        <>
                          <span>💾 Confirm & Save Syllabus to My Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* LIST OF EXISTING SUBJECTS & TOPICS WITH EDIT OPTION */}
              {subjects.map((subject) => {
                const subjectTopics = topics.filter((t) => t.subject_id === subject.id);
                return (
                  <div key={subject.id} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>📚 {subject.name}</span>
                        <span className="text-xs font-normal text-slate-400">
                          ({subjectTopics.filter((t) => t.completed).length}/{subjectTopics.length} done)
                        </span>
                      </h3>
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Delete Subject
                      </button>
                    </div>

                    {subjectTopics.length > 0 ? (
                      <div className="space-y-2">
                        {subjectTopics.map((topic) => {
                          const isEditing = editingTopicId === topic.id;
                          if (isEditing) {
                            return (
                              <div
                                key={topic.id}
                                className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-3"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editTopicName}
                                    onChange={(e) => setEditTopicName(e.target.value)}
                                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block mb-1">Difficulty</span>
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map((lvl) => (
                                        <button
                                          key={lvl}
                                          type="button"
                                          onClick={() => setEditTopicDifficulty(lvl)}
                                          className={`flex-1 py-1 text-[10px] font-bold rounded ${
                                            editTopicDifficulty === lvl ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                          }`}
                                        >
                                          {lvl}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-slate-400 block mb-1">Priority</span>
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map((lvl) => (
                                        <button
                                          key={lvl}
                                          type="button"
                                          onClick={() => setEditTopicPriority(lvl)}
                                          className={`flex-1 py-1 text-[10px] font-bold rounded ${
                                            editTopicPriority === lvl ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                                          }`}
                                        >
                                          {lvl}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={cancelEditTopic}
                                    className="text-xs px-3 py-1 text-slate-400 hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveTopicEdit(topic.id)}
                                    className="text-xs px-3 py-1 bg-purple-600 text-white font-bold rounded-lg"
                                  >
                                    Save Topic
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={topic.id}
                              className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={topic.completed}
                                  onChange={() => handleToggleTopicCompleted(topic)}
                                  className="h-4 w-4 rounded accent-purple-500 cursor-pointer"
                                />
                                <span
                                  className={`text-xs font-semibold ${
                                    topic.completed ? 'line-through text-slate-500' : 'text-white'
                                  }`}
                                >
                                  {topic.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  Diff: {topic.difficulty}/5
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                  Prio: {topic.priority}/5
                                </span>
                                <button
                                  onClick={() => startEditTopic(topic)}
                                  className="text-slate-400 hover:text-purple-300 text-xs px-1.5 py-0.5 rounded bg-slate-800"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTopic(topic.id)}
                                  className="text-slate-500 hover:text-rose-400 text-xs ml-1"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No topics added under this subject yet.</p>
                    )}
                  </div>
                );
              })}

              {subjects.length === 0 && (
                <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
                  <div className="text-4xl">📚</div>
                  <h4 className="text-base font-bold text-white">No Subjects Added Yet</h4>
                  <p className="text-xs text-slate-400">Use the form on the left or upload a syllabus to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACADEMIC CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 h-fit">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                📅 Add Academic Event
              </h3>
              <form onSubmit={handleCreateExam} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Event Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'exam', label: '🎯 Exam' },
                      { id: 'assignment', label: '📝 Assignment' },
                      { id: 'quiz', label: '⏱️ Quiz' },
                      { id: 'project', label: '🚀 Project' },
                    ].map((typeItem) => (
                      <button
                        key={typeItem.id}
                        type="button"
                        onClick={() => setNewEventType(typeItem.id as any)}
                        className={`p-2 rounded-xl text-xs font-bold border text-center transition-all ${
                          newEventType === typeItem.id
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                      >
                        {typeItem.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={newExamTitle}
                    onChange={(e) => setNewExamTitle(e.target.value)}
                    placeholder="e.g. DBMS Final Exam / Web Dev Assignment #2"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <select
                    value={newExamSubjectId || ''}
                    onChange={(e) => setNewExamSubjectId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date & Deadline Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Submission Guidelines</label>
                  <textarea
                    rows={2}
                    value={newExamNotes}
                    onChange={(e) => setNewExamNotes(e.target.value)}
                    placeholder="e.g. Submit PDF online; covers Chapters 1 to 5"
                    className="w-full p-3 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={subjects.length === 0}
                  className="w-full py-3 rounded-xl gradient-btn text-white font-bold text-xs shadow-md"
                >
                  Save Academic Event
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Academic Calendar Schedule & Deadlines
                </h3>
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {['all', 'exam', 'assignment', 'quiz', 'project'].map((typeFilter) => (
                    <button
                      key={typeFilter}
                      onClick={() => setCalendarFilter(typeFilter as any)}
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all ${
                        calendarFilter === typeFilter
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {typeFilter === 'all' ? 'All Events' : typeFilter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams
                  .filter((e) => calendarFilter === 'all' || e.event_type === calendarFilter)
                  .map((exam) => {
                    const subjectName = subjects.find((s) => s.id === exam.subject_id)?.name || 'General';
                    const countdownText = getDaysUntil(exam.date);
                    return (
                      <div key={exam.id} className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {subjectName}
                            </span>
                            <span className="text-[10px] font-semibold ml-2 text-slate-400">
                              {getEventTypeIcon(exam.event_type)}
                            </span>
                            <h4 className="text-base font-bold text-white mt-1">{exam.title}</h4>
                          </div>
                          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {countdownText}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          📅 {new Date(exam.date).toLocaleString()}
                        </div>

                        {exam.notes && (
                          <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                            {exam.notes}
                          </p>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="text-xs text-slate-500 hover:text-rose-400 font-medium"
                          >
                            Remove Event
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {exams.length === 0 && (
                  <div className="col-span-2 glass-panel p-12 rounded-3xl text-center space-y-3">
                    <div className="text-4xl">🎯</div>
                    <h4 className="text-base font-bold text-white">No Academic Events Scheduled</h4>
                    <p className="text-xs text-slate-400">Add exam dates and assignment deadlines to activate smart AI study recommendations!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STUDY HISTORY */}
        {activeTab === 'history' && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white">📜 Logged Study Sessions</h3>
            {sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Topic / Task</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sessions.map((sess: StudySession) => (
                      <tr key={sess.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-bold text-purple-300">{sess.subject_name || 'General'}</td>
                        <td className="py-3 px-4 text-white font-medium">{sess.topic_name || 'Study Session'}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">{sess.duration_minutes} min</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(sess.start_time).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-slate-400 italic">{sess.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-8 text-center">
                No sessions completed yet. Use the Pomodoro Timer tab to log your study sessions!
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
