# Spec Delta

## Purpose

질문에 답하기 위한 근거 리뷰를 적재하고 검색하며 대화 기록을 보관하는 데이터 계층을 정의한다. Mock 모드(로컬 CSV + 서버 메모리)와 실데이터 모드의 분기 경계를 소유한다.

## ADDED Requirements

### Requirement: 데이터 모드 결정
서버는 환경변수 `USE_MOCK`이 정확히 `'false'`일 때만 실데이터 모드로, 그 외(미설정 포함)에는 Mock 모드로 SHALL 동작한다. 인덱싱·검색·대화 기록 저장은 모두 같은 모드 판정을 따라야 한다(MUST).

#### Scenario: USE_MOCK 미설정
- **WHEN** `USE_MOCK`이 설정되지 않은 상태로 인덱싱 또는 채팅 API를 호출하면
- **THEN** Mock 모드로 처리되고 응답의 `mode`는 `"mock"`이다

#### Scenario: 실데이터 모드 미구현
- **WHEN** `USE_MOCK=false`로 인덱싱 또는 채팅 API를 호출하면
- **THEN** HTTP 501과 함께 `{ success: false, error }`(실데이터 모드 미지원 안내)가 반환된다

### Requirement: 샘플 리뷰 인덱싱 API
`POST /api/index-data`는 Mock 모드에서 `samples/review.csv`의 모든 리뷰를 서버 메모리에 적재하고 `{ success: true, mode: "mock", data: { indexed: N } }`를 SHALL 반환한다. N은 적재된 리뷰 수이며 샘플 파일 기준 100이다. 반복 호출해도 중복 적재되지 않아야 한다(MUST).

#### Scenario: 최초 인덱싱
- **WHEN** 서버 기동 후 `POST /api/index-data`를 호출하면
- **THEN** `{ success: true, mode: "mock", data: { indexed: 100 } }`가 반환된다

#### Scenario: 반복 인덱싱
- **WHEN** `POST /api/index-data`를 두 번 연속 호출하면
- **THEN** 두 응답 모두 `indexed: 100`이며 저장된 리뷰 수는 100건으로 유지된다

#### Scenario: 샘플 파일 읽기 실패
- **WHEN** `samples/review.csv`를 읽거나 파싱할 수 없으면
- **THEN** HTTP 500과 함께 `{ success: false, error }`가 반환된다

### Requirement: 리뷰 레코드 필드
적재된 각 리뷰는 `id`, `rating`(1~5 정수), `title`, `content`, `author`, `date`(YYYY-MM-DD 문자열), `helpful_votes`(0 이상 정수)를 SHALL 가진다. CSV 원본의 모든 행이 필드 누락·밀림 없이 적재되어야 한다(MUST).

#### Scenario: 본문에 쉼표가 포함된 리뷰
- **WHEN** 본문에 쉼표가 포함된 리뷰(예: r007, r013)를 적재하면
- **THEN** 본문 전체가 `content`에 보존되고 `author`·`date`가 올바른 값으로 적재된다

### Requirement: 키워드 기반 관련 리뷰 검색
검색은 질문을 공백 단위로 나누고 끝의 한국어 조사를 제거한 2글자 이상 키워드로, 리뷰 `title`·`content`의 키워드 출현 횟수와 `helpful_votes`를 조합해 관련도를 SHALL 계산한다. 결과는 관련도 내림차순 최대 5건이어야 한다(MUST). 인덱싱 전에 검색이 요청되면 먼저 자동 적재한다.

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
질문에서 추출한 키워드가 어떤 리뷰와도 매칭되지 않거나 유효 키워드가 없으면, 검색은 `helpful_votes` 상위 5건을 SHALL 반환한다.

#### Scenario: 무관한 질문
- **WHEN** "ㅎㅎ"처럼 2글자 이상 키워드가 없거나 어떤 리뷰와도 매칭되지 않는 질문으로 검색하면
- **THEN** `helpful_votes`가 가장 높은 리뷰 5건이 반환된다

### Requirement: 관련도 점수 범위
검색 결과의 각 리뷰는 0.65 이상 0.98 이하의 관련도 `score`를 SHALL 가진다. 결과 목록의 `score`는 내림차순이어야 한다(MUST).

#### Scenario: 점수 정규화
- **WHEN** 임의의 질문으로 검색하면
- **THEN** 모든 결과의 `score`가 0.65~0.98 범위이고 앞 항목의 점수가 뒤 항목보다 작지 않다

### Requirement: 대화 기록 저장
서버는 Mock 모드에서 채팅 질문과 답변을 `chatId`별로 서버 메모리에 SHALL 저장하고 조회할 수 있어야 한다. 각 기록은 역할(user/assistant), 내용, 생성 시각을 포함한다. 서버 프로세스가 재시작되면 기록은 사라질 수 있다.

#### Scenario: 질문-답변 기록
- **WHEN** `chatId: "c1"`로 질문 1건이 성공적으로 답변되면
- **THEN** `c1`의 대화 기록에 user 메시지와 assistant 메시지가 순서대로 1건씩 추가된다
