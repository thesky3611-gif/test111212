import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  Archive,
  BookOpen,
  Check,
  ClipboardCheck,
  Download,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { ActivityBuilderModal } from './components/ActivityBuilderModal';
import { AiDraftStudioView } from './components/AiDraftStudioView';
import { AnalyticsSummaryView } from './components/AnalyticsSummaryView';
import { AuthGate } from './components/AuthGate';
import { ClassStudentManagerModal } from './components/ClassStudentManagerModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EvaluationSlideOver } from './components/EvaluationSlideOver';
import { PeerSelfImportModal } from './components/PeerSelfImportModal';
import {
  ATTITUDE_ACTIONS,
  clampScore,
  computeRubricPercentage,
  computeTotalScore,
  createEmptyEvaluation,
  getLevelLabelKo,
} from './data/curriculumPresets';
import { auth } from './lib/firebase';
import {
  ensureTeacherProfile,
  quickLogAttitude,
  seedSampleClassroomData,
  subscribeActivities,
  subscribeClasses,
  subscribeEvaluations,
  subscribeStudents,
  updateStudent,
  upsertEvaluation,
} from './lib/firestoreService';
import type { Activity, ClassGroup, Evaluation, Student } from './types';

type ActiveView = 'eval' | 'ai' | 'analytics';

function AppWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('eval');

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [evaluationsByStudent, setEvaluationsByStudent] = useState<Record<string, Evaluation>>({});

  // Filters & modals
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [showClassModal, setShowClassModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showPeerImportModal, setShowPeerImportModal] = useState(false);
  const [activeEvalStudentId, setActiveEvalStudentId] = useState<string | null>(null);
  const [aiTargetStudentId, setAiTargetStudentId] = useState<string | null>(null);
  const [seedingSample, setSeedingSample] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Inline table row editing (student info + numeric scores)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineDraft, setInlineDraft] = useState({
    studentNumber: '',
    name: '',
    groupName: '',
    artifactScore: 0,
    selfScore: 0,
    peerScore: 0,
    attitudeScore: 80,
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      setAppError(null);
      if (u) {
        try {
          await ensureTeacherProfile(u);
          setProfileReady(true);
        } catch (err) {
          setAppError(err instanceof Error ? err.message : '교사 프로필 초기화에 실패했습니다.');
        }
      } else {
        setProfileReady(false);
        setClasses([]);
        setStudents([]);
        setActivities([]);
        setEvaluationsByStudent({});
      }
    });
    return () => unsub();
  }, []);

  // Subscribe classes when authenticated
  useEffect(() => {
    if (!user || !profileReady) return;
    return subscribeClasses(user.uid, (items) => {
      setClasses(items);
      setSelectedClassId((prev) => {
        if (prev && items.some((c) => c.id === prev)) return prev;
        return items[0]?.id ?? '';
      });
    });
  }, [user, profileReady]);

  // Subscribe students & activities for selected class
  useEffect(() => {
    setStudents([]);
    setActivities([]);
    setSelectedActivityId('');
    setEvaluationsByStudent({});
    setGroupFilter('all');
    setSearchQuery('');
    setActiveEvalStudentId(null);
    setAiTargetStudentId(null);
    setInlineEditId(null);

    if (!user || !profileReady || !selectedClassId) {
      return;
    }
    const unsubStudents = subscribeStudents(user.uid, selectedClassId, setStudents);
    const unsubActivities = subscribeActivities(user.uid, selectedClassId, (items) => {
      setActivities(items);
      setSelectedActivityId((prev) => {
        if (prev && items.some((a) => a.id === prev)) return prev;
        return items[0]?.id ?? '';
      });
    });
    return () => {
      unsubStudents();
      unsubActivities();
    };
  }, [user, profileReady, selectedClassId]);

  // Subscribe evaluations for selected activity
  useEffect(() => {
    if (!user || !profileReady || !selectedActivityId) {
      setEvaluationsByStudent({});
      return;
    }
    return subscribeEvaluations(user.uid, selectedActivityId, setEvaluationsByStudent);
  }, [user, profileReady, selectedActivityId]);

  const activeClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const classStudents = useMemo(
    () => students.filter((s) => s.classId === selectedClassId),
    [students, selectedClassId]
  );

  const classActivities = useMemo(
    () => activities.filter((a) => a.classId === selectedClassId),
    [activities, selectedClassId]
  );

  const activeActivity = useMemo(
    () => classActivities.find((a) => a.id === selectedActivityId) ?? null,
    [classActivities, selectedActivityId]
  );

  const groupNames = useMemo(() => {
    const set = new Set<string>();
    classStudents.forEach((s) => {
      if (s.groupName?.trim()) set.add(s.groupName.trim());
    });
    return Array.from(set).sort();
  }, [classStudents]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const matchesGroup = groupFilter === 'all' || (s.groupName || '') === groupFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        (s.groupName || '').toLowerCase().includes(q);
      return matchesGroup && matchesSearch;
    });
  }, [classStudents, groupFilter, searchQuery]);

  const activeEvalStudentIndex = useMemo(
    () => filteredStudents.findIndex((s) => s.id === activeEvalStudentId),
    [filteredStudents, activeEvalStudentId]
  );

  const activeEvalStudent =
    activeEvalStudentIndex >= 0 ? filteredStudents[activeEvalStudentIndex] : null;

  const handleSeedSample = async () => {
    if (!user) return;
    setSeedingSample(true);
    setAppError(null);
    try {
      await ensureTeacherProfile(user);
      setProfileReady(true);
      const { classId, activityId } = await seedSampleClassroomData(user.uid);
      setSelectedClassId(classId);
      setSelectedActivityId(activityId);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : '샘플 학급 데이터를 불러오지 못했습니다.');
    } finally {
      setSeedingSample(false);
    }
  };

  const handleStartInlineEdit = (st: Student, ev?: Evaluation) => {
    setInlineEditId(st.id);
    setInlineDraft({
      studentNumber: st.studentNumber,
      name: st.name,
      groupName: st.groupName ?? '',
      artifactScore: ev?.artifact.score ?? 0,
      selfScore: ev?.peerSelf.selfScore ?? 0,
      peerScore: ev?.peerSelf.peerScore ?? 0,
      attitudeScore: ev?.attitudeScore ?? 80,
    });
  };

  const handleSaveInlineEdit = async (st: Student) => {
    if (!user || !activeClass || !activeActivity) return;
    const trimmedNumber = inlineDraft.studentNumber.trim();
    const trimmedName = inlineDraft.name.trim();
    if (!trimmedNumber || !trimmedName) {
      setAppError('학번과 이름은 비워둘 수 없습니다.');
      return;
    }
    setInlineSaving(true);
    setAppError(null);
    try {
      const trimmedGroup = inlineDraft.groupName.trim();
      if (
        trimmedNumber !== st.studentNumber ||
        trimmedName !== st.name ||
        trimmedGroup !== (st.groupName ?? '')
      ) {
        await updateStudent(user.uid, activeClass.id, st.id, {
          studentNumber: trimmedNumber,
          name: trimmedName,
          groupName: trimmedGroup,
        });
      }

      const base =
        evaluationsByStudent[st.id] ??
        createEmptyEvaluation(user.uid, activeClass.id, activeActivity.id, st.id);
      const nextArtifact = {
        ...base.artifact,
        score: clampScore(inlineDraft.artifactScore),
      };
      const nextPeerSelf = {
        ...base.peerSelf,
        selfScore: clampScore(inlineDraft.selfScore),
        peerScore: clampScore(inlineDraft.peerScore),
      };
      const nextAttitudeScore = clampScore(inlineDraft.attitudeScore);
      const nextTotal = computeTotalScore(activeActivity, {
        rubricScores: base.rubricScores,
        artifact: nextArtifact,
        peerSelf: nextPeerSelf,
        attitudeScore: nextAttitudeScore,
      });

      await upsertEvaluation(user.uid, activeActivity, st.id, {
        rubricScores: base.rubricScores,
        checklistChecked: base.checklistChecked,
        attitudeLogs: base.attitudeLogs,
        attitudeScore: nextAttitudeScore,
        artifact: nextArtifact,
        peerSelf: nextPeerSelf,
        observationMemo: base.observationMemo,
        aiFeedbackDraft: base.aiFeedbackDraft,
        aiSeTeukDraft: base.aiSeTeukDraft,
        totalScore: nextTotal,
      });
      setInlineEditId(null);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : '학생 정보 및 점수 수정에 실패했습니다.');
    } finally {
      setInlineSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (!activeClass || !activeActivity) return;
    const headers = [
      '학급',
      '활동명',
      '영역',
      '학번',
      '이름',
      '모둠',
      '루브릭환산점수',
      '산출물점수',
      '자기평가점수',
      '동료평가점수',
      '태도점수',
      '종합환산점수',
      '루브릭상세',
      '관찰메모',
      '학생피드백초안',
      '생활기록부세특초안',
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = classStudents.map((st) => {
      const ev = evaluationsByStudent[st.id];
      const rubricPct = ev ? computeRubricPercentage(activeActivity, ev.rubricScores) : 0;
      const rubricDetails = activeActivity.rubricCriteria
        .map((c) => `${c.title}:${getLevelLabelKo(ev?.rubricScores[c.id])}`)
        .join(' | ');
      return [
        activeClass.name,
        activeActivity.title,
        activeActivity.domainTitle,
        st.studentNumber,
        st.name,
        st.groupName || '',
        rubricPct,
        ev?.artifact.score ?? 0,
        ev?.peerSelf.selfScore ?? 0,
        ev?.peerSelf.peerScore ?? 0,
        ev?.attitudeScore ?? 80,
        ev?.totalScore ?? 0,
        rubricDetails,
        ev?.observationMemo ?? '',
        ev?.aiFeedbackDraft ?? '',
        ev?.aiSeTeukDraft ?? '',
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeClass.name}_${activeActivity.title}_평가결과.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadGithubZip = async () => {
    setDownloadingZip(true);
    setAppError(null);
    try {
      const response = await fetch('/api/export/github-zip');
      if (!response.ok) {
        let errMessage = 'GitHub용 ZIP 파일을 다운로드하지 못했습니다.';
        try {
          const errJson = (await response.json()) as { error?: string };
          if (errJson.error) errMessage = errJson.error;
        } catch {
          // ignore non-JSON error body
        }
        throw new Error(errMessage);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ai-class-eval-studio-github.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAppError(
        err instanceof Error ? err.message : 'GitHub용 ZIP 파일 다운로드 중 오류가 발생했습니다.'
      );
    } finally {
      setDownloadingZip(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-500">
        교사 인증 상태를 확인하고 있습니다...
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('eval');
          }}
          className="text-base font-bold tracking-tight whitespace-nowrap shrink-0"
        >
          AI-Class Eval Studio
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setActiveView('eval')}
            className={`whitespace-nowrap shrink-0 pb-0.5 border-b-2 transition-colors ${
              activeView === 'eval'
                ? 'border-blue-700 text-slate-900 dark:text-white dark:border-blue-400'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            실시간 평가표
          </button>
          <button
            type="button"
            onClick={() => setActiveView('ai')}
            className={`whitespace-nowrap shrink-0 pb-0.5 border-b-2 transition-colors ${
              activeView === 'ai'
                ? 'border-blue-700 text-slate-900 dark:text-white dark:border-blue-400'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            AI 피드백·세특
          </button>
          <button
            type="button"
            onClick={() => setActiveView('analytics')}
            className={`whitespace-nowrap shrink-0 pb-0.5 border-b-2 transition-colors ${
              activeView === 'analytics'
                ? 'border-blue-700 text-slate-900 dark:text-white dark:border-blue-400'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            성취도 요약
          </button>
          <button
            type="button"
            onClick={() => setShowClassModal(true)}
            className="whitespace-nowrap shrink-0 pb-0.5 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-white"
          >
            학급·명단
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={downloadingZip}
            onClick={handleDownloadGithubZip}
            title="GitHub 업로드용 프로젝트 소스코드 ZIP 다운로드"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Archive className="w-3.5 h-3.5" />
            {downloadingZip ? 'ZIP 생성 중...' : 'GitHub .zip'}
          </button>
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="테마 전환"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            disabled={!activeClass}
            onClick={() => {
              setEditingActivity(null);
              setShowActivityModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            새 평가 활동
          </button>
        </div>
      </header>

      {/* Main Workspace with Left Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-6">
          {/* Class Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">담당 학급</span>
              <button
                type="button"
                onClick={() => setShowClassModal(true)}
                className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
              >
                관리
              </button>
            </div>
            {classes.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowClassModal(true)}
                className="w-full py-2 px-3 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 hover:text-slate-800"
              >
                + 첫 학급 등록하기
              </button>
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.semester})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Activity List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">수업 평가 활동</span>
              {activeClass && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingActivity(null);
                    setShowActivityModal(true);
                  }}
                  className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
                >
                  + 추가
                </button>
              )}
            </div>
            {classActivities.length === 0 ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                등록된 활동이 없습니다.
              </p>
            ) : (
              <div className="space-y-1.5">
                {classActivities.map((act) => {
                  const selected = act.id === selectedActivityId;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setSelectedActivityId(act.id)}
                      className={`w-full p-2.5 rounded-xl text-left transition-colors border ${
                        selected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                        {act.domainCode}. {act.domainTitle} · {act.activityDate}
                      </div>
                      <div className="text-xs font-semibold mt-0.5 line-clamp-2">{act.title}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile View Switcher */}
          <div className="flex md:hidden gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView('eval')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${
                activeView === 'eval' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              평가표
            </button>
            <button
              type="button"
              onClick={() => setActiveView('ai')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${
                activeView === 'ai' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              AI 세특
            </button>
            <button
              type="button"
              onClick={() => setActiveView('analytics')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${
                activeView === 'analytics'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              요약
            </button>
          </div>

          {/* Teacher Account Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{user.displayName || '담당 교사'}</div>
              <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              title="로그아웃"
              aria-label="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 min-w-0">
          {appError && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-4">
              <span className="break-all">{appError}</span>
              <button
                type="button"
                onClick={() => setAppError(null)}
                className="px-2.5 py-1 rounded bg-red-100 dark:bg-red-900/50 font-medium shrink-0"
              >
                닫기
              </button>
            </div>
          )}
          {!activeClass ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 lg:p-14 text-center max-w-2xl mx-auto my-8 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-balance">
                  &lt;인공지능 기초&gt; 첫 수업 평가 공간을 준비해 보세요
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  학급과 학생 명단을 직접 등록하거나, 2학년 3반 샘플 데이터(루브릭·산출물·관찰메모 포함)를
                  불러와 4대 평가 기능과 Gemini AI 세특 작성을 바로 체험할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={seedingSample}
                  onClick={handleSeedSample}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  {seedingSample ? '샘플 학급 생성 중...' : '샘플 학급(2학년 3반) 불러오기'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClassModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  직접 학급·명단 등록하기
                </button>
              </div>
            </div>
          ) : !activeActivity ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 lg:p-14 text-center max-w-2xl mx-auto my-8 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-mono-tabular">
                  {activeClass.name} · 등록 학생 {classStudents.length}명
                </p>
                <h1 className="text-xl font-bold text-balance">
                  {activeClass.name}의 첫 평가 활동을 만들어 보세요
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  교육과정 대단원을 선택하면 성취기준과 추천 루브릭이 자동으로 구성되며, 등록된{' '}
                  {activeClass.name} 학생 명단으로 바로 평가를 시작할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingActivity(null);
                    setShowActivityModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  {activeClass.name} 새 평가 활동 만들기
                </button>
                <button
                  type="button"
                  onClick={() => setShowClassModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
                >
                  <Users className="w-4 h-4" />
                  {activeClass.name} 학생 명단 ({classStudents.length}명)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Contextual Activity Header */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{activeClass.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      영역 {activeActivity.domainCode}. {activeActivity.domainTitle}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {activeActivity.standards.join(', ') || '성취기준 미지정'}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight truncate">
                    {activeActivity.title}
                  </h1>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                    반영 비율: 루브릭 {activeActivity.weights.rubric}% · 산출물{' '}
                    {activeActivity.weights.artifact}% · 자기/동료 {activeActivity.weights.peerSelf}% ·
                    태도 {activeActivity.weights.attitude}%
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPeerImportModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    자기·동료평가 가져오기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingActivity(activeActivity);
                      setShowActivityModal(true);
                    }}
                    className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap"
                  >
                    루브릭 설정
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV 내보내기
                  </button>
                </div>
              </div>

              {/* View Content */}
              {activeView === 'eval' && (
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="학번 또는 이름 검색"
                          className="pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-52"
                        />
                      </div>
                      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setGroupFilter('all')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                            groupFilter === 'all'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          전체 ({classStudents.length})
                        </button>
                        {groupNames.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGroupFilter(g)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                              groupFilter === g
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowClassModal(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-700 whitespace-nowrap"
                    >
                      <Users className="w-3.5 h-3.5" />
                      학생 명단 편집
                    </button>
                  </div>

                  {/* Evaluation Data Table */}
                  {filteredStudents.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                      <ClipboardCheck className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="text-sm text-slate-500">
                        {classStudents.length === 0
                          ? `${activeClass.name}에 등록된 학생이 없습니다.`
                          : '검색 조건에 일치하는 학생이 없습니다.'}
                      </p>
                      {classStudents.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowClassModal(true)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg"
                        >
                          학생 명단 등록하기
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium whitespace-nowrap">학번</th>
                            <th className="text-left px-4 py-3 font-medium whitespace-nowrap">이름</th>
                            <th className="text-left px-4 py-3 font-medium whitespace-nowrap">모둠</th>
                            <th className="text-right px-4 py-3 font-medium whitespace-nowrap">루브릭</th>
                            <th className="text-right px-4 py-3 font-medium whitespace-nowrap">산출물</th>
                            <th className="text-right px-4 py-3 font-medium whitespace-nowrap">자기·동료</th>
                            <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                              수업 태도 빠른 체크
                            </th>
                            <th className="text-right px-4 py-3 font-medium whitespace-nowrap">총점</th>
                            <th className="text-right px-4 py-3 font-medium whitespace-nowrap">평가/세특</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredStudents.map((st) => {
                            const ev = evaluationsByStudent[st.id];
                            const isRowEditing = inlineEditId === st.id;
                            const rubricRatedCount = ev
                              ? Object.keys(ev.rubricScores).length
                              : 0;
                            const rubricTotal = activeActivity.rubricCriteria.length;
                            const rubricPct = ev
                              ? computeRubricPercentage(activeActivity, ev.rubricScores)
                              : 0;
                            const peerSelfAvg = ev
                              ? Math.round(
                                  ((ev.peerSelf.selfScore + ev.peerSelf.peerScore) / 2) * 10
                                ) / 10
                              : 0;

                            const previewTotal = isRowEditing
                              ? computeTotalScore(activeActivity, {
                                  rubricScores: ev?.rubricScores ?? {},
                                  artifact: {
                                    score: clampScore(inlineDraft.artifactScore),
                                    summary: ev?.artifact.summary ?? '',
                                    feedback: ev?.artifact.feedback ?? '',
                                  },
                                  peerSelf: {
                                    selfScore: clampScore(inlineDraft.selfScore),
                                    selfNote: ev?.peerSelf.selfNote ?? '',
                                    peerScore: clampScore(inlineDraft.peerScore),
                                    peerNote: ev?.peerSelf.peerNote ?? '',
                                  },
                                  attitudeScore: clampScore(inlineDraft.attitudeScore),
                                })
                              : ev
                                ? ev.totalScore
                                : 0;

                            return (
                              <tr
                                key={st.id}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="px-4 py-3 font-mono-tabular text-xs text-slate-500 whitespace-nowrap">
                                  {isRowEditing ? (
                                    <input
                                      type="text"
                                      value={inlineDraft.studentNumber}
                                      onChange={(e) =>
                                        setInlineDraft((d) => ({
                                          ...d,
                                          studentNumber: e.target.value,
                                        }))
                                      }
                                      aria-label="학번 수정"
                                      className="w-20 px-2 py-1 text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                                    />
                                  ) : (
                                    st.studentNumber
                                  )}
                                </td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                  {isRowEditing ? (
                                    <input
                                      type="text"
                                      value={inlineDraft.name}
                                      onChange={(e) =>
                                        setInlineDraft((d) => ({ ...d, name: e.target.value }))
                                      }
                                      aria-label="이름 수정"
                                      className="w-24 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActiveEvalStudentId(st.id)}
                                      className="hover:text-blue-700 dark:hover:text-blue-400 text-left"
                                    >
                                      {st.name}
                                    </button>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                  {isRowEditing ? (
                                    <input
                                      type="text"
                                      value={inlineDraft.groupName}
                                      onChange={(e) =>
                                        setInlineDraft((d) => ({
                                          ...d,
                                          groupName: e.target.value,
                                        }))
                                      }
                                      placeholder="모둠"
                                      aria-label="모둠 수정"
                                      className="w-20 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                    />
                                  ) : (
                                    st.groupName || '-'
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono-tabular text-xs whitespace-nowrap">
                                  <span
                                    className={
                                      rubricRatedCount === rubricTotal
                                        ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                        : 'text-slate-500'
                                    }
                                  >
                                    {rubricPct} ({rubricRatedCount}/{rubricTotal})
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono-tabular text-xs whitespace-nowrap">
                                  {isRowEditing ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={inlineDraft.artifactScore}
                                      onChange={(e) =>
                                        setInlineDraft((d) => ({
                                          ...d,
                                          artifactScore: clampScore(Number(e.target.value)),
                                        }))
                                      }
                                      aria-label="산출물 점수 수정"
                                      className="w-16 px-2 py-1 text-right text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                    />
                                  ) : ev ? (
                                    ev.artifact.score
                                  ) : (
                                    0
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono-tabular text-xs whitespace-nowrap">
                                  {isRowEditing ? (
                                    <div className="inline-flex items-center gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        title="자기평가 점수"
                                        value={inlineDraft.selfScore}
                                        onChange={(e) =>
                                          setInlineDraft((d) => ({
                                            ...d,
                                            selfScore: clampScore(Number(e.target.value)),
                                          }))
                                        }
                                        className="w-14 px-1.5 py-1 text-right text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                      />
                                      <span className="text-slate-400">/</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        title="동료평가 점수"
                                        value={inlineDraft.peerScore}
                                        onChange={(e) =>
                                          setInlineDraft((d) => ({
                                            ...d,
                                            peerScore: clampScore(Number(e.target.value)),
                                          }))
                                        }
                                        className="w-14 px-1.5 py-1 text-right text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                      />
                                    </div>
                                  ) : (
                                    peerSelfAvg
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {isRowEditing ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={inlineDraft.attitudeScore}
                                      onChange={(e) =>
                                        setInlineDraft((d) => ({
                                          ...d,
                                          attitudeScore: clampScore(Number(e.target.value)),
                                        }))
                                      }
                                      aria-label="태도 점수 수정"
                                      className="w-16 px-2 py-1 text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono-tabular text-xs font-medium w-9 text-slate-700 dark:text-slate-300">
                                        {ev ? ev.attitudeScore : 80}
                                      </span>
                                      {ATTITUDE_ACTIONS.slice(0, 3).map((act) => (
                                        <button
                                          key={act.type}
                                          type="button"
                                          onClick={() =>
                                            quickLogAttitude(
                                              user.uid,
                                              activeActivity,
                                              st.id,
                                              ev,
                                              act
                                            )
                                          }
                                          className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                        >
                                          +{act.label.split('/')[0]}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono-tabular font-bold text-sm text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                  {previewTotal}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  {isRowEditing ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={inlineSaving}
                                        onClick={() => handleSaveInlineEdit(st)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        저장
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setInlineEditId(null)}
                                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                                        aria-label="수정 취소"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleStartInlineEdit(st, ev)}
                                        title="학번·이름·점수 빠른 수정"
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        aria-label={`${st.name} 정보 및 점수 수정`}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveEvalStudentId(st.id)}
                                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      >
                                        평가 입력
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAiTargetStudentId(st.id);
                                          setActiveView('ai');
                                        }}
                                        title="AI 피드백·세특 작성"
                                        className={`p-1.5 rounded-lg border transition-colors ${
                                          ev?.aiSeTeukDraft
                                            ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-700'
                                        }`}
                                        aria-label={`${st.name} AI 초안`}
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeView === 'ai' && (
                <AiDraftStudioView
                  teacherId={user.uid}
                  activity={activeActivity}
                  students={classStudents}
                  evaluationsByStudent={evaluationsByStudent}
                  initialStudentId={aiTargetStudentId}
                  onExportCsv={handleExportCsv}
                />
              )}

              {activeView === 'analytics' && (
                <AnalyticsSummaryView
                  activity={activeActivity}
                  students={classStudents}
                  evaluationsByStudent={evaluationsByStudent}
                  onExportCsv={handleExportCsv}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      {showClassModal && (
        <ClassStudentManagerModal
          teacherId={user.uid}
          classes={classes}
          activeClass={activeClass}
          students={classStudents}
          onSelectClass={(cid) => setSelectedClassId(cid)}
          onClassCreated={(cid) => setSelectedClassId(cid)}
          onClose={() => setShowClassModal(false)}
        />
      )}

      {showActivityModal && activeClass && (
        <ActivityBuilderModal
          teacherId={user.uid}
          classId={activeClass.id}
          editingActivity={editingActivity}
          onSaved={(aid) => {
            setSelectedActivityId(aid);
            setShowActivityModal(false);
          }}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {showPeerImportModal && activeActivity && (
        <PeerSelfImportModal
          teacherId={user.uid}
          activity={activeActivity}
          students={classStudents}
          evaluationsByStudent={evaluationsByStudent}
          onClose={() => setShowPeerImportModal(false)}
        />
      )}

      {activeEvalStudent && activeActivity && (
        <EvaluationSlideOver
          teacherId={user.uid}
          activity={activeActivity}
          student={activeEvalStudent}
          evaluation={evaluationsByStudent[activeEvalStudent.id]}
          hasPrev={activeEvalStudentIndex > 0}
          hasNext={activeEvalStudentIndex < filteredStudents.length - 1}
          onPrev={() => {
            if (activeEvalStudentIndex > 0) {
              setActiveEvalStudentId(filteredStudents[activeEvalStudentIndex - 1].id);
            }
          }}
          onNext={() => {
            if (activeEvalStudentIndex < filteredStudents.length - 1) {
              setActiveEvalStudentId(filteredStudents[activeEvalStudentIndex + 1].id);
            }
          }}
          onOpenAiStudio={(sid) => {
            setActiveEvalStudentId(null);
            setAiTargetStudentId(sid);
            setActiveView('ai');
          }}
          onClose={() => setActiveEvalStudentId(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppWorkspace />
    </ErrorBoundary>
  );
}
