# Proposal

## Why

현재 `src/app/page.tsx`는 create-next-app 기본 템플릿 그대로여서, 리뷰 분석 RAG 파이프라인을 붙여 시연·검증할 화면이 없다. Mock-First 전략에 따라 데이터/검색 계층보다 먼저 사용자가 실제로 사용할 대시보드 UI를 완성해, 이후 RAG·Pinecone·Supabase 연동 변경이 UI 수정 없이 API 응답만 교체하면 동작하도록 기반을 만든다.

## What Changes

- 기본 템플릿 페이지를 **2단 레이아웃 대시보드**(좌측 사이드바 + 우측 채팅 영역)로 교체한다.
- **좌측 사이드바**
  - 서비스 타이틀 "쇼핑 리뷰 AI 분석기"와 현재 데이터 모드 배지("Mock 모드" / "실데이터 모드")를 표시한다. 모드는 서버의 `USE_MOCK` 환경변수에서 결정한다.
  - [샘플 데이터 인덱싱] 버튼: 대기 → 로딩(스피너) → 완료/실패 상태를 표시한다.
  - 최근 분석 질문 히스토리 목록: 클릭 시 해당 질문을 입력창에 다시 채운다.
- **우측 채팅 영역**
  - 상단 분석 대상 상품 배너(예: "노이즈캔슬링 무선 이어폰 PRO", 리뷰 수/평균 평점 요약).
  - 중앙 메시지 스트림: 사용자 질문/AI 답변 버블, 응답 대기 중 로딩 표시, 빈 상태 안내 및 예시 질문.
  - AI 답변 하단 **참고 리뷰 카드(Top 3~5)**: 접힘/펼침 아코디언, 평점·작성자·제목·본문·유사도 점수 배지.
  - 하단 질문 입력창 + 전송 버튼: Enter 전송 / Shift+Enter 줄바꿈, `e.nativeEvent.isComposing` 체크로 한글 IME 중복 전송 방지, 전송 중 중복 요청 차단.
- UI 전반에 `lucide-react` 아이콘을 적용한다(신규 의존성).
- UI가 의존하는 API 계약(`POST /api/chat`, `POST /api/ingest`)을 클라이언트 타입/호출 계층으로 정의하고, 이 변경에서는 계약을 만족하는 **임시 스텁 라우트**를 둔다. 실제 키워드 검색·LLM 생성은 후속 RAG 변경에서 스텁을 교체한다.

## Capabilities

### New Capabilities
- `review-dashboard`: 대시보드 셸 — 2단 레이아웃, 서비스 타이틀·데이터 모드 배지, 상품 정보 배너, 샘플 데이터 인덱싱 컨트롤, 최근 질문 히스토리.
- `review-chat`: 채팅 상호작용 — 메시지 스트림, 질문 입력/전송(IME 방어 포함), AI 답변과 참고 리뷰 카드 표시, 오류 상태 표시.

### Modified Capabilities
(없음 — 기존 스펙 없음)

## Impact

- **코드**: `src/app/page.tsx`(교체), `src/app/layout.tsx`(메타데이터·`lang="ko"`), 신규 `src/components/**`, `src/lib/types.ts`, `src/lib/api-client.ts`, `src/config/product.ts`.
- **API**: 신규 스텁 `src/app/api/chat/route.ts`, `src/app/api/ingest/route.ts` (CLAUDE.md 응답 규격 준수). 후속 변경에서 실제 구현으로 대체.
- **의존성**: `lucide-react` 추가.
- **범위 외**: CSV 파싱·키워드 검색, LangChain/Anthropic 호출, 서버 측 대화 히스토리 영속화, Pinecone/Supabase 연동, 인증, 다중 상품 선택.
