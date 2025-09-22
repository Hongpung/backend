function parseSnapshotDate(value: unknown): Date | undefined {
  if (value == null) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : undefined;
  }

  if (typeof value === 'object') {
    const candidate = value as {
      toDate?: () => Date;
      _seconds?: number;
      seconds?: number;
    };

    if (typeof candidate.toDate === 'function') {
      const fromTimestamp = candidate.toDate();
      return Number.isFinite(fromTimestamp.getTime()) ? fromTimestamp : undefined;
    }

    const seconds = candidate._seconds ?? candidate.seconds;
    if (typeof seconds === 'number' && Number.isInteger(seconds)) {
      const fromSeconds = new Date(seconds * 1000);
      return Number.isFinite(fromSeconds.getTime()) ? fromSeconds : undefined;
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : undefined;
  }

  return undefined;
}

export function toValidSnapshotDate(value: unknown): Date {
  return parseSnapshotDate(value) ?? new Date();
}

export function toOptionalValidSnapshotDate(value: unknown): Date | undefined {
  return parseSnapshotDate(value);
}

/** Firestore rejects explicit `undefined` fields in documents. */
export function stripUndefinedForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedForFirestore(item)) as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (nested !== undefined) {
        result[key] = stripUndefinedForFirestore(nested);
      }
    }
    return result as T;
  }

  return value;
}
