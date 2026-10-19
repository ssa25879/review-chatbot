# Spec Delta

## MODIFIED Requirements

### Requirement: 실데이터 리뷰 근거 LLM 답변
실데이터 모드의 Chat API는 검색된 리뷰의 `retrieval.context`만을 근거로, "답변 생성 모델 선택"에 따라 정해진 모델이 생성한 답변을 `answer`로 SHALL 반환한다. 시스템 지시는 전자제품 쇼핑몰 리뷰 분석가 역할로, 제공된 리뷰 데이터만 바탕으로 답하고, 리뷰에 없는 사실을 지어내지 않으며, 장단점을 균형 있게 설명하고 작성자 의견을 인용하도록 요구해야 한다(MUST). 시스템 지시와 응답 형식은 모델 공급자와 무관하게 동일하다.

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
실데이터 모드에서 선택된 공급자에 필요한 설정이 없거나 LLM 호출이 실패하면 Chat API는 HTTP 500과 사용자에게 보여줄 수 있는 `{ success: false, mode: "real", error }`를 SHALL 반환한다. 이 경우 대화 기록을 저장하지 않으며, 오류 응답에 키 값이나 내부 스택을 포함해서는 안 된다(MUST NOT).

#### Scenario: LLM 호출 실패
- **WHEN** 실데이터 모드에서 Gemini API가 인증 오류 또는 호출 한도 초과 오류를 반환하면
- **THEN** HTTP 500과 `{ success: false, mode: "real", error }`가 반환되고 Supabase `messages`에 행이 추가되지 않는다

#### Scenario: 로컬 LLM 연결 실패
- **WHEN** `LLM_PROVIDER=ollama`인데 Ollama 서버가 실행 중이 아니거나 `OLLAMA_MODEL`이 설치되어 있지 않으면
- **THEN** HTTP 500과 `{ success: false, mode: "real", error }`가 반환되고 Supabase `messages`에 행이 추가되지 않는다

## ADDED Requirements

### Requirement: 답변 생성 모델 선택
실데이터 모드의 답변 생성 모델은 환경변수 `LLM_PROVIDER`로 SHALL 결정된다. 미설정 또는 `gemini`이면 `gemini-3.5-flash-lite`(`GEMINI_API_KEY` 필요), `ollama`이면 `OLLAMA_BASE_URL`(미설정 시 `http://localhost:11434`)의 Ollama 서버에서 `OLLAMA_MODEL` 모델을 사용한다. 그 외 값이거나 `ollama`인데 `OLLAMA_MODEL`이 없으면 설정 오류로 처리해야 한다(MUST).

#### Scenario: 기본 공급자
- **WHEN** `LLM_PROVIDER`를 설정하지 않은 실데이터 모드에서 질문하면
- **THEN** Gemini로 답변이 생성되고 응답 형식은 이전과 같다

#### Scenario: 로컬 Ollama 공급자
- **WHEN** `LLM_PROVIDER=ollama`, `OLLAMA_MODEL=gemma4:e2b`이고 `GEMINI_API_KEY`가 없는 실데이터 모드에서 질문하면
- **THEN** 로컬 `gemma4:e2b`가 생성한 일반 텍스트 답변과 함께 HTTP 200 성공 응답이 반환된다

#### Scenario: 잘못된 공급자 값
- **WHEN** `LLM_PROVIDER=openai`로 실데이터 모드에서 질문하면
- **THEN** HTTP 500과 함께 허용 값(`gemini`, `ollama`)을 안내하는 `{ success: false, mode: "real", error }`가 반환되고 LLM은 호출되지 않는다

#### Scenario: Ollama 모델 미지정
- **WHEN** `LLM_PROVIDER=ollama`인데 `OLLAMA_MODEL`이 비어 있으면
- **THEN** HTTP 500과 `OLLAMA_MODEL` 설정이 필요하다는 `{ success: false, mode: "real", error }`가 반환된다
