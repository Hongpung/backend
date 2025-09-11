import { SetMetadata, Type } from '@nestjs/common';

export const RESPONSE_SCHEMA_KEY = 'response:schema';

export interface ResponseSchemaMetadata {
  schema: Type<unknown>;
  isArray?: boolean;
}

export function ResponseSchema(
  schema: Type<unknown>,
  options?: { isArray?: boolean },
) {
  return SetMetadata(RESPONSE_SCHEMA_KEY, {
    schema,
    isArray: options?.isArray ?? false,
  } satisfies ResponseSchemaMetadata);
}
