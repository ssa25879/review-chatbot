# Spec Delta

## MODIFIED Requirements

### Requirement: 질문 입력과 전송
하단 입력창은 질문 입력과 전송 버튼을 SHALL 제공한다. Enter는 전송, Shift+Enter는 줄바꿈이어야 한다(MUST). 공백만 있는 입력은 전송하지 않으며, 전송 시 입력창을 비우고 `POST /api/chat`에 `{ query, chatId }`를 보낸다. `chatId`는 페이지 세션 동안 동일한 값을 유지한다.

#### Scenario: Enter로 전송
- **WHEN** 사용자가 "음질 어때?"를 입력하고 Enter를 누르면
- **THEN** 질문이 한 번 전송되고 입력창이 비워진다

#### Scenario: Shift+Enter 줄바꿈
- **WHEN** 사용자가 Shift+Enter를 누르면
- **THEN** 전송되지 않고 입력창에 줄바꿈이 추가된다

#### Scenario: 빈 입력
- **WHEN** 입력창이 비어 있거나 공백만 있으면
- **THEN** 전송 버튼은 비활성화되고 Enter를 눌러도 전송되지 않는다

#### Scenario: 세션 내 동일 chatId
- **WHEN** 사용자가 새로고침 없이 질문 두 개를 연달아 전송하면
- **THEN** 두 요청 본문의 `chatId`는 같은 값이다

### Requirement: Chat API 응답 계약
UI는 `/api/chat` 응답을 `{ success: boolean, mode?: "mock" | "real", answer?: string, sources?: SourceReview[], retrieval?: { query, chatId, context }, error?: string }` 형식으로 SHALL 해석한다. `SourceReview`는 `id`, `rating`, `title`, `content`, `author`, `date`, `score`를 포함한다. UI는 Mock/실데이터 모드를 구분하지 않고 동일하게 렌더링해야 한다(MUST).

#### Scenario: 모드와 무관한 렌더링
- **WHEN** Mock 모드와 실데이터 모드에서 동일 형식의 응답이 반환되면
- **THEN** 답변과 참고 리뷰 카드가 동일한 방식으로 표시된다

## ADDED Requirements

### Requirement: 검색 결과 JSON 보기
응답에 `retrieval`이 있으면 AI 답변 하단의 참고 리뷰 섹션 옆에 "검색 결과 JSON" 접이식 섹션을 SHALL 표시한다. 기본은 접힌 상태이며, 펼치면 `retrieval`의 `query`·`chatId`·`context`와 `sources`를 합친 객체를 들여쓰기된 고정폭 JSON으로 보여줘야 한다(MUST). 긴 내용은 섹션 내부에서 스크롤된다.

#### Scenario: JSON 펼치기
- **WHEN** 사용자가 "검색 결과 JSON" 헤더를 클릭하면
- **THEN** `query`, `chatId`, `context`, `sources` 키를 가진 들여쓰기된 JSON이 펼쳐지고, 다시 클릭하면 접힌다

#### Scenario: 근거 데이터 없음
- **WHEN** 응답에 `retrieval`이 없거나 오류 응답이면
- **THEN** 검색 결과 JSON 섹션이 렌더링되지 않는다
