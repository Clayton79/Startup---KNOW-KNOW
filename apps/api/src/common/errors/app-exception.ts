import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@know-know/shared';

/**
 * Erro de negócio com código estável e mensagem pronta para o usuário (pt-BR).
 * É a única forma de a camada de serviço sinalizar falhas esperadas.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }

  static unauthorized(message = 'Entre na sua conta para continuar.'): AppException {
    return new AppException(ApiErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = 'Você não tem permissão para fazer isso.'): AppException {
    return new AppException(ApiErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }

  static notFound(message = 'Não encontramos o que você procura.'): AppException {
    return new AppException(ApiErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }

  static conflict(
    code: ApiErrorCode = ApiErrorCode.CONFLICT,
    message = 'Isso entrou em conflito com outra informação.',
  ): AppException {
    return new AppException(code, message, HttpStatus.CONFLICT);
  }

  static unprocessable(code: ApiErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
