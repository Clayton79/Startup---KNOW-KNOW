import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  avatarUploadRequestSchema,
  deleteAccountSchema,
  onboardingStepSchema,
  updateProfileSchema,
  type AvatarUploadTicket,
  type MeProfile,
} from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { AccountService } from './account.service';
import { ProfilesService } from './profiles.service';

class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
class OnboardingStepDto extends createZodDto(onboardingStepSchema) {}
class DeleteAccountDto extends createZodDto(deleteAccountSchema) {}
class AvatarUploadRequestDto extends createZodDto(avatarUploadRequestSchema) {}

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('me')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly account: AccountService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Perfil completo de quem está logado' })
  getMe(@RequiredUser() user: AuthenticatedUser): Promise<MeProfile> {
    return this.profiles.getMe(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualiza o próprio perfil' })
  updateMe(
    @RequiredUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ): Promise<MeProfile> {
    return this.profiles.updateMe(user.id, body);
  }

  @Patch('onboarding')
  @ApiOperation({ summary: 'Registra o passo atual do onboarding' })
  setOnboardingStep(
    @RequiredUser() user: AuthenticatedUser,
    @Body() body: OnboardingStepDto,
  ): Promise<MeProfile> {
    return this.profiles.setOnboardingStep(user.id, body.step);
  }

  @Post('onboarding/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Conclui o onboarding' })
  completeOnboarding(@RequiredUser() user: AuthenticatedUser): Promise<MeProfile> {
    return this.profiles.completeOnboarding(user.id);
  }

  @Post('avatar-upload-url')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gera uma URL assinada para enviar a foto de perfil' })
  createAvatarUploadUrl(
    @RequiredUser() user: AuthenticatedUser,
    @Body() body: AvatarUploadRequestDto,
  ): Promise<AvatarUploadTicket> {
    return this.profiles.createAvatarUploadTicket(user.id, body.contentType);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exclui minha conta (anonimiza os dados e cancela aulas futuras)',
    description: 'Exige { "confirmation": "EXCLUIR" } no corpo.',
  })
  async deleteAccount(
    @RequiredUser() user: AuthenticatedUser,
    @Body() _body: DeleteAccountDto,
  ): Promise<void> {
    await this.account.deleteAccount(user.id);
  }
}
