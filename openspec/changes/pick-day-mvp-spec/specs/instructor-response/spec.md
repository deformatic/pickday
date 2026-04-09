## ADDED Requirements

### Requirement: 응답 폼 표시
강사는 참여 링크로 접속하면 단일 페이지에서 모든 입력을 완료할 수 있다. 이름은 항상 필수이며, 이메일·전화번호 필수 여부는 해당 일정의 `require_email`, `require_phone` 설정에 따라 동적으로 결정된다.

#### Scenario: 필수 필드 동적 표시
- **WHEN** 강사가 `require_email = true`인 일정 링크에 접속하면
- **THEN** 응답 폼에서 이메일 필드가 `*` 표기와 함께 필수로 표시된다

#### Scenario: 선택 필드 표시
- **WHEN** 강사가 `require_phone = false`인 일정 링크에 접속하면
- **THEN** 전화번호 필드는 선택 사항으로 표시된다

---

### Requirement: 응답 제출
강사는 이름(필수), 가능 일정 선택(필수, 복수 선택 가능), 이메일·전화번호(설정에 따라), 코멘트(선택)를 입력하고 제출할 수 있다.

#### Scenario: 유효한 응답 제출
- **WHEN** 강사가 필수 항목을 모두 입력하고 일정을 1개 이상 선택한 후 제출하면
- **THEN** `responses` 레코드와 `response_selected_options` 레코드가 생성되고 완료 메시지를 표시한다

#### Scenario: 일정 미선택 제출
- **WHEN** 강사가 가능 일정을 하나도 선택하지 않고 제출하면
- **THEN** 유효성 에러를 표시하고 제출을 차단한다

#### Scenario: 필수 이메일 누락
- **WHEN** `require_email = true`인 일정에서 이메일 없이 제출하면
- **THEN** 유효성 에러를 표시하고 제출을 차단한다

---

### Requirement: 응답 수정
강사는 이미 제출한 응답을 수정할 수 있다. 동일한 이름+이메일+전화번호 조합으로 재제출하면 기존 응답을 덮어쓴다.

#### Scenario: 재제출로 응답 수정
- **WHEN** 강사가 동일한 이름+이메일+전화번호로 다시 응답을 제출하면
- **THEN** 기존 `responses` 레코드가 업데이트되고 `response_selected_options`가 교체된다

#### Scenario: 신규 강사 재제출
- **WHEN** 일치하는 기존 응답이 없는 경우 제출하면
- **THEN** 새 `responses` 레코드가 생성된다

---

### Requirement: Rate Limiting
동일 IP에서 과도한 제출을 방지하기 위해 분당 10회로 제한한다.

#### Scenario: 한도 초과 제출
- **WHEN** 동일 IP에서 1분 내 11번째 응답 제출을 시도하면
- **THEN** 시스템은 429 에러를 반환하고 제출을 거부한다
