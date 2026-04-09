## ADDED Requirements

### Requirement: 강사 자동완성
응답 폼에서 이름, 이메일, 전화번호 입력 시 기존 `instructor_identities` 레코드 기반으로 자동완성 추천을 제공한다.

#### Scenario: 이름 기반 자동완성
- **WHEN** 강사가 이름 필드에 2자 이상 입력하면
- **THEN** 시스템은 일치하는 `instructor_identities` 레코드를 최대 5개 반환하여 드롭다운으로 표시한다

#### Scenario: 추천 항목 선택
- **WHEN** 강사가 드롭다운에서 항목을 선택하면
- **THEN** 이름, 이메일, 전화번호 필드가 해당 레코드로 자동 채워진다

#### Scenario: 검색 결과 없음
- **WHEN** 입력한 이름과 일치하는 레코드가 없으면
- **THEN** 드롭다운을 표시하지 않고 강사가 직접 입력을 계속한다

---

### Requirement: InstructorIdentity 자동 등록 및 연결
강사가 응답을 제출할 때 `instructor_identities` 테이블에 자동으로 등록되거나 기존 레코드에 연결된다. 관리자가 사전 등록하지 않는다.

#### Scenario: 신규 강사 자동 등록
- **WHEN** 이름+이메일+전화번호 조합이 기존 레코드와 일치하지 않는 응답이 제출되면
- **THEN** 새 `instructor_identities` 레코드가 생성되고 `responses.instructor_identity_id`에 연결된다

#### Scenario: 기존 강사 재연결
- **WHEN** 이름+이메일+전화번호 조합이 기존 레코드와 일치하는 응답이 제출되면
- **THEN** 기존 `instructor_identities` 레코드를 재사용하여 `responses.instructor_identity_id`에 연결된다

#### Scenario: 이메일·전화번호 모두 없는 경우
- **WHEN** 이메일과 전화번호 모두 제공되지 않은 경우 응답이 제출되면
- **THEN** 이름만으로 매칭을 시도하며, 동명이인 가능성으로 `instructor_identity_id`는 `null`로 남긴다
