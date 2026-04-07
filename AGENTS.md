# agent-dashboard — AI 에이전트 개발 가이드

AI 코딩 에이전트(Codex, Copilot, OpenCode 등)가 이 프로젝트에서 작업할 때 따르는 개발 워크플로우, 컨벤션, 템플릿, QA 체크리스트.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [개발 워크플로우 (5단계)](#4-개발-워크플로우-5단계)
5. [프론트엔드 개발 가이드](#5-프론트엔드-개발-가이드)
6. [백엔드 개발 가이드](#6-백엔드-개발-가이드)
7. [QA 검증 체크리스트](#7-qa-검증-체크리스트)
8. [API 계약 문서 형식](#8-api-계약-문서-형식)
9. [작업 범위별 실행 가이드](#9-작업-범위별-실행-가이드)

---

## 1. 프로젝트 개요

Multi-Agent Dashboard — Claude Code, Codex, Copilot, OpenCode 등 AI 코딩 에이전트의 설정을 통합 관리하는 웹 대시보드.

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 + Zustand 5 |
| Backend | Vite 8 미들웨어 플러그인 (REST API) |
| i18n | 한국어/영어 (`src/i18n/`) |
| 빌드 | `npm run build` (tsc + vite build) |

---

## 3. 프로젝트 구조

```
src/
├── App.tsx                    — 탭 라우터 (switch-case 등록)
├── main.tsx                   — 엔트리
├── index.css                  — 디자인 토큰 (@theme)
├── types/                     — TypeScript 인터페이스
├── store/                     — Zustand (ui-store, agent-store)
├── hooks/                     — use-fetch, use-tab, use-toast
├── i18n/                      — ko.json, en.json
├── components/layout/         — Shell, Header, TabNav
├── components/ui/             — ToastContainer
└── features/                  — 피처 패널 (overview, instructions, skills, ...)

server/
├── index.ts                   — Vite 미들웨어 플러그인 (라우트 디스패처)
├── helpers.ts                 — 유틸리티 함수
├── parsers.ts                 — 마크다운/YAML 파서
├── backup.ts                  — 파일 백업 유틸
├── agents/                    — 레지스트리, 타입, 어댑터
│   ├── types.ts               — AgentConfig, AgentPaths, AgentSupports
│   ├── adapter.ts             — AgentAdapter 클래스
│   └── registry.ts            — loadRegistry, getAdapter, getAllAdapters
└── routes/                    — API 핸들러 (피처별 파일)

data/
├── agents.json                — 에이전트 레지스트리
└── projects.json              — 프로젝트 레지스트리

_workspace/                    — 작업 산출물 (워크플로우 중간 파일)
├── 00_api_contract.md         — API 계약 문서 (→ 섹션 8)
└── 99_qa_report.md            — QA 검증 보고서 (→ 섹션 7)
```

---

## 4. 개발 워크플로우 (5단계)

피처 추가·수정 시 아래 5단계를 따른다.

### Step 0: 컨텍스트 확인

`_workspace/` 디렉토리 존재 여부를 확인하여 실행 방식을 결정한다:

| 상태 | 처리 |
|------|------|
| `_workspace/` 없음 | 초기 실행 → Step 1로 진행 |
| `_workspace/` 있음 + 부분 수정 요청 | 해당 부분만 재작업 |
| `_workspace/` 있음 + 새 입력 | 기존 `_workspace/`를 타임스탬프 접미사로 이동 후 새 실행 |

### Step 1: 분석 및 API 계약 설계

1. 요청을 분석하여 변경 범위를 파악한다:
   - 프론트엔드만? 백엔드만? 둘 다?
   - 새 탭/패널 추가? 기존 수정?
   - API 변경 필요?

2. `_workspace/00_api_contract.md`를 작성한다 (→ [섹션 8](#8-api-계약-문서-형식) 참조)

3. 프론트엔드만 변경이면 Step 2의 백엔드 작업 스킵, 백엔드만이면 프론트엔드 작업 스킵

### Step 2: 구현

`_workspace/00_api_contract.md`를 기준으로 구현한다. 가능하면 프론트엔드와 백엔드를 병렬로 작업한다.

- **프론트엔드**: [섹션 5 프론트엔드 개발 가이드](#5-프론트엔드-개발-가이드)를 따라 구현
- **백엔드**: [섹션 6 백엔드 개발 가이드](#6-백엔드-개발-가이드)를 따라 구현

### Step 3: QA 검증

구현 완료 후 [섹션 7 QA 검증 체크리스트](#7-qa-검증-체크리스트)에 따라 검증하고, 결과를 `_workspace/99_qa_report.md`에 저장한다.

### Step 4: 결과 처리

1. `_workspace/99_qa_report.md`를 읽는다
2. **Critical 이슈**: 해당 부분을 수정하고 QA를 재실행한다 (최대 2회)
3. **Major 이슈**: 수정하거나 사용자에게 보고한다
4. **Minor 이슈**: 보고서에 기재하고 넘어가도 무방
5. 모든 이슈 해결 후 변경 파일 목록과 추가된 기능을 요약 보고한다

---

## 5. 프론트엔드 개발 가이드

### 5.1 새 피처 패널 추가 체크리스트

1. **타입 정의**: `src/types/{domain}.ts` 생성
2. **패널 컴포넌트**: `src/features/{domain}/{Name}Panel.tsx` 생성
3. **App.tsx 등록**: import 추가 + switch-case 추가
4. **TabNav 등록**: `src/components/layout/TabNav.tsx`의 `TAB_KEYS` 배열에 키 추가
5. **i18n 추가**: `src/i18n/ko.json`과 `src/i18n/en.json`에 `tabs.{key}` 및 관련 키 추가

### 5.2 패널 컴포넌트 템플릿

```tsx
import { useAgentStore } from '../../store/agent-store';
import { useFetch } from '../../hooks/use-fetch';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../i18n';
import type { MyType } from '../../types/my-domain';

export function MyPanel() {
  const { t } = useI18n();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const { addToast } = useToast();
  const { data, loading, error, reload } = useFetch<MyType>(
    `/api/my-endpoint?agent=${currentAgent}`
  );

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-tertiary rounded-lg border border-border" />
        ))}
      </div>
    );
  }

  if (error) {
    if (error.includes('404') || error.includes('501')) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-text-muted text-sm">{t('common.unsupported')}</p>
        </div>
      );
    }
    return <div className="text-accent-red text-sm">{t('common.error')}: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">{t('myDomain.title')}</h2>
        <button
          onClick={reload}
          className="text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-border-hover"
        >
          {t('common.retry')}
        </button>
      </div>
      {/* 콘텐츠 */}
    </div>
  );
}
```

### 5.3 디자인 토큰

`src/index.css`의 `@theme`에 정의된 CSS 변수:

| 토큰 | 값 | 용도 |
|------|-----|------|
| `bg-primary` | #09090b | 전체 배경 |
| `bg-secondary` | #18181b | 카드 배경 |
| `bg-tertiary` | #27272a | 입력 필드, 뱃지 배경 |
| `bg-hover` | #3f3f46 | 호버 배경 |
| `text-primary` | #fafafa | 주요 텍스트 |
| `text-secondary` | #a1a1aa | 보조 텍스트 |
| `text-muted` | #71717a | 희미한 텍스트 |
| `accent-purple` | #a78bfa | 주요 액센트, 버튼 |
| `accent-blue` | #60a5fa | 정보 |
| `accent-green` | #34d399 | 성공 |
| `accent-yellow` | #fbbf24 | 경고 |
| `accent-red` | #f87171 | 에러, 삭제 |

### 5.4 공통 UI 패턴

**카드**
```tsx
<div className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-border-hover transition-colors">
```

**펼치기/접기**
```tsx
const [expanded, setExpanded] = useState(false);
<button onClick={() => setExpanded(v => !v)}>
  {expanded ? '▲' : '▼'}
</button>
```

**그룹 헤더**
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm font-semibold text-text-primary">{label}</span>
  <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">{count}</span>
</div>
```

**모달 다이얼로그**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
  <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-md mx-4 p-6">
    {/* 내용 */}
  </div>
</div>
```

### 5.5 디자인 시스템 클래스 레퍼런스

| 용도 | 클래스 |
|------|--------|
| 카드 배경 | `bg-bg-secondary rounded-xl border border-border` |
| 호버 강조 | `hover:border-border-hover transition-colors` |
| 제목 텍스트 | `text-xl font-semibold text-text-primary` |
| 보조 텍스트 | `text-sm text-text-secondary` |
| 희미한 텍스트 | `text-xs text-text-muted` |
| 주요 버튼 | `bg-accent-purple text-white rounded-lg px-4 py-2` |
| 보조 버튼 | `border border-border hover:border-border-hover rounded-lg px-3 py-1.5` |
| 뱃지 | `text-xs bg-bg-tertiary text-text-muted px-2 py-0.5 rounded-full` |
| 로딩 스켈레톤 | `h-14 bg-bg-tertiary rounded-lg border border-border animate-pulse` |
| 구분선 | `border-t border-border` |

### 5.6 API 연동 규칙

- **GET 요청**: `useFetch<T>(url)` 훅 사용
- **POST/PUT/DELETE**: `fetch(url, { method, headers, body })` 직접 사용 + `addToast()`로 결과 알림
- **에이전트 파라미터**: 모든 API URL에 `?agent=${currentAgent}` 쿼리 추가
- **응답 처리**: `if (!res.ok) throw new Error(\`HTTP ${res.status}\`)` 패턴

### 5.7 i18n 규칙

- 모든 사용자 대면 텍스트는 `t('namespace.key')` 형태
- `ko.json`과 `en.json` 모두에 키 추가 필수
- 네임스페이스: `tabs`, `common`, `overview`, `instructions`, `skills`, `hooks`, `settings`, `agentsDef` 등
- 공통 키: `common.loading`, `common.error`, `common.noData`, `common.unsupported`, `common.save`, `common.delete`, `common.create`, `common.cancel`, `common.retry`

### 5.8 상태 관리

| 훅/스토어 | 용도 | 예시 |
|----------|------|------|
| `useAgentStore((s) => s.currentAgent)` | 현재 선택된 에이전트 타입 | `'claude' \| 'codex' \| ...` |
| `useUiStore((s) => s.activeTab)` | 현재 활성 탭 | `'overview' \| 'skills' \| ...` |
| `useToast()` | 토스트 알림 | `addToast({ message, type })` |
| `useFetch<T>(url)` | 데이터 페칭 | `{ data, loading, error, reload }` |

---

## 6. 백엔드 개발 가이드

### 6.1 새 API 엔드포인트 추가 체크리스트

1. **타입 정의**: `server/agents/types.ts`에 데이터 타입 추가 (필요 시)
2. **AgentSupports 확장**: 지원 여부 필드 추가 + `getSupports()` 업데이트
3. **AgentAdapter 메서드**: `server/agents/adapter.ts`에 데이터 접근 메서드 추가
4. **라우트 핸들러**: `server/routes/{feature}.ts` 생성
5. **디스패처 등록**: `server/index.ts`에 import + if 분기 추가
6. **프론트 타입 동기화**: `src/types/{domain}.ts`에 동일 타입 정의

### 6.2 라우트 핸들러 템플릿

```typescript
import type { IncomingMessage, ServerResponse } from 'http';
import { json, jsonError, collectBody, getQuery } from '../helpers';
import { getAdapter } from '../agents/registry';

export async function handleMyFeature(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<void> {
  const query = getQuery(req.url || '');
  const agentType = query.get('agent') || 'claude';
  const adapter = getAdapter(agentType);

  if (!adapter) {
    jsonError(res, `Agent type "${agentType}" not found`, 404);
    return;
  }

  if (!adapter.supports.myFeature) {
    jsonError(res, `Agent "${agentType}" does not support myFeature`, 501);
    return;
  }

  if (req.method === 'GET') {
    const data = adapter.getMyFeature();
    json(res, data);
  } else if (req.method === 'POST') {
    const body = await collectBody(req);
    const parsed = JSON.parse(body);
    adapter.createMyFeature(parsed);
    json(res, { ok: true });
  } else if (req.method === 'PUT') {
    const body = await collectBody(req);
    const parsed = JSON.parse(body);
    adapter.updateMyFeature(parsed);
    json(res, { ok: true });
  } else if (req.method === 'DELETE') {
    const id = query.get('id');
    if (!id) { jsonError(res, 'Missing "id"', 400); return; }
    adapter.deleteMyFeature(id);
    json(res, { ok: true });
  }
}
```

### 6.3 디스패처 등록 패턴

`server/index.ts`의 if-else 체인에 추가:

```typescript
// import 추가
import { handleMyFeature } from './routes/my-feature';

// if 분기 추가 (기존 else if 체인에)
} else if (pathname.startsWith('/api/my-feature')) {
  await handleMyFeature(req, res, pathname);
}
```

### 6.4 AgentAdapter 확장 패턴

```typescript
// server/agents/adapter.ts 에 메서드 추가
getMyFeature(): MyFeatureData {
  if (!this.paths.myFeature) return { items: [] };

  const dir = path.join(this.globalHome, this.paths.myFeature);
  if (!fs.existsSync(dir)) return { items: [] };

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    // ... 파싱 로직
  } catch {
    return { items: [] };
  }
}
```

### 6.5 헬퍼 함수 레퍼런스

| 함수 | 용도 | 예시 |
|------|------|------|
| `json(res, data, status?)` | JSON 성공 응답 | `json(res, { items })` |
| `jsonError(res, msg, status)` | JSON 에러 응답 | `jsonError(res, 'Not found', 404)` |
| `collectBody(req)` | 요청 본문 수집 | `const body = await collectBody(req)` |
| `getQuery(url)` | 쿼리 파라미터 파싱 | `const q = getQuery(req.url)` |
| `getPathname(url)` | 경로 추출 | `const p = getPathname(req.url)` |
| `safeReadFile(path)` | 안전한 파일 읽기 (없으면 빈 문자열) | `const raw = safeReadFile(filePath)` |
| `backupFile(path)` | 수정 전 백업 | `backupFile(filePath)` |
| `ensureDir(path)` | 디렉토리 생성 보장 | `ensureDir(path.dirname(filePath))` |
| `parseYamlFrontmatter(raw)` | YAML frontmatter 파싱 | `const { frontmatter, body } = parseYamlFrontmatter(raw)` |
| `parseMarkdownSections(raw)` | 마크다운 섹션 파싱 | `const sections = parseMarkdownSections(raw)` |

### 6.6 에이전트 경로 체계

`data/agents.json`에 정의된 경로 규칙 (`#` 구문: 파일 내 특정 키 참조):

| 경로 키 | Claude | Codex | Copilot | OpenCode |
|---------|--------|-------|---------|----------|
| `globalHome` | `~/.claude` | `~/.codex` | `~/.copilot` | `~/.config/opencode` |
| `projectDir` | `.claude` | `.codex` | `.github` | `.opencode` |
| `settings` | `settings.json` | `config.toml` | — | `opencode.json` |
| `skills` | `skills` | `skills` | `prompts` | `skills` |
| `hooks` | `settings.json#hooks` | — | — | — |
| `mcp` | `.mcp.json`, `settings.json#mcpServers` | `config.toml#mcp` | — | `opencode.json#mcp` |

### 6.7 파일 수정 안전 규칙

1. 수정 전 `backupFile()` 호출 필수
2. 디렉토리 생성 시 `ensureDir()` 사용
3. JSON 파싱은 try-catch로 감쌈
4. `resolveHome()`으로 `~` 경로 변환
5. 존재하지 않는 파일은 `safeReadFile()`로 빈 문자열 반환

---

## 7. QA 검증 체크리스트

반드시 아래 순서로 검증한다. 앞 단계에서 Critical 이슈 발견 시 즉시 보고하고 후속 단계는 스킵 가능.

### Step 1: 빌드 검증

```bash
cd /path/to/agent-dashboard
npx tsc --noEmit 2>&1          # TypeScript 타입 체크
npm run build 2>&1              # Vite 프로덕션 빌드
npm run lint 2>&1               # ESLint
```

모든 명령이 exit code 0이면 PASS. 에러 메시지 전문을 보고서에 포함.

### Step 2: API-UI 계약 교차 비교

프론트엔드가 기대하는 응답 shape과 백엔드가 반환하는 shape을 비교한다.

**비교 대상 매핑:**

| 프론트엔드 파일 | 백엔드 파일 | 비교 포인트 |
|---------------|-----------|-----------|
| `src/features/overview/OverviewPanel.tsx` | `server/routes/instructions.ts` 등 | useFetch 제네릭 vs json() 응답 |
| `src/features/skills/SkillsPanel.tsx` | `server/routes/skills.ts` | `Skill[]` 타입 vs `getSkills()` 반환 |
| `src/features/hooks/HooksPanel.tsx` | `adapter.getHooks()` | `HooksResponse` vs 실제 반환 |
| `src/features/settings/SettingsPanel.tsx` | `server/routes/settings.ts` | `SettingsData` vs `getSettings()` |
| `src/features/agents-def/AgentsDefPanel.tsx` | `server/routes/agents-def.ts` | `AgentDef[]` vs `getAgentDefs()` |
| `src/features/connectors/ConnectorsPanel.tsx` | `server/routes/connectors.ts` | `ConnectorsResponse` vs `getMcpServers()` |
| `src/features/plugins/PluginsPanel.tsx` | `server/routes/plugins.ts` | `Plugin[]` vs `getPlugins()` |

**비교 방법:**
1. 프론트엔드 파일에서 `useFetch<T>` 또는 `fetch()` 호출을 찾아 기대 타입 추출
2. 해당 API 경로의 백엔드 핸들러에서 `json(res, data)`의 data shape 추출
3. 필드 이름, 필드 타입, 필수/선택 여부를 비교

### Step 3: 타입 정합성

`src/types/`와 `server/agents/types.ts` 간 공유 개념의 타입 일치 여부 확인:

```
src/types/agent.ts    ↔  server/agents/types.ts
src/types/skills.ts   ↔  server/agents/types.ts (SkillInfo)
src/types/hooks.ts    ↔  adapter.getHooks() 반환 타입
src/types/settings.ts ↔  adapter.getSettings() 반환 타입
```

### Step 4: 라우트 등록 검증

1. `server/routes/` 내 모든 `export async function handle*` 함수 나열
2. `server/index.ts`에서 해당 함수가 import되고 if 분기에 등록되어 있는지 확인
3. 프론트엔드 `useFetch` URL과 백엔드 라우트 pathname 매칭 확인

### Step 5: 컴포넌트 등록 검증

1. `src/features/*/` 의 `*Panel.tsx` 컴포넌트 나열
2. `src/App.tsx`에 import + switch-case 등록 확인
3. `src/components/layout/TabNav.tsx`의 `TAB_KEYS` 배열에 키 존재 확인

### Step 6: i18n 커버리지

1. 모든 `.tsx` 파일에서 `t('...')` 호출의 키 추출
2. `src/i18n/ko.json`과 `src/i18n/en.json`에 해당 키 존재 확인
3. 누락 키 보고

### 보고서 형식

결과를 `_workspace/99_qa_report.md`에 저장:

```markdown
# QA Report — {date}

## Summary
| 항목 | 결과 |
|------|------|
| Build | PASS / FAIL |
| Type Check | PASS / FAIL |
| Lint | PASS / FAIL |
| API Contract | {N} issues |
| Route Registration | PASS / FAIL |
| Component Registration | PASS / FAIL |
| i18n Coverage | {N} missing keys |

## Issues

### Critical (빌드 실패, 런타임 크래시)
- [{file}:{line}] {description}

### Major (런타임 에러 가능, 데이터 불일치)
- [{file}:{line}] {description}

### Minor (스타일, 컨벤션)
- [{file}:{line}] {description}

## Recommendations
- {개선 제안}
```

### 심각도 기준

| 등급 | 기준 | 예시 |
|------|------|------|
| **Critical** | 빌드 실패 또는 앱 크래시 | TypeScript 에러, 미등록 라우트 |
| **Major** | 런타임 에러 가능 또는 데이터 손실 | API 응답 shape 불일치, 누락 필드 |
| **Minor** | 기능 이상 없으나 개선 여지 | i18n 키 누락, 미사용 import |

---

## 8. API 계약 문서 형식

새 피처 작업 전 `_workspace/00_api_contract.md`를 아래 형식으로 작성한다:

```markdown
# API Contract: {피처명}

## Endpoints

### GET /api/{resource}?agent={type}
Response:
```typescript
interface MyResponse {
  field1: string;
  field2: number;
  items: MyItem[];
}
```

### POST /api/{resource}?agent={type}
Request:
```typescript
interface MyCreateRequest {
  field1: string;
}
```
Response: `{ ok: boolean }`

## Shared Types
```typescript
interface MyItem {
  id: string;
  name: string;
}
```

## Frontend Requirements
- 패널 위치: `src/features/{name}/{Name}Panel.tsx`
- 탭 키: `'{key}'`
- i18n 네임스페이스: `'{namespace}'`

## Backend Requirements
- 라우트: `server/routes/{name}.ts`
- 어댑터 메서드: `get{Name}()`, `create{Name}()`
- AgentSupports 필드: `{name}: boolean`
```

---

## 9. 작업 범위별 실행 가이드

모든 작업에 5단계 풀 워크플로우를 실행할 필요는 없다:

| 작업 범위 | 실행 방식 |
|----------|----------|
| 프론트엔드만 (스타일, i18n, 단순 UI) | 섹션 5만 참조, QA 스킵 가능 |
| 백엔드만 (파서 수정, 유틸 추가) | 섹션 6만 참조, QA 스킵 가능 |
| 둘 다 + 단순 변경 (5개 미만 파일) | 섹션 5·6 참조 후 경량 QA (Step 1 빌드 검증만) |
| 둘 다 + 복잡한 변경 (5개 이상 파일) | 섹션 4 풀 워크플로우 + 섹션 7 전체 QA |

### 에러 핸들링

| 상황 | 처리 방법 |
|------|----------|
| 빌드 실패 | QA 보고서의 에러를 확인하여 해당 부분 수정 후 재빌드 |
| API 계약 불일치 | `_workspace/00_api_contract.md` 수정 후 프론트/백엔드 모두 재작업 |
| QA 2회 반복 후에도 Critical | 사용자에게 수동 개입 요청 |
