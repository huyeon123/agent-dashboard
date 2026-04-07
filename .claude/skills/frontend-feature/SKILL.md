---
name: frontend-feature
description: "agent-dashboard 프론트엔드 피처 개발 가이드. React 19 + Tailwind CSS 4 + Zustand + i18n 기반 패널 컴포넌트 구현 패턴, 디자인 토큰, 상태 관리, API 연동 규칙을 제공한다. 새 탭/패널 추가, UI 컴포넌트 개발, 기존 패널 수정, 스타일링 작업 시 반드시 이 스킬을 참조하라."
---

# Frontend Feature Development Guide

agent-dashboard 프론트엔드 피처를 개발할 때 따르는 가이드.

## 새 피처 패널 추가 체크리스트

1. **타입 정의**: `src/types/{domain}.ts` 생성
2. **패널 컴포넌트**: `src/features/{domain}/{Name}Panel.tsx` 생성
3. **App.tsx 등록**: import 추가 + switch-case 추가
4. **TabNav 등록**: `src/components/layout/TabNav.tsx`의 `TAB_KEYS`에 키 추가
5. **i18n 추가**: `src/i18n/ko.json`과 `src/i18n/en.json`에 `tabs.{key}` 및 관련 키 추가

## 패널 컴포넌트 템플릿

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

## 디자인 토큰 (src/index.css @theme)

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

## 공통 UI 패턴

### 카드
```tsx
<div className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-border-hover transition-colors">
```

### 펼치기/접기
```tsx
const [expanded, setExpanded] = useState(false);
<button onClick={() => setExpanded(v => !v)}>
  {expanded ? '▲' : '▼'}
</button>
```

### 그룹 헤더
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm font-semibold text-text-primary">{label}</span>
  <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">{count}</span>
</div>
```

### 모달 다이얼로그
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
  <div className="bg-bg-secondary rounded-xl border border-border w-full max-w-md mx-4 p-6">
    {/* 내용 */}
  </div>
</div>
```

## API 연동 규칙

- GET 요청: `useFetch<T>(url)` 훅 사용
- POST/PUT/DELETE: `fetch(url, { method, headers, body })` 직접 사용 + `addToast()` 결과 알림
- 에이전트 파라미터: 모든 API URL에 `?agent=${currentAgent}` 쿼리 추가
- 응답 처리: `if (!res.ok) throw new Error(`HTTP ${res.status}`)` 패턴

## i18n 규칙

- 모든 사용자 대면 텍스트는 `t('namespace.key')` 형태
- ko.json과 en.json 모두에 키 추가 필수
- 네임스페이스: `tabs`, `common`, `overview`, `instructions`, `skills`, `hooks`, `settings`, `agentsDef` 등
- 공통 키: `common.loading`, `common.error`, `common.noData`, `common.unsupported`, `common.save`, `common.delete`, `common.create`, `common.cancel`, `common.retry`
