# Spec Delta

## MODIFIED Requirements

### Requirement: 검색 결과 요약 답변
Mock 모드의 Chat API는 질문으로 관련 리뷰 최대 5건을 검색하고, LLM을 호출하지 않고 검색 결과를 요약한 자연어 문장을 `answer`로 SHALL 반환한다. 답변은 질문, 찾은 리뷰 수, 평균 별점, 관련도가 가장 높은 리뷰의 작성자·제목을 포함하고, AI 답변 생성이 준비 중임을 알려야 한다(MUST).

#### Scenario: 요약 답변
- **WHEN** Mock 모드에서 "통화 품질 괜찮아?"로 요청하면
- **THEN** `answer`는 JSON이 아닌 일반 문장이며 "통화 품질 괜찮아?", 리뷰 건수, 평균 별점, 첫 번째 source의 작성자를 포함한다

#### Scenario: API 키 없이 동작
- **WHEN** Mock 모드에서 LLM API 키(`GEMINI_API_KEY` 등)가 설정되지 않은 상태로 유효한 질문을 보내면
- **THEN** HTTP 200과 성공 응답이 반환된다

### Requirement: Chat API 성공 응답 형식
성공 시 응답은 `{ success: true, mode, answer, sources, retrieval }`를 SHALL 따른다. `sources`는 검색된 리뷰 목록이며 각 항목은 `id`, `title`, `content`, `rating`, `author`, `date`, `score`를 포함해야 한다(MUST). 응답 형식은 Mock/실데이터 모드에서 동일하다.

#### Scenario: Mock 모드 성공 응답
- **WHEN** Mock 모드에서 유효한 질문으로 요청하면
- **THEN** `mode: "mock"`, 비어 있지 않은 `answer`, 1~5건의 `sources`가 반환되고 각 source는 0.65~0.98의 `score`를 가진다

#### Scenario: 실데이터 모드 성공 응답
- **WHEN** 인덱싱이 끝난 실데이터 모드에서 유효한 질문으로 요청하면
- **THEN** `mode: "real"`, 비어 있지 않은 `answer`, 1~5건의 `sources`, `retrieval`이 Mock 모드와 같은 형식으로 반환된다

## ADDED Requirements

### Requirement: 실데이터 리뷰 근거 LLM 답변
실데이터 모드의 Chat API는 검색된 리뷰의 `retrieval.context`만을 근거로 `gemini-3.5-flash-lite` 모델이 생성한 답변을 `answer`로 SHALL 반환한다. 시스템 지시는 전자제품 쇼핑몰 리뷰 분석가 역할로, 제공된 리뷰 데이터만 바탕으로 답하고, 리뷰에 없는 사실을 지어내지 않으며, 장단점을 균형 있게 설명하고 작성자 의견을 인용하도록 요구해야 한다(MUST).

#### Scenario: 일반 텍스트 답변
- **WHEN** 실데이터 모드에서 답변이 생성되면
- **THEN** `answer`에는 `**`, `#` 제목, 줄 앞 `-`·`*`·`1.` 목록 기호, 백틱 같은 마크다운 서식이 포함되지 않고, 문단은 빈 줄로만 구분된다

#### Scenario: 근거 기반 LLM 답변
- **WHEN** 실데이터 모드에서 "통화 품질 괜찮아?"로 요청하면
- **THEN** 검색된 리뷰가 컨텍스트로 모델에 전달되고, `answer`는 모델이 생성한 일반 문장이다

#### Scenario: 검색 결과 없음
- **WHEN** 실데이터 모드에서 검색 결과가 0건이면
- **THEN** LLM을 호출하지 않고 관련 리뷰가 없으며 먼저 샘플 데이터 인덱싱이 필요할 수 있다는 안내 문장을 `answer`로, 빈 `sources`와 함께 반환한다

### Requirement: 답변 생성 실패 처리
실데이터 모드에서 `GEMINI_API_KEY`가 없거나 LLM 호출이 실패하면 Chat API는 HTTP 500과 사용자에게 보여줄 수 있는 `{ success: false, mode: "real", error }`를 SHALL 반환한다. 이 경우 대화 기록을 저장하지 않으며, 오류 응답에 키 값이나 내부 스택을 포함해서는 안 된다(MUST NOT).

#### Scenario: LLM 호출 실패
- **WHEN** 실데이터 모드에서 Gemini API가 인증 오류 또는 호출 한도 초과 오류를 반환하면
- **THEN** HTTP 500과 `{ success: false, mode: "real", error }`가 반환되고 Supabase `messages`에 행이 추가되지 않는다
