## ADDED Requirements

### Requirement: 일정 생성
관리자는 교육명, 지역, 시간 정보, 일정 후보(1개 이상)를 입력하여 일정을 생성할 수 있다. 생성 시 `scheduleToken`(참여용)과 `adminToken`(관리용)이 각각 독립적으로 발급된다. 관리자 비밀번호는 필수이며 bcrypt로 해싱 저장된다.

#### Scenario: 유효한 입력으로 일정 생성
- **WHEN** 관리자가 교육명, 지역, 시간 정보, 일정 후보 1개 이상, 관리자 비밀번호를 입력하고 제출하면
- **THEN** 시스템은 `schedules` 레코드와 `schedule_options` 레코드를 생성하고, 참여 링크(`/s/{scheduleToken}`)와 관리자 링크(`/admin/{adminToken}`)를 반환한다

#### Scenario: 관리자 비밀번호 누락
- **WHEN** 관리자 비밀번호 없이 일정 생성을 시도하면
- **THEN** 시스템은 400 에러를 반환하고 일정을 생성하지 않는다

#### Scenario: 일정 후보 없음
- **WHEN** 일정 후보를 0개로 제출하면
- **THEN** 시스템은 400 에러를 반환한다

---

### Requirement: 접근 모드 설정
관리자는 일정 생성 시 Public 모드(비밀번호 없음) 또는 Protected 모드(참여 비밀번호 설정)를 선택할 수 있다.

#### Scenario: Protected 모드 설정
- **WHEN** 관리자가 참여 비밀번호를 입력하면
- **THEN** `schedules.is_protected = true`이며 `access_password_hash`에 bcrypt 해시가 저장된다

#### Scenario: Public 모드 (기본값)
- **WHEN** 관리자가 참여 비밀번호를 입력하지 않으면
- **THEN** `schedules.is_protected = false`이며 강사는 비밀번호 없이 접근 가능하다

---

### Requirement: 응답 필드 필수 여부 설정
관리자는 일정 생성 시 강사 이메일과 전화번호 각각에 대해 독립적으로 필수 여부를 설정할 수 있다. 기본값은 선택(optional)이다.

#### Scenario: 이메일 필수 설정
- **WHEN** 관리자가 `require_email = true`로 설정하면
- **THEN** 해당 일정의 응답 폼에서 이메일 필드에 `*` 표기와 함께 필수 입력이 적용된다

#### Scenario: 전화번호 선택 설정 (기본)
- **WHEN** 관리자가 `require_phone`을 설정하지 않으면
- **THEN** `require_phone = false`이며 응답 폼에서 전화번호는 선택 입력으로 표시된다

---

### Requirement: 참여 링크 비밀번호 검증
Protected 모드 일정에 접근할 때, 시스템은 참여 비밀번호를 검증한 후 응답 폼을 표시한다.

#### Scenario: 올바른 비밀번호 입력
- **WHEN** 강사가 올바른 비밀번호를 입력하면
- **THEN** 응답 폼 페이지로 진입한다

#### Scenario: 잘못된 비밀번호 입력
- **WHEN** 강사가 잘못된 비밀번호를 입력하면
- **THEN** 에러 메시지를 표시하고 폼 진입을 차단한다

#### Scenario: Public 모드 직접 접근
- **WHEN** Public 모드 일정 링크(`/s/{token}`)에 접속하면
- **THEN** 비밀번호 입력 없이 바로 응답 폼이 표시된다
