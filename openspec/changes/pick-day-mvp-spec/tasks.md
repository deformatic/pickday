## 1. 프로젝트 초기화

- [x] 1.1 `npx create-next-app@latest` — App Router, TypeScript, Tailwind CSS
- [x] 1.2 Supabase 프로젝트 생성 및 환경변수 설정 (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [x] 1.3 `@supabase/supabase-js`, `bcryptjs`, `nanoid` 패키지 설치
- [x] 1.4 Vercel 프로젝트 생성 및 GitHub 연결, 환경변수 등록

## 2. 데이터베이스 마이그레이션

- [x] 2.1 `schedules` 테이블 생성 (`id`, `token`, `admin_token`, `title`, `location`, `time_info`, `is_protected`, `access_password_hash`, `admin_password_hash`, `require_email`, `require_phone`, `created_at`)
- [x] 2.2 `schedule_options` 테이블 생성 (`id`, `schedule_id`, `datetime`, `label`)
- [x] 2.3 `instructor_identities` 테이블 생성 (`id`, `name`, `email`, `phone`, `created_at`)
- [x] 2.4 `responses` 테이블 생성 (`id`, `schedule_id`, `instructor_identity_id`, `name`, `email`, `phone`, `comment`, `assigned_option_id`, `created_at`, `updated_at`)
- [x] 2.5 `response_selected_options` 조인 테이블 생성 (`response_id`, `option_id`)
- [x] 2.6 `rate_limit_log` 테이블 생성 (`id`, `ip`, `created_at`) + 1시간 이전 레코드 자동 삭제 DB Function

## 3. 일정 생성 기능 (schedule-management)

- [x] 3.1 `POST /api/schedules` Route Handler 구현 — 입력 검증, bcrypt 해싱, nanoid 토큰 생성, DB 저장
- [x] 3.2 일정 생성 페이지 (`/new`) UI 구현 — 교육명, 지역, 시간 정보, 일정 후보 동적 추가/삭제
- [x] 3.3 비밀번호 설정 옵션 UI — Protected 모드 토글, 참여 비밀번호, 관리자 비밀번호 입력
- [x] 3.4 이메일/전화번호 필수 여부 토글 UI
- [x] 3.5 생성 완료 페이지 — 참여 링크 + 관리자 링크 복사 버튼

## 4. 강사 응답 기능 (instructor-response)

- [x] 4.1 `GET /api/schedules/[token]` — 일정 정보 및 옵션 조회 (비밀번호 해시 제외)
- [x] 4.2 `POST /api/schedules/[token]/verify` — Protected 모드 비밀번호 검증
- [x] 4.3 비밀번호 게이트 페이지 (`/s/[token]`) — Protected 모드 시 비밀번호 입력 폼 선표시
- [x] 4.4 `POST /api/schedules/[token]/responses` — 응답 제출 (upsert 로직, rate limit 체크)
- [x] 4.5 응답 폼 페이지 (`/s/[token]/respond`) — 이름, 이메일, 전화번호, 일정 체크박스, 코멘트 UI
- [x] 4.6 동적 필수 필드 표시 로직 (`require_email`, `require_phone` 기반 `*` 표기)
- [x] 4.7 모바일 최적화 — 터치 친화적 체크박스, 단일 스크롤 레이아웃

## 5. 강사 자동완성 (instructor-identity)

- [x] 5.1 `GET /api/instructors/autocomplete?q=<query>` Route Handler — `instructor_identities` 검색, 최대 5개 반환
- [x] 5.2 응답 폼 이름 필드에 자동완성 드롭다운 컴포넌트 연결
- [x] 5.3 항목 선택 시 이메일·전화번호 자동 채움 로직

## 6. 관리자 대시보드 (admin-dashboard)

- [x] 6.1 `POST /api/admin/[adminToken]/verify` — 관리자 비밀번호 검증 + 단기 서명 토큰 발급
- [x] 6.2 `GET /api/admin/[adminToken]/responses` — 응답 목록 + 일정별 집계 조회 (서명 토큰 검증)
- [x] 6.3 `PATCH /api/admin/[adminToken]/responses/[responseId]` — 강사 배정 (`assigned_option_id` 업데이트)
- [x] 6.4 관리자 인증 페이지 (`/admin/[adminToken]`) — 비밀번호 입력 폼
- [x] 6.5 대시보드 페이지 (`/admin/[adminToken]/dashboard`) — 응답 목록 테이블 UI
- [x] 6.6 일정별 응답 집계 UI — 옵션별 응답 수 카드, 응답 수 내림차순 정렬
- [x] 6.7 강사 배정 UI — 응답 행에서 배정 버튼, 배정 상태 표시

## 7. 보안 및 마무리

- [x] 7.1 Rate Limit 미들웨어 — IP 기반 분당 10회 제한 (Supabase `rate_limit_log` 활용)
- [x] 7.2 입력 검증 — 모든 API Route Handler에 Zod 스키마 검증 적용
- [x] 7.3 404 페이지 — 유효하지 않은 토큰 접근 처리
- [x] 7.4 Vercel 배포 검증 — 프로덕션 환경변수 확인, 전체 플로우 E2E 테스트
