## Context

신규 프로젝트. 기존 코드베이스 없음. Vercel 무료 플랜(Hobby) + Supabase 무료 플랜(500MB DB, 2GB 대역폭)만 사용한다는 하드 제약이 있다. 로그인 시스템 없이 토큰 기반 URL로 모든 접근을 처리한다.

## Goals / Non-Goals

**Goals:**
- Vercel + Supabase 무료 플랜 내에서 완전히 동작
- 단일 Next.js 앱으로 프론트엔드 + API 레이어 통합
- 강사가 5초 내에 응답 제출 완료 (모바일 최적화)
- bcrypt로 비밀번호 해싱, 토큰 기반 URL로 인증 대체

**Non-Goals:**
- 이메일 발송, OAuth, 유료 외부 서비스
- 자동 매칭, 추천 알고리즘
- 실시간 업데이트 (WebSocket/SSE)
- 관리자 계정 시스템

## Decisions

### 1. Next.js App Router + Route Handlers (API)

서버 컴포넌트에서 직접 Supabase 쿼리. API가 필요한 경우 `app/api/` Route Handlers 사용.

**대안 고려**: Pages Router — App Router가 서버 컴포넌트 기반으로 무료 플랜 Edge Function 호출을 줄임.

### 2. Supabase Client (서버 사이드 전용)

`@supabase/supabase-js`를 서버 컴포넌트·Route Handler에서만 사용. 클라이언트에 DB 접근 키 노출 없음.

**대안 고려**: Supabase RLS + 클라이언트 SDK — 토큰 기반 접근 모델에서 RLS 규칙이 복잡해지므로 서버 사이드 접근으로 단순화.

### 3. 토큰: `nanoid` 생성 (21자)

`scheduleToken`(참여용) + `adminToken`(관리용) 각각 독립 발급. URL에 포함. 별도 세션/JWT 불필요.

### 4. 비밀번호: bcrypt (서버 사이드)

`bcryptjs` (순수 JS, Edge 런타임 호환). Protected 모드 일정에만 사용. 관리자 비밀번호는 항상 필수.

### 5. 데이터 모델: 5개 테이블

```
schedules
schedule_options       (FK → schedules)
instructor_identities  (name + email + phone 기준 upsert)
responses              (FK → schedules, instructor_identities)
response_selected_options (FK → responses, schedule_options)
```

`selected_option_ids`를 JSON 컬럼 대신 조인 테이블로 분리 — 집계 쿼리 단순화.

### 6. Rate Limiting: Vercel KV 없이 구현

Vercel 무료 플랜에는 KV가 없음. Supabase 테이블(`rate_limit_log`)에 IP + 타임스탬프 기록 후 서버 사이드에서 체크. 분당 10회 제한.

**대안 고려**: `upstash/ratelimit` — 무료 플랜 한도 초과 가능성으로 제외.

## Risks / Trade-offs

- **Supabase 무료 플랜 일시 중지**: 7일 비활성 시 DB 일시정지 → 사용 중 서비스면 무관, 장기 운영 시 주의
- **bcryptjs 성능**: Edge 런타임에서 bcrypt cost 10 기준 ~200ms → 비밀번호 검증 API만 해당, 허용 범위
- **토큰 충돌**: nanoid 21자 기준 충돌 확률 무시 가능 (10억 개에서 1% 확률 = ~10^12 토큰 필요)
- **Rate Limit DB 기록 누적**: 주기적 cleanup 없으면 테이블 비대화 → DB Function + cron으로 1시간 이전 레코드 자동 삭제

## Migration Plan

신규 프로젝트이므로 마이그레이션 없음.

1. Supabase 프로젝트 생성 → SQL 마이그레이션 파일 실행
2. Vercel 프로젝트 생성 → GitHub 연결 → 환경변수 설정
3. `main` 브랜치 push → 자동 배포

## Open Questions

- Supabase `rate_limit_log` cleanup: DB Function + pg_cron 사용 여부 (무료 플랜에서 pg_cron 활성화 가능)
- 관리자 링크 URL 패턴: `/admin/[adminToken]` vs `/a/[adminToken]` (짧은 URL 선호도 확인 필요)
