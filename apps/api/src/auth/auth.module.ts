import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ProfilesModule } from '../profiles/profiles.module';
import { AuthGuard } from './auth.guard';
import { JwtVerifierService } from './jwt-verifier.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [ProfilesModule],
  providers: [
    JwtVerifierService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtVerifierService],
})
export class AuthModule {}
