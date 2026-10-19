# Spec Delta

## MODIFIED Requirements

### Requirement: 샘플 데이터 인덱싱 버튼
사이드바는 [샘플 데이터 인덱싱] 버튼을 SHALL 제공한다. 클릭 시 인덱싱 API(`POST /api/index-data`)를 호출하고, 버튼은 대기(idle)·진행 중(loading)·완료(success)·실패(error) 상태를 시각적으로 구분해 표시해야 한다(MUST). 진행 중에는 재클릭이 불가능해야 한다.

#### Scenario: 인덱싱 진행 중
- **WHEN** 사용자가 버튼을 클릭해 요청이 진행 중이면
- **THEN** 버튼에 회전하는 스피너와 "인덱싱 중..." 문구가 표시되고 버튼은 비활성화된다

#### Scenario: 인덱싱 성공
- **WHEN** API가 `{ success: true, data: { indexed } }`를 반환하면
- **THEN** 완료 아이콘과 함께 "N건 인덱싱 완료" 형태로 처리 건수가 표시되고, 버튼은 다시 클릭 가능하다

#### Scenario: 인덱싱 실패
- **WHEN** API가 `success: false`를 반환하거나 네트워크 오류가 발생하면
- **THEN** 실패 아이콘과 오류 메시지가 표시되고, 버튼은 다시 클릭 가능하다
