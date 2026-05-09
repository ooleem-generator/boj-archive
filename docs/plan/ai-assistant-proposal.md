# AI 도우미 기능 도입 계획

> **문서 버전**: v0.1 (초안)
> **작성일**: 2026-05-09
> **상태**: 논의 대기 — owner 검토 전

NEXT JUDGE에 학습 보조 AI 도우미를 얹기 위한 기획서. 프로젝트 owner와의
정렬을 위한 **논의 문서**이며, 본구현 진입 전 **§9의 열린 결정들이
합의되어야** 한다.

배경: 알고리즘 학습 진입 장벽을 낮추는 방향으로 서비스를 차별화하고 싶다는
제안에서 출발. PR 기반 큐레이션 / 브라우저 채점 / 코드는 서버로 전송이라는
NEXT JUDGE의 기존 아키텍처가 학습용 AI 도우미 도입에 구조적으로 우호적이라는
점이 결정 배경이다.

---

## 1. 시장 조사 요약

| 플랫폼 | AI 도우미 | 정책 | 비고 |
|---|---|---|---|
| **LeetCode** | "Ask Leet" Coding Agent (2025) — 솔루션 브레인스토밍, 코드 최적화, 테스트케이스 생성, 디버깅. Highlight to Ask. | 컨테스트 URL(`/contest/`)은 차단 | Premium 한정 추가 크레딧 |
| **CoderPad / HackerRank** | 면접 IDE에 AI Assist (Ask / Edit 모드) | 면접관이 모델·모드 선택 | 학습용 아님 — 평가 시뮬레이션 |
| **Codeforces / AtCoder** | 공식 없음. Repovive 등 서드파티 익스텐션 | 컨테스트 중 AI 사용 금지 (2024-09) | — |
| **코드트리** | AI 에러 분석 + 3회 오답 시 도움 팝업 + 단계별 해설 | 정답 코드 직접 제공 X | 사람 전문가 폴백 (~4시간) |
| **백준 / solved.ac / 프로그래머스** | 공식 AI 기능 없음 | — | 외부 게시판·testcase.ac 의존 |

**시사점.** "학습 컨텍스트와 평가 컨텍스트의 정책 분리"는 LeetCode가 사실상
표준화한 라인이고, "정답을 직접 주지 않고 막히는 지점만 짚는" 페르소나는
코드트리가 학습 효과 측면에서 호평받는 패턴이다. 우리는 이 둘을 결합한
포지션을 잡는다.

---

## 2. 페르소나와 정책 라인

### 페르소나

**소크라테스식 학습 동반자.**

- 정답 코드는 **절대 직접 제공하지 않는다**. 의사코드 골격까지가 한계.
- 사용자가 다음 한 발만 디딜 수 있을 만큼만 밀어준다 — "정답 직행 차단".
- 사용자의 풀이를 부정하지 않는 톤. 회고/대안 제시는 비교가 아니라 추가로.

### 정책 라인

LeetCode 모델을 따라 **모드를 분리**한다.

| 모드 | AI 도우미 | 비고 |
|---|---|---|
| 학습 모드 (기본) | ON | 모든 일반 문제 풀이 |
| 컨테스트 / 평가 모드 (향후) | OFF | URL·세션 차원에서 차단 |

현재는 학습 모드만 존재하므로 정책 라인은 "장차 컨테스트 모드를 도입할 때
구조적으로 분기 가능하게 둔다" 정도로 충분하다. 코드는 이미 서버에 전송되고
있어 모드 플래그 추가는 비용이 낮다.

---

## 3. 기능 범위 — 두 갈래

### 3-1. 갈래 A: 풀이 중 힌트 ("막혔을 때")

**입력 컨텍스트**

- `problem.md` 본문 + frontmatter
- 사용자가 작성 중인 코드 (에디터 현재 상태)
- 최근 채점 결과 (오답 / 런타임 에러 / 시간 초과 / 컴파일 에러)
- 사용자의 자연어 질문 (있으면)
- (정책) hidden case 실패 시 — **"몇 번째 케이스에서 틀렸다"까지만**.
  입력값 자체는 노출하지 않는다. 노출하면 brute-force 우회 학습이 됨.

**트리거**

- **Pull**: "힌트" 버튼 — 항상 활성
- **Push** (코드트리식): N회 같은 채점 결과 반복 / M분 inactivity 시
  "도움이 필요한가요?" 팝업
  - 사용자별 ON/OFF 토글 필요 (상위권 유저에게는 방해)

**채점 결과별 톤 분기**

| 채점 결과 | 톤 | 비고 |
|---|---|---|
| 컴파일 에러 | 자유롭게 도움 — 알고리즘 누설 위험 0 | |
| 런타임 에러 | 코드 라인 단위 분석 — "여기서 IndexError 가능" | 코드트리 강점 영역 |
| 오답 | 가장 신중. **반례 직접 노출 X.** "이런 종류의 케이스를 생각해봤나요?"로 우회 | |
| 시간 초과 | 복잡도 코칭 — "지금 O(N²)인데 N≤10⁵이면…" | |

### 3-2. 갈래 B: 풀이 후 학습 가이드 ("풀고 나서")

정답을 이미 맞췄으므로 정답 누설 우려가 없어 자유롭다.

- **(a) 내 풀이 회고** — 시·공간 복잡도 진단, 가독성/관용 표현 코멘트.
  "같은 알고리즘 내 개선" 과 "다른 알고리즘으로의 도약" 을 분리해서 제시
  (섞으면 학습자가 길을 잃음).
- **(b) 개념 추상화** — 패턴 이름 부여, 제약이 바뀌면 어떻게 풀이가 변하는지,
  실제 시스템 매핑 (BFS↔라우팅, 해시↔캐시).
- **(c) 다음 추천** — 같은 패턴 점진적 난이도, 협업 필터링(데이터 누적 후),
  사용자 약점 진단.
- **(d) 솔루션 비교** — "본질적으로 다른 접근 N가지". 본인 풀이를 부정하지
  않는 톤.
- **(e) 회고 프롬프트** (옵션) — "다시 푼다면 어디서 시간을 줄였을까요?"
  사용자가 먼저 답하고 AI가 코칭. 학습 효과↑, UX 비용↑ — 강제하지 말고
  토글로.

**1차 범위.** 갈래 A를 먼저 구축하고, 갈래 B는 (a) + (c) 정도로 시작해서
점진 확장한다 (§10 참고).

---

## 4. 힌트 설계 — Role pool 기반

### 4-1. 왜 고정 N단계가 아닌가

처음 검토했던 "5단계 사다리 (재해석 → 관찰 → 분류 → 자료구조 → 의사코드)" 는
실전에서 두 방향으로 깨진다.

- **쉬운 문제 (Bronze 급)**: 5단계가 의미 없이 같은 말을 반복하게 된다
  (`두 수의 합` 류는 재해석부터 자료구조까지 전부 자명).
- **어려운 문제 (Diamond/Ruby 급)**: 두 번 이상의 통찰 점프가 필요한 문제는
  5칸으로 부족. 관찰(observation)이 여러 개로 갈라지는 경우도 있음.

→ **단계 수를 prompt에 못박지 않고**, role pool에서 LLM이 문제에 맞는 부분
집합을 골라 단계 번호를 매기게 한다.

### 4-2. Role pool

| Role | 의미 | 적용 예 |
|---|---|---|
| `REFRAME` | 문제 재해석 / 단순화 | "결국 N개 중 K개 골라서 합이 최소가 되도록…" |
| `REDUCE` | 작은 케이스로 축소 | "N=3일 때 직접 손으로 풀어보면" |
| `OBSERVE` | 핵심 관찰 / 성질 (복수 가능) | "정렬하면 어떤 성질이 보일까요?" |
| `CLASSIFY` | 알고리즘 카테고리 | "DP/그리디 계열" |
| `STRUCTURE` | 자료구조·점화식 형태 | "dp[i] = …의 최댓값으로 정의해보세요" |
| `COMPLEXITY` | 시간복잡도 목표 환기 | "N≤10⁵면 O(N²)은 통과 못 함" |
| `EDGE` | 놓치기 쉬운 경계 케이스 환기 | "빈 입력은 어떻게 되나요?" |
| `SKELETON` | 의사코드 골격 (정답 코드 X) | for/while 구조까지 |

**LLM은 2~7개 역할을 골라 정렬한 사다리를 만든다.**

| 난이도 | 예상 사다리 |
|---|---|
| Bronze | `[REFRAME, STRUCTURE]` |
| Gold | `[REFRAME, OBSERVE, CLASSIFY, STRUCTURE]` |
| Diamond+ | `[REDUCE, OBSERVE×2, CLASSIFY, STRUCTURE, COMPLEXITY, SKELETON]` |

---

## 5. LLM 그라운딩 — `solution.py` 활용

### 5-1. LLM은 문제를 풀지 않는다

NEXT JUDGE는 **모든 challenge에 검증된 `solution.py`** 가 있다는 점이 다른
저지와 차별화된 자산이다. LLM에게 풀라고 시키는 대신 **정답 풀이를
컨텍스트로 그냥 넘겨준다**.

```
입력 → LLM
  - problem.md
  - solution.py  ← 이미 PR에서 검증된 정답
  - (옵션) contributor가 적은 핵심 관찰 메모
출력 → 힌트 사다리 (role pool 기반)
```

LLM이 하는 일은 "풀이"가 아니라 **"정답으로부터 통찰을 역산해 단계로 풀어
쓰기"**. 후자가 훨씬 안정적이다.

### 5-2. 비교: LeetCode Ask Leet과의 차이

| 항목 | Ask Leet 류 | NEXT JUDGE |
|---|---|---|
| 정답 컨텍스트 | 없음. LLM이 매번 풀이 | `solution.py` 주입 |
| 힌트 사다리 품질 | 모델이 틀리면 통째로 어긋남 | 정답에 그라운딩 |
| 큐레이션 비용 | 사용자 요청마다 매번 추론 | PR 머지 시 1회 |

### 5-3. 함정과 보완책

| 함정 | 영향 | 보완 |
|---|---|---|
| `solution.py`는 단 하나의 풀이 경로 | 힌트가 그 풀이 쪽으로 편향 | (옵션) contributor가 PR에 "다른 가능한 접근들" 메모 |
| 코드에서 "왜"를 역산하는 게 항상 깔끔하진 않음 (세그트리 비트, 파라메트릭 서치 등 고급 기법) | 어려운 문제에서 사다리 품질 저하 | (옵션) contributor의 insight 메모 (자유 텍스트) |
| 모델 업그레이드 시 기존 힌트 품질이 의문 | 사이트 전반 품질 산포 | 모델 버전을 hints.json에 기록, 일괄 재생성 가능 |

---

## 6. Static vs Dynamic 분리

힌트는 **두 종류로 나뉜다**:

| 종류 | 시점 | 입력 | 비용 | 저장 |
|---|---|---|---|---|
| **Static hint ladder** | PR 머지 시 1회 | problem + solution.py + (옵션 메모) | 문제당 1회 | git 트래킹 + DB |
| **Dynamic feedback** | 사용자 요청 시 | 위 + **사용자 현재 코드 + 채점 결과** | 매 요청 | 캐시 안 함 |

- Static은 "이 문제의 일반적 힌트 사다리". 사용자 무관 동일.
- Dynamic은 "이 사용자가 짠 코드를 보니 L2까지 통찰은 있으니 L3 보여주자",
  "사다리에 없는 다른 접근을 시도 중인데 어디가 어긋났나" 같은 적응형 응답.

**Dynamic은 1차 범위 외**로 둔다 (§10). MVP는 Static + 사용자가 사다리를
순서대로 unlock하는 단순 UX로 시작.

---

## 7. Static 힌트 파이프라인

### 7-1. 결정: PR 머지 시 자동 생성

> **결정.** Static hint ladder는 PR이 main에 머지되는 시점에 GitHub
> Actions가 자동 생성한다. lazy generate (첫 요청 시 생성) 는 채택하지 않는다.

근거:

- 생성 결과를 **사람이 미리 검수**해서 이상한 응답이 사용자에게 노출되는 일을
  막을 수 있음.
- 첫 요청한 사용자가 응답 지연을 겪지 않음.
- 비용이 사용자 트래픽에 비례하지 않고 PR 수에 비례 (예측 가능).

### 7-2. `hints.json` 파일 패턴

생성된 힌트는 **DB가 아니라 git 트래킹 파일로** 저장하고, DB는 그 거울이다.

```
challenges/<slug>/
  problem.md
  solution.py
  hints.json      ← 새로 추가
  testcases/
```

이 패턴의 장점:

- **리뷰**: PR diff에서 maintainer가 hint 내용을 코드처럼 본다.
- **수정**: "이 힌트 이상하다" 싶으면 `hints.json` 한 줄 고치는 PR로 끝.
- **이력**: git log로 누가 언제 어떻게 고쳤는지 다 남음.
- **재생성 제어**: `humanEdited: true` 항목은 다음 자동 재생성 시 건너뜀.

### 7-3. 워크플로우

```
[PR 생성: problem.md, solution.py 작성]
        ↓
[validate.yml]
  - 스키마 검증 + 솔루션 실행 (기존)
  - hints.json이 없거나 problem/solution이 변경됐으면
    → LLM 호출 → hints.json 생성/갱신
    → PR 브랜치에 자동 커밋 (bot)
        ↓
[리뷰: contributor + maintainer가 hints.json도 함께 본다]
  - 이상하면 PR에 직접 커밋해서 수정 (humanEdited: true 마킹)
        ↓
[merge to main]
        ↓
[sync.yml]
  - challenges + hints 모두 DB로 upsert
```

### 7-4. `hints.json` 스키마 (제안)

```json
{
  "model": "claude-opus-4-7",
  "modelVersion": "2026-01",
  "generatedAt": "2026-05-09T10:00:00Z",
  "sourceHash": "sha256 of (problem.md + solution.py)",
  "ladder": [
    {
      "level": 1,
      "role": "REFRAME",
      "content": "...",
      "humanEdited": false
    },
    {
      "level": 2,
      "role": "OBSERVE",
      "content": "...",
      "humanEdited": true
    }
  ]
}
```

| 필드 | 용도 |
|---|---|
| `model`, `modelVersion` | 모델 업그레이드 시 일괄 재생성 대상 식별 |
| `generatedAt` | 생성 시각 — 디버깅용 |
| `sourceHash` | `problem.md` / `solution.py` 변경 감지. 동일하면 재생성 스킵 |
| `humanEdited` | 항목별 — `true` 인 항목은 자동 재생성 시 보존 |

### 7-5. DB 스키마 (제안)

`challenge_hints` 테이블 신규 (별도 테이블 권장 — `challenges` 본체 비대화 방지):

```
challenge_hints
  id
  challengeId → challenges.id
  level (int)
  role (text — REFRAME | OBSERVE | ...)
  content (text)
  humanEdited (boolean)
  model (text)
  generatedAt (timestamptz)
```

`sync.yml`이 `challengeId + level` 키로 upsert.

---

## 8. 미래 옵션: Contributor 직접 작성

### 결정 (현 단계)

> **결정.** MVP는 LLM-first. contributor는 `hints.json`에 직접 작성하지
> **않는다** — 자동 생성된 결과를 검토만 한다. **단**, 향후 contributor가
> 처음부터 직접 작성할 수 있는 옵션을 열어둘 수 있게 스키마와 워크플로우를
> 호환적으로 둔다.

근거: 서비스 초기에 **contributor 부담을 최소화**하는 방향이 우선. 힌트
작성을 필수로 두면 PR 진입 장벽이 높아진다.

### 향후 도입 시 고려할 형태

- contributor가 PR에 `hints.json` 을 직접 커밋하면 validate.yml은 LLM 호출을
  스킵하고 그대로 통과.
- 또는 일부 항목만 사람이 작성, 나머지는 LLM이 보강하는 **하이브리드** —
  스키마의 항목별 `humanEdited` 플래그가 이걸 그대로 지원함.
- contributor 가이드(`CONTRIBUTING.md`) 에 "힌트 직접 작성 시" 섹션 추가.

---

## 9. 남은 결정 사항 / 논의 필요

> Owner와 합의 후 본구현 진입.

### 9-1. Bot commit 권한 (운영)

- validate.yml에서 PR 브랜치에 push-back 하려면 PAT 또는 GitHub App 필요.
- **Fork에서 들어온 PR은 push-back 권한 없음** → 두 가지 fallback:
  - (A) PR comment로 hints preview만 달고, 머지 후 main에서 생성·커밋
  - (B) maintainer가 PR을 own-branch로 받아 재PR

→ A를 default, B는 예외 케이스로.

### 9-2. 재생성 트리거 정확성

- `solution.py` 변경 → 재생성 ✅
- `problem.md` **본문** 변경 → 재생성 ✅
- `problem.md` **frontmatter만** (tags, time_limit) 변경 → 재생성 불필요
  - `sourceHash` 계산 시 frontmatter 일부 필드를 제외해야 함. 어느 필드를
    포함/제외할지 명세 필요.

### 9-3. Role pool 최종 명세

§4-2의 8개 role이 **MVP에 충분한가, 너무 많은가**.
초기에는 5개 정도로 줄이는 것도 고려 (`REFRAME`, `OBSERVE`, `CLASSIFY`,
`STRUCTURE`, `SKELETON`).

### 9-4. UI / UX

- 힌트 사다리 노출 방식: **단계별 잠금** (사용자가 다음 단계 unlock) vs
  **자유 열람**.
  - 잠금: 학습 효과↑, UX 비용↑
  - 자유 열람: 정답 직행 위험↑
- 모바일에서의 노출 위치 (현재 split-panel 레이아웃과의 정합성).

### 9-5. 비용 / 모델 선택

- 문제 1건당 hint 생성 토큰 추정: input ~3K (problem + solution), output ~2K
  (사다리 7단계 × 평균). Opus 기준 약 $0.05~0.10/문제. Sonnet은 1/5 수준.
- **모델 결정.** Opus / Sonnet / 다른 vendor 중 선택 필요.
- 운영 측면: Anthropic API 키 GitHub Secrets 등록.

### 9-6. Dynamic feedback의 범위

§6에서 1차 범위 외로 두기로 했지만, "사용자 코드를 보고 어디서 막혔는지
짚어주기" 는 결국 차별화 핵심. 도입 시점·UX를 별도 후속 문서로 다룬다.

### 9-7. 평가 지표

- 도우미가 "도움이 됐는가" 를 어떻게 측정할 것인가.
- 후보: 힌트 노출 후 정답률 변화, 단계별 unlock 분포, 사용자 만족도 thumbs.

---

## 10. 마일스톤 (제안)

| Phase | 범위 | Exit criteria |
|---|---|---|
| **0. 기획 정렬** (현재) | 본 문서 | Owner 합의 — §9 결정들 |
| **1. Static MVP** | hints.json 자동 생성 + DB 동기화 + UI 노출 (자유 열람) | 기존 challenges 전체에 hints.json 채워짐 |
| **2. UX 다듬기** | 단계 잠금 / push 트리거 / 토글 / 모바일 | 사용자 피드백 수렴 |
| **3. 학습 가이드 (갈래 B)** | 풀이 후 회고 (a) + 다음 추천 (c) | "푼 직후" 화면에 카드 노출 |
| **4. Dynamic feedback** | 사용자 코드 기반 적응형 응답 | 별도 기획 문서 |
| **5. Contributor 직접 작성** | `hints.json` 직접 커밋 허용 | CONTRIBUTING.md 갱신 |

---

## 11. 참고

- 시장 조사 메모(이 문서 §1) — 추가 인용·링크는 owner 검토 후 보강.
- 페르소나 레퍼런스: 코드트리의 "정답 직접 안 주기" 정책.
- 정책 분리 레퍼런스: LeetCode `/contest/` URL 차단.
