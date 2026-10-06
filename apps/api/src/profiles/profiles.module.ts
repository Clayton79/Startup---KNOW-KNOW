import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AccountService } from './account.service';
import { ProfilesController } from './profiles.controller';
import { ProfilesRepository } from './profiles.repository';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [CreditsModule, SessionsModule],
  controllers: [ProfilesController],
  providers: [ProfilesRepository, ProfilesService, AccountService],
  exports: [ProfilesService, ProfilesRepository],
})
export class ProfilesModule {}
