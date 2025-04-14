<p align="center">
  <a href="https://green-bath-cc7.notion.site/1b62749b6fda80c69245f995bab2e031" target="blank"><img src="https://file.notion.so/f/f/92794d22-9384-4f79-8c0c-67377d1489bd/cdd65839-0757-413a-9568-22cc8825a8a0/image.png?table=block&id=1b62749b-6fda-8055-b4d8-cacbaf3aa403&spaceId=92794d22-9384-4f79-8c0c-67377d1489bd&expirationTimestamp=1744675200000&signature=NsXBWkJ1H45BO-YuG8WgMQSKvWjY9TAQFsKH_LEXLUM&downloadName=image.png" height="240" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

<br/>
      
## 홍풍<a href="https://green-bath-cc7.notion.site/1b62749b6fda80c69245f995bab2e031" target="blank"><img src="https://play-lh.googleusercontent.com/tJ84QKArlyPTyavYnR6AJQgx6dyWk36KBHJxIMb9FmaukdoYkCYELypP83-qlU3JzQ=w480-h960-rw" align=left width=100></a>
홍익대학교 풍물패연합 연습실 예약 어플리케이션, 홍풍 **백 엔드** 저장소

<br/><br/>


## 사용스택

<img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=NestJS&logoColor=white"> <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=MySQL&logoColor=white"> <img src="https://img.shields.io/badge/prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white"> 
 <br/>
<img src="https://img.shields.io/badge/redis-FF4438?style=for-the-badge&logo=Redis&logoColor=white"> <img src="https://img.shields.io/badge/jsonwebtokens-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white"> 
<br/>
<img src="https://img.shields.io/badge/amazonaws-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white"> <img src="https://img.shields.io/badge/CloudFlare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white">


## Project Structure

```
hongpung_backend/
├── src/ # 소스 코드 디렉토리
│ ├── admin/ # 관리자 관련 기능
│ ├── auth/ # 인증 관련 기능
│ ├── banners/ # 배너 관리 기능
│ ├── club/ # 클럽 관련 기능
│ ├── decorators/ # 커스텀 데코레이터
│ ├── firebase/ # Firebase 연동
│ ├── guards/ # 인증 가드
│ ├── instrument/ # 악기 관리 기능
│ ├── mail/ # 이메일 전송 기능
│ ├── member/ # 회원 관리 기능
│ ├── notice/ # 공지사항 관리
│ ├── notification/ # 푸시 알림 기능
│ ├── reservation/ # 예약 관리 기능
│ ├── role/ # 역할 관리
│ ├── session/ # 세션 관리
│ ├── types/ # express Request Declare (jwt 사용)
│ ├── upload-s3/ # S3 업로드 기능
│ ├── verification/ # 이메일 검증 기능
│ ├── app.controller.ts # 메인 컨트롤러
│ ├── app.module.ts # 메인 모듈
│ ├── app.service.ts # 메인 서비스
│ ├── main.ts # 애플리케이션 진입점
│ └── prisma.service.ts # Prisma 서비스
│
├── prisma/ # 데이터베이스 관련
  └── schema.prisma # Prisma 스키마

```
## 주요 기능 설명

### 1. 인증 및 보안

- `auth/`: JWT 기반 인증 시스템
- `guards/`: 다양한 인증 가드 (Admin, Auth, WsAuth 등)
- `verification/`: 이메일 검증 시스템

### 2. 데이터 관리

- `prisma/`: Prisma ORM을 사용한 데이터베이스 관리
- `member/`: 회원 정보 관리
- `admin/`: 관리자 기능

### 3. 기능 모듈

- `club/`: 클럽 관리
- `notice/`: 공지사항
- `reservation/`: 예약 시스템
- `notification/`: 푸시 알림
- `banners/`: 배너 관리
- `instrument/`: 악기 관리

### 4. 유틸리티

- `upload-s3/`: AWS S3 파일 업로드
- `firebase/`: Firebase 연동
- `mail/`: 이메일 전송
- `session/`: 세션 관리

### 5. 설정 파일

- `.env`: 환경 변수 (보안상 gitignore됨)
- `prisma/schema.prisma`: 데이터베이스 스키마
- `tsconfig.json`: TypeScript 설정
- 

## 개발자
<a href="https://github.com/Wide-Pants"> 강윤호@wide-pants</a>
