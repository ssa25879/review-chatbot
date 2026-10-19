# review-retrieval Specification

## Purpose

질문에 답하기 위한 근거 리뷰를 적재하고 검색하며 대화 기록을 보관하는 데이터 계층을 정의한다. Mock 모드(로컬 CSV + 서버 메모리)와 실데이터 모드의 분기 경계를 소유한다.

## Requirements

### Requirement: 샘플 리뷰 인덱싱 API
`POST /api/index-data`는 `samples/review.csv`의 모든 리뷰를 현재 모드의 저장소에 적재하고 `{ success: true, mode, data: { indexed: N } }`를 SHALL 반환한다. N은 적재된 리뷰 수이며 샘플 파일 기준 100이다. Mock 모드는 서버 메모리에, 실데이터 모드는 Supabase `reviews` 테이블과 Pinecone `reviews` 네임스페이스 양쪽에 적재한다. 반복 호출해도 중복 적재되지 않아야 한다(MUST).

#### Scenario: 최초 인덱싱
- **WHEN** 서버 기동 후 `POST /api/index-data`를 호출하면
- **THEN** `{ success: true, mode: "mock", data: { indexed: 100 } }`가 반환된다

#### Scenario: 반복 인덱싱
- **WHEN** `POST /api/index-data`를 두 번 연속 호출하면
- **THEN** 두 응답 모두 `indexed: 100`이며 저장된 리뷰 수는 100건으로 유지된다

#### Scenario: 샘플 파일 읽기 실패
- **WHEN** `samples/review.csv`를 읽거나 파싱할 수 없으면
- **THEN** HTTP 500과 함께 `{ success: false, error }`가 반환된다

#### Scenario: 실데이터 인덱싱
- **WHEN** 실데이터 모드에서 `POST /api/index-data`를 두 번 연속 호출하면
- **THEN** 두 응답 모두 `{ success: true, mode: "real", data: { indexed: 100 } }`이고, Supabase `reviews` 테이블의 행 수와 Pinecone `reviews` 네임스페이스의 레코드 수는 각각 100으로 유지된다

#### Scenario: 실데이터 적재 실패
- **WHEN** 실데이터 모드에서 Supabase upsert 또는 Pinecone 적재가 실패하면
- **THEN** HTTP 500과 함께 `{ success: false, mode: "real", error }`가 반환되고 오류 문구에 키 값이나 스택이 포함되지 않는다

### Requirement: 리뷰 레코드 필드
적재된 각 리뷰는 `id`, `rating`(1~5 정수), `title`, `content`, `author`, `date`(YYYY-MM-DD 문자열), `helpful_votes`(0 이상 정수)를 SHALL 가진다. CSV 원본의 모든 행이 필드 누락·밀림 없이 적재되어야 한다(MUST).

#### Scenario: 본문에 쉼표가 포함된 리뷰
- **WHEN** 본문에 쉼표가 포함된 리뷰(예: r007, r013)를 적재하면
- **THEN** 본문 전체가 `content`에 보존되고 `author`·`date`가 올바른 값으로 적재된다

### Requirement: 키워드 기반 관련 리뷰 검색
Mock 모드의 검색은 질문을 공백 단위로 나누고 끝의 한국어 조사를 제거한 2글자 이상 키워드로, 리뷰 `title`·`content`의 키워드 출현 횟수와 `helpful_votes`를 조합해 관련도를 SHALL 계산한다. 결과는 관련도 내림차순 최대 5건이어야 한다(MUST). 인덱싱 전에 검색이 요청되면 먼저 자동 적재한다.

#### Scenario: 키워드 매칭
- **WHEN** "노이즈캔슬링 성능은 어때?"로 검색하면
- **THEN** `title` 또는 `content`에 "노이즈캔슬링"이 포함된 리뷰가 우선 반환되고 결과는 5건 이하다

#### Scenario: 조사 제거
- **WHEN** "배터리가 오래 가나요?"로 검색하면
- **THEN** "배터리" 키워드로 매칭된 리뷰가 반환된다

#### Scenario: 인덱싱 전 검색
- **WHEN** 인덱싱 API를 호출하지 않은 상태에서 채팅 질문이 들어오면
- **THEN** 리뷰가 자동 적재된 뒤 검색 결과가 반환된다

### Requirement: 매칭 없음 기본 결과
Mock 모드에서 질문에서 추출한 키워드가 어떤 리뷰와도 매칭되지 않거나 유효 키워드가 없으면, 검색은 `helpful_votes` 상위 5건을 SHALL 반환한다.

#### Scenario: 무관한 질문
- **WHEN** "ㅎㅎ"처럼 2글자 이상 키워드가 없거나 어떤 리뷰와도 매칭되지 않는 질문으로 검색하면
- **THEN** `helpful_votes`가 가장 높은 리뷰 5건이 반환된다

### Requirement: 관련도 점수 범위
Mock 모드 검색 결과의 각 리뷰는 0.65 이상 0.98 이하의 관련도 `score`를 SHALL 가진다. 결과 목록의 `score`는 내림차순이어야 한다(MUST).

#### Scenario: 점수 정규화
- **WHEN** Mock 모드에서 임의의 질문으로 검색하면
- **THEN** 모든 결과의 `score`가 0.65~0.98 범위이고 앞 항목의 점수가 뒤 항목보다 작지 않다

### Requirement: 대화 기록 저장
서버는 채팅 질문과 답변을 `chatId`별로 SHALL 저장한다. 각 기록은 역할(user/assistant), 내용, 생성 시각을 포함한다. Mock 모드는 서버 메모리에 저장하며 서버 재시작 시 사라질 수 있다. 실데이터 모드는 Supabase `messages` 테이블에 영구 저장하고, assistant 기록에는 답변 근거 `sources`를 JSON으로 함께 저장해야 한다(MUST).

#### Scenario: 질문-답변 기록
- **WHEN** `chatId: "c1"`로 질문 1건이 성공적으로 답변되면
- **THEN** `c1`의 대화 기록에 user 메시지와 assistant 메시지가 순서대로 1건씩 추가된다

#### Scenario: 실데이터 기록 영속화
- **WHEN** 실데이터 모드에서 `chatId: "c1"`로 질문 1건이 성공적으로 답변되면
- **THEN** Supabase `messages`에 `chat_id = 'c1'`인 user 행과 assistant 행이 추가되고, assistant 행의 `sources`는 응답의 `sources`와 같은 JSON 배열이다

### Requirement: 데이터 모드 판정
서버는 환경변수 `USE_MOCK`이 정확히 `'false'`일 때만 실데이터 모드로, 그 외(미설정 포함)에는 Mock 모드로 SHALL 동작한다. 인덱싱·검색·대화 기록 저장은 모두 같은 모드 판정을 따라야 한다(MUST). 실데이터 모드에서 필요한 환경변수가 없으면 해당 API는 HTTP 500과 누락된 설정을 알리는 `{ success: false, error }`를 반환하며, 오류 문구에 키 값은 포함하지 않는다.

#### Scenario: USE_MOCK 미설정
- **WHEN** `USE_MOCK`이 설정되지 않은 상태로 인덱싱 또는 채팅 API를 호출하면
- **THEN** Mock 모드로 처리되고 응답의 `mode`는 `"mock"`이다

#### Scenario: 실데이터 모드
- **WHEN** `USE_MOCK=false`이고 필요한 환경변수가 모두 설정된 상태로 인덱싱 또는 채팅 API를 호출하면
- **THEN** Pinecone·Supabase를 사용해 처리되고 응답의 `mode`는 `"real"`이다

#### Scenario: 실데이터 설정 누락
- **WHEN** `USE_MOCK=false`이고 `PINECONE_API_KEY`가 설정되지 않은 상태로 인덱싱 API를 호출하면
- **THEN** HTTP 500과 함께 `PINECONE_API_KEY` 설정이 필요하다는 `{ success: false, mode: "real", error }`가 반환된다

### Requirement: 실데이터 의미 검색
실데이터 모드의 검색은 질문 텍스트로 Pinecone `reviews` 네임스페이스를 통합 임베딩 검색해 상위 최대 5건을 SHALL 반환한다. 각 결과는 hit의 `_id`를 `id`로, `_score`를 소수 둘째 자리로 반올림한 `score`로, `fields`의 `title`·`content`·`rating`·`author`를 그대로 사용하고, `date`는 Supabase `reviews`의 같은 `id` 행에서 채운다. 결과는 `score` 내림차순이어야 한다(MUST).

#### Scenario: 의미 기반 매칭
- **WHEN** 실데이터 모드에서 "노캔 성능 어때?"로 검색하면
- **THEN** 노이즈캔슬링 관련 리뷰가 포함된 최대 5건이 `score` 내림차순으로 반환되고, 각 결과는 `id`·`title`·`content`·`rating`·`author`·`date`·`score`를 가진다

#### Scenario: 인덱싱 전 실데이터 검색
- **WHEN** 실데이터 모드에서 Pinecone 네임스페이스가 비어 있는 상태로 검색하면
- **THEN** 빈 결과가 반환되며 오류가 발생하지 않는다
