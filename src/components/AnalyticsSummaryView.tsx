import { Download } from 'lucide-react';
import { computeRubricPercentage } from '../data/curriculumPresets';
import type { Activity, Evaluation, Student } from '../types';

interface Props {
  activity: Activity;
  students: Student[];
  evaluationsByStudent: Record<string, Evaluation>;
  onExportCsv: () => void;
}

export function AnalyticsSummaryView({
  activity,
  students,
  evaluationsByStudent,
  onExportCsv,
}: Props) {
  const totalStudents = students.length;
  const evaluatedList = students
    .map((s) => evaluationsByStudent[s.id])
    .filter((ev): ev is Evaluation => Boolean(ev));

  const avgTotal =
    evaluatedList.length > 0
      ? Math.round(
          (evaluatedList.reduce((acc, ev) => acc + ev.totalScore, 0) / evaluatedList.length) * 10
        ) / 10
      : 0;

  const avgRubric =
    evaluatedList.length > 0
      ? Math.round(
          (evaluatedList.reduce(
            (acc, ev) => acc + computeRubricPercentage(activity, ev.rubricScores),
            0
          ) /
            evaluatedList.length) *
            10
        ) / 10
      : 0;

  const avgArtifact =
    evaluatedList.length > 0
      ? Math.round(
          (evaluatedList.reduce((acc, ev) => acc + ev.artifact.score, 0) / evaluatedList.length) * 10
        ) / 10
      : 0;

  const seteukReadyCount = evaluatedList.filter((ev) => ev.aiSeTeukDraft.trim().length > 0).length;

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500">평가 진행 학생</div>
          <div className="text-2xl font-bold font-mono-tabular mt-1">
            {evaluatedList.length} / {totalStudents}명
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500">종합 환산 평균</div>
          <div className="text-2xl font-bold font-mono-tabular mt-1 text-blue-700 dark:text-blue-400">
            {avgTotal}점
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500">루브릭 / 산출물 평균</div>
          <div className="text-2xl font-bold font-mono-tabular mt-1">
            {avgRubric} · {avgArtifact}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500">세특 초안 저장 완료</div>
          <div className="text-2xl font-bold font-mono-tabular mt-1 text-emerald-700 dark:text-emerald-400">
            {seteukReadyCount} / {totalStudents}명
          </div>
        </div>
      </div>

      {/* Rubric Criterion Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">루브릭 기준별 성취 분포</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              학급 전체 학생의 상·중·하 성취 비율을 확인해 후속 피드백 수업을 설계할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            전체 성적·세특 CSV 내보내기
          </button>
        </div>

        <div className="space-y-4">
          {activity.rubricCriteria.map((crit) => {
            let high = 0;
            let mid = 0;
            let low = 0;
            let none = 0;
            students.forEach((st) => {
              const lvl = evaluationsByStudent[st.id]?.rubricScores[crit.id];
              if (lvl === 'high') high++;
              else if (lvl === 'mid') mid++;
              else if (lvl === 'low') low++;
              else none++;
            });
            const denom = Math.max(1, totalStudents);
            return (
              <div key={crit.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{crit.title}</span>
                  <span className="font-mono-tabular text-slate-500">
                    상 {high} · 중 {mid} · 하 {low} · 미평가 {none}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(high / denom) * 100}%` }}
                    className="bg-emerald-600 h-full"
                    title={`상 ${high}명`}
                  />
                  <div
                    style={{ width: `${(mid / denom) * 100}%` }}
                    className="bg-blue-600 h-full"
                    title={`중 ${mid}명`}
                  />
                  <div
                    style={{ width: `${(low / denom) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`하 ${low}명`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
