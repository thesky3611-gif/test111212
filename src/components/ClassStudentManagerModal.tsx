import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, Upload, Users, X } from 'lucide-react';
import {
  batchImportStudents,
  createClassGroup,
  createStudent,
  deleteStudent,
  updateStudent,
} from '../lib/firestoreService';
import type { ClassGroup, Student } from '../types';

interface Props {
  teacherId: string;
  classes: ClassGroup[];
  activeClass: ClassGroup | null;
  students: Student[];
  onSelectClass: (classId: string) => void;
  onClassCreated: (classId: string) => void;
  onClose: () => void;
}

export function ClassStudentManagerModal({
  teacherId,
  classes,
  activeClass,
  students,
  onSelectClass,
  onClassCreated,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'students' | 'bulk' | 'newClass'>(
    activeClass ? 'students' : 'newClass'
  );

  const classStudents = useMemo(
    () => (activeClass ? students.filter((s) => s.classId === activeClass.id) : []),
    [students, activeClass]
  );

  // New class form
  const [className, setClassName] = useState('');
  const [semester, setSemester] = useState('2026학년도 2학기');
  const [subject, setSubject] = useState('인공지능 기초');

  // Single student form
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [groupName, setGroupName] = useState('');

  // Bulk CSV paste
  const [bulkText, setBulkText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Inline student edit
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');

  const parsedBulkRows = useMemo(() => {
    return bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t]/).map((p) => p.trim());
        return {
          studentNumber: parts[0] ?? '',
          name: parts[1] ?? '',
          groupName: parts[2] ?? '',
        };
      })
      .filter((r) => r.studentNumber && r.name);
  }, [bulkText]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const id = await createClassGroup(teacherId, {
        name: className.trim(),
        semester: semester.trim(),
        subject: subject.trim(),
      });
      onClassCreated(id);
      setClassName('');
      setTab('students');
      setFeedbackMsg('새 학급이 생성되었습니다. 이제 학생 명단을 등록하세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !studentNumber.trim() || !studentName.trim()) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      await createStudent(teacherId, activeClass.id, {
        studentNumber: studentNumber.trim(),
        name: studentName.trim(),
        groupName: groupName.trim(),
      });
      setStudentNumber('');
      setStudentName('');
      setFeedbackMsg('학생이 등록되었습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!activeClass || parsedBulkRows.length === 0) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const added = await batchImportStudents(teacherId, activeClass.id, parsedBulkRows);
      setBulkText('');
      setTab('students');
      setFeedbackMsg(`${added}명의 학생이 일괄 등록되었습니다.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!activeClass) return;
    await deleteStudent(teacherId, activeClass.id, studentId);
  };

  const handleStartEdit = (st: Student) => {
    setEditingStudentId(st.id);
    setEditNumber(st.studentNumber);
    setEditName(st.name);
    setEditGroup(st.groupName ?? '');
    setFeedbackMsg(null);
  };

  const handleSaveEdit = async (studentId: string) => {
    if (!activeClass || !editNumber.trim() || !editName.trim()) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      await updateStudent(teacherId, activeClass.id, studentId, {
        studentNumber: editNumber.trim(),
        name: editName.trim(),
        groupName: editGroup.trim(),
      });
      setEditingStudentId(null);
      setFeedbackMsg('학생 정보가 수정되었습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">학급 및 학생 명단 관리</h2>
            {classes.length > 0 && activeClass ? (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  선택 학급:
                </span>
                <select
                  value={activeClass.id}
                  onChange={(e) => onSelectClass(e.target.value)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.semester})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                새 학급을 먼저 생성하세요
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            disabled={!activeClass}
            onClick={() => setTab('students')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === 'students'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40'
            }`}
          >
            학생 명단 ({classStudents.length}명)
          </button>
          <button
            type="button"
            disabled={!activeClass}
            onClick={() => setTab('bulk')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === 'bulk'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40'
            }`}
          >
            엑셀/CSV 일괄 붙여넣기
          </button>
          <button
            type="button"
            onClick={() => setTab('newClass')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === 'newClass'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + 새 학급 추가
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {feedbackMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
              {feedbackMsg}
            </div>
          )}

          {tab === 'newClass' && (
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  학급명 *
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="예: 2학년 4반"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    학년도 / 학기
                  </label>
                  <input
                    type="text"
                    required
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    교과목명
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
              >
                {submitting ? '생성 중...' : '학급 생성하기'}
              </button>
            </form>
          )}

          {tab === 'students' && activeClass && (
            <div className="space-y-5">
              <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-500 mb-1">학번 *</label>
                  <input
                    type="text"
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="20301"
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs text-slate-500 mb-1">이름 *</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-500 mb-1">모둠 (선택)</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="1모둠"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg inline-flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    추가
                  </button>
                </div>
              </form>

              {classStudents.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Users className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {activeClass.name}에 아직 등록된 학생이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">학번</th>
                        <th className="text-left px-4 py-2.5 font-medium">이름</th>
                        <th className="text-left px-4 py-2.5 font-medium">모둠</th>
                        <th className="text-right px-4 py-2.5 font-medium">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {classStudents.map((st) => {
                        const isEditing = editingStudentId === st.id;
                        return (
                          <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2 font-mono-tabular text-slate-600 dark:text-slate-300">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editNumber}
                                  onChange={(e) => setEditNumber(e.target.value)}
                                  className="w-24 px-2 py-1 text-xs font-mono-tabular rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                />
                              ) : (
                                st.studentNumber
                              )}
                            </td>
                            <td className="px-4 py-2 font-medium">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-28 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                />
                              ) : (
                                st.name
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-500">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editGroup}
                                  onChange={(e) => setEditGroup(e.target.value)}
                                  placeholder="모둠"
                                  className="w-24 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                                />
                              ) : (
                                st.groupName || '-'
                              )}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={submitting || !editNumber.trim() || !editName.trim()}
                                    onClick={() => handleSaveEdit(st.id)}
                                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 rounded"
                                    aria-label="저장"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStudentId(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                                    aria-label="취소"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(st)}
                                    className="p-1.5 text-slate-400 hover:text-blue-700 rounded"
                                    aria-label={`${st.name} 수정`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStudent(st.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                    aria-label={`${st.name} 삭제`}
                                  >
                                    <Trash2 className="w-4 h-4" />
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

          {tab === 'bulk' && activeClass && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                엑셀이나 구글 시트에서 <strong>학번 · 이름 · 모둠</strong> 열을 복사해 붙여넣거나 쉼표(,)로 구분해 입력하세요.
              </p>
              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'20401, 김민서, 1모둠\n20402, 박준혁, 1모둠\n20403, 이지은, 2모둠'}
                className="w-full p-3 text-sm font-mono-tabular rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono-tabular">
                  인식된 학생 수: {parsedBulkRows.length}명
                </span>
                <button
                  type="button"
                  disabled={submitting || parsedBulkRows.length === 0}
                  onClick={handleBulkImport}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Upload className="w-4 h-4" />
                  {submitting ? '등록 중...' : `${parsedBulkRows.length}명 일괄 등록`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
