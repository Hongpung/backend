import { applyDecorators, UseGuards, SetMetadata, Type } from '@nestjs/common';
import { OrGuard } from '../guards/or.guard';

export const GUARDS_OR_KEY = 'guards_or';

export function UseGuardsOr(...guards: Type<any>[]) {
    return applyDecorators(
        SetMetadata(GUARDS_OR_KEY, guards),
        UseGuards(OrGuard),
    );
}