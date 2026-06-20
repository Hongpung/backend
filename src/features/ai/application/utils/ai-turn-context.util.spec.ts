import { toCompleteTurnMessages } from './ai-turn-context.util';
import type { AiTurnRecord } from '../../domain/ai.types';

function turn(
  role: 'user' | 'assistant',
  content: Record<string, unknown>[],
): AiTurnRecord {
  return {
    turnId: 't1',
    adminId: '1',
    roomId: '550e8400-e29b-41d4-a716-446655440000',
    role,
    content,
    createdAt: new Date(),
    countsForUsage: role === 'user',
  };
}

describe('toCompleteTurnMessages', () => {
  it('미완성 tool_use tail을 제외한다', () => {
    const result = toCompleteTurnMessages([
      turn('user', [{ type: 'text', text: 'hello' }]),
      turn('assistant', [{ type: 'text', text: 'hi' }]),
      turn('user', [{ type: 'text', text: 'cancel reservation' }]),
      turn('assistant', [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'reservation_force_delete',
          input: { reservationId: 1 },
        },
      ]),
    ]);

    expect(result).toHaveLength(3);
    expect(result[2].content[0]).toMatchObject({ type: 'text' });
  });

  it('tool_use와 tool_result가 짝지어진 턴은 포함한다', () => {
    const result = toCompleteTurnMessages([
      turn('user', [{ type: 'text', text: 'delete it' }]),
      turn('assistant', [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'reservation_force_delete',
          input: { reservationId: 1 },
        },
      ]),
      turn('user', [
        {
          type: 'tool_result',
          tool_use_id: 'tool-1',
          content: '{"ok":true}',
        },
      ]),
    ]);

    expect(result).toHaveLength(3);
  });
});
