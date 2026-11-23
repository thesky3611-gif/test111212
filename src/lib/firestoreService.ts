import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  clampScore,
  computeTotalScore,
  createEmptyEvaluation,
  CURRICULUM_PRESETS,
  sanitizeId,
} from '../data/curriculumPresets';
import type {
  Activity,
  AttitudeLog,
  ClassGroup,
  Evaluation,
  RubricLevel,
  Student,
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';

function trunc(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

export async function ensureTeacherProfile(user: User): Promise<void> {
  const path = `teachers/${user.uid}`;
  const ref = doc(db, 'teachers', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        teacherId: user.uid,
        displayName: trunc(user.displayName || user.email?.split('@')[0] || '교사', 100),
        email: trunc(user.email || 'teacher@school.kr', 200),
        schoolName: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: trunc(user.displayName || snap.data().displayName || '교사', 100),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeClasses(
  teacherId: string,
  callback: (classes: ClassGroup[]) => void
): Unsubscribe {
  const path = `teachers/${teacherId}/classes`;
  const q = query(
    collection(db, 'teachers', teacherId, 'classes'),
    where('teacherId', '==', teacherId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ClassGroup[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ClassGroup, 'id'>),
        }))
        .sort((a, b) => b.id.localeCompare(a.id));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createClassGroup(
  teacherId: string,
  input: { name: string; semester: string; subject: string }
): Promise<string> {
  const classId = sanitizeId(`cls_${Date.now()}`);
  const path = `teachers/${teacherId}/classes/${classId}`;
  try {
    await setDoc(doc(db, 'teachers', teacherId, 'classes', classId), {
      teacherId,
      name: trunc(input.name, 60) || '새 학급',
      semester: trunc(input.semester, 40) || '2026학년도 2학기',
      subject: trunc(input.subject, 60) || '인공지능 기초',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return classId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteClassGroup(teacherId: string, classId: string): Promise<void> {
  const path = `teachers/${teacherId}/classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'teachers', teacherId, 'classes', classId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeStudents(
  teacherId: string,
  classId: string,
  callback: (students: Student[]) => void
): Unsubscribe {
  const path = `teachers/${teacherId}/classes/${classId}/students`;
  const q = query(
    collection(db, 'teachers', teacherId, 'classes', classId, 'students'),
    where('teacherId', '==', teacherId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Student[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Student, 'id'>),
        }))
        .filter((s) => s.classId === classId)
        .sort((a, b) => a.studentNumber.localeCompare(b.studentNumber, 'ko', { numeric: true }));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createStudent(
  teacherId: string,
  classId: string,
  input: { studentNumber: string; name: string; groupName?: string; memo?: string }
): Promise<string> {
  const studentId = sanitizeId(`stu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const path = `teachers/${teacherId}/classes/${classId}/students/${studentId}`;
  try {
    await setDoc(doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId), {
      teacherId,
      classId,
      studentNumber: trunc(input.studentNumber, 20),
      name: trunc(input.name, 50),
      groupName: trunc(input.groupName, 40),
      memo: trunc(input.memo, 300),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return studentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function batchImportStudents(
  teacherId: string,
  classId: string,
  rows: { studentNumber: string; name: string; groupName?: string }[]
): Promise<number> {
  const path = `teachers/${teacherId}/classes/${classId}/students`;
  try {
    const batch = writeBatch(db);
    let count = 0;
    const baseTs = Date.now();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.studentNumber.trim() || !row.name.trim()) continue;
      const studentId = sanitizeId(`stu_${baseTs}_${i}`);
      const ref = doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId);
      batch.set(ref, {
        teacherId,
        classId,
        studentNumber: trunc(row.studentNumber, 20),
        name: trunc(row.name, 50),
        groupName: trunc(row.groupName, 40),
        memo: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      count++;
    }
    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateStudent(
  teacherId: string,
  classId: string,
  studentId: string,
  input: { studentNumber: string; name: string; groupName?: string; memo?: string }
): Promise<void> {
  const path = `teachers/${teacherId}/classes/${classId}/students/${studentId}`;
  const studentNumber = trunc(input.studentNumber, 20);
  const name = trunc(input.name, 50);
  if (!studentNumber || !name) {
    throw new Error('학번과 이름은 비워둘 수 없습니다.');
  }
  try {
    const payload: Record<string, unknown> = {
      studentNumber,
      name,
      groupName: trunc(input.groupName, 40),
      updatedAt: serverTimestamp(),
    };
    if (input.memo !== undefined) {
      payload.memo = trunc(input.memo, 300);
    }
    await updateDoc(
      doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId),
      payload
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudent(
  teacherId: string,
  classId: string,
  studentId: string
): Promise<void> {
  const path = `teachers/${teacherId}/classes/${classId}/students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'teachers', teacherId, 'classes', classId, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeActivities(
  teacherId: string,
  classId: string,
  callback: (activities: Activity[]) => void
): Unsubscribe {
  const path = `teachers/${teacherId}/activities`;
  const q = query(
    collection(db, 'teachers', teacherId, 'activities'),
    where('teacherId', '==', teacherId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Activity[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Activity, 'id'>),
        }))
        .filter((a) => a.classId === classId)
        .sort((a, b) => b.activityDate.localeCompare(a.activityDate));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createActivity(
  teacherId: string,
  input: Omit<Activity, 'id' | 'teacherId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const activityId = sanitizeId(`act_${Date.now()}`);
  const path = `teachers/${teacherId}/activities/${activityId}`;
  try {
    await setDoc(doc(db, 'teachers', teacherId, 'activities', activityId), {
      teacherId,
      classId: input.classId,
      title: trunc(input.title, 120),
      domainCode: input.domainCode,
      domainTitle: trunc(input.domainTitle, 60),
      standards: input.standards.slice(0, 10).map((s) => trunc(s, 30)),
      rubricCriteria: input.rubricCriteria.slice(0, 10),
      checklistItems: input.checklistItems.slice(0, 15),
      weights: input.weights,
      activityDate: trunc(input.activityDate, 20),
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return activityId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateActivity(
  teacherId: string,
  activityId: string,
  input: Partial<Omit<Activity, 'id' | 'teacherId' | 'classId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const path = `teachers/${teacherId}/activities/${activityId}`;
  try {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (input.title !== undefined) payload.title = trunc(input.title, 120);
    if (input.domainCode !== undefined) payload.domainCode = input.domainCode;
    if (input.domainTitle !== undefined) payload.domainTitle = trunc(input.domainTitle, 60);
    if (input.standards !== undefined)
      payload.standards = input.standards.slice(0, 10).map((s) => trunc(s, 30));
    if (input.rubricCriteria !== undefined)
      payload.rubricCriteria = input.rubricCriteria.slice(0, 10);
    if (input.checklistItems !== undefined)
      payload.checklistItems = input.checklistItems.slice(0, 15);
    if (input.weights !== undefined) payload.weights = input.weights;
    if (input.activityDate !== undefined) payload.activityDate = trunc(input.activityDate, 20);
    if (input.status !== undefined) payload.status = input.status;

    await updateDoc(doc(db, 'teachers', teacherId, 'activities', activityId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteActivity(teacherId: string, activityId: string): Promise<void> {
  const path = `teachers/${teacherId}/activities/${activityId}`;
  try {
    await deleteDoc(doc(db, 'teachers', teacherId, 'activities', activityId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeEvaluations(
  teacherId: string,
  activityId: string,
  callback: (evalsByStudent: Record<string, Evaluation>) => void
): Unsubscribe {
  const path = `teachers/${teacherId}/evaluations`;
  const q = query(
    collection(db, 'teachers', teacherId, 'evaluations'),
    where('teacherId', '==', teacherId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, Evaluation> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data() as Omit<Evaluation, 'id'>;
        if (data.activityId === activityId) {
          map[data.studentId] = {
            id: d.id,
            ...data,
          };
        }
      });
      callback(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function upsertEvaluation(
  teacherId: string,
  activity: Activity,
  studentId: string,
  data: Omit<Evaluation, 'id' | 'teacherId' | 'classId' | 'activityId' | 'studentId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const evalId = sanitizeId(`${activity.id}_${studentId}`);
  const path = `teachers/${teacherId}/evaluations/${evalId}`;
  const ref = doc(db, 'teachers', teacherId, 'evaluations', evalId);

  const sanitizedAttitudeLogs = data.attitudeLogs.slice(-50);
  const sanitizedChecklist = data.checklistChecked.slice(0, 15).map((id) => trunc(id, 64));
  const attitudeScore = clampScore(data.attitudeScore);
  const artifact = {
    score: clampScore(data.artifact.score),
    summary: trunc(data.artifact.summary, 500),
    feedback: trunc(data.artifact.feedback, 1000),
  };
  const peerSelf = {
    selfScore: clampScore(data.peerSelf.selfScore),
    selfNote: trunc(data.peerSelf.selfNote, 600),
    peerScore: clampScore(data.peerSelf.peerScore),
    peerNote: trunc(data.peerSelf.peerNote, 600),
  };
  const totalScore = computeTotalScore(activity, {
    rubricScores: data.rubricScores,
    artifact,
    peerSelf,
    attitudeScore,
  });

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        teacherId,
        classId: activity.classId,
        activityId: activity.id,
        studentId,
        rubricScores: data.rubricScores,
        checklistChecked: sanitizedChecklist,
        attitudeLogs: sanitizedAttitudeLogs,
        attitudeScore,
        artifact,
        peerSelf,
        observationMemo: trunc(data.observationMemo, 1500),
        aiFeedbackDraft: trunc(data.aiFeedbackDraft, 2000),
        aiSeTeukDraft: trunc(data.aiSeTeukDraft, 2000),
        totalScore,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        rubricScores: data.rubricScores,
        checklistChecked: sanitizedChecklist,
        attitudeLogs: sanitizedAttitudeLogs,
        attitudeScore,
        artifact,
        peerSelf,
        observationMemo: trunc(data.observationMemo, 1500),
        aiFeedbackDraft: trunc(data.aiFeedbackDraft, 2000),
        aiSeTeukDraft: trunc(data.aiSeTeukDraft, 2000),
        totalScore,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function quickLogAttitude(
  teacherId: string,
  activity: Activity,
  studentId: string,
  currentEval: Evaluation | undefined,
  action: { type: AttitudeLog['type']; label: string; delta: number }
): Promise<void> {
  const base = currentEval ?? {
    ...createEmptyEvaluation(teacherId, activity.classId, activity.id, studentId),
    id: sanitizeId(`${activity.id}_${studentId}`),
  };
  const newLog: AttitudeLog = {
    id: `att_${Date.now()}`,
    type: action.type,
    label: action.label,
    delta: action.delta,
    timestamp: new Date().toISOString(),
  };
  const updatedLogs = [...base.attitudeLogs, newLog].slice(-50);
  const updatedAttitudeScore = clampScore(base.attitudeScore + action.delta);

  await upsertEvaluation(teacherId, activity, studentId, {
    rubricScores: base.rubricScores,
    checklistChecked: base.checklistChecked,
    attitudeLogs: updatedLogs,
    attitudeScore: updatedAttitudeScore,
    artifact: base.artifact,
    peerSelf: base.peerSelf,
    observationMemo: base.observationMemo,
    aiFeedbackDraft: base.aiFeedbackDraft,
    aiSeTeukDraft: base.aiSeTeukDraft,
    totalScore: base.totalScore,
  });
}

export async function seedSampleClassroomData(teacherId: string): Promise<{
  classId: string;
  activityId: string;
}> {
  const classId = await createClassGroup(teacherId, {
    name: '2학년 3반 (샘플)',
    semester: '2026학년도 2학기',
    subject: '인공지능 기초',
  });

  const sampleStudents = [
    { studentNumber: '20301', name: '김도윤', groupName: '1모둠' },
    { studentNumber: '20302', name: '이서연', groupName: '1모둠' },
    { studentNumber: '20303', name: '박지후', groupName: '1모둠' },
    { studentNumber: '20304', name: '최하은', groupName: '2모둠' },
    { studentNumber: '20305', name: '정민준', groupName: '2모둠' },
    { studentNumber: '20306', name: '강수아', groupName: '2모둠' },
  ];

  const studentIds: string[] = [];
  const baseTs = Date.now();
  const batch = writeBatch(db);
  sampleStudents.forEach((s, idx) => {
    const sid = sanitizeId(`stu_${baseTs}_${idx}`);
    studentIds.push(sid);
    batch.set(doc(db, 'teachers', teacherId, 'classes', classId, 'students', sid), {
      teacherId,
      classId,
      studentNumber: s.studentNumber,
      name: s.name,
      groupName: s.groupName,
      memo: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();

  const preset = CURRICULUM_PRESETS[2]; // 03. 데이터와 기계학습
  const activityId = await createActivity(teacherId, {
    classId,
    title: preset.defaultActivityTitle,
    domainCode: preset.domainCode,
    domainTitle: preset.domainTitle,
    standards: preset.standards.map((s) => s.code),
    rubricCriteria: preset.defaultRubric,
    checklistItems: preset.defaultChecklist,
    weights: preset.defaultWeights,
    activityDate: new Date().toISOString().slice(0, 10),
    status: 'active',
  });

  // Seed 2 realistic partial evaluations so the teacher sees live examples immediately
  const sampleActivityObj: Activity = {
    id: activityId,
    teacherId,
    classId,
    title: preset.defaultActivityTitle,
    domainCode: preset.domainCode,
    domainTitle: preset.domainTitle,
    standards: preset.standards.map((s) => s.code),
    rubricCriteria: preset.defaultRubric,
    checklistItems: preset.defaultChecklist,
    weights: preset.defaultWeights,
    activityDate: new Date().toISOString().slice(0, 10),
    status: 'active',
  };

  const eval1Rubric: Record<string, RubricLevel> = {
    crit_03_data: 'high',
    crit_03_eval: 'high',
    crit_03_apply: 'mid',
  };
  await upsertEvaluation(teacherId, sampleActivityObj, studentIds[0], {
    rubricScores: eval1Rubric,
    checklistChecked: ['chk_03_1', 'chk_03_2', 'chk_03_3', 'chk_03_4'],
    attitudeLogs: [
      { id: 'att_s1', type: 'participate', label: '발표/참여', delta: 5, timestamp: new Date().toISOString() },
      { id: 'att_s2', type: 'collab', label: '모둠 협업', delta: 5, timestamp: new Date().toISOString() },
    ],
    attitudeScore: 90,
    artifact: {
      score: 92,
      summary: '교내 급식 잔반량 분류 이미지 모델(배경 조명 편향 보완 전후 정확도 74% -> 91%)',
      feedback: '조명 조건별 데이터 균형을 맞춘 뒤 오분류 원인을 정확히 해석함.',
    },
    peerSelf: {
      selfScore: 90,
      selfNote: '초기 모델이 어두운 배경을 오인식하는 원인을 데이터 편향에서 찾아 데이터를 추가 촬영함.',
      peerScore: 95,
      peerNote: '모둠원들과 데이터 라벨링 기준을 정리해 주어 모델 완성도가 높아짐.',
    },
    observationMemo: '데이터 전처리 과정에서 배경 편향 문제를 스스로 발견하고 테스트 데이터셋을 재설계하여 발표 시 근거를 명확히 제시함.',
    aiFeedbackDraft: '',
    aiSeTeukDraft: '',
    totalScore: 0,
  });

  const eval2Rubric: Record<string, RubricLevel> = {
    crit_03_data: 'mid',
    crit_03_eval: 'high',
    crit_03_apply: 'high',
  };
  await upsertEvaluation(teacherId, sampleActivityObj, studentIds[1], {
    rubricScores: eval2Rubric,
    checklistChecked: ['chk_03_1', 'chk_03_3', 'chk_03_4'],
    attitudeLogs: [
      { id: 'att_s3', type: 'question', label: '핵심 질문', delta: 5, timestamp: new Date().toISOString() },
    ],
    attitudeScore: 85,
    artifact: {
      score: 88,
      summary: '재활용 플라스틱/페트병 라벨 유무 판별 분류기 및 혼동행렬 분석 보고서',
      feedback: '투명 페트병 오인식 사례를 도출하고 실생활 분리배출 앱 연동 시나리오를 구체화함.',
    },
    peerSelf: {
      selfScore: 85,
      selfNote: '에포크 수 변화에 따른 과적합 현상을 비교하면서 적절한 학습 횟수를 탐색함.',
      peerScore: 90,
      peerNote: '실생활 적용 아이디어와 발표 자료 정리를 주도적으로 담당함.',
    },
    observationMemo: '지도학습 모델의 과적합 징후에 대해 핵심 질문을 던지고, 실제 분리배출 환경에서의 활용 한계를 비판적으로 검토함.',
    aiFeedbackDraft: '',
    aiSeTeukDraft: '',
    totalScore: 0,
  });

  return { classId, activityId };
}
