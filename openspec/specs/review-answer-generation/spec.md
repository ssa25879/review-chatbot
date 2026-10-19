# review-answer-generation Specification

## Purpose

Chat API가 사용자 질문에 대한 답변 응답을 만드는 서버 측 동작(입력 검증, 답변 내용, 응답 형식, 오류 처리)을 정의한다. 현재는 검색 결과 요약 템플릿으로 답변하며, 이후 리뷰 근거 LLM 답변으로 교체된다.

## Requirements

### Requirement: Chat API 요청 검증
`POST /api/chat`은 `{ query: string, chatId?: string }` 본문을 SHALL 받는다. `query`가 없거나 공백뿐이거나 본문이 올바른 JSON이 아니면 HTTP 400과 `{ success: false, error }`를 반환해야 한다(MUST).

#### Scenario: 빈 질문
- **WHEN** `{ "query": "   " }`로 요청하면
- **THEN** HTTP 400과 `{ success: false, error: "질문을 입력해 주세요." }`가 반환된다

#### Scenario: chatId 생략
- **WHEN** `chatId` 없이 유효한 `query`로 요청하면
- **THEN** 요청은 정상 처리되고 대화 기록은 기본 대화 단위로 저장된다

### Requirement: 검색 결과 요약 답변
Chat API는 질문으로 관련 리뷰 최대 5건을 검색하고, LLM을 호출하지 않고 검색 결과를 요약한 자연어 문장을 `answer`로 SHALL 반환한다. 답변은 질문, 찾은 리뷰 수, 평균 별점, 관련도가 가장 높은 리뷰의 작성자·제목을 포함하고, AI 답변 생성이 준비 중임을 알려야 한다(MUST).

#### Scenario: 요약 답변
- **WHEN** "통화 품질 괜찮아?"로 요청하면
- **THEN** `answer`는 JSON이 아닌 일반 문장이며 "통화 품질 괜찮아?", 리뷰 건수, 평균 별점, 첫 번째 source의 작성자를 포함한다

#### Scenario: API 키 없이 동작
- **WHEN** `ANTHROPIC_API_KEY`가 설정되지 않은 상태로 유효한 질문을 보내면
- **THEN** HTTP 200과 성공 응답이 반환된다

### Requirement: Chat API 성공 응답 형식
성공 시 응답은 `{ success: true, mode, answer, sources, retrieval }`를 SHALL 따른다. `sources`는 검색된 리뷰 목록이며 각 항목은 `id`, `title`, `content`, `rating`, `author`, `date`, `score`를 포함해야 한다(MUST).

#### Scenario: Mock 모드 성공 응답
- **WHEN** Mock 모드에서 유효한 질문으로 요청하면
- **THEN** `mode: "mock"`, 비어 있지 않은 `answer`, 1~5건의 `sources`가 반환되고 각 source는 0.65~0.98의 `score`를 가진다

### Requirement: 검색 근거 데이터
성공 응답의 `retrieval`은 `query`(검증된 질문), `chatId`(요청 값, 생략 시 `null`), `context`를 SHALL 포함한다. `context`는 `sources`의 각 리뷰를 순서대로 `[리뷰 N] ★{rating} {title} — {content} (작성자: {author})` 형식으로 줄바꿈 연결한 문자열이어야 한다(MUST).

#### Scenario: 근거 데이터 반환
- **WHEN** `chatId: "c1"`과 "통화 품질 괜찮아?"로 요청하면
- **THEN** `retrieval.query`는 "통화 품질 괜찮아?", `retrieval.chatId`는 "c1"이고 `retrieval.context`는 `[리뷰 1] ★`로 시작하며 `sources` 수만큼의 줄을 가진다

#### Scenario: chatId 생략 시 근거 데이터
- **WHEN** `chatId` 없이 요청하면
- **THEN** `retrieval.chatId`는 `null`이다

### Requirement: 서버 오류 처리
리뷰 적재·검색 등 답변 응답을 만드는 중 예기치 않은 오류가 발생하면 Chat API는 HTTP 500과 사용자에게 보여줄 수 있는 `{ success: false, error }`를 SHALL 반환한다. 오류 응답에 내부 스택이나 파일 경로를 포함해서는 안 된다(MUST NOT).

#### Scenario: 리뷰 데이터 로드 실패
- **WHEN** 샘플 리뷰 파일을 읽을 수 없는 상태에서 유효한 질문으로 요청하면
- **THEN** HTTP 500과 `{ success: false, error }`가 반환되고 대화 기록은 저장되지 않는다
