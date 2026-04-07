---
name: dashboard-orchestrator
description: "agent-dashboard 에이전트 팀 오케스트레이터. 대시보드 기능 추가, 패널 구현, API 개발, 피처 개발, 탭 추가, 프론트엔드/백엔드 동시 작업을 조율한다. '기능 추가', '패널 만들어', '탭 추가', 'API 추가', '피처 구현', '대시보드 수정', '대시보드 개선' 요청 시 이 스킬을 사용하라. 후속 작업: 결과 수정, 부분 재실행, 업데이트, 보완, 다시 실행, 이전 결과 개선 요청 시에도 반드시 이 스킬을 사용."
---

# Dashboard Orchestrator

agent-dashboard의 프론트엔드·백엔드·QA 에이전트를 조율하여 피처를 구현하는 통합 스킬.

## 실행 모드: 서브 에이전트

오케스트레이터가 API 계약을 사전 정의한 뒤 프론트엔드·백엔드를 병렬 실행하고, QA가 통합 검증한다.

## 에이전트 구성

| 에이전트 | 정의 파일 | 역할 | 스킬 | 출력 |
|---------|----------|------|------|------|
| frontend-dev | `.claude/agents/frontend-dev.md` | React 컴포넌트, UI, i18n | frontend-feature | src/ 변경 |
| backend-dev | `.claude/agents/backend-dev.md` | API 라우트, 어댑터, 파서 | backend-api | server/ 변경 |
| qa-engineer | `.claude/agents/qa-engineer.md` | 빌드·타입·계약 검증 | qa-verify | `_workspace/99_qa_report.md` |

## 워크플로우

### Phase 0: 컨텍스트 확인

기존 산출물 존재 여부를 확인하여 실행 모드를 결정한다:

1. `_workspace/` 디렉토리 존재 여부 확인
2. 실행 모드 결정:
   - **`_workspace/` 미존재** → 초기 실행. Phase 1로 진행
   - **`_workspace/` 존재 + 사용자가 부분 수정 요청** → 부분 재실행. 해당 에이전트만 재호출
   - **`_workspace/` 존재 + 새 입력 제공** → 새 실행. 기존 `_workspace/`를 타임스탬프 접미사로 이동

### Phase 1: 분석 및 API 계약 설계

1. 사용자 요청을 분석하여 변경 범위를 파악:
   - 프론트엔드만? 백엔드만? 둘 다?
   - 새 탭/패널 추가? 기존 수정?
   - API 변경 필요?

2. API 계약 문서 작성 (`_workspace/00_api_contract.md`):
   ```markdown
   # API Contract: {피처명}
   
   ## Endpoints
   ### GET /api/{resource}?agent={type}
   Response: { field1: type, field2: type }
   
   ### POST /api/{resource}?agent={type}
   Request: { field1: type }
   Response: { ok: boolean }
   
   ## Shared Types
   interface MyType { ... }
   
   ## Frontend Requirements
   - 패널 위치: src/features/{name}/{Name}Panel.tsx
   - 탭 키: '{key}'
   - i18n 네임스페이스: '{namespace}'
   
   ## Backend Requirements
   - 라우트: server/routes/{name}.ts
   - 어댑터 메서드: get{Name}(), create{Name}()
   - AgentSupports 필드: {name}: boolean
   ```

3. 프론트엔드만 변경이면 Phase 2-B 스킵, 백엔드만이면 Phase 2-F 스킵

### Phase 2: 병렬 구현

프론트엔드와 백엔드 에이전트를 병렬로 실행한다.

**Phase 2-B: 백엔드 구현**
```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  run_in_background: true,
  prompt: "
    너는 agent-dashboard의 백엔드 개발자다.
    .claude/agents/backend-dev.md 를 읽고 역할을 숙지하라.
    .claude/skills/backend-api/SKILL.md 를 읽고 개발 가이드를 따르라.
    _workspace/00_api_contract.md 를 읽고 API 계약에 맞게 구현하라.
    
    {구체적 구현 지시}
  "
)
```

**Phase 2-F: 프론트엔드 구현**
```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  run_in_background: true,
  prompt: "
    너는 agent-dashboard의 프론트엔드 개발자다.
    .claude/agents/frontend-dev.md 를 읽고 역할을 숙지하라.
    .claude/skills/frontend-feature/SKILL.md 를 읽고 개발 가이드를 따르라.
    _workspace/00_api_contract.md 를 읽고 API 계약에 맞게 구현하라.
    
    {구체적 구현 지시}
  "
)
```

### Phase 3: QA 검증

프론트엔드·백엔드 구현 완료 후 QA 에이전트를 실행한다.

```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "
    너는 agent-dashboard의 QA 엔지니어다.
    .claude/agents/qa-engineer.md 를 읽고 역할을 숙지하라.
    .claude/skills/qa-verify/SKILL.md 를 읽고 검증 체크리스트를 따르라.
    _workspace/00_api_contract.md 를 읽고 API 계약 기준으로 검증하라.
    
    검증 대상 변경 사항:
    {변경된 파일 목록과 내용 요약}
    
    결과를 _workspace/99_qa_report.md 에 저장하라.
  "
)
```

### Phase 4: 결과 처리

1. QA 보고서 읽기 (`_workspace/99_qa_report.md`)
2. Critical 이슈가 있으면:
   - 해당 에이전트(frontend-dev 또는 backend-dev)를 재실행하여 수정
   - 수정 후 QA 재실행 (최대 2회 반복)
3. Major 이슈가 있으면:
   - 사용자에게 보고하고 수정 여부 확인
4. 모든 이슈 해결 후:
   - 사용자에게 결과 요약 보고
   - 변경 파일 목록, 추가된 기능, 잔여 Minor 이슈 안내

## 데이터 흐름

```
[오케스트레이터]
    │
    ├── Phase 1: API 계약 작성 → _workspace/00_api_contract.md
    │
    ├── Phase 2 (병렬):
    │   ├── [backend-dev] → server/ 파일 변경
    │   └── [frontend-dev] → src/ 파일 변경
    │
    ├── Phase 3:
    │   └── [qa-engineer] → _workspace/99_qa_report.md
    │
    └── Phase 4: 결과 처리 → 사용자 보고
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 에이전트 1개 실패 | 에러 로그 확인 → 1회 재시도 → 재실패 시 사용자 보고 |
| 빌드 실패 | QA 보고서의 에러를 해당 에이전트에 전달하여 수정 |
| API 계약 불일치 | 계약 문서 수정 후 프론트/백엔드 모두 재실행 |
| QA 2회 반복 후에도 Critical | 사용자에게 수동 개입 요청 |

## 단순 작업 바이패스

모든 요청에 3-에이전트 풀 파이프라인을 실행할 필요는 없다:

| 작업 범위 | 실행 방식 |
|----------|----------|
| 프론트엔드만 (스타일, i18n, 단순 UI) | frontend-dev 에이전트만 실행, QA 스킵 |
| 백엔드만 (파서 수정, 유틸 추가) | backend-dev 에이전트만 실행, QA 스킵 |
| 둘 다 + 단순 변경 (5개 미만 파일) | 병렬 실행 후 경량 QA (빌드 체크만) |
| 둘 다 + 복잡한 변경 (5개 이상 파일) | 풀 파이프라인 (병렬 + 전체 QA) |

## 테스트 시나리오

### 정상 흐름: 새 패널 추가
1. 사용자: "프로젝트 분석 패널을 추가해줘"
2. Phase 1: API 계약 설계 (GET /api/project-analysis)
3. Phase 2: backend-dev가 라우트+어댑터, frontend-dev가 패널+타입+i18n 병렬 구현
4. Phase 3: qa-engineer가 빌드·타입·계약·등록 검증
5. Phase 4: QA PASS → 사용자에게 결과 보고

### 에러 흐름: 타입 불일치
1. Phase 3에서 QA가 API 응답 shape 불일치 발견 (Critical)
2. Phase 4에서 해당 에이전트 재실행 (불일치 내용 전달)
3. QA 재실행 → PASS
4. 사용자에게 "1회 수정 후 통과" 보고
