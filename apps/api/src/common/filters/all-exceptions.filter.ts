import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiErrorBody, ApiErrorCode } from '@know-know/shared';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from '../errors/app-exception';

const STATUS_TO_CODE: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ApiErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.RATE_LIMITED,
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorCode.VALIDATION_ERROR,
};

const STATUS_TO_MESSAGE: Partial<Record<number, string>> = {
  [HttpStatus.UNAUTHORIZED]: 'Entre na sua conta para continuar.',
  [HttpStatus.FORBIDDEN]: 'Você não tem permissão para fazer isso.',
  [HttpStatus.NOT_FOUND]: 'Não encontramos o que você procura.',
  [HttpStatus.CONFLICT]: 'Isso entrou em conflito com outra informação.',
  [HttpStatus.TOO_MANY_REQUESTS]:
    'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
  [HttpStatus.BAD_REQUEST]: 'Algo na sua solicitação não está certo.',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'O conteúdo enviado é grande demais.',
};

/**
 * Traduz qualquer exceção para o formato `{ error: { code, message } }`.
 * Nunca devolve stack trace, mensagens do Prisma/Postgres nem detalhes internos.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toResponse(exception);
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }
    response.status(status).json(body);
  }

  private toResponse(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        body: { error: { code: exception.code, message: exception.message } },
      };
    }

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Confira os campos informados e tente novamente.',
            details: zodError instanceof ZodError ? this.zodDetails(zodError) : undefined,
          },
        },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        body: {
          error: {
            code: STATUS_TO_CODE[status] ?? ApiErrorCode.INTERNAL_ERROR,
            message: STATUS_TO_MESSAGE[status] ?? 'Não foi possível concluir a solicitação.',
          },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Algo deu errado do nosso lado. Tente novamente em instantes.',
        },
      },
    };
  }

  private fromPrisma(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    body: ApiErrorBody;
  } {
    switch (error.code) {
      case 'P2002': // unique constraint
        return this.simple(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, STATUS_TO_MESSAGE[409]!);
      case 'P2025': // registro não encontrado
        return this.simple(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, STATUS_TO_MESSAGE[404]!);
      case 'P2003': // foreign key
        return this.simple(
          HttpStatus.CONFLICT,
          ApiErrorCode.CONFLICT,
          'Essa informação está ligada a outros dados e não pode ser alterada assim.',
        );
      default:
        this.logger.error(`Prisma ${error.code}: ${error.message}`);
        return this.simple(
          HttpStatus.INTERNAL_SERVER_ERROR,
          ApiErrorCode.INTERNAL_ERROR,
          'Algo deu errado do nosso lado. Tente novamente em instantes.',
        );
    }
  }

  private simple(status: number, code: ApiErrorCode, message: string) {
    return { status, body: { error: { code, message } } as ApiErrorBody };
  }

  private zodDetails(error: ZodError): { path: string; message: string }[] {
    return error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }
}
