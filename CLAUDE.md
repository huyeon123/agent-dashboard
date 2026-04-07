# agent-dashboard

Multi-Agent Dashboard — Claude Code, Codex, Copilot, OpenCode 등 AI 코딩 에이전트의 설정을 통합 관리하는 웹 대시보드.

## 기술 스택

- Frontend: React 19 + TypeScript + Tailwind CSS 4 + Zustand 5
- Backend: Vite 8 미들웨어 플러그인 (REST API)
- i18n: 한국어/영어 (src/i18n/)
- 빌드: `npm run build` (tsc + vite build)

## 프로젝트 구조

```
src/
├── App.tsx                    — 탭 라우터
├── main.tsx                   — 엔트리
├── index.css                  — 디자인 토큰 (@theme)
├── types/                     — TypeScript 인터페이스
├── store/                     — Zustand (ui-store, agent-store)
├── hooks/                     — use-fetch, use-tab, use-toast
├── i18n/                      — ko.json, en.json
├── components/layout/         — Shell, Header, TabNav
├── components/ui/             — ToastContainer
└── features/                  — 12개 피처 패널 (overview, instructions, skills, ...)

server/
├── index.ts                   — Vite 미들웨어 플러그인
├── helpers.ts                 — 유틸리티
├── parsers.ts                 — 마크다운/YAML 파서
├── backup.ts                  — 파일 백업
├── agents/                    — 레지스트리, 타입, 어댑터
└── routes/                    — API 핸들러

data/
├── agents.json                — 에이전트 레지스트리
└── projects.json              — 프로젝트 레지스트리
```

## 하네스: Dashboard Development

**목표:** 대시보드 기능 추가/수정 시 프론트엔드·백엔드·QA를 병렬 처리하고 통합 품질을 보장

**에이전트 팀:**

| 에이전트 | 역할 |
|---------|------|
| frontend-dev | React 컴포넌트, Tailwind CSS, Zustand, i18n |
| backend-dev | Vite 미들웨어 API, AgentAdapter, 파서 |
| qa-engineer | 빌드·타입 검증, API-UI 계약 교차 비교 |

**스킬:**

| 스킬 | 용도 | 사용 에이전트 |
|------|------|-------------|
| frontend-feature | 프론트엔드 피처 개발 가이드 | frontend-dev |
| backend-api | 백엔드 API 개발 가이드 | backend-dev |
| qa-verify | QA 검증 체크리스트 | qa-engineer |
| dashboard-orchestrator | 에이전트 팀 오케스트레이터 | (오케스트레이터) |

**실행 규칙:**

- 대시보드 기능 추가/수정/개선 요청 시 `dashboard-orchestrator` 스킬을 통해 에이전트 팀으로 처리하라
- 단순 질문, 코드 설명, 설정 확인 등은 에이전트 팀 없이 직접 응답해도 무방
- 모든 에이전트는 `model: "opus"` 사용
- 중간 산출물: `_workspace/` 디렉토리

**디렉토리 구조:**

```
.claude/
├── agents/
│   ├── frontend-dev.md
│   ├── backend-dev.md
│   └── qa-engineer.md
└── skills/
    ├── frontend-feature/
    │   └── SKILL.md
    ├── backend-api/
    │   └── SKILL.md
    ├── qa-verify/
    │   └── SKILL.md
    └── dashboard-orchestrator/
        └── SKILL.md
```

**변경 이력:**

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-06 | 초기 구성 | 전체 | 하네스 신규 구축 |
