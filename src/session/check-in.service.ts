import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma.service';
import { SessionManagerService } from 'src/session/session-manager.service';
import { RoleEnum } from 'src/role/role.enum';
import {
  BASIC_TIME_INTERVAL,
  CREATABLE_MIN_GAP_MS,
  KST_OFFSET_MS,
  RESERVATION_DISCARD_GRACE_MS,
  STARTABLE_WINDOW_AFTER_MS,
  STARTABLE_WINDOW_BEFORE_MS,
  OPEN_HOUR,
  CLOSE_HOUR,
} from './constant-variable';
import {
  getKoreanTimeString,
  getNowKoreanTime,
  parseKstDateTime,
  timeFormmatForClient,
} from 'src/reservation/reservation.utils';

@Injectable()
export class CheckInService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly sessionManager: SessionManagerService,
    private readonly roleEnum: RoleEnum,
  ) {}

  //세션의 생성/시작/참여 가능 상태를 반환, 현재 세션, 다음 예약 세션
  sessionStatus(userId: number): SessionState {
    //UTC 시간
    const utcTime = new Date();

    //UTC단위 (KST +9) --now
    const koreaTime = new Date(utcTime.getTime() + KST_OFFSET_MS);

    // 한국 시간으로 변환 (UTC+9)
    const kstHour = koreaTime.getUTCHours();

    // 10~22시가 아닌 조건
    if (kstHour < OPEN_HOUR || kstHour >= CLOSE_HOUR)
      return {
        status: 'UNAVAILABLE',
        errorMessage: `연습실 사용시간: ${OPEN_HOUR}:00 ~ ${CLOSE_HOUR}:00`,
      };

    const nextReservationSession =
      this.sessionManager.getNextReservationSession();
    const startTime = nextReservationSession
      ? parseKstDateTime(
          nextReservationSession.date,
          nextReservationSession.startTime,
        )
      : null;

    const currentSession = this.sessionManager.getCurrentSessionStatus();

    const gapMs = startTime ? startTime.getTime() - Date.now() : null;
    const gapMin = gapMs != null ? Math.round(gapMs / 60000) : null;

    //현재 진행 중인 세션이 있는 경우
    if (!!currentSession) {
      const isAlreadyAttend = this.sessionManager.isAlreadyAttendUser(userId);

      //현재 세션이 열린 연습인 경우에는 참여 가능 내용 전송
      if (isAlreadyAttend)
        return {
          status: 'UNAVAILABLE',
          errorMessage: '이미 참여 중인 연습이에요.',
        };

      if (currentSession.participationAvailable)
        return { status: 'JOINABLE', currentSession: currentSession };
      //현재 세션이 닫힌 연습인 경우에는 참여 불가능 내용 전송
      else
        return {
          status: 'UNAVAILABLE',
          errorMessage: '참여할 수 없는 연습이에요.',
        };
    }

    //현재 진행중인 세션이 없고
    //다음 예약 세션이 없거나
    //다음 예약 시작이 이미 지남(폐기 grace 10분 초과) → CREATABLE
    //startTime - now(여유시간)이 40분 보다 큰 경우
    //실행 가능하다는 내용 전송
    const isNextSessionStale =
      gapMs != null && gapMs < -RESERVATION_DISCARD_GRACE_MS;
    const creatableCond =
      !nextReservationSession ||
      !startTime ||
      isNextSessionStale ||
      (gapMs != null && gapMs > CREATABLE_MIN_GAP_MS);

    if (creatableCond) {
      return {
        status: 'CREATABLE',
        nextReservationSession: isNextSessionStale
          ? null
          : nextReservationSession,
      };
    }

    //다음 예약 세션이 존재하는데 여유시간이 10분 이내인 경우
    const gapInWindow =
      gapMs != null &&
      gapMs < STARTABLE_WINDOW_BEFORE_MS &&
      gapMs > STARTABLE_WINDOW_AFTER_MS;

    if (gapInWindow) {
      const isParticipator = nextReservationSession.participators?.some(
        (participator) => participator.memberId === userId,
      );

      //예약 세션의 참가자인 경우 시작 가능하다는 내용 전송

      if (isParticipator)
        return {
          status: 'STARTABLE',
          nextReservationSession: nextReservationSession,
        };
    }

    //모든 조건문 통과시 모두 불가능 하다는 알럿 노출
    return { status: 'UNAVAILABLE', errorMessage: '참여할 수 없는 세션이에요' };
  }

  private async createRealtimeSession(
    user: User,
    participationAvailable: boolean,
  ) {
    const now = new Date();
    const endTime = new Date(now.getTime() + BASIC_TIME_INTERVAL);

    const newSessionProps = {
      participationAvailable,
      startTime: getKoreanTimeString(now),
      endTime: getKoreanTimeString(endTime),
      attendanceList: [{ user: user, status: '참가', timeStamp: getNowKoreanTime() }] as {
        user: User;
        status: '참가';
        timeStamp: Date;
      }[],
      creatorName: user.name,
      creatorId: user.memberId,
      creatorNickname: user.nickname,
    };

    await this.sessionManager.startRealTimeSession(newSessionProps);
  }

  //유저가 시작할 수 있으면 세션 시작
  private async startNextReservationSession(user: User) {
    await this.sessionManager.startReservationSession(user);

    this.eventEmitter.emit('start-reservation-session');
    this.eventEmitter.emit('session-update');
  }

  async tryStartSession(
    memberId: number,
    participationAvailable: boolean = false,
  ) {
    const user = await this.prisma.member.findUnique({
      where: { memberId },
      select: {
        memberId: true,
        email: true,
        name: true,
        nickname: true,
        club: true,
        profileImageUrl: true,
        enrollmentNumber: true,
        roleAssignment: true,
      },
    });

    if (!user) throw new UnauthorizedException('권한이 없습니다.');
    if (!user.club || !user.roleAssignment) {
      throw new UnauthorizedException('회원 정보(동아리/역할)가 없습니다.');
    }

    const userInformation: User = {
      ...user,
      club: user.club.clubName,
      role: user.roleAssignment.map((roleAssignment) =>
        this.roleEnum.EnToKo(roleAssignment.role),
      ),
    };

    // sessionStatus와 동일한 로직을 재사용해서 상태를 판단하고,
    // 여기서는 그 결과에 따라 실제 액션(세션 생성/시작)만 수행한다.
    const state = this.sessionStatus(memberId);

    if (state.status === 'CREATABLE') {
      await this.createRealtimeSession(userInformation, participationAvailable);
      return { status: 'created' };
    }

    if (state.status === 'STARTABLE') {
      // sessionStatus가 STARTABLE을 반환했다는 것은
      // 이미 참가자 여부 등 조건을 모두 통과한 상태이므로 바로 시작한다.
      await this.startNextReservationSession(userInformation);
      return { status: 'started' };
    }

    return { title: 'failed' };
  }

  async attendToSession(memberId: number) {
    const currentSession = this.sessionManager.getCurrentSessionStatus();

    if (!currentSession)
      throw new NotFoundException('Current session is not exist');

    if (
      currentSession.participationAvailable ||
      currentSession.participatorIds.some((id) => id == memberId)
    ) {
      const userInfo = await this.prisma.member.findUnique({
        where: { memberId },
        include: {
          club: { select: { clubName: true } },
          roleAssignment: { select: { role: true } },
        },
      });

      if (!userInfo?.club || !userInfo?.roleAssignment) {
        throw new NotFoundException('회원 정보를 찾을 수 없습니다.');
      }

      const user = {
        memberId: userInfo.memberId,
        email: userInfo.email,
        name: userInfo.name,
        nickname: userInfo.nickname,
        club: userInfo.club.clubName,
        enrollmentNumber: userInfo.enrollmentNumber,
        role: userInfo.roleAssignment.map((role) =>
          this.roleEnum.EnToKo(role.role),
        ),
        profileImageUrl: userInfo.profileImageUrl,
      };

      const status = await this.sessionManager.attendToSession(user);
      this.eventEmitter.emit('session-update');

      return { status };
    }
  }
}
