import { useMemo, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { clampScore, createEmptyEvaluation } from '../data/curriculumPresets';
import { upsertEvaluation } from '../lib/firestoreService';
import type { Activity, Evaluation, Student } from '../types';

interface Props {
  teacherId: string;
  activity: Activity;
  students: Student[];
  evaluationsByStudent: Record<string, Evaluation>;
  onClose: () => void;
}

export function PeerSelfImportModal({
  teacherId,
  activity,
  students,
  evaluationsByStudent,
  onClose,
}: Props) {
  const [rawText, setRawText] = useState('');
  const [importing, setImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const studentByNumber = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.studentNumber.trim(), s));
    return map;
  }, [students]);

  const parsedRows = useMemo(() => {
    return rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const cols = line.split(/[,\t]/).map((c) => c.trim());
        const studentNumber = cols[0] ?? '';
        const matched = studentByNumber.get(studentNumber);
        return {
          studentNumber,
          matchedStudent: matched,
          selfScore: clampScore(Number(cols[1] ?? 0)),
          selfNote: cols[2] ?? '',
          peerScore: clampScore(Number(cols[3] ?? 0)),
          peerNote: cols[4] ?? '',
        };
      });
  }, [rawText, studentByNumber]);

  const matchedCount = parsedRows.filter((r) => r.matchedStudent).length;

  const handleImport = async () => {
    if (matchedCount === 0) return;
    setImporting(true);
    setResultMsg(null);
    try {
      let updated = 0;
      for (const row of parsedRows) {
        if (!row.matchedStudent) continue;
        const current =
          evaluationsByStudent[row.matchedStudent.id] ??
          createEmptyEvaluation(teacherId, activity.classId, activity.id, row.matchedStudent.id);
        await upsertEvaluation(teacherId, activity, row.matchedStudent.id, {
          rubricScores: current.rubricScores,
          checklistChecked: current.checklistChecked,
          attitudeLogs: current.attitudeLogs,
          attitudeScore: current.attitudeScore,
          artifact: current.artifact,
          peerSelf: {
            selfScore: row.selfScore,
            selfNote: row.selfNote,
            peerScore: row.peerScore,
            peerNote: row.peerNote,
          },
          observationMemo: current.observationMemo,
          aiFeedbackDraft: current.aiFeedbackDraft,
          aiSeTeukDraft: current.aiSeTeukDraft,
          totalScore: current.totalScore,
        });
        updated++;
      }
      setResultMsg(`${updated}명의 자기·동료평가 데이터가 반영되었습니다.`);
      setTimeout(() => onClose(), 800);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">자기·동료평가 CSV 일괄 가져오기</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              구글폼이나 설문 시트 결과를 학번 기준으로 한 번에 연결합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            입력 형식 (쉼표 또는 탭 구분):{' '}
            <span className="font-mono-tabular font-medium">
              학번, 자기평가점수(0~100), 자기성찰, 동료평가점수(0~100), 동료피드백
            </span>
          </div>

          <textarea
            rows={7}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              '20301, 90, 데이터 편향을 직접 확인해 정확도를 높임, 95, 모둠 자료 정리에 크게 기여함\n20302, 85, 과적합 사례를 실험으로 비교함, 90, 질문과 발표 준비가 성실함'
            }
            className="w-full p-3 text-xs font-mono-tabular rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />

          {resultMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-700 dark:text-emerald-300">
              {resultMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 font-mono-tabular">
              학번 매칭 완료: {matchedCount} / {parsedRows.length}행
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg"
              >
                취소
              </button>
              <button
                type="button"
                disabled={importing || matchedCount === 0}
                onClick={handleImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                {importing ? '반영 중...' : `${matchedCount}명 데이터 반영`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
