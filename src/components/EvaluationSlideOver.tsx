import { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ATTITUDE_ACTIONS,
  clampScore,
  computeRubricPercentage,
  computeTotalScore,
  createEmptyEvaluation,
} from '../data/curriculumPresets';
import { updateStudent, upsertEvaluation } from '../lib/firestoreService';
import type { Activity, AttitudeLog, Evaluation, RubricLevel, Student } from '../types';

interface Props {
  teacherId: string;
  activity: Activity;
  student: Student;
  evaluation?: Evaluation;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenAiStudio: (studentId: string) => void;
  onClose: () => void;
}

export function EvaluationSlideOver({
  teacherId,
  activity,
  student,
  evaluation,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onOpenAiStudio,
  onClose,
}: Props) {
  const buildInitial = () =>
    evaluation
      ? {
          rubricScores: { ...evaluation.rubricScores },
          checklistChecked: [...evaluation.checklistChecked],
          attitudeLogs: [...evaluation.attitudeLogs],
          attitudeScore: evaluation.attitudeScore,
          artifact: { ...evaluation.artifact },
          peerSelf: { ...evaluation.peerSelf },
          observationMemo: evaluation.observationMemo,
          aiFeedbackDraft: evaluation.aiFeedbackDraft,
          aiSeTeukDraft: evaluation.aiSeTeukDraft,
        }
      : createEmptyEvaluation(teacherId, activity.classId, activity.id, student.id);

  const [rubricScores, setRubricScores] = useState<Record<string, RubricLevel>>(
    () => buildInitial().rubricScores
  );
  const [checklistChecked, setChecklistChecked] = useState<string[]>(
    () => buildInitial().checklistChecked
  );
  const [attitudeLogs, setAttitudeLogs] = useState<AttitudeLog[]>(
    () => buildInitial().attitudeLogs
  );
  const [attitudeScore, setAttitudeScore] = useState<number>(() => buildInitial().attitudeScore);
  const [artifactScore, setArtifactScore] = useState<number>(() => buildInitial().artifact.score);
  const [artifactSummary, setArtifactSummary] = useState<string>(() => buildInitial().artifact.summary);
  const [artifactFeedback, setArtifactFeedback] = useState<string>(
    () => buildInitial().artifact.feedback
  );
  const [selfScore, setSelfScore] = useState<number>(() => buildInitial().peerSelf.selfScore);
  const [selfNote, setSelfNote] = useState<string>(() => buildInitial().peerSelf.selfNote);
  const [peerScore, setPeerScore] = useState<number>(() => buildInitial().peerSelf.peerScore);
  const [peerNote, setPeerNote] = useState<string>(() => buildInitial().peerSelf.peerNote);
  const [observationMemo, setObservationMemo] = useState<string>(
    () => buildInitial().observationMemo
  );

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editStudentNumber, setEditStudentNumber] = useState(student.studentNumber);
  const [editStudentName, setEditStudentName] = useState(student.name);
  const [editGroupName, setEditGroupName] = useState(student.groupName ?? '');

  // Sync local form state when switching student
  useEffect(() => {
    const next = evaluation ?? createEmptyEvaluation(teacherId, activity.classId, activity.id, student.id);
    setRubricScores({ ...next.rubricScores });
    setChecklistChecked([...next.checklistChecked]);
    setAttitudeLogs([...next.attitudeLogs]);
    setAttitudeScore(next.attitudeScore);
    setArtifactScore(next.artifact.score);
    setArtifactSummary(next.artifact.summary);
    setArtifactFeedback(next.artifact.feedback);
    setSelfScore(next.peerSelf.selfScore);
    setSelfNote(next.peerSelf.selfNote);
    setPeerScore(next.peerSelf.peerScore);
    setPeerNote(next.peerSelf.peerNote);
    setObservationMemo(next.observationMemo);
    setSavedNotice(false);
    setEditingInfo(false);
    setEditStudentNumber(student.studentNumber);
    setEditStudentName(student.name);
    setEditGroupName(student.groupName ?? '');
  }, [student.id, student.studentNumber, student.name, student.groupName, activity.id, evaluation, teacherId, activity.classId]);

  const liveRubricPct = computeRubricPercentage(activity, rubricScores);
  const liveTotalScore = computeTotalScore(activity, {
    rubricScores,
    artifact: { score: artifactScore, summary: artifactSummary, feedback: artifactFeedback },
    peerSelf: { selfScore, selfNote, peerScore, peerNote },
    attitudeScore,
  });

  const handleToggleChecklist = (id: string) => {
    setChecklistChecked((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddAttitude = (action: (typeof ATTITUDE_ACTIONS)[number]) => {
    const log: AttitudeLog = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: action.type,
      label: action.label,
      delta: action.delta,
      timestamp: new Date().toISOString(),
    };
    setAttitudeLogs((prev) => [...prev, log].slice(-50));
    setAttitudeScore((prev) => clampScore(prev + action.delta));
  };

  const handleUndoAttitude = (logId: string, delta: number) => {
    setAttitudeLogs((prev) => prev.filter((l) => l.id !== logId));
    setAttitudeScore((prev) => clampScore(prev - delta));
  };

  const persist = async () => {
    setSaving(true);
    try {
      await upsertEvaluation(teacherId, activity, student.id, {
        rubricScores,
        checklistChecked,
        attitudeLogs,
        attitudeScore,
        artifact: {
          score: clampScore(artifactScore),
          summary: artifactSummary,
          feedback: artifactFeedback,
        },
        peerSelf: {
          selfScore: clampScore(selfScore),
          selfNote,
          peerScore: clampScore(peerScore),
          peerNote,
        },
        observationMemo,
        aiFeedbackDraft: evaluation?.aiFeedbackDraft ?? '',
        aiSeTeukDraft: evaluation?.aiSeTeukDraft ?? '',
        totalScore: liveTotalScore,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    await persist();
    if (hasNext) onNext();
  };

  const handleSaveAndOpenAi = async () => {
    await persist();
    onOpenAiStudio(student.id);
  };

  const handleSaveStudentInfo = async () => {
    if (!editStudentNumber.trim() || !editStudentName.trim()) return;
    setSaving(true);
    try {
      await updateStudent(teacherId, activity.classId, student.id, {
        studentNumber: editStudentNumber.trim(),
        name: editStudentName.trim(),
        groupName: editGroupName.trim(),
      });
      setEditingInfo(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/35 flex justify-end">
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-2xl h-full flex flex-col">
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono-tabular">{student.studentNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{student.groupName || '모둠 미지정'}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{activity.title}</span>
            </div>
            {editingInfo ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <input
                  type="text"
                  value={editStudentNumber}
                  onChange={(e) => setEditStudentNumber(e.target.value)}
                  placeholder="학번"
                  className="w-24 px-2 py-1 text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  placeholder="이름"
                  className="w-28 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="모둠"
                  className="w-24 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="button"
                  disabled={saving || !editStudentNumber.trim() || !editStudentName.trim()}
                  onClick={handleSaveStudentInfo}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditingInfo(false)}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-lg font-bold">{student.name} 학생 평가 기록</h2>
                <button
                  type="button"
                  onClick={() => setEditingInfo(true)}
                  className="p-1 text-slate-400 hover:text-blue-700 rounded"
                  title="학번·이름·모둠 수정"
                  aria-label="학번·이름·모둠 수정"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={onPrev}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-35 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label="이전 학생"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-35 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label="다음 학생"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Score Strip */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-5 gap-2 text-center">
          <div>
            <div className="text-[11px] text-slate-500">루브릭 ({activity.weights.rubric}%)</div>
            <div className="text-sm font-semibold font-mono-tabular">{liveRubricPct}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">산출물 ({activity.weights.artifact}%)</div>
            <div className="text-sm font-semibold font-mono-tabular">{artifactScore}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">자기·동료 ({activity.weights.peerSelf}%)</div>
            <div className="text-sm font-semibold font-mono-tabular">
              {Math.round(((selfScore + peerScore) / 2) * 10) / 10}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">태도 ({activity.weights.attitude}%)</div>
            <div className="text-sm font-semibold font-mono-tabular">{attitudeScore}</div>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">종합 환산</div>
            <div className="text-base font-bold font-mono-tabular text-blue-700 dark:text-blue-400">
              {liveTotalScore}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* 1. Rubric */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">1. 루브릭 기반 수행평가</h3>
            <div className="space-y-3">
              {activity.rubricCriteria.map((crit) => {
                const selected = rubricScores[crit.id];
                return (
                  <div
                    key={crit.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{crit.title}</span>
                      <span className="text-xs font-mono-tabular text-slate-500">
                        배점 {crit.maxScore}점
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['high', '상 (100%)', crit.highDesc],
                          ['mid', '중 (75%)', crit.midDesc],
                          ['low', '하 (50%)', crit.lowDesc],
                        ] as const
                      ).map(([lvl, label, desc]) => {
                        const isActive = selected === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() =>
                              setRubricScores((prev) => ({ ...prev, [crit.id]: lvl }))
                            }
                            className={`p-2.5 rounded-lg border text-left transition-colors ${
                              isActive
                                ? 'border-blue-700 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="text-xs font-semibold mb-1">{label}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-3">
                              {desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. Checklist & Attitude */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">2. 활동 관찰 체크리스트 &amp; 참여 태도</h3>

            {activity.checklistItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activity.checklistItems.map((item) => {
                  const checked = checklistChecked.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleChecklist(item.id)}
                      className={`p-2.5 rounded-lg border text-left text-xs flex items-center gap-2 transition-colors ${
                        checked
                          ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          checked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  수업 참여 태도 빠른 체크 (기본 80점)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">직접 조정</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={attitudeScore}
                    onChange={(e) => setAttitudeScore(clampScore(Number(e.target.value)))}
                    className="w-16 px-2 py-1 text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ATTITUDE_ACTIONS.map((act) => (
                  <button
                    key={act.type}
                    type="button"
                    onClick={() => handleAddAttitude(act)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      act.delta > 0
                        ? 'border-slate-200 dark:border-slate-700 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400'
                        : 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                    }`}
                  >
                    {act.delta > 0 ? `+${act.delta}` : act.delta} {act.label}
                  </button>
                ))}
              </div>
              {attitudeLogs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {attitudeLogs.map((log) => (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => handleUndoAttitude(log.id, log.delta)}
                      title="클릭하여 기록 취소"
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded hover:bg-red-50 hover:text-red-600"
                    >
                      <span>{log.label}</span>
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 3. Artifact */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">3. 실습 산출물 점수 및 피드백</h3>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs text-slate-500 mb-1">산출물 점수 (0~100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={artifactScore}
                  onChange={(e) => setArtifactScore(clampScore(Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-9">
                <label className="block text-xs text-slate-500 mb-1">산출물 주제 / 링크 요약</label>
                <input
                  type="text"
                  value={artifactSummary}
                  onChange={(e) => setArtifactSummary(e.target.value)}
                  placeholder="예: 티처블 머신 분리배출 분류기 (정확도 91%)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">산출물 교사 코멘트</label>
              <textarea
                rows={2}
                value={artifactFeedback}
                onChange={(e) => setArtifactFeedback(e.target.value)}
                placeholder="산출물의 기술적 완성도나 개선 사항을 기록하세요."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </section>

          {/* 4. Peer & Self + Observation Memo */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">4. 자기·동료평가 및 교사 관찰 메모</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">학생 자기평가</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selfScore}
                    onChange={(e) => setSelfScore(clampScore(Number(e.target.value)))}
                    className="w-16 px-2 py-1 text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <textarea
                  rows={2}
                  value={selfNote}
                  onChange={(e) => setSelfNote(e.target.value)}
                  placeholder="학생이 작성한 자기성찰 요약"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">모둠 동료평가</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={peerScore}
                    onChange={(e) => setPeerScore(clampScore(Number(e.target.value)))}
                    className="w-16 px-2 py-1 text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <textarea
                  rows={2}
                  value={peerNote}
                  onChange={(e) => setPeerNote(e.target.value)}
                  placeholder="모둠 동료들이 남긴 협업 기여도 평가"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                교사 관찰 메모 (AI 세특 초안의 핵심 근거로 활용됩니다)
              </label>
              <textarea
                rows={3}
                value={observationMemo}
                onChange={(e) => setObservationMemo(e.target.value)}
                placeholder="수업 중 학생이 보인 구체적 탐구 태도, 질문 내용, 문제 해결 과정을 기록하세요."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="text-xs">
            {savedNotice ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                클라우드에 저장되었습니다
              </span>
            ) : (
              <span className="text-slate-400">저장 시 종합 점수가 자동 재계산됩니다</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAndOpenAi}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              저장 후 AI 작성
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={persist}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? '저장 중...' : '저장'}
            </button>
            {hasNext && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAndNext}
                className="px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg whitespace-nowrap"
              >
                저장 후 다음
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
