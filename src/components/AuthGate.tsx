import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { BookOpenCheck, CheckSquare, FileSpreadsheet, Sparkles } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';

export function AuthGate() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('로그인 창이 닫혔습니다. 다시 시도해 주세요.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
            AI-Class Eval Studio
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            고등학교 인공지능 기초 · 교사용 통합 평가 워크스페이스
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 tracking-wide">
            2022 개정 교육과정 · 인공지능 기초 성취기준 연계
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-balance">
            수업 중 관찰부터 AI 세특 초안까지,
            <br />
            한 화면에서 끝내는 과정중심 평가
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            컴퓨터실 실습과 모둠 토의가 많은 &lt;인공지능 기초&gt; 수업 시간에 흐름을 끊지 않고
            루브릭 수행평가, 태도 빠른 체크, 산출물 점수, 자기·동료평가를 실시간으로 기록하고
            클라우드에 안전하게 동기화하세요.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <CheckSquare className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>4대 평가 영역 통합 기록</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                루브릭 상/중/하 채점, 관찰 체크리스트, +발표/+질문 태도 체크, 산출물·자기동료평가를 가중치로 자동 합산합니다.
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>근거 기반 AI 피드백 &amp; 세특</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                교사가 기록한 성취기준과 관찰 메모만을 근거로 NEIS 바이트 규격에 맞춘 세특·피드백 초안을 생성합니다.
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <BookOpenCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>교과 성취기준 기본 프리셋</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                [12인기01-01]~[12인기04-04] 4개 대단원별 추천 루브릭과 체크리스트를 클릭 한 번으로 불러옵니다.
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>엑셀 CSV 일괄 등록 및 내보내기</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                학생 명단과 구글폼 자기·동료평가 결과를 붙여넣어 반영하고, 학기말 평가표를 CSV로 다운로드합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">교사 계정으로 시작하기</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Google 계정으로 로그인하면 교무실 PC와 수업실 태블릿에서 동일한 평가 데이터를 실시간으로 이용할 수 있습니다.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap"
            >
              <span>{loading ? '로그인 창 연결 중...' : 'Google 계정으로 로그인'}</span>
            </button>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>· 교사 본인 UID 기준으로 평가 데이터가 격리 저장됩니다.</p>
              <p>· 로그인 후 샘플 학급 데이터를 불러와 즉시 체험할 수 있습니다.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
