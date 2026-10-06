import { Module } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';

@Module({
  providers: [LedgerService, CreditsService],
  exports: [LedgerService, CreditsService],
})
export class CreditsModule {}
