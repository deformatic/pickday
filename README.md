This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 운영 가이드

### 관리자 인증 토큰 운영
- `POST /api/admin/{adminToken}/verify` 성공 시 서버는 짧은 TTL의 서명 토큰을 HTTP-only, Secure, SameSite=Strict 쿠키로 발급합니다.
- 관리자 API(`GET /api/admin/{adminToken}/responses` 및 하위 수정/삭제)는 비밀번호 대신 해당 토큰(쿠키 또는 Bearer)을 검증합니다.
- `ADMIN_AUTH_TOKEN_SECRET`은 32자 이상으로 설정하고 정기적으로 교체합니다.

### 로깅 보안
- 요청/응답/헤더 로깅에서 인증 토큰(`Authorization: Bearer`, `pd_admin_auth` 쿠키)은 반드시 마스킹 처리합니다.
- 애플리케이션 로그, APM, 리버스 프록시(Vercel/NGINX) 접근 로그, 에러 리포트에 토큰 원문이 남지 않도록 필터 규칙을 설정합니다.
