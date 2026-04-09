## Why

교육업체 담당자가 강사 일정을 조율할 때 메신저/전화 기반의 반복 커뮤니케이션으로 인한 비용과 오류를 제거하기 위해, 링크 하나로 일정 응답을 수집하고 강사를 배정할 수 있는 시스템이 필요하다. Vercel + Supabase 무료 플랜만으로 즉시 배포 가능한 MVP를 구축한다.

## What Changes

- 교육업체 담당자가 교육 일정 후보를 생성하고 고유 링크(참여/관리자)를 발급하는 기능 추가
- 강사가 로그인 없이 링크에 접속해 가능한 일정을 선택·제출하는 응답 폼 추가
- 이름/이메일/연락처 기반 자동완성으로 강사 중복 입력 방지
- 관리자가 응답 목록·집계를 확인하고 강사를 배정하는 대시보드 추가
- Public / Password-protected 두 가지 접근 모드 지원

## Capabilities

### New Capabilities

- `schedule-management`: 일정 생성, 토큰 발급(참여/관리자), 비밀번호 설정, 일정 후보 관리
- `instructor-response`: 강사 응답 폼 (이름·이메일·연락처·일정 선택·코멘트), 응답 수정
- `instructor-identity`: 강사 자동완성 및 중복 방지 (이름+이메일+연락처 기준 upsert)
- `admin-dashboard`: 응답 리스트 조회, 일정별 집계, 강사 배정

### Modified Capabilities

<!-- 기존 스펙 없음 - 신규 프로젝트 -->

## Impact

- **Frontend**: Next.js App Router (Vercel 무료 배포) — 4개 페이지: 일정 생성, 응답 폼, 관리자 대시보드, 비밀번호 게이트
- **Backend**: Next.js Route Handlers (Serverless) — API 레이어, bcrypt 비밀번호 해싱, rate limiting
- **Database**: Supabase PostgreSQL (무료 플랜) — 5개 테이블: schedules, schedule_options, instructor_identities, responses, response_selected_options
- **외부 의존성 없음**: 이메일, OAuth, 외부 스토리지 미사용 (MVP 범위 외)
