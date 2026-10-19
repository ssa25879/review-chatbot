# review-chat Specification

## Purpose

사용자가 상품 리뷰에 대해 자연어로 질문하고, AI 답변과 그 근거가 된 참고 리뷰를 함께 확인하는 채팅 상호작용을 정의한다.

## Requirements

### Requirement: 메시지 스트림 표시
채팅 영역 중앙은 사용자 질문과 AI 답변을 시간순으로 SHALL 표시한다. 사용자 메시지는 우측, AI 메시지는 좌측에 서로 다른 아이콘·색상의 버블로 구분되어야 하며(MUST), 새 메시지가 추가되면 스트림이 최하단으로 자동 스크롤되어야 한다.

#### Scenario: 질문과 답변 표시
- **WHEN** 사용자가 질문을 전송하고 답변을 받으면
- **THEN** 사용자 질문 버블이 우측에, AI 답변 버블이 좌측에 순서대로 표시되고 스트림이 최하단으로 스크롤된다

#### Scenario: 빈 대화 상태
- **WHEN** 아직 메시지가 없으면
- **THEN** 안내 문구와 클릭 가능한 예시 질문 3개 이상이 표시되고, 예시를 클릭하면 입력창에 해당 질문이 채워진다

### Requirement: 응답 대기 표시
질문 전송 후 응답을 받기 전까지 AI 메시지 위치에 로딩 표시를 SHALL 보여준다.

#### Scenario: 답변 생성 중
- **WHEN** 질문이 전송되어 `/api/chat` 응답을 기다리는 중이면
- **THEN** AI 버블 위치에 "리뷰를 분석하고 있어요" 문구와 로딩 애니메이션이 표시된다

### Requirement: 질문 입력과 전송
하단 입력창은 질문 입력과 전송 버튼을 SHALL 제공한다. Enter는 전송, Shift+Enter는 줄바꿈이어야 한다(MUST). 공백만 있는 입력은 전송하지 않으며, 전송 시 입력창을 비우고 `POST /api/chat`에 `{ question }`을 보낸다.

#### Scenario: Enter로 전송
- **WHEN** 사용자가 "음질 어때?"를 입력하고 Enter를 누르면
- **THEN** 질문이 한 번 전송되고 입력창이 비워진다

#### Scenario: Shift+Enter 줄바꿈
- **WHEN** 사용자가 Shift+Enter를 누르면
- **THEN** 전송되지 않고 입력창에 줄바꿈이 추가된다

#### Scenario: 빈 입력
- **WHEN** 입력창이 비어 있거나 공백만 있으면
- **THEN** 전송 버튼은 비활성화되고 Enter를 눌러도 전송되지 않는다

### Requirement: 한글 IME 중복 전송 방지
IME 조합 중(`isComposing === true`) 발생한 Enter 키 이벤트는 전송을 트리거해서는 안 된다(MUST NOT). 한글 입력 후 Enter 한 번으로 질문은 정확히 한 번만 SHALL 전송된다.

#### Scenario: 한글 조합 중 Enter
- **WHEN** 사용자가 "배터리"를 한글로 입력하고 마지막 글자 조합이 끝나지 않은 상태에서 Enter를 누르면
- **THEN** `/api/chat` 요청은 정확히 1회만 발생하고 사용자 메시지도 1개만 추가된다

### Requirement: 전송 중 중복 요청 차단
응답 대기 중에는 새 질문을 전송할 수 SHALL 없다. 전송 버튼과 Enter 전송이 모두 비활성화되어야 한다(MUST). 입력창 타이핑은 계속 가능하다.

#### Scenario: 응답 대기 중 재전송 시도
- **WHEN** 응답 대기 중 사용자가 전송 버튼을 클릭하거나 Enter를 누르면
- **THEN** 추가 요청이 발생하지 않는다

### Requirement: 참고 리뷰 카드
AI 답변 하단에는 응답의 `sources` 배열(최대 5건)을 참고 리뷰 카드로 SHALL 표시한다. 기본은 "참고 리뷰 N건" 헤더만 보이는 접힌 상태이며, 펼치면 각 카드에 별점(1~5), 작성자, 제목, 본문, 관련도 점수 배지가 표시되어야 한다(MUST). `sources`가 비어 있으면 섹션을 표시하지 않는다.

#### Scenario: 참고 리뷰 펼치기
- **WHEN** 사용자가 "참고 리뷰 3건" 헤더를 클릭하면
- **THEN** 3개의 리뷰 카드가 펼쳐져 별점·작성자·제목·본문·관련도 점수가 보이고, 다시 클릭하면 접힌다

#### Scenario: 긴 리뷰 본문
- **WHEN** 리뷰 본문이 3줄을 초과하면
- **THEN** 3줄까지만 보이고 "더보기"로 전체 본문을 펼칠 수 있다

#### Scenario: 근거 없음
- **WHEN** 응답의 `sources`가 비어 있거나 없으면
- **THEN** 참고 리뷰 섹션이 렌더링되지 않는다

### Requirement: 채팅 오류 표시
`/api/chat`이 `success: false`를 반환하거나 네트워크 오류가 발생하면 AI 메시지 위치에 오류 메시지를 SHALL 표시하고, 입력을 다시 가능하게 해야 한다(MUST).

#### Scenario: API 오류
- **WHEN** `/api/chat`이 `{ success: false, error: "..." }`를 반환하면
- **THEN** 경고 아이콘과 함께 오류 문구가 담긴 AI 버블이 표시되고 입력창이 다시 활성화된다

### Requirement: Chat API 응답 계약
UI는 `/api/chat` 응답을 `{ success: boolean, answer?: string, sources?: SourceReview[], error?: string }` 형식으로 SHALL 해석한다. `SourceReview`는 `id`, `rating`, `title`, `content`, `author`, `score`를 포함한다. UI는 Mock/실데이터 모드를 구분하지 않고 동일하게 렌더링해야 한다(MUST).

#### Scenario: 모드와 무관한 렌더링
- **WHEN** Mock 모드와 실데이터 모드에서 동일 형식의 응답이 반환되면
- **THEN** 답변과 참고 리뷰 카드가 동일한 방식으로 표시된다
