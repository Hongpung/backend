import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AdminSessionLogService } from './admin-session-log.service';
import { AdminGuard } from 'src/guards/admin.guard';

@Controller('admin/session-log')
export class AdminSessionLogController {
    constructor(
        private readonly adminSessionLogService: AdminSessionLogService
    ) { }

    @Get('list')
    @UseGuards(AdminGuard)
    async getUserMonthlySessionLogs(@Query('skip') skip?: string) {
        return this.adminSessionLogService.getLatestSessionLogs(+skip)
    }

}
