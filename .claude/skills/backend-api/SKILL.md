---
name: backend-api
description: "agent-dashboard 백엔드 API 개발 가이드. Vite 미들웨어 기반 REST API 라우트 추가, AgentAdapter 확장, 마크다운/YAML 파서, 파일 시스템 조작 패턴을 제공한다. 새 API 엔드포인트 추가, 백엔드 로직 수정, 데이터 파서 개발, 에이전트 어댑터 확장 시 반드시 이 스킬을 참조하라."
---

# Backend API Development Guide

agent-dashboard 백엔드 API를 개발할 때 따르는 가이드.

## 새 API 엔드포인트 추가 체크리스트

1. **타입 정의**: `server/agents/types.ts`에 데이터 타입 추가 (필요 시)
2. **AgentSupports 확장**: 지원 여부 필드 추가 + `getSupports()` 업데이트
3. **AgentAdapter 메서드**: `server/agents/adapter.ts`에 데이터 접근 메서드 추가
4. **라우트 핸들러**: `server/routes/{feature}.ts` 생성
5. **디스패처 등록**: `server/index.ts`에 import + if 분기 추가
6. **프론트 타입 동기화**: `src/types/{domain}.ts`에 동일 타입 정의

## 라우트 핸들러 템플릿

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

## 디스패처 등록 패턴 (server/index.ts)

```typescript
// import 추가
import { handleMyFeature } from './routes/my-feature';

// if 분기 추가 (기존 else if 체인에)
} else if (pathname.startsWith('/api/my-feature')) {
  await handleMyFeature(req, res, pathname);
}
```

## AgentAdapter 확장 패턴

```typescript
// server/agents/adapter.ts 에 메서드 추가
getMyFeature(): MyFeatureData {
  if (!this.paths.myFeature) return { items: [] };
  
  const dir = path.join(this.globalHome, this.paths.myFeature);
  if (!fs.existsSync(dir)) return { items: [] };
  
  // 파일 시스템에서 데이터 읽기
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    // ... 파싱 로직
  } catch {
    return { items: [] };
  }
}
```

## 헬퍼 함수 사용법

| 함수 | 용도 | 예시 |
|------|------|------|
| `json(res, data, status?)` | JSON 성공 응답 | `json(res, { items })` |
| `jsonError(res, msg, status)` | JSON 에러 응답 | `jsonError(res, 'Not found', 404)` |
| `collectBody(req)` | 요청 본문 수집 | `const body = await collectBody(req)` |
| `getQuery(url)` | 쿼리 파라미터 | `const q = getQuery(req.url)` |
| `getPathname(url)` | 경로 추출 | `const p = getPathname(req.url)` |
| `safeReadFile(path)` | 안전한 파일 읽기 | `const raw = safeReadFile(filePath)` |
| `backupFile(path)` | 수정 전 백업 | `backupFile(filePath)` |
| `ensureDir(path)` | 디렉토리 보장 | `ensureDir(path.dirname(filePath))` |
| `parseYamlFrontmatter(raw)` | YAML frontmatter 파싱 | `const { frontmatter, body } = parseYamlFrontmatter(raw)` |
| `parseMarkdownSections(raw)` | 마크다운 섹션 파싱 | `const sections = parseMarkdownSections(raw)` |

## 에이전트 경로 체계

`data/agents.json`에 정의된 경로 규칙:

| 경로 키 | Claude | Codex | Copilot | OpenCode |
|---------|--------|-------|---------|----------|
| globalHome | `~/.claude` | `~/.codex` | `~/.copilot` | `~/.config/opencode` |
| projectDir | `.claude` | `.codex` | `.github` | `.opencode` |
| settings | `settings.json` | `config.toml` | — | `opencode.json` |
| skills | `skills` | `skills` | `prompts` | `skills` |
| hooks | `settings.json#hooks` | — | — | — |
| mcp | `.mcp.json`, `settings.json#mcpServers` | `config.toml#mcp` | — | `opencode.json#mcp` |

`#` 구문: 파일 내 특정 키를 참조 (예: `settings.json#hooks` → settings.json의 hooks 키)

## 파일 수정 안전 규칙

1. 수정 전 `backupFile()` 호출 필수
2. 디렉토리 생성 시 `ensureDir()` 사용
3. JSON 파싱 실패를 try-catch로 감쌈
4. `resolveHome()`으로 `~` 경로 변환
5. 존재하지 않는 파일은 `safeReadFile()`로 빈 문자열 반환
