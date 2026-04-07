---
name: qa-verify
description: "agent-dashboard QA 검증 체크리스트. 빌드 검증, TypeScript 타입 정합성, API-UI 계약 교차 비교, i18n 커버리지, 라우트/컴포넌트 등록 검증을 수행한다. 코드 변경 후 품질 확인, 빌드 체크, 타입 검증, API 계약 확인, 테스트, QA 요청 시 반드시 이 스킬을 사용하라."
---

# QA Verification Checklist

agent-dashboard 코드 변경 후 품질을 검증할 때 따르는 체크리스트.

## 검증 순서

반드시 아래 순서로 검증한다. 앞 단계에서 Critical 이슈가 발견되면 즉시 보고하고 후속 단계는 스킵해도 된다.

### Step 1: 빌드 검증

```bash
cd /Users/aaron/Desktop/workspace/agent-dashboard
npx tsc --noEmit 2>&1          # TypeScript 타입 체크
npm run build 2>&1              # Vite 프로덕션 빌드
npm run lint 2>&1               # ESLint
```

- 모든 명령이 exit code 0이면 PASS
- 에러가 있으면 에러 메시지 전문을 보고서에 포함

### Step 2: API-UI 계약 교차 비교

프론트엔드가 기대하는 응답 shape과 백엔드가 반환하는 shape을 비교한다.

**비교 대상 매핑:**

| 프론트엔드 파일 | 백엔드 파일 | 비교 포인트 |
|---------------|-----------|-----------|
| `src/features/overview/OverviewPanel.tsx` | `server/routes/instructions.ts` 등 | useFetch 제네릭 vs json() 응답 |
| `src/features/skills/SkillsPanel.tsx` | `server/routes/skills.ts` | Skill[] 타입 vs getSkills() 반환 |
| `src/features/hooks/HooksPanel.tsx` | adapter.getHooks() | HooksResponse vs 실제 반환 |
| `src/features/settings/SettingsPanel.tsx` | `server/routes/settings.ts` | SettingsData vs getSettings() |
| `src/features/agents-def/AgentsDefPanel.tsx` | `server/routes/agents-def.ts` | AgentDef[] vs getAgentDefs() |
| `src/features/connectors/ConnectorsPanel.tsx` | `server/routes/connectors.ts` | ConnectorsResponse vs getMcpServers() |
| `src/features/plugins/PluginsPanel.tsx` | `server/routes/plugins.ts` | Plugin[] vs getPlugins() |

**비교 방법:**
1. 프론트엔드 파일에서 `useFetch<T>` 또는 `fetch()` 호출을 찾아 기대 타입 추출
2. 해당 API 경로의 백엔드 핸들러에서 `json(res, data)`의 data shape 추출
3. 필드 이름, 필드 타입, 필수/선택 여부를 비교

### Step 3: 타입 정합성

`src/types/` 와 `server/agents/types.ts` 간 공유되는 개념의 타입이 일치하는지 확인:

```
src/types/agent.ts ↔ server/agents/types.ts
src/types/skills.ts ↔ server/agents/types.ts (SkillInfo)
src/types/hooks.ts ↔ adapter.getHooks() 반환 타입
src/types/settings.ts ↔ adapter.getSettings() 반환 타입
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

1. 모든 `.tsx` 파일에서 `t('...')` 호출의 키 추출: `grep -ohP "t\('([^']+)'\)" src/**/*.tsx`
2. `src/i18n/ko.json`과 `src/i18n/en.json`에 해당 키 존재 확인
3. 누락 키 보고

## 보고서 형식

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

## 심각도 기준

| 등급 | 기준 | 예시 |
|------|------|------|
| **Critical** | 빌드 실패 또는 앱 크래시 | TypeScript 에러, 미등록 라우트 |
| **Major** | 런타임 에러 가능 또는 데이터 손실 | API 응답 shape 불일치, 누락 필드 |
| **Minor** | 기능 이상 없으나 개선 여지 | i18n 키 누락, 미사용 import |
