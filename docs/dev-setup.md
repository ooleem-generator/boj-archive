# 개발 환경 셋업 가이드

로컬에서 NEXT JUDGE를 실행하기 위한 환경 구성 절차입니다.

## 사전 요구사항

- **Node.js 20+** (`node -v`로 확인)
- **npm** (Node.js에 포함)
- **Git**
- Supabase 계정 (무료 플랜으로 충분)
- GitHub 계정 (OAuth App 등록용)

---

## 1. 레포 포크 & 클론

```bash
# GitHub에서 포크 후
git clone https://github.com/<your-username>/next-judge.git
cd next-judge
npm install
```

---

## 2. 환경변수 설정

`.env.example`을 복사해 `.env.local`을 만듭니다.

```bash
cp .env.example .env.local
```

`.env.local`에 아래 값들을 채웁니다.

### 2-1. Supabase (DB)

1. [supabase.com](https://supabase.com/)에서 새 프로젝트를 만듭니다.
   - Region: **Northeast Asia (Seoul)** 권장
   - Database Password: 기억해 두거나 따로 저장합니다 (URL에 포함됨)

2. 프로젝트 생성 후 대시보드 좌측 사이드바에서 **Project Settings → Database** 로 이동합니다.

3. **Connection string** 탭을 클릭하면 URI 형식 URL이 표시됩니다.
   - **Transaction mode** (포트 6543) → `POSTGRES_URL` 에 붙여넣기
   - **Session mode** (포트 5432) → `POSTGRES_URL_NON_POOLING` 에 붙여넣기

   URL 형식:
   ```
   postgres://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
   ```

   > `[password]` 부분은 프로젝트 생성 시 입력한 Database Password입니다.
   > 잊었다면 **Settings → Database → Reset database password** 에서 재설정합니다.

4. 두 URL을 `.env.local`에 채웁니다.

앱은 `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` 두 변수만 사용합니다.
Supabase 대시보드에 표시되는 그 외 키(`SUPABASE_ANON_KEY`, `POSTGRES_USER` 등)는 이 프로젝트에서 참조하지 않으므로 불필요합니다.

### 2-2. NextAuth

```bash
# AUTH_SECRET 생성 (1회만 실행)
npx auth secret
```

생성된 값을 `.env.local`의 `AUTH_SECRET`에 붙여넣습니다.

### 2-3. GitHub OAuth App

1. [GitHub Developer Settings](https://github.com/settings/developers) → **OAuth Apps → New OAuth App**
2. 다음 값으로 등록:
   - Application name: 임의 (예: `next-judge-local`)
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. **Client ID** → `AUTH_GITHUB_ID`
4. **Generate a new client secret** → `AUTH_GITHUB_SECRET`

### 2-4. Judge 입력 키

히든 테스트케이스 stdin을 브라우저에 전달할 때 AES-256-GCM으로 obfuscate하는 키입니다.
아무 값이나 생성해서 써도 됩니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

생성된 64자 hex 문자열을 `NEXT_PUBLIC_JUDGE_INPUT_KEY`에 넣습니다.

### 2-5. Notion (공지사항, 선택)

공지사항 기능 없이도 앱은 정상 동작합니다. 공지사항을 로컬에서 테스트하려면
[Notion Integration 생성](https://www.notion.so/my-integrations)이 필요합니다.

- `NOTION_TOKEN`: Integration 시크릿
- `NOTION_NOTICES_DB_ID`: 공지사항 Notion Database ID (페이지 URL의 마지막 32자)

`NOTION_TOKEN` 또는 `NOTION_NOTICES_DB_ID`가 없으면 빌드 시 공지사항 fetch를 건너뜁니다.

### 2-6. 완성된 .env.local 예시

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

AUTH_SECRET=<npx auth secret 결과>
AUTH_GITHUB_ID=<GitHub OAuth Client ID>
AUTH_GITHUB_SECRET=<GitHub OAuth Client Secret>

POSTGRES_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
POSTGRES_URL_NON_POOLING=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres

NEXT_PUBLIC_JUDGE_INPUT_KEY=<64자 hex>

# 선택
NOTION_TOKEN=
```

---

## 3. DB 마이그레이션

```bash
npm run db:migrate
```

이 명령은 `POSTGRES_URL_NON_POOLING`으로 direct 연결해 `db/migrations/` 아래 SQL 파일을 순서대로 적용합니다. 이미 적용된 파일은 skip합니다.

> Drizzle Studio로 테이블을 시각적으로 확인: `npm run db:studio`

---

## 4. 로컬 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 확인합니다.

---

## 5. 주요 스크립트 정리

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (HMR) |
| `npm run build` | 프로덕션 빌드 (공지사항 fetch → 마이그레이션 → Next.js 빌드) |
| `npm run type-check` | TypeScript 타입 체크 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 포매팅 |
| `npm run db:migrate` | DB 마이그레이션 적용 |
| `npm run db:generate` | 스키마 변경 후 migration 파일 생성 |
| `npm run db:studio` | Drizzle Studio UI |
| `npm run challenges:validate` | 문제 파일 스키마·솔루션 검증 |
| `npm run challenges:sync` | `challenges/` 폴더 → DB 동기화 (`POSTGRES_URL_NON_POOLING` 필요) |

---

## 6. 문제 데이터 로컬 DB에 반영

`challenges/` 폴더의 문제들을 로컬 DB에 넣으려면:

```bash
npm run challenges:sync
```

---

## 7. 코드 기여 흐름

1. `develop` 브랜치에서 새 브랜치를 만듭니다: `git checkout -b feat/my-feature develop`
2. 변경 후 `npm run type-check && npm run lint`로 검증합니다.
3. `develop` 브랜치로 PR을 올립니다.
4. 리뷰 후 머지되면 `develop → main` PR을 통해 프로덕션에 배포됩니다.

> 문제(challenge) 기여는 별도 가이드인 [CONTRIBUTING.md](../CONTRIBUTING.md)를 참고하세요.

---

## 8. 프로젝트 구조 요약

```
app/                  Next.js App Router 페이지 및 API routes
components/
  challenges/         문제 목록 페이지 컴포넌트
  problems/           문제 상세 + 에디터 컴포넌트
  notices/            공지사항 컴포넌트
  ui/                 공용 디자인 시스템 컴포넌트
db/
  schema.ts           Drizzle 스키마 정의
  migrations/         SQL 마이그레이션 파일
lib/
  judge/              채점 로직 (Web Worker, WASM 런타임)
challenges/           문제 파일 (problem.md, solution.py, testcases/)
scripts/              DB 동기화, 공지사항 fetch 등 유틸 스크립트
content/notices/      빌드 시 생성되는 공지사항 마크다운
docs/                 설계 문서 모음
```

---

## 트러블슈팅

| 증상 | 해결 |
|---|---|
| `POSTGRES_URL is not set` | `.env.local`에 값이 있는지, 파일 위치가 프로젝트 루트인지 확인 |
| `prepared statement "..." already exists` | `db/index.ts`의 `prepare: false` 옵션 확인 |
| GitHub 로그인 후 redirect 오류 | OAuth App의 callback URL이 `http://localhost:3000/api/auth/callback/github`인지 확인 |
| `challenges:sync` 실패 | `POSTGRES_URL_NON_POOLING`이 direct connection(포트 5432)인지 확인 |
