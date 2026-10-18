import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentParticipant, ParticipantGuard } from '../auth/guards.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { RateLimit } from '../common/rate-limit.js';
import { UuidParam } from '../common/uuid-param.js';
import type { Participant } from '../db/schema.js';
import { DownloadUrlDto, WishlistDto, WishlistLinkDto } from '../rooms/dto.js';
import { TOKEN_AUTH } from '../setup.js';
import { MAX_FILE_BYTES } from '../storage/file-type.js';
import { WishlistsService } from './wishlists.service.js';

const errors = { type: ErrorResponseDto };

@ApiTags('lista de deseos')
@ApiBearerAuth(TOKEN_AUTH)
@ApiNotFoundResponse({ ...errors, description: 'NOT_FOUND' })
@ApiTooManyRequestsResponse({ ...errors, description: 'TOO_MANY_REQUESTS' })
@UseGuards(ParticipantGuard)
@Controller()
export class WishlistsController {
  constructor(private readonly wishlists: WishlistsService) {}

  @Put('me/wishlist/link')
  @ApiOperation({
    summary: 'Guarda un enlace como lista de deseos',
    description:
      'Reemplaza el elemento anterior (y borra su archivo, si lo había).',
  })
  @ApiBody({ type: WishlistLinkDto })
  @ApiOkResponse({ type: WishlistDto })
  @ApiBadRequestResponse({ ...errors, description: 'VALIDATION_ERROR' })
  setLink(
    @CurrentParticipant() me: Participant,
    @Body() dto: WishlistLinkDto,
  ): Promise<WishlistDto> {
    return this.wishlists.setLink(me, dto.url);
  }

  @Put('me/wishlist/file')
  @RateLimit('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES, files: 1 },
      // Sin esto, multer lee los nombres de archivo como latin1 y «ñ» llega
      // como «Ã±».
      defParamCharset: 'utf8',
    }),
  )
  @ApiOperation({
    summary: 'Sube un archivo como lista de deseos',
    description:
      'PDF, JPEG, PNG o WebP de hasta 5 MB, según su contenido real. Reemplaza el elemento anterior.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: WishlistDto })
  @ApiBadRequestResponse({ ...errors, description: 'FILE_REQUIRED' })
  @ApiPayloadTooLargeResponse({ ...errors, description: 'FILE_TOO_LARGE' })
  @ApiUnsupportedMediaTypeResponse({
    ...errors,
    description: 'UNSUPPORTED_FILE_TYPE',
  })
  setFile(
    @CurrentParticipant() me: Participant,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<WishlistDto> {
    return this.wishlists.setFile(me, file);
  }

  @Delete('me/wishlist')
  @HttpCode(204)
  @ApiOperation({ summary: 'Quita la lista de deseos' })
  @ApiNoContentResponse()
  remove(@CurrentParticipant() me: Participant): Promise<void> {
    return this.wishlists.remove(me);
  }

  @Get('wishlists/:participantId/file')
  @ApiOperation({
    summary: 'URL de descarga del archivo de deseos de alguien de la sala',
    description:
      'Devuelve una URL firmada de 5 minutos. Solo para participantes de la misma sala.',
  })
  @ApiOkResponse({ type: DownloadUrlDto })
  downloadUrl(
    @CurrentParticipant() me: Participant,
    @Param('participantId', UuidParam) participantId: string,
  ): Promise<DownloadUrlDto> {
    return this.wishlists.downloadUrl(me, participantId);
  }
}
