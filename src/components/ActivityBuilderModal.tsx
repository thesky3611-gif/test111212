import { useMemo, useState } from 'react';
import { Plus, Sparkles, Trash2, X } from 'lucide-react';
import { CURRICULUM_PRESETS } from '../data/curriculumPresets';
import { createActivity, updateActivity } from '../lib/firestoreService';
import type { Activity, ActivityWeights, ChecklistItem, DomainCode, RubricCriterion } from '../types';

interface Props {
  teacherId: string;
  classId: string;
  editingActivity?: Activity | null;
  onSaved: (activityId: string) => void;
  onClose: () => void;
}

export function ActivityBuilderModal({
  teacherId,
  classId,
  editingActivity,
  onSaved,
  onClose,
}: Props) {
  const initialDomain = editingActivity?.domainCode ?? '03';
  const initialPreset = CURRICULUM_PRESETS.find((p) => p.domainCode === initialDomain) ?? CURRICULUM_PRESETS[2];

  const [domainCode, setDomainCode] = useState<DomainCode>(initialDomain);
  const [title, setTitle] = useState(editingActivity?.title ?? initialPreset.defaultActivityTitle);
  const [activityDate, setActivityDate] = useState(
    editingActivity?.activityDate ?? new Date().toISOString().slice(0, 10)
  );
  const [standards, setStandards] = useState<string[]>(
    editingActivity?.standards ?? initialPreset.standards.map((s) => s.code)
  );
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>(
    editingActivity?.rubricCriteria ?? initialPreset.defaultRubric
  );
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    editingActivity?.checklistItems ?? initialPreset.defaultChecklist
  );
  const [weights, setWeights] = useState<ActivityWeights>(
    editingActivity?.weights ?? initialPreset.defaultWeights
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentPreset = useMemo(
    () => CURRICULUM_PRESETS.find((p) => p.domainCode === domainCode) ?? CURRICULUM_PRESETS[0],
    [domainCode]
  );

  const weightsSum = weights.rubric + weights.artifact + weights.peerSelf + weights.attitude;

  const handleApplyDomainPreset = (code: DomainCode) => {
    const preset = CURRICULUM_PRESETS.find((p) => p.domainCode === code);
    if (!preset) return;
    setDomainCode(code);
    if (!editingActivity) {
      setTitle(preset.defaultActivityTitle);
      setStandards(preset.standards.map((s) => s.code));
      setRubricCriteria(preset.defaultRubric.map((r) => ({ ...r })));
      setChecklistItems(preset.defaultChecklist.map((c) => ({ ...c })));
      setWeights({ ...preset.defaultWeights });
    }
  };

  const toggleStandard = (code: string) => {
    setStandards((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code].slice(0, 10)
    );
  };

  const handleCriterionChange = (idx: number, field: keyof RubricCriterion, value: string | number) => {
    setRubricCriteria((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleAddCriterion = () => {
    if (rubricCriteria.length >= 10) return;
    setRubricCriteria((prev) => [
      ...prev,
      {
        id: `crit_${Date.now()}`,
        title: '새 평가 항목',
        maxScore: 20,
        highDesc: '핵심 원리를 정확히 적용하고 근거를 명확히 제시함.',
        midDesc: '기본 절차를 수행하였으나 세부 설명이 다소 부족함.',
        lowDesc: '기본 개념 이해 및 산출물 완성이 미흡함.',
      },
    ]);
  };

  const handleAddChecklist = () => {
    if (checklistItems.length >= 15) return;
    setChecklistItems((prev) => [
      ...prev,
      { id: `chk_${Date.now()}`, label: '새 수업 관찰 체크 항목' },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg('수업 활동 제목을 입력해 주세요.');
      return;
    }
    if (rubricCriteria.length === 0) {
      setErrorMsg('최소 1개 이상의 루브릭 평가 항목이 필요합니다.');
      return;
    }
    if (weightsSum !== 100) {
      setErrorMsg(`평가 반영 비율 합계가 100%여야 합니다. (현재 ${weightsSum}%)`);
      return;
    }

    setSubmitting(true);
    try {
      if (editingActivity) {
        await updateActivity(teacherId, editingActivity.id, {
          title: title.trim(),
          domainCode,
          domainTitle: currentPreset.domainTitle,
          standards,
          rubricCriteria,
          checklistItems: checklistItems.filter((c) => c.label.trim()),
          weights,
          activityDate,
        });
        onSaved(editingActivity.id);
      } else {
        const id = await createActivity(teacherId, {
          classId,
          title: title.trim(),
          domainCode,
          domainTitle: currentPreset.domainTitle,
          standards,
          rubricCriteria,
          checklistItems: checklistItems.filter((c) => c.label.trim()),
          weights,
          activityDate,
          status: 'active',
        });
        onSaved(id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '활동 저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {editingActivity ? '수업 활동 및 루브릭 수정' : '새 <인공지능 기초> 평가 활동 만들기'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              교과 영역을 선택하면 교육과정 성취기준과 추천 루브릭·체크리스트가 자동으로 채워집니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* 1. Domain & Basic Info */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              1. 교육과정 대단원 영역 선택
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {CURRICULUM_PRESETS.map((preset) => (
                <button
                  key={preset.domainCode}
                  type="button"
                  onClick={() => handleApplyDomainPreset(preset.domainCode)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    domainCode === preset.domainCode
                      ? 'border-blue-700 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                    영역 {preset.domainCode}
                  </div>
                  <div className="text-sm font-semibold mt-0.5">{preset.domainTitle}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  수업 활동 / 수행평가 제목 *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  수업 일자 *
                </label>
                <input
                  type="date"
                  required
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>

          {/* 2. Standards */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              2. 연계 성취기준 선택
            </label>
            <div className="grid grid-cols-1 gap-2">
              {currentPreset.standards.map((std) => {
                const checked = standards.includes(std.code);
                return (
                  <label
                    key={std.code}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      checked
                        ? 'border-blue-300 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStandard(std.code)}
                      className="mt-0.5 rounded border-slate-300 text-blue-700"
                    />
                    <span>
                      <strong className="font-mono-tabular mr-1.5">{std.code}</strong>
                      {std.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Evaluation Weights */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                3. 4대 평가 영역 반영 비율 (합계 100%)
              </label>
              <span
                className={`text-xs font-mono-tabular font-semibold ${
                  weightsSum === 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'
                }`}
              >
                합계: {weightsSum}%
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  ['rubric', '루브릭 수행평가'],
                  ['artifact', '실습 산출물'],
                  ['peerSelf', '자기·동료평가'],
                  ['attitude', '수업 참여 태도'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="block text-xs text-slate-500 mb-1">{label} (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[key]}
                    onChange={(e) =>
                      setWeights((prev) => ({
                        ...prev,
                        [key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 4. Rubric Criteria */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                4. 루브릭 채점 기준 ({rubricCriteria.length}/10)
              </label>
              <button
                type="button"
                onClick={handleAddCriterion}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                기준 추가
              </button>
            </div>
            <div className="space-y-3">
              {rubricCriteria.map((crit, idx) => (
                <div
                  key={crit.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      value={crit.title}
                      onChange={(e) => handleCriterionChange(idx, 'title', e.target.value)}
                      placeholder="평가 기준명"
                      className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-500">배점</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={crit.maxScore}
                        onChange={(e) =>
                          handleCriterionChange(idx, 'maxScore', Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-16 px-2 py-1.5 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    {rubricCriteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setRubricCriteria((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600"
                        aria-label="기준 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={crit.highDesc}
                      onChange={(e) => handleCriterionChange(idx, 'highDesc', e.target.value)}
                      placeholder="상(우수) 수준 설명"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                    <input
                      type="text"
                      value={crit.midDesc}
                      onChange={(e) => handleCriterionChange(idx, 'midDesc', e.target.value)}
                      placeholder="중(보통) 수준 설명"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                    <input
                      type="text"
                      value={crit.lowDesc}
                      onChange={(e) => handleCriterionChange(idx, 'lowDesc', e.target.value)}
                      placeholder="하(노력) 수준 설명"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Observation Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                5. 수업 관찰 체크리스트 ({checklistItems.length}/15)
              </label>
              <button
                type="button"
                onClick={handleAddChecklist}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                항목 추가
              </button>
            </div>
            <div className="space-y-2">
              {checklistItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) =>
                      setChecklistItems((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, label: e.target.value } : c))
                      )
                    }
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setChecklistItems((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1.5 text-slate-400 hover:text-red-600"
                    aria-label="체크 항목 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? '저장 중...' : editingActivity ? '변경사항 저장' : '평가 활동 시작하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
