import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { SessionsModule } from '../sessions/sessions.module';
import { WalletController } from './wallet.controller';

@Module({
  imports: [CreditsModule, SessionsModule],
  controllers: [WalletController],
})
export class WalletModule {}
