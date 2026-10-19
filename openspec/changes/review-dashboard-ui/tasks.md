# Tasks

## 1. 준비

- [x] 1.1 `node_modules/next/dist/docs/01-app/`에서 Server/Client Component, Route Handler, 동적 렌더링 관련 문서를 확인하고 design.md 결정(특히 `force-dynamic` 대체 수단)과 다른 점이 있으면 design.md에 반영 — 확인 결과를 design.md 또는 커밋 메시지에 기록
- [x] 1.2 `npm install lucide-react` 후 design.md에 나열한 아이콘 export가 모두 존재하는지 확인 — `node -e "const l=require('lucide-react');console.log(['ShoppingBag','Database','Cloud','DatabaseZap','Loader2','CheckCircle2','AlertCircle','History','Headphones','Star','User','Bot','BookOpen','ChevronDown','SendHorizontal','Sparkles','Menu','X'].filter(n=>!l[n]))"`가 빈 배열 출력

## 2. 타입·설정·API 계층

- [x] 2.1 `src/lib/types.ts`에 `DataMode`, `SourceReview`, `ChatMessage`, `ChatResponse`, `ApiResponse<T>`, `IngestResult` 정의 — `npx tsc --noEmit` 통과
- [x] 2.2 `src/config/product.ts`에 상품 정보 상수(이름 "노이즈캔슬링 무선 이어폰 PRO", 카테고리, 리뷰 수 100, 평균 평점은 `samples/review.csv` 기준 계산값) 작성 — `tsc` 통과
- [x] 2.3 `src/app/api/chat/route.ts` 스텁: 빈 `question` → 400 `{success:false,error}`, 정상 → 지연 후 "(임시 응답)" 답변 + 샘플 `sources` 3건 — `curl -X POST localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"question\":\"음질\"}"`와 빈 질문 요청으로 두 응답 형식 확인
- [x] 2.4 `src/app/api/ingest/route.ts` 스텁: 지연 후 `{success:true,data:{count:100,mode}}` — `curl -X POST localhost:3000/api/ingest`로 확인
- [x] 2.5 `src/lib/api-client.ts`에 `sendChat`, `ingestSamples` 구현(네트워크 오류·non-2xx·JSON 파싱 실패를 `{success:false,error}`로 정규화, throw 없음) — dev 서버 중지 상태에서 호출 시 오류 객체 반환을 브라우저 콘솔로 확인

## 3. 대시보드 셸 (review-dashboard)

- [x] 3.1 `layout.tsx`를 `lang="ko"`, 타이틀 "쇼핑 리뷰 AI 분석기"로 수정하고 `globals.css`의 body `font-family: Arial` 제거 — 브라우저 탭 제목 확인
- [x] 3.2 `page.tsx`를 Server Component로 교체: `USE_MOCK`으로 mode 계산, 동적 렌더링 설정 후 `<Dashboard>` 렌더 — `USE_MOCK` 미설정/`false` 각각 dev 실행해 배지 문구 변경 확인
- [x] 3.3 `Dashboard.tsx`('use client') 2단 레이아웃(`h-dvh`, 사이드바 `w-72`, 메시지 영역만 스크롤) 및 모바일 드로어(`Menu`/`X`) — 1024px/375px 뷰포트에서 레이아웃 시나리오 확인
- [x] 3.4 `Sidebar.tsx` + `ModeBadge.tsx`: 타이틀(`ShoppingBag`), Mock(amber·`Database`) / 실데이터(emerald·`Cloud`) 배지 — 3.2 확인과 함께 색상·아이콘 구분 확인
- [x] 3.5 `IngestButton.tsx`: idle/loading(`Loader2` 회전·비활성)/success("N건 인덱싱 완료")/error 상태 — 클릭 시 스피너→완료 표시, 라우트를 임시로 실패 응답하게 바꿔 오류 표시 확인 후 원복
- [x] 3.6 `HistoryList.tsx`: 최신순·중복 제거·최대 20개, 빈 상태 문구, 클릭 시 입력창 채움+포커스(자동 전송 없음) — 질문 2개 전송 후 순서/중복/클릭 동작 확인
- [x] 3.7 `ProductBanner.tsx`: 상품명·카테고리·리뷰 수·평균 평점(`Headphones`, `Star`) — 채팅 영역 상단 표시 확인

## 4. 채팅 (review-chat)

- [x] 4.1 `MessageList.tsx` + `MessageBubble.tsx`: 사용자 우측/AI 좌측(`User`/`Bot`), 새 메시지 시 자동 스크롤, 빈 상태 안내 + 예시 질문 3개(클릭 시 입력창 채움), 대기 중 "리뷰를 분석하고 있어요" 인디케이터, 오류 버블(`AlertCircle`) — 질문 전송·대기·응답·오류 시나리오를 화면에서 확인
- [x] 4.2 `ChatInput.tsx`: 제어 textarea 자동 높이, Enter 전송 / Shift+Enter 줄바꿈, 공백 입력 시 버튼 비활성, 전송 중 버튼 `Loader2` 표시 — 각 키 동작 수동 확인
- [x] 4.3 IME 방어: `onKeyDown`에서 `e.nativeEvent.isComposing || e.keyCode === 229` 시 무시, `Dashboard.handleSend`에 in-flight `useRef` 가드 — Chrome·Edge에서 한글 "배터리" 입력 직후 Enter 시 DevTools Network에 `/api/chat` 요청 1회, 사용자 메시지 1개만 생성됨을 확인
- [x] 4.4 응답 대기 중 전송 버튼 클릭/Enter 재시도 시 추가 요청 없음 확인(Network 탭), 대기 중에도 타이핑 가능
- [x] 4.5 `SourceReviews.tsx` + `ReviewCard.tsx`: "참고 리뷰 N건" 접힘 헤더(`BookOpen`, `ChevronDown` 회전), 펼침 시 별점·작성자·제목·본문·관련도 배지, `line-clamp-3` + 더보기, `sources` 비면 미렌더 — 스텁 응답으로 펼치기/접기/더보기 확인, 빈 `sources` 응답으로 미렌더 확인

## 5. 통합 검증

- [x] 5.1 `npm run lint` 및 `npm run build` 오류 없이 통과
- [x] 5.2 `specs/review-dashboard/spec.md`, `specs/review-chat/spec.md`의 모든 Scenario를 dev 서버에서 순서대로 수동 점검하고 결과 체크
- [x] 5.3 Conventional Commits 한국어 메시지로 커밋 (예: `feat: 리뷰 분석 대시보드 UI 구현`)

## Workflow follow-up

- 리뷰 후 `/opsx:archive`로 변경을 아카이브하고 `openspec/specs/`에 `review-dashboard`, `review-chat` 스펙이 생성됐는지 확인한다.
- 후속 변경(Mock RAG 파이프라인)에서 `/api/chat`, `/api/ingest` 스텁을 실제 구현으로 교체한다.
