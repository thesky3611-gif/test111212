import { useEffect, useState } from 'react';
import { Check, Copy, Download, Save, Sparkles } from 'lucide-react';
import {
  calculateNeisBytes,
  createEmptyEvaluation,
  getLevelLabelKo,
} from '../data/curriculumPresets';
import { upsertEvaluation } from '../lib/firestoreService';
import type { Activity, Evaluation, Student } from '../types';

interface Props {
  teacherId: string;
  activity: Activity;
  students: Student[];
  evaluationsByStudent: Record<string, Evaluation>;
  initialStudentId?: string | null;
  onExportCsv: () => void;
}

const COMPETENCY_OPTIONS = [
  '인공지능 원리 이해 및 문제 해결 역량',
  '데이터 기반 추론 및 모델 개선 역량',
  '인공지능 윤리 의식 및 비판적 성찰',
  '모둠 협업 및 의사소통 역량',
];

export function AiDraftStudioView({
  teacherId,
  activity,
  students,
  evaluationsByStudent,
  initialStudentId,
  onExportCsv,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => initialStudentId || students[0]?.id || ''
  );
  const [mode, setMode] = useState<'seteuk' | 'feedback'>('seteuk');
  const [focusCompetency, setFocusCompetency] = useState(COMPETENCY_OPTIONS[0]);
  const [targetLength, setTargetLength] = useState<'short' | 'standard' | 'detailed'>('standard');
  const [draftText, setDraftText] = useState('');
  const [evidenceUsed, setEvidenceUsed] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudentId && students.some((s) => s.id === initialStudentId)) {
      setSelectedStudentId(initialStudentId);
    } else if (!students.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(students[0]?.id ?? '');
    }
  }, [initialStudentId, students, selectedStudentId]);

  const activeStudent = students.find((s) => s.id === selectedStudentId) ?? students[0] ?? null;
  const activeEval = activeStudent ? evaluationsByStudent[activeStudent.id] : undefined;

  useEffect(() => {
    if (!activeStudent) return;
    const saved =
      mode === 'seteuk' ? activeEval?.aiSeTeukDraft ?? '' : activeEval?.aiFeedbackDraft ?? '';
    setDraftText(saved);
    setEvidenceUsed([]);
    setErrorMsg(null);
    setStatusMsg(null);
  }, [activeStudent?.id, mode, activeEval?.aiSeTeukDraft, activeEval?.aiFeedbackDraft]);

  if (students.length === 0 || !activeStudent) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <p className="text-sm text-slate-500">먼저 학급에 학생을 등록해 주세요.</p>
      </div>
    );
  }

  const evalSnapshot =
    activeEval ?? createEmptyEvaluation(teacherId, activity.classId, activity.id, activeStudent.id);

  const rubricSummary = activity.rubricCriteria.map((c) => {
    const lvl = evalSnapshot.rubricScores[c.id];
    const desc =
      lvl === 'high' ? c.highDesc : lvl === 'mid' ? c.midDesc : lvl === 'low' ? c.lowDesc : '미평가';
    return {
      criterionTitle: c.title,
      levelLabel: getLevelLabelKo(lvl),
      descriptor: desc,
    };
  });

  const completedChecklistLabels = activity.checklistItems
    .filter((item) => evalSnapshot.checklistChecked.includes(item.id))
    .map((item) => item.label);

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const response = await fetch('/api/ai/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          focusCompetency,
          targetLength,
          student: {
            name: activeStudent.name,
            studentNumber: activeStudent.studentNumber,
            groupName: activeStudent.groupName,
          },
          activity: {
            title: activity.title,
            domainTitle: activity.domainTitle,
            standards: activity.standards,
            rubricSummary,
            checklistCompleted: completedChecklistLabels,
            checklistTotalCount: activity.checklistItems.length,
          },
          evaluation: {
            attitudeLogs: evalSnapshot.attitudeLogs.map((l) => ({
              label: l.label,
              delta: l.delta,
            })),
            attitudeScore: evalSnapshot.attitudeScore,
            artifactScore: evalSnapshot.artifact.score,
            artifactSummary: evalSnapshot.artifact.summary,
            artifactFeedback: evalSnapshot.artifact.feedback,
            selfScore: evalSnapshot.peerSelf.selfScore,
            selfNote: evalSnapshot.peerSelf.selfNote,
            peerScore: evalSnapshot.peerSelf.peerScore,
            peerNote: evalSnapshot.peerSelf.peerNote,
            observationMemo: evalSnapshot.observationMemo,
            totalScore: evalSnapshot.totalScore,
          },
        }),
      });

      const data = (await response.json()) as {
        draftText?: string;
        evidenceUsed?: string[];
        error?: string;
      };

      if (!response.ok || !data.draftText) {
        throw new Error(data.error || 'AI 초안 생성에 실패했습니다.');
      }

      setDraftText(data.draftText);
      setEvidenceUsed(data.evidenceUsed ?? []);
      setStatusMsg('초안이 생성되었습니다. 내용을 검수한 뒤 저장하세요.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI 요청 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await upsertEvaluation(teacherId, activity, activeStudent.id, {
        rubricScores: evalSnapshot.rubricScores,
        checklistChecked: evalSnapshot.checklistChecked,
        attitudeLogs: evalSnapshot.attitudeLogs,
        attitudeScore: evalSnapshot.attitudeScore,
        artifact: evalSnapshot.artifact,
        peerSelf: evalSnapshot.peerSelf,
        observationMemo: evalSnapshot.observationMemo,
        aiFeedbackDraft: mode === 'feedback' ? draftText : evalSnapshot.aiFeedbackDraft,
        aiSeTeukDraft: mode === 'seteuk' ? draftText : evalSnapshot.aiSeTeukDraft,
        totalScore: evalSnapshot.totalScore,
      });
      setStatusMsg('클라우드에 저장되었습니다.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!draftText.trim()) return;
    await navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const charCount = draftText.length;
  const byteCount = calculateNeisBytes(draftText);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Student Selector + Grounded Evidence */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">학생 선택</h2>
            <span className="text-xs text-slate-500 font-mono-tabular">{students.length}명</span>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
            {students.map((st) => {
              const ev = evaluationsByStudent[st.id];
              const hasSeTeuk = Boolean(ev?.aiSeTeukDraft?.trim());
              const hasFeedback = Boolean(ev?.aiFeedbackDraft?.trim());
              const isSelected = st.id === activeStudent.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStudentId(st.id)}
                  className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono-tabular text-slate-500 mr-2">{st.studentNumber}</span>
                    <span className="font-medium">{st.name}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {hasSeTeuk && hasFeedback
                      ? '세특·피드백 완료'
                      : hasSeTeuk
                        ? '세특 저장됨'
                        : hasFeedback
                          ? '피드백 저장됨'
                          : '미작성'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grounded Evidence Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold">
                {activeStudent.studentNumber} {activeStudent.name} 평가 근거 요약
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                AI는 아래에 기록된 실제 근거만을 바탕으로 문장을 작성합니다.
              </p>
            </div>
            <span className="text-sm font-bold font-mono-tabular text-blue-700 dark:text-blue-400">
              {evalSnapshot.totalScore}점
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                루브릭 성취 수준
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                {rubricSummary.map((r) => (
                  <li key={r.criterionTitle}>
                    · {r.criterionTitle}: <strong className="text-slate-800 dark:text-slate-200">{r.levelLabel}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                실습 산출물 ({evalSnapshot.artifact.score}점)
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {evalSnapshot.artifact.summary || '기록된 산출물 요약 없음'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  자기평가 ({evalSnapshot.peerSelf.selfScore}점)
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {evalSnapshot.peerSelf.selfNote || '기록 없음'}
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  동료평가 ({evalSnapshot.peerSelf.peerScore}점)
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {evalSnapshot.peerSelf.peerNote || '기록 없음'}
                </p>
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                교사 관찰 메모 &amp; 태도 ({evalSnapshot.attitudeScore}점)
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {evalSnapshot.observationMemo || '기록된 관찰 메모 없음'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: AI Generator & Editor */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('seteuk')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'seteuk'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              생활기록부 세특 초안
            </button>
            <button
              type="button"
              onClick={() => setMode('feedback')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'feedback'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              학생 전달 피드백
            </button>
          </div>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            학급 전체 세특 CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7">
            <label className="block text-xs text-slate-500 mb-1">강조 역량</label>
            <select
              value={focusCompetency}
              onChange={(e) => setFocusCompetency(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {COMPETENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {mode === 'seteuk' && (
            <div className="sm:col-span-5">
              <label className="block text-xs text-slate-500 mb-1">세특 분량 목표</label>
              <select
                value={targetLength}
                onChange={(e) =>
                  setTargetLength(e.target.value as 'short' | 'standard' | 'detailed')
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="short">간결형 (약 300자 / 900B 이하)</option>
                <option value="standard">표준형 (약 400자 / 1200B 이하)</option>
                <option value="detailed">심화형 (약 500자 / 1500B 이하)</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            {generating
              ? '근거 기반 문장 생성 중...'
              : mode === 'seteuk'
                ? 'Gemini AI 세특 초안 생성'
                : 'Gemini AI 피드백 생성'}
          </button>

          <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            <span>{charCount}자</span>
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            <span className={byteCount > 1500 ? 'text-red-600 font-semibold' : ''}>
              {byteCount} / 1500 Bytes
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
            {statusMsg}
          </div>
        )}

        <textarea
          rows={10}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder={
            mode === 'seteuk'
              ? '상단의 "Gemini AI 세특 초안 생성" 버튼을 누르거나 직접 세특 초안을 입력·편집하세요.'
              : '상단의 "Gemini AI 피드백 생성" 버튼을 누르거나 학생에게 보낼 피드백을 작성하세요.'
          }
          className="w-full p-4 text-sm leading-relaxed rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        {evidenceUsed.length > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            반영된 주요 근거: {evidenceUsed.join(' · ')}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!draftText.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 rounded-lg whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사 완료' : '클립보드 복사'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 rounded-lg whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? '저장 중...' : '평가 기록에 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
