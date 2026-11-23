# AI-Class Eval Studio

고등학교 **<인공지능 기초>** 교과 수업의 수행평가(루브릭·관찰 체크리스트), 실습 산출물, 자기·동료평가, 수업 참여도·태도를 통합 관리하고, Gemini AI 기반으로 학생 피드백 초안과 학교생활기록부 과목별 세부능력 및 특기사항(세특) 초안을 작성하는 교사용 웹 애플리케이션입니다.

## 주요 기능

- **교사 인증 및 학급별 데이터 격리**: Firebase Google 로그인 및 학급별 학생/평가 활동 분리 관리
- **실시간 통합 평가표**: 학번·이름·모둠 및 산출물·자기·동료·태도 점수 인라인 수정, 원클릭 수업 태도 기록, 실시간 총점 계산
- **4대 평가 통합 입력**: 2022 개정 교육과정 `<인공지능 기초>` 4개 영역 및 성취기준 기반 루브릭 평가, 관찰 체크리스트, 산출물 피드백, 자기·동료평가(CSV 일괄 가져오기 지원)
- **AI 피드백·세특 작성 스튜디오**: 서버 측 Gemini API를 활용한 근거 기반 형성평가 피드백 및 NEIS 바이트 계산 포함 세특 초안 생성
- **성취도 요약 및 내보내기**: 영역/모둠별 성취도 요약 대시보드 및 평가 결과 CSV 다운로드

## 기술 스택

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express (`tsx server.ts`)
- **Database & Auth**: Firebase Authentication (Google), Cloud Firestore (`firestore.rules`)
- **AI**: Google GenAI SDK (`@google/genai`)

## 로컬 실행 방법

1. 의존성 설치
   ```bash
   npm install
   ```

2. 환경 변수 설정
   `.env.example`을 참고하여 `.env` 파일을 생성하고 API 키를 입력합니다.
   ```bash
   cp .env.example .env
   ```
   ```env
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   APP_URL="http://localhost:3000"
   ```

3. Firebase 설정 확인
   - Firebase 콘솔에서 Google 로그인 및 Firestore 데이터베이스를 활성화합니다.
   - 필요 시 `firestore.rules`를 Firebase 프로젝트에 배포합니다.

4. 개발 서버 실행
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000`으로 접속합니다.

5. 프로덕션 빌드 및 실행
   ```bash
   npm run build
   npm start
   ```
