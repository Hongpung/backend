import type { AiAvailableCommand } from './ai.types';

export const AI_AVAILABLE_COMMANDS: AiAvailableCommand[] = [
  {
    name: 'reservation_force_create',
    description: '관리자 권한으로 예약을 강제 생성합니다.',
  },
  {
    name: 'reservation_force_delete',
    description: '관리자 권한으로 예약을 강제 삭제합니다.',
  },
  {
    name: 'reservation_modify',
    description: '관리자 권한으로 기존 예약을 수정합니다.',
  },
  {
    name: 'reservation_batch_create',
    description: '관리자 권한으로 반복 일정 예약을 일괄 생성합니다.',
  },
];

export const AI_MUTATION_TOOL_NAMES = new Set(
  AI_AVAILABLE_COMMANDS.map((command) => command.name),
);

export function isAiMutationToolName(toolName: string): boolean {
  return AI_MUTATION_TOOL_NAMES.has(toolName);
}
