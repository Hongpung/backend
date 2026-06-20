import type {
  AiContentBlock,
  AiTurnMessage,
  AiTurnRecord,
} from '../../domain/ai.types';

function extractToolUseIds(content: AiContentBlock[]): Set<string> {
  const ids = new Set<string>();
  for (const block of content) {
    if (block.type === 'tool_use' && typeof block.id === 'string') {
      ids.add(block.id);
    }
  }
  return ids;
}

function extractToolResultIds(content: AiContentBlock[]): Set<string> {
  const ids = new Set<string>();
  for (const block of content) {
    if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
      ids.add(block.tool_use_id);
    }
  }
  return ids;
}

/**
 * Anthropic tool_use ↔ tool_result 짝이 맞는 완결 턴만 반환한다.
 */
export function toCompleteTurnMessages(turns: AiTurnRecord[]): AiTurnMessage[] {
  const messages = turns.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  const pending = new Set<string>();
  let lastCompleteIndex = -1;

  messages.forEach((message, index) => {
    for (const id of extractToolUseIds(message.content)) {
      pending.add(id);
    }
    for (const id of extractToolResultIds(message.content)) {
      pending.delete(id);
    }

    if (pending.size === 0) {
      lastCompleteIndex = index;
    }
  });

  if (lastCompleteIndex < 0) {
    return messages.filter(
      (message) =>
        message.content.length > 0 && extractToolUseIds(message.content).size === 0,
    );
  }

  return messages
    .slice(0, lastCompleteIndex + 1)
    .filter((message) => message.content.length > 0);
}

export function toUserTextContent(message: string): AiContentBlock[] {
  return [{ type: 'text', text: message }];
}

export function toToolResultContent(
  toolUseId: string,
  result: unknown,
): AiContentBlock[] {
  return [
    {
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: JSON.stringify(result),
    },
  ];
}
