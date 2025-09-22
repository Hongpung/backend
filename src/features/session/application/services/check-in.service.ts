import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import {
  BASIC_TIME_INTERVAL,
  OPEN_HOUR,
  CLOSE_HOUR,
} from 'src/features/session/domain/session.constant';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionUser } from 'src/features/session/domain/value-objects/session-user.vo';
import {
  START_SESSION_STATUSES,
  type AttendSessionResultVo,
  type CheckInSessionStateResultVo,
  type StartSessionResultVo,
} from 'src/features/session/domain/value-objects/check-in-result.vo';
import { CheckInStateReadVo } from 'src/features/session/domain/value-objects/check-in-state-read.vo';
import {
  ISessionRepository,
  SessionRepositoryPort,
} from '../ports/out/session.repository.port';
import { CheckInUseCasePort } from '../ports/in/check-in.use-case.port';
import { SessionEventPublisherPort } from '../ports/out/session-event-publisher.port';
import { ReservationSession } from '../../domain/entities/reservation-session.entity';
import {
  SessionRuntimePort,
  type SessionRuntimePort as ISessionRuntime,
} from '../ports/out/session-runtime.port';

const [START_SESSION_CREATED, START_SESSION_STARTED, START_SESSION_FAILED] =
  START_SESSION_STATUSES;

@Injectable()
export class CheckInService implements CheckInUseCasePort {
  constructor(
    @Inject(SessionEventPublisherPort)
    private readonly eventPublisher: SessionEventPublisherPort,
    @Inject(SessionRepositoryPort)
    private readonly repository: ISessionRepository,
    @Inject(SessionRuntimePort)
    private readonly sessionRuntimeManager: ISessionRuntime,
  ) {}

  sessionStatus(userId: number): CheckInSessionStateResultVo {
    const utcTime = new Date();
    const kstHour = AppKstDateTime.kstHourFromInstant(utcTime);

    if (kstHour < OPEN_HOUR || kstHour >= CLOSE_HOUR) {
      return {
        status: 'UNAVAILABLE',
        errorMessage: `연습실 사용시간: ${OPEN_HOUR}:00 ~ ${CLOSE_HOUR}:00`,
      };
    }

    const nextReservationSession =
      this.sessionRuntimeManager.getNextReservationSession();
    const currentSession = this.sessionRuntimeManager.getCurrentSessionStatus();
    const stateReadVo = CheckInStateReadVo.from(
      nextReservationSession,
      currentSession,
    );

    if (currentSession) {
      const isAlreadyAttend =
        this.sessionRuntimeManager.isAlreadyAttendUser(userId);

      if (isAlreadyAttend) {
        return {
          status: 'UNAVAILABLE',
          errorMessage: '이미 참여 중인 연습이에요.',
        };
      }

      if (currentSession.participationAvailable) {
        return { status: 'JOINABLE', currentSession };
      }

      return {
        status: 'UNAVAILABLE',
        errorMessage: '참여할 수 없는 연습이에요.',
      };
    }

    if (stateReadVo.isCreatable) {
      return {
        status: 'CREATABLE',
        nextReservationSession: stateReadVo.normalizedNextReservationSession,
      };
    }

    if (stateReadVo.isInStartableWindow && nextReservationSession) {
      const isParticipator = nextReservationSession.participators?.some(
        (participator) => participator.memberId === userId,
      );

      if (isParticipator) {
        return {
          status: 'STARTABLE',
          nextReservationSession,
        };
      }
    }

    return {
      status: 'UNAVAILABLE',
      errorMessage: '참여할 수 없는 세션이에요.',
    };
  }

  private async createRealtimeSession(
    user: SessionUser,
    participationAvailable: boolean,
  ) {
    const now = new Date();
    const endTime = new Date(now.getTime() + BASIC_TIME_INTERVAL);

    const newSessionProps = {
      participationAvailable,
      startTime: AppKstDateTime.kstHHmmFromInstant(now),
      endTime: AppKstDateTime.kstHHmmFromInstant(endTime),
      attendanceList: [
        { user: user, status: '참가', timeStamp: AppKstDateTime.getNowKoreanTime() },
      ] as {
        user: SessionUser;
        status: '참가';
        timeStamp: Date;
      }[],
      creatorName: user.name,
      creatorId: user.memberId,
      creatorNickname: user.nickname,
    };

    await this.sessionRuntimeManager.startRealTimeSession(newSessionProps);
  }

  private async startNextReservationSession(user: SessionUser) {
    await this.sessionRuntimeManager.startReservationSession(user);
  }

  async tryStartSession(
    memberId: number,
    participationAvailable: boolean = false,
  ): Promise<StartSessionResultVo> {
    const user = await this.repository.findMemberForCheckIn(memberId);

    if (!user) throw new UnauthorizedException('권한이 없습니다.');
    if (!user.club || !user.roleAssignment) {
      throw new UnauthorizedException('회원 정보(동아리/역할)가 없습니다.');
    }

    const userInformation =
      this.repository.toSessionUserFromCheckInMember(user);

    const state = this.sessionStatus(memberId);

    if (state.status === 'CREATABLE') {
      await this.createRealtimeSession(userInformation, participationAvailable);
      this.eventPublisher.publishSessionUpdate();
      return { status: START_SESSION_CREATED };
    }

    if (state.status === 'STARTABLE') {
      await this.startNextReservationSession(userInformation);
      this.eventPublisher.publishSessionUpdate();
      return { status: START_SESSION_STARTED };
    }

    return { status: START_SESSION_FAILED };
  }

  async attendToSession(memberId: number): Promise<AttendSessionResultVo> {
    const currentSession = this.sessionRuntimeManager.getCurrentSessionStatus();

    if (!currentSession) {
      throw new NotFoundException('Current session is not exist');
    }

    if (
      currentSession.participationAvailable ||
      (currentSession instanceof ReservationSession &&
        currentSession.participatorIds.some((id) => id == memberId))
    ) {
      const userInfo = await this.repository.findMemberForCheckIn(memberId);

      if (!userInfo?.club || !userInfo?.roleAssignment) {
        throw new NotFoundException('회원 정보를 찾을 수 없습니다.');
      }

      const user = this.repository.toSessionUserFromCheckInMember(userInfo);

      const attendResult =
        await this.sessionRuntimeManager.attendToSession(user);
      this.eventPublisher.publishSessionUpdate();

      if (!attendResult) {
        throw new NotFoundException('Current session is not exist');
      }

      return attendResult;
    }

    return {
      status: '실패',
    };
  }
}
