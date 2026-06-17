# GitHub Secrets 설정 가이드 (CI/CD + EC2 배포)

이 문서는 현재 워크플로우 기준으로, GitHub에 어떤 시크릿을 어디에 넣어야 하는지 정리한다.

- 이미지 빌드/푸시: `.github/workflows/ci.yml`
- EC2 배포: `.github/workflows/deploy-ec2.yml`

---

## 1) 핵심 원칙

- 시크릿 값은 **절대 코드/문서에 평문으로 저장하지 않는다**.
- `Repository secrets`와 `Environment secrets`를 분리해서 최소 권한으로 관리한다.
- 운영 배포용 시크릿은 `production` Environment에 넣는 것을 권장한다.

---

## 2) 현재 워크플로우별 시크릿 요구사항

## `ci.yml` (이미지 빌드 + GHCR push)

현재 구성은 GHCR 로그인에 `secrets.GITHUB_TOKEN`을 사용한다.  
즉, **추가 PAT 시크릿 없이 동작 가능**하다.

필수 조건:
- Repository Settings -> Actions -> General -> **Workflow permissions: Read and write permissions**

---

## `deploy-ec2.yml` (SSH 접속 배포)

EC2에 **사전에 `docker login ghcr.io`가 되어 있어야** 한다.  
워크플로우는 SSH로 접속해 `docker compose pull` / `up`만 실행한다.

GitHub Actions에 필요한 시크릿:

| Secret 이름 | 용도 | 예시 형태 |
|---|---|---|
| `DEPLOY_HOST` | EC2 호스트/IP | `1.2.3.4` |
| `DEPLOY_USER` | SSH 유저 | `ubuntu` 또는 `ec2-user` |
| `DEPLOY_PORT` | SSH 포트 | `22` |
| `DEPLOY_SSH_KEY` | 배포용 private key | `-----BEGIN ...` |
| `DEPLOY_KNOWN_HOSTS` | 호스트 키 핀닝 | `ssh-keyscan` 결과 |

`GHCR_USERNAME` / `GHCR_PAT`는 **워크플로우에서 사용하지 않는다** (서버에 credential 상주).

---

## 3) 어디에 넣을지 (권장)

옵션은 2가지:

1. `Repository secrets`에 전부 저장 (빠른 시작)
2. `Environment: production` secrets에 저장 (권장)

현재 `deploy-ec2.yml`은 `environment: production`을 사용하므로,  
**운영 배포용 시크릿은 `production` Environment에 넣는 것이 안전**하다.

---

## 4) GitHub UI 등록 순서

1. GitHub repo -> **Settings**
2. 좌측 **Secrets and variables** -> **Actions**
3. 아래 중 선택
   - `Repository secrets` -> **New repository secret**
   - `Environments` -> `production` 생성 -> **Add secret**
4. 위 표의 이름 그대로 등록

주의:
- 이름 오타가 있으면 워크플로우에서 빈 값으로 들어가 실패한다.
- 값 앞뒤 공백이 들어가지 않게 주의한다.

---

## 5) `DEPLOY_KNOWN_HOSTS` 만드는 방법

로컬에서:

```bash
ssh-keyscan -p 22 <EC2_HOST_OR_IP>
```

출력 전체를 `DEPLOY_KNOWN_HOSTS`에 그대로 저장한다.

---

## 6) EC2 GHCR 로그인 (1회 설정)

배포 서버에서 한 번 실행한다 (`read:packages` PAT 사용):

```bash
docker login ghcr.io -u <GITHUB_USERNAME>
```

인증 정보는 `~/.docker/config.json`에 저장된다. PAT 만료·로테이션 시 서버에서 다시 로그인한다.

권한 기준:
- pull만: `read:packages`
- push까지: `write:packages` (+ `read:packages`)

---

## 7) 설정 검증 체크리스트

- [ ] `ci.yml` 실행 시 `publish-images`가 GHCR push 성공
- [ ] `deploy-ec2.yml` 수동 실행 시 SSH 접속 성공
- [ ] `docker compose pull` 성공
- [ ] `docker compose up -d` 성공
- [ ] 앱 헬스체크(`GET /`, `GET /health/cache`) 성공

---

## 8) 운영 보안 권장

- 배포용 SSH 키는 **전용 키**로 분리
- `DEPLOY_USER`는 root 대신 전용 사용자 사용
- EC2 `~/.docker/config.json` 권한은 `600`, PAT는 pull 전용 + 만료 설정
- 배포 실패/접근 실패 로그를 주기적으로 점검

