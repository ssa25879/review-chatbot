# Design

## Context

- 저장소는 create-next-app 직후 상태다(Next.js 16.4 App Router, React 19.3, Tailwind v4 — `@import "tailwindcss"` + `@theme inline`). `src/components`, `src/lib`, API 라우트는 아직 없다.
- `lucide-react`는 설치되어 있지 않다.
- 이 버전의 Next.js는 학습 데이터와 다른 점이 있으므로, 구현 전 `node_modules/next/dist/docs/01-app/`의 Server/Client Component, Route Handler 가이드를 확인한다(AGENTS.md).
- `samples/review.csv`(100건, 컬럼: `id,rating,title,content,author,date,helpful_votes,verified_purchase`)가 단일 상품(무선 이어폰) 리뷰다. 배너의 리뷰 수·평균 평점은 이 데이터 기준 값을 쓴다.
- 요구사항은 `specs/review-dashboard/spec.md`, `specs/review-chat/spec.md` 참고.

## Goals / Non-Goals

**Goals:**
- 서버/클라이언트 경계를 최소화: 페이지는 Server Component, 상호작용 영역만 `'use client'`.
- API 계약을 타입으로 고정해, 후속 RAG 변경이 라우트 구현만 바꾸면 UI가 그대로 동작하도록 한다.
- 외부 UI 라이브러리 없이 Tailwind + lucide-react만으로 구현.

**Non-Goals:**
- 스트리밍 응답(SSE) — 단건 JSON 응답만 처리.
- 대화/히스토리의 새로고침 후 유지(서버 영속화는 후속 변경).
- 다크 모드 전용 디자인 튜닝(기본 `prefers-color-scheme` 대응만 유지).
- 자동화 테스트 프레임워크 도입(현재 미설치) — 수동 시나리오 검증 + `lint`/`build`로 확인.

## Decisions

### 1. 컴포넌트 구조
```
src/app/page.tsx                  (Server) USE_MOCK 읽어 mode 전달, <Dashboard mode=... product=... />
src/components/dashboard/
  Dashboard.tsx                   ('use client') 상태 소유: messages, history, isSending, draft, sidebarOpen
  Sidebar.tsx                     타이틀 + ModeBadge + IngestButton + HistoryList
  ModeBadge.tsx                   Database(Mock: amber) / Cloud(실데이터: emerald)
  IngestButton.tsx                자체 상태(idle|loading|success|error)
  HistoryList.tsx                 History, MessageSquare 아이콘
src/components/chat/
  ProductBanner.tsx               Headphones, Star, MessageSquareText
  MessageList.tsx                 자동 스크롤, EmptyState, TypingIndicator
  MessageBubble.tsx               User / Bot 아바타, 오류 시 AlertCircle
  SourceReviews.tsx               아코디언(ChevronDown 회전), BookOpen
  ReviewCard.tsx                  Star 별점, 관련도 배지, line-clamp-3 + 더보기
  ChatInput.tsx                   textarea 자동 높이, SendHorizontal / Loader2
src/lib/types.ts                  ChatMessage, SourceReview, ChatResponse, ApiResponse<T>, DataMode
src/lib/api-client.ts             sendChat(question), ingestSamples() — fetch + 응답 정규화
src/config/product.ts             상품 정보 상수(이름, 카테고리, 리뷰 수, 평균 평점)
src/app/api/chat/route.ts         스텁
src/app/api/ingest/route.ts       스텁
```
- **상태를 `Dashboard`에 집중**: 히스토리 클릭 → 입력창 채움, 예시 질문 클릭 → 입력창 채움, 전송 → 메시지/히스토리 갱신이 사이드바와 채팅 영역을 가로지르므로 공통 부모가 소유한다. 대안(Context/Zustand)은 현재 규모에서 과하다.
- `draft`를 `Dashboard`에서 제어 컴포넌트로 관리하고 `ChatInput`에 `inputRef`를 전달해 외부에서 포커스 이동.

### 2. 데이터 모드 판별: Server Component props
`page.tsx`(Server Component)에서 `process.env.USE_MOCK !== 'false' ? 'mock' : 'real'`을 계산해 props로 전달한다. `USE_MOCK`은 `NEXT_PUBLIC_` 접두사가 없어 클라이언트에서 읽을 수 없고, 별도 `/api/status` 호출은 첫 렌더 깜빡임과 추가 요청이 생긴다. 환경변수 변경을 런타임에 반영하기 위해 모드 판별은 요청 시점에 수행한다.

> **번들 문서 확인 결과 (Next.js 16.4.2, 태스크 1.1)**: 이 프로젝트는 `next.config.ts`에서 `cacheComponents: true`를 사용한다. 이 경우 Route Segment Config의 `dynamic`(`force-dynamic`)·`revalidate`·`fetchCache`는 **제거**되어 사용할 수 없다(`03-file-conventions/02-route-segment-config/index.md`). 대신 `next/cache`의 `io()`(v16.3+)를 `await`한 뒤 `process.env.USE_MOCK`을 읽는 비동기 Server Component를 `<Suspense>`로 감싸, 해당 부분만 정적 셸에서 제외하고 요청 시점에 렌더링한다(`04-functions/io.md`, `01-getting-started/08-caching.md` — Suspense 없이 요청 시점 데이터를 읽으면 blocking-route 경고). `connection()`도 가능하지만 문서가 `io()`를 권장한다. Route Handler의 `POST`는 캐시되지 않으므로 별도 설정이 필요 없다(`15-route-handlers.md`). Server→Client props는 직렬화 가능해야 하므로 `mode`(문자열)와 상품 상수(plain object)만 전달한다.

### 3. IME 방어
`ChatInput`의 `onKeyDown`:
```ts
if (e.key !== 'Enter' || e.shiftKey) return;
if (e.nativeEvent.isComposing || e.keyCode === 229) return;
e.preventDefault();
onSubmit();
```
- `keyCode === 229`는 일부 브라우저(Safari)에서 조합 종료 직후 Enter의 `isComposing`이 false로 오는 경우 대비.
- 추가 방어로 `Dashboard.handleSend`가 `isSending` 상태와 `useRef` 기반 in-flight 플래그를 함께 확인해, 같은 틱에 두 번 호출돼도 요청은 1회만 나간다(state는 비동기 갱신이라 ref가 필요).

### 4. API 클라이언트와 오류 정규화
`api-client.ts`는 항상 `ChatResponse`/`ApiResponse<T>`를 반환하고 throw하지 않는다. `fetch` 실패, non-2xx, JSON 파싱 실패를 모두 `{ success: false, error }`로 변환해 컴포넌트는 `success`만 분기한다.

### 5. 스텁 라우트
- `POST /api/chat`: `question` 검증(빈 값 → 400 `{ success:false, error }`), 약 800ms 지연 후 고정 안내 답변과 `samples/review.csv` 기반이 아닌 **하드코딩 샘플 3건**의 `sources`를 반환. CSV 파싱·검색은 후속 RAG 변경 범위이므로 의도적으로 넣지 않는다.
- `POST /api/ingest`: 약 1.2s 지연 후 `{ success: true, data: { count: 100, mode } }`.
- 응답 형식은 CLAUDE.md 규격 준수. 파일 상단에 "후속 변경에서 교체" 주석.

### 6. 스타일 / 아이콘
- Tailwind 유틸리티만 사용, 사이드바 `w-72` 고정 + `md:` 미만에서 오버레이 드로어(`Menu`/`X` 아이콘).
- 레이아웃은 `h-dvh flex`, 메시지 영역만 `overflow-y-auto`.
- 아이콘: `ShoppingBag`(타이틀), `Database`/`Cloud`(모드), `DatabaseZap`·`Loader2`(animate-spin)·`CheckCircle2`·`AlertCircle`(인덱싱), `History`, `Headphones`, `Star`, `User`, `Bot`, `BookOpen`, `ChevronDown`, `SendHorizontal`, `Sparkles`(빈 상태). 이 버전의 lucide-react에서 이름이 바뀐 아이콘이 있으면 설치 후 export 이름을 확인해 대체.
- `layout.tsx`: `lang="ko"`, 메타데이터 title을 "쇼핑 리뷰 AI 분석기"로. body의 `font-family: Arial` 덮어쓰기는 제거해 Geist + 시스템 한글 폰트가 쓰이도록 한다.

## Risks / Trade-offs

- [히스토리가 클라이언트 메모리에만 있어 새로고침 시 사라짐] → 스펙상 "현재 세션" 범위로 명시. 서버 `messages` 저장은 후속 변경.
- [스텁 응답이 실제 답변처럼 보여 혼동] → 스텁 답변 본문에 "(임시 응답)" 표기.
- [`isComposing`이 브라우저마다 다르게 동작] → `keyCode 229` 체크 + in-flight ref 이중 방어, Chrome/Edge에서 한글 입력 수동 검증.
- [Next 16 API가 학습 지식과 다를 수 있음] → 구현 첫 단계에서 번들 문서 확인 태스크 포함.
- [상품 배너 값이 하드코딩] → `src/config/product.ts` 한 곳에 모아 후속 변경에서 데이터 기반으로 교체 용이.

## Migration Plan

신규 화면 교체이며 기존 사용자/데이터가 없다. 롤백은 커밋 revert로 충분하다.
