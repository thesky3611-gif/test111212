import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 서버 환경변수에 설정되어 있지 않습니다. Settings > Secrets에서 키를 확인해 주세요.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function calculateNeisBytes(text: string): number {
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

interface DraftRequestBody {
  mode: 'feedback' | 'seteuk';
  focusCompetency?: string;
  targetLength?: 'short' | 'standard' | 'detailed';
  student: {
    name: string;
    studentNumber: string;
    groupName?: string;
  };
  activity: {
    title: string;
    domainTitle: string;
    standards: string[];
    rubricSummary: { criterionTitle: string; levelLabel: string; descriptor: string }[];
    checklistCompleted: string[];
    checklistTotalCount: number;
  };
  evaluation: {
    attitudeLogs: { label: string; delta: number }[];
    attitudeScore: number;
    artifactScore: number;
    artifactSummary: string;
    artifactFeedback: string;
    selfScore: number;
    selfNote: string;
    peerScore: number;
    peerNote: string;
    observationMemo: string;
    totalScore: number;
  };
}

app.post('/api/ai/generate-draft', async (req, res) => {
  try {
    const body = req.body as DraftRequestBody;

    if (!body || !body.student?.name || !body.activity?.title || !body.mode) {
      res.status(400).json({ error: '학생, 활동 정보 및 생성 모드가 필요합니다.' });
      return;
    }

    const ai = getGeminiClient();

    const lengthGuide =
      body.mode === 'feedback'
        ? '학생에게 전달할 따뜻하고 구체적인 형성평가 피드백 250~380자 분량(잘한 점, 근거, 다음 개선 제안 포함).'
        : body.targetLength === 'short'
          ? '학교생활기록부 과목별 세부능력 및 특기사항(세특) 250~330자 내외(공백 포함, NEIS 900바이트 이하).'
          : body.targetLength === 'detailed'
            ? '학교생활기록부 과목별 세부능력 및 특기사항(세특) 430~500자 내외(공백 포함, NEIS 1450바이트 이하).'
            : '학교생활기록부 과목별 세부능력 및 특기사항(세특) 340~420자 내외(공백 포함, NEIS 1200바이트 이하).';

    const systemInstruction =
      body.mode === 'seteuk'
        ? [
            '당신은 대한민국 고등학교 <인공지능 기초> 교과 담당 교사의 학교생활기록부 세부능력 및 특기사항(세특) 작성을 돕는 교육 평가 전문가입니다.',
            '반드시 아래 원칙을 철저히 준수하세요:',
            '1. 입력된 평가 근거(성취기준, 루브릭 등급, 관찰 메모, 산출물 요약, 자기·동료평가, 참여 태도)에 명시된 사실만 바탕으로 작성하고, 입력에 없는 활동이나 수상·대회·사교육·외부 기관명은 절대 지어내지 마세요.',
            '2. 문체는 NEIS 세특 표준 문체인 명사형 종결 또는 "~함.", "~보임.", "~수행함.", "~기여함." 형태의 객관적·관찰 중심 서술로 통일하세요.',
            '3. 학생의 성명은 본문에 직접 쓰지 말고 주어 생략 또는 학습자 중심 서술로 작성하세요.',
            '4. 성취기준 코드나 단순 점수 숫자(예: 92점)를 그대로 나열하지 말고, 구체적인 인공지능 개념·탐구 과정·성장 변화로 녹여내세요.',
            `5. 분량 목표: ${lengthGuide}`,
          ].join('\n')
        : [
            '당신은 대한민국 고등학교 <인공지능 기초> 교과 담당 교사입니다.',
            '수업 활동에 참여한 학생에게 전달할 구체적이고 격려 중심의 개별 피드백을 작성합니다.',
            '1. 입력된 루브릭 평가 결과, 체크리스트, 산출물, 자기·동료평가, 관찰 메모의 실제 근거를 언급하세요.',
            '2. 강점 1~2가지와 향후 보완/심화 탐구 방향 1가지를 자연스러운 구어체 존댓말("~했어요", "~해 보면 좋겠어요")로 작성하세요.',
            `3. 분량 목표: ${lengthGuide}`,
          ].join('\n');

    const promptPayload = {
      수업활동: body.activity.title,
      교육과정영역: body.activity.domainTitle,
      관련성취기준: body.activity.standards,
      강조역량: body.focusCompetency || '인공지능 원리 이해 및 문제 해결 역량',
      학생정보: {
        학번: body.student.studentNumber,
        이름: body.student.name,
        모둠: body.student.groupName || '미지정',
      },
      루브릭평가근거: body.activity.rubricSummary,
      체크리스트달성: `${body.activity.checklistCompleted.length}/${body.activity.checklistTotalCount} (${body.activity.checklistCompleted.join(', ') || '기록 없음'})`,
      참여태도기록: {
        태도점수: body.evaluation.attitudeScore,
        누적기록: body.evaluation.attitudeLogs.map((l) => l.label),
      },
      실습산출물: {
        점수: body.evaluation.artifactScore,
        산출물요약: body.evaluation.artifactSummary || '기록 없음',
        교사산출물코멘트: body.evaluation.artifactFeedback || '기록 없음',
      },
      자기평가및동료평가: {
        자기평가점수: body.evaluation.selfScore,
        자기성찰내용: body.evaluation.selfNote || '기록 없음',
        동료평가점수: body.evaluation.peerScore,
        동료평가내용: body.evaluation.peerNote || '기록 없음',
      },
      교사수업관찰메모: body.evaluation.observationMemo || '기록 없음',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `다음 학생의 <인공지능 기초> 수업 평가 근거 데이터를 바탕으로 초안을 작성해 주세요.\n\n${JSON.stringify(promptPayload, null, 2)}`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            draftText: {
              type: Type.STRING,
              description: '생성된 피드백 또는 세특 초안 문구',
            },
            evidenceUsed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '초안 작성에 직접 반영한 핵심 근거 키워드 2~4개',
            },
          },
          required: ['draftText', 'evidenceUsed'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      draftText?: string;
      evidenceUsed?: string[];
    };

    const draftText = (parsed.draftText ?? '').trim();
    if (!draftText) {
      res.status(502).json({ error: 'AI 응답에서 초안 텍스트를 생성하지 못했습니다. 다시 시도해 주세요.' });
      return;
    }

    res.json({
      draftText,
      evidenceUsed: Array.isArray(parsed.evidenceUsed) ? parsed.evidenceUsed : [],
      charCount: draftText.length,
      neisByteCount: calculateNeisBytes(draftText),
      modelUsed: 'gemini-4-hydrogen',
    });
  } catch (err) {
    console.error('AI draft generation error:', err);
    const message = err instanceof Error ? err.message : 'AI 초안 생성 중 오류가 발생했습니다.';
    if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
      res.status(403).json({
        error: 'Gemini API 키 인증에 실패했습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.',
      });
      return;
    }
    if (message.includes('RESOURCE_EXHAUSTED')) {
      res.status(429).json({
        error: 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도하거나 Settings > Secrets에서 유료 키를 확인해 주세요.',
      });
      return;
    }
    res.status(500).json({ error: message });
  }
});

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.aistudio',
  '.cache',
  '.vscode',
  '.idea',
]);

function shouldIncludeFile(fileName: string): boolean {
  if (fileName.startsWith('.env') && fileName !== '.env.example') {
    return false;
  }
  if (fileName === '.DS_Store' || fileName === 'Thumbs.db') {
    return false;
  }
  if (/\.(log|zip|pem|key|p12)$/i.test(fileName)) {
    return false;
  }
  return true;
}

async function addDirectoryToZip(zip: JSZip, currentDir: string): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const resolvedPath = path.resolve(currentDir, entry.name);
    if (!resolvedPath.startsWith(PROJECT_ROOT + path.sep)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        await addDirectoryToZip(zip, resolvedPath);
      }
      continue;
    }

    if (entry.isFile() && shouldIncludeFile(entry.name)) {
      const stat = await fs.stat(resolvedPath);
      if (stat.size > 10 * 1024 * 1024) {
        continue;
      }
      const relativePath = path.relative(PROJECT_ROOT, resolvedPath).split(path.sep).join('/');
      const content = await fs.readFile(resolvedPath);
      zip.file(relativePath, content);
    }
  }
}

app.get('/api/export/github-zip', async (_req, res) => {
  try {
    const zip = new JSZip();
    await addDirectoryToZip(zip, PROJECT_ROOT);

    const archiveBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="ai-class-eval-studio-github.zip"'
    );
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(archiveBuffer);
  } catch (err) {
    console.error('GitHub ZIP export error:', err);
    res.status(500).json({ error: 'GitHub 업로드용 ZIP 파일을 생성하지 못했습니다.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
