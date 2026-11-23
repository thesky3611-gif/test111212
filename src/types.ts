export type DomainCode = '01' | '02' | '03' | '04';

export type RubricLevel = 'high' | 'mid' | 'low';

export interface RubricCriterion {
  id: string;
  title: string;
  maxScore: number;
  highDesc: string;
  midDesc: string;
  lowDesc: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ActivityWeights {
  rubric: number;
  artifact: number;
  peerSelf: number;
  attitude: number;
}

export interface TeacherProfile {
  teacherId: string;
  displayName: string;
  email: string;
  schoolName?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ClassGroup {
  id: string;
  teacherId: string;
  name: string;
  semester: string;
  subject: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Student {
  id: string;
  teacherId: string;
  classId: string;
  studentNumber: string;
  name: string;
  groupName?: string;
  memo?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Activity {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  domainCode: DomainCode;
  domainTitle: string;
  standards: string[];
  rubricCriteria: RubricCriterion[];
  checklistItems: ChecklistItem[];
  weights: ActivityWeights;
  activityDate: string;
  status: 'active' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AttitudeLog {
  id: string;
  type: 'participate' | 'question' | 'collab' | 'help' | 'caution';
  label: string;
  delta: number;
  timestamp: string;
}

export interface ArtifactEvaluation {
  score: number;
  summary: string;
  feedback: string;
}

export interface PeerSelfEvaluation {
  selfScore: number;
  selfNote: string;
  peerScore: number;
  peerNote: string;
}

export interface Evaluation {
  id: string;
  teacherId: string;
  classId: string;
  activityId: string;
  studentId: string;
  rubricScores: Record<string, RubricLevel>;
  checklistChecked: string[];
  attitudeLogs: AttitudeLog[];
  attitudeScore: number;
  artifact: ArtifactEvaluation;
  peerSelf: PeerSelfEvaluation;
  observationMemo: string;
  aiFeedbackDraft: string;
  aiSeTeukDraft: string;
  totalScore: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CurriculumStandard {
  code: string;
  text: string;
}

export interface CurriculumDomainPreset {
  domainCode: DomainCode;
  domainTitle: string;
  description: string;
  standards: CurriculumStandard[];
  defaultActivityTitle: string;
  defaultRubric: RubricCriterion[];
  defaultChecklist: ChecklistItem[];
  defaultWeights: ActivityWeights;
}
