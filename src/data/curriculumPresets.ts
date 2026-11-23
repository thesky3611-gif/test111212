import type { Activity, CurriculumDomainPreset, Evaluation, RubricLevel } from '../types';

export const CURRICULUM_PRESETS: CurriculumDomainPreset[] = [
  {
    domainCode: '01',
    domainTitle: '인공지능의 이해',
    description: '인공지능의 개념과 특성, 사회·직업 변화, 지능 에이전트의 개념과 실생활 사례 탐구',
    standards: [
      { code: '[12인기01-01]', text: '인공지능의 개념과 특성을 이해하고, 인공지능과 인공지능이 아닌 것을 비교·분석한다.' },
      { code: '[12인기01-02]', text: '인공지능이 개인의 삶, 사회와 직업을 어떻게 변화시키는지 탐색하고 중요성을 이해한다.' },
      { code: '[12인기01-03]', text: '인공지능과 지능 에이전트와의 관계를 파악하고 지능 에이전트의 개념을 이해한다.' },
      { code: '[12인기01-04]', text: '지능 에이전트가 실생활에 활용된 다양한 사례를 탐색하고 역할을 이해한다.' },
    ],
    defaultActivityTitle: '실생활 지능 에이전트 탐색 및 비교 분석',
    defaultRubric: [
      {
        id: 'crit_01_concept',
        title: 'AI 개념 및 비인공지능 비교 정확성',
        maxScore: 40,
        highDesc: '자율성·적응성 기준을 들어 AI와 일반 자동화 프로그램을 정확히 구분하고 근거를 제시함.',
        midDesc: 'AI와 일반 프로그램의 차이를 구분하나 일부 사례의 근거 설명이 다소 피상적임.',
        lowDesc: '단순 자동화 시스템과 AI를 혼동하며 비교 기준이 불명확함.',
      },
      {
        id: 'crit_01_agent',
        title: '지능 에이전트 구조 분석 (인식-추론-행동)',
        maxScore: 35,
        highDesc: '선택한 사례의 환경 인식 센서, 의사결정 과정, 출력 행동을 구조화하여 명확히 도식화함.',
        midDesc: '지능 에이전트 요소를 나열하였으나 요소 간 연결 관계 설명이 일부 누락됨.',
        lowDesc: '단순 기능 소개에 그쳐 에이전트 관점의 구조 분석이 부족함.',
      },
      {
        id: 'crit_01_impact',
        title: '사회·직업 변화 성찰 및 발표력',
        maxScore: 25,
        highDesc: '해당 기술이 관련 직무와 일상에 미치는 긍정·부정 영향을 균형 있게 제시하고 설득력 있게 발표함.',
        midDesc: '생활 변화 사례를 제시하나 직업 변화나 한계점에 대한 성찰이 다소 짧음.',
        lowDesc: '개인 의견이나 근거 제시가 미흡하고 발표 준비가 부족함.',
      },
    ],
    defaultChecklist: [
      { id: 'chk_01_1', label: 'AI vs 단순 소프트웨어 비교표 작성 완료' },
      { id: 'chk_01_2', label: '실생활 지능 에이전트 2종 이상 사례 조사' },
      { id: 'chk_01_3', label: '인식·판단·행동 흐름도 정리' },
      { id: 'chk_01_4', label: '모둠 토의 참여 및 상호 질의응답' },
    ],
    defaultWeights: { rubric: 40, artifact: 25, peerSelf: 20, attitude: 15 },
  },
  {
    domainCode: '02',
    domainTitle: '인공지능의 원리와 활용',
    description: '센서 인식, 컴퓨터 비전, 음성·언어 이해, 탐색 알고리즘, 지식 표현과 추론 실습',
    standards: [
      { code: '[12인기02-01]', text: '지능 에이전트가 다양한 센서를 통해 주변 환경 및 상황 정보를 탐지하여 인식하는 원리를 설명한다.' },
      { code: '[12인기02-02]', text: '이미지 인식·컴퓨터 비전 활용 분야를 탐색하고, 인간 시각 처리와 비교하여 한계를 설명한다.' },
      { code: '[12인기02-03]', text: '음성 인식과 언어 이해 기법의 동작 원리를 탐색하고 상호작용 발전 방향을 제시한다.' },
      { code: '[12인기02-04]', text: '퍼즐 또는 게임 문제를 해결하기 위한 탐색 과정을 상태 공간으로 구조화하여 표현한다.' },
      { code: '[12인기02-05]', text: '최상 우선 탐색 방법을 활용하여 최적 경로를 찾고 휴리스틱 정보의 중요성을 인식한다.' },
      { code: '[12인기02-06]', text: '규칙과 사실을 이용하여 지식을 표현하고, 추론을 통해 새로운 사실을 생성한다.' },
    ],
    defaultActivityTitle: '상태 공간 탐색 및 컴퓨터 비전 인식 원리 탐구',
    defaultRubric: [
      {
        id: 'crit_02_model',
        title: '탐색 트리 및 문제 구조화 완성도',
        maxScore: 40,
        highDesc: '초기·목표 상태와 연산자를 빠짐없이 정의하고, 휴리스틱 함수를 적용해 최적 경로를 논리적으로 도출함.',
        midDesc: '상태 공간을 구성하고 해를 찾았으나 불필요한 경로 탐색이나 휴리스틱 설명이 일부 부족함.',
        lowDesc: '상태 공간 표현이 불완전하여 탐색 절차를 끝까지 완수하지 못함.',
      },
      {
        id: 'crit_02_vision',
        title: '인식 원리 이해 및 한계 분석',
        maxScore: 35,
        highDesc: '픽셀·특징 추출 관점에서 컴퓨터 비전 원리를 설명하고 조명·가림 등 한계 상황을 실험으로 검증함.',
        midDesc: '인식 원리의 핵심 개념은 이해했으나 인간 시각과의 비교 분석이 피상적임.',
        lowDesc: '인식 도구를 단순 실행하는 수준에 머무름.',
      },
      {
        id: 'crit_02_improve',
        title: '실험 과정 기록 및 개선 시도',
        maxScore: 25,
        highDesc: '오류 사례를 스스로 포착하고 조건을 바꿔 재실험하며 원인을 체계적으로 기록함.',
        midDesc: '주어진 실험 절차를 충실히 수행하고 결과를 정리함.',
        lowDesc: '실험 기록이 누락되거나 결과 해석이 불분명함.',
      },
    ],
    defaultChecklist: [
      { id: 'chk_02_1', label: '상태 공간 트리(초기/중간/목표 상태) 작성' },
      { id: 'chk_02_2', label: '휴리스틱 평가 기준 직접 설정' },
      { id: 'chk_02_3', label: '컴퓨터 비전 오인식 테스트 사례 3건 수집' },
      { id: 'chk_02_4', label: '실험 보고서 정해진 시간 내 제출' },
    ],
    defaultWeights: { rubric: 45, artifact: 30, peerSelf: 10, attitude: 15 },
  },
  {
    domainCode: '03',
    domainTitle: '데이터와 기계학습',
    description: '데이터의 가치와 전처리, 지도·비지도 학습 비교, 분류·군집·예측 모델 구현 및 평가',
    standards: [
      { code: '[12인기03-01]', text: '기계학습의 개념을 이해하고, 지도학습과 비지도학습의 차이를 비교·설명한다.' },
      { code: '[12인기03-02]', text: '분류, 군집, 예측 등 기계학습의 활용 분야를 탐색하고 문제에 적합한 모델을 설계한다.' },
      { code: '[12인기03-03]', text: '문제 해결을 위한 데이터를 수집·전처리하고 기계학습 모델을 학습시켜 성능을 평가·개선한다.' },
    ],
    defaultActivityTitle: '티처블 머신/데이터 기반 분류 모델 제작 및 성능 개선',
    defaultRubric: [
      {
        id: 'crit_03_data',
        title: '학습 데이터의 다양성·품질 및 편향 점검',
        maxScore: 35,
        highDesc: '클래스별 균형 잡힌 데이터를 충분량 수집하고 배경·각도 편향을 사전 점검하여 정제함.',
        midDesc: '기본 데이터를 수집해 모델을 학습시켰으나 데이터 다양성 검증이 다소 부족함.',
        lowDesc: '데이터 수량이 부족하거나 특정 조건에 편향되어 모델 일반화 성능이 떨어짐.',
      },
      {
        id: 'crit_03_eval',
        title: '모델 성능 평가 및 하이퍼파라미터/데이터 개선',
        maxScore: 40,
        highDesc: '테스트 데이터로 정확도·오분류 사례를 분석하고, 데이터 보강·에포크 조정 등 근거 있는 개선을 반복 수행함.',
        midDesc: '모델 학습 및 테스트 결과를 확인하고 1회 이상 수정을 시도함.',
        lowDesc: '초기 학습 결과만 확인하고 성능 평가 및 개선 절차를 수행하지 못함.',
      },
      {
        id: 'crit_03_apply',
        title: '실생활 문제 해결 적합성 및 설명력',
        maxScore: 25,
        highDesc: '지도학습의 필요성과 모델 활용 시나리오를 명확히 제시하며 실제 적용 가능성을 설득력 있게 설명함.',
        midDesc: '주제와 모델의 연결은 적절하나 실제 적용 시 고려사항 설명이 간략함.',
        lowDesc: '실생활 문제와의 연계성이 낮고 모델 설명이 부족함.',
      },
    ],
    defaultChecklist: [
      { id: 'chk_03_1', label: '학습/테스트 데이터셋 분리 구성' },
      { id: 'chk_03_2', label: '클래스별 편향 데이터 점검 및 수정' },
      { id: 'chk_03_3', label: '오분류 테스트 케이스 2건 이상 기록' },
      { id: 'chk_03_4', label: '모델 개선 전후 정확도 비교표 작성' },
    ],
    defaultWeights: { rubric: 40, artifact: 35, peerSelf: 10, attitude: 15 },
  },
  {
    domainCode: '04',
    domainTitle: '인공지능의 사회적 영향',
    description: 'AI 발전과 사회 변화, 알고리즘 편향성, 윤리적 딜레마 분석 및 인간-AI 공존 방안 도출',
    standards: [
      { code: '[12인기04-01]', text: '인공지능의 발전으로 인한 사회 변화를 살펴보고, 인공지능으로 해결할 수 있는 사회적 문제를 분석한다.' },
      { code: '[12인기04-02]', text: '인공지능에 의해 변화하는 인간의 삶과 직업의 양상에 대해 이해하고 진로를 탐색한다.' },
      { code: '[12인기04-03]', text: '인공지능에 대한 비판적 자세를 바탕으로 인공지능과 인간의 공존 방안을 도출한다.' },
      { code: '[12인기04-04]', text: '인공지능의 활용 사례와 윤리적 딜레마 상황을 인공지능 윤리 관점에서 분석한다.' },
    ],
    defaultActivityTitle: 'AI 알고리즘 편향·윤리 딜레마 토론 및 가이드라인 설계',
    defaultRubric: [
      {
        id: 'crit_04_ethics',
        title: 'AI 윤리 원칙 적용 및 쟁점 분석력',
        maxScore: 40,
        highDesc: '공정성·투명성·책임성 관점에서 딜레마의 이해관계자별 입장을 다각도로 분석하고 구체적 근거를 제시함.',
        midDesc: '윤리적 문제점을 파악하고 기본적인 윤리 원칙과 연결하여 설명함.',
        lowDesc: '단편적 찬반 의견만 제시하며 윤리 원칙에 기반한 분석이 미흡함.',
      },
      {
        id: 'crit_04_solution',
        title: '인간-AI 공존 방안 및 가이드라인 구체성',
        maxScore: 35,
        highDesc: '기술적 보완책과 제도·사용자 규범을 아우르는 실현 가능한 공존 가이드라인을 창의적으로 제안함.',
        midDesc: '공존 방안을 제시하였으나 실행 주체나 구체적 절차가 다소 일반적임.',
        lowDesc: '추상적인 선언에 그쳐 구체적인 해결 방안이 부족함.',
      },
      {
        id: 'crit_04_collab',
        title: '모둠 토의 경청·합의 도출 태도',
        maxScore: 25,
        highDesc: '타인의 반론을 경청하고 논리적으로 조율하여 모둠의 최종 합의안을 완성하는 데 핵심 기여함.',
        midDesc: '모둠 토의에 성실히 참여하고 맡은 역할을 수행함.',
        lowDesc: '토의 참여가 소극적이거나 타인의 의견과 조율하려는 노력이 부족함.',
      },
    ],
    defaultChecklist: [
      { id: 'chk_04_1', label: '실제 AI 윤리/편향 사례 1건 이상 조사' },
      { id: 'chk_04_2', label: '이해관계자별 관점 정리표 작성' },
      { id: 'chk_04_3', label: '우리 반 AI 활용 윤리 수칙 3조항 제안' },
      { id: 'chk_04_4', label: '모둠 동료 피드백 성실 작성' },
    ],
    defaultWeights: { rubric: 35, artifact: 20, peerSelf: 25, attitude: 20 },
  },
];

export const ATTITUDE_ACTIONS = [
  { type: 'participate' as const, label: '발표/참여', delta: 5 },
  { type: 'question' as const, label: '핵심 질문', delta: 5 },
  { type: 'collab' as const, label: '모둠 협업', delta: 5 },
  { type: 'help' as const, label: '동료 도움', delta: 5 },
  { type: 'caution' as const, label: '집중 주의', delta: -5 },
];

export function calculateNeisBytes(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    if (ch === '\n') {
      bytes += 2;
    } else if (ch.charCodeAt(0) > 127) {
      bytes += 3;
    } else {
      bytes += 1;
    }
  }
  return bytes;
}

export function clampScore(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val * 10) / 10));
}

export function getLevelMultiplier(level: RubricLevel | undefined): number {
  if (level === 'high') return 1;
  if (level === 'mid') return 0.75;
  if (level === 'low') return 0.5;
  return 0;
}

export function getLevelLabelKo(level: RubricLevel | undefined): string {
  if (level === 'high') return '상 (우수)';
  if (level === 'mid') return '중 (보통)';
  if (level === 'low') return '하 (노력요함)';
  return '미평가';
}

export function computeRubricPercentage(activity: Activity, rubricScores: Record<string, RubricLevel>): number {
  const totalMax = activity.rubricCriteria.reduce((acc, c) => acc + c.maxScore, 0);
  if (totalMax <= 0) return 0;
  const earned = activity.rubricCriteria.reduce((acc, c) => {
    const level = rubricScores[c.id];
    return acc + c.maxScore * getLevelMultiplier(level);
  }, 0);
  return clampScore((earned / totalMax) * 100);
}

export function computeTotalScore(
  activity: Activity,
  evaluation: Pick<Evaluation, 'rubricScores' | 'artifact' | 'peerSelf' | 'attitudeScore'>
): number {
  const rubricPct = computeRubricPercentage(activity, evaluation.rubricScores);
  const artifactPct = clampScore(evaluation.artifact.score);
  const peerSelfPct = clampScore((evaluation.peerSelf.selfScore + evaluation.peerSelf.peerScore) / 2);
  const attitudePct = clampScore(evaluation.attitudeScore);

  const total =
    (rubricPct * activity.weights.rubric +
      artifactPct * activity.weights.artifact +
      peerSelfPct * activity.weights.peerSelf +
      attitudePct * activity.weights.attitude) /
    100;

  return clampScore(total);
}

export function sanitizeId(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.slice(0, 120) || `id_${Date.now()}`;
}

export function createEmptyEvaluation(
  teacherId: string,
  classId: string,
  activityId: string,
  studentId: string
): Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    teacherId,
    classId,
    activityId,
    studentId,
    rubricScores: {},
    checklistChecked: [],
    attitudeLogs: [],
    attitudeScore: 80,
    artifact: {
      score: 0,
      summary: '',
      feedback: '',
    },
    peerSelf: {
      selfScore: 0,
      selfNote: '',
      peerScore: 0,
      peerNote: '',
    },
    observationMemo: '',
    aiFeedbackDraft: '',
    aiSeTeukDraft: '',
    totalScore: 0,
  };
}
