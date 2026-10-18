import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import {
  cleanName,
  PARTICIPANT_NAME_MAX,
  PARTICIPANT_NAME_PATTERN,
  ROOM_NAME_MAX,
  ROOM_NAME_MIN,
  ROOM_NAME_PATTERN,
} from '../common/names.js';
import { MAX_PARTICIPANTS } from '../draw/draw.js';

const clean = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? cleanName(value) : value;

// Fecha de hoy en España (YYYY-MM-DD), que es donde se usa la app.
export function todayInSpain(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
  }).format(now);
}

@ValidatorConstraint({ name: 'giftDate' })
export class GiftDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return false;
    // Rechaza fechas imposibles como 2026-02-30.
    if (date.toISOString().slice(0, 10) !== value) return false;
    const today = todayInSpain();
    const max = new Date(`${today}T00:00:00Z`);
    max.setUTCFullYear(max.getUTCFullYear() + 2);
    return value >= today && value <= max.toISOString().slice(0, 10);
  }

  defaultMessage(): string {
    return 'La fecha de entrega debe ser de hoy en adelante y como mucho dentro de 2 años';
  }
}

export class CreateRoomDto {
  @ApiProperty({
    type: String,
    minLength: ROOM_NAME_MIN,
    maxLength: ROOM_NAME_MAX,
    example: 'Cena de Navidad de la oficina',
  })
  @Transform(clean)
  @IsString({ message: 'El nombre de la sala es obligatorio' })
  @MinLength(ROOM_NAME_MIN, {
    message: `El nombre de la sala debe tener al menos ${ROOM_NAME_MIN} caracteres`,
  })
  @MaxLength(ROOM_NAME_MAX, {
    message: `El nombre de la sala puede tener como mucho ${ROOM_NAME_MAX} caracteres`,
  })
  @Matches(ROOM_NAME_PATTERN, {
    message: 'El nombre de la sala tiene caracteres no permitidos',
  })
  name: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-12-20',
    description: 'Día de entrega de los regalos. De hoy a 2 años vista.',
  })
  @IsOptional()
  @Validate(GiftDateConstraint)
  giftDate?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 1000,
    example: 15,
    description: 'Presupuesto sugerido en euros, con hasta 2 decimales.',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'El presupuesto debe ser un importe con hasta 2 decimales' },
  )
  @Min(1, { message: 'El presupuesto mínimo es 1 €' })
  @Max(1000, { message: 'El presupuesto máximo es 1000 €' })
  budget?: number;
}

export class JoinRoomDto {
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: PARTICIPANT_NAME_MAX,
    example: 'Sofía',
    description:
      "Letras, números, espacios y ' - . No puede repetirse en la sala (sin distinguir mayúsculas ni tildes).",
  })
  @Transform(clean)
  @IsString({ message: 'El nombre es obligatorio' })
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(PARTICIPANT_NAME_MAX, {
    message: `El nombre puede tener como mucho ${PARTICIPANT_NAME_MAX} caracteres`,
  })
  @Matches(PARTICIPANT_NAME_PATTERN, {
    message: "El nombre solo puede tener letras, números, espacios y ' - .",
  })
  name: string;
}

export class RoomDto {
  @ApiProperty({ type: String, example: 'Cena de Navidad de la oficina' })
  name: string;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2026-12-20',
  })
  giftDate: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 15,
    description: 'Euros',
  })
  budget: number | null;

  @ApiProperty({ type: String, enum: ['open', 'drawn'], example: 'open' })
  status: 'open' | 'drawn';

  @ApiProperty({ type: Boolean, example: true })
  pairRuleEnabled: boolean;
}

export class ParticipantDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, example: 'Ana' })
  name: string;
}

export class AvailabilityDto {
  @ApiProperty({
    type: Boolean,
    description: 'false cuando se ha alcanzado MAX_ROOMS.',
  })
  canCreateRoom: boolean;
}

export class CreateRoomResponseDto {
  @ApiProperty({ type: RoomDto })
  room: RoomDto;

  @ApiProperty({
    type: String,
    example: 'AbCdEfGhIjKlMnOp',
    description: 'Código del enlace de invitación: /s/<inviteCode>.',
  })
  inviteCode: string;

  @ApiProperty({
    type: String,
    description:
      'Token del enlace de gestión: /o#<manageToken>. Se devuelve solo esta vez.',
  })
  manageToken: string;
}

export class InvitationDto {
  @ApiProperty({ type: RoomDto })
  room: RoomDto;

  @ApiProperty({ type: Number, example: 5 })
  participantCount: number;

  @ApiProperty({ type: Number, example: MAX_PARTICIPANTS })
  maxParticipants: number;

  @ApiProperty({
    type: [String],
    example: ['Ana', 'Luis', 'Marta'],
    description:
      'Nombres de quienes ya están dentro. Vacío si no se puede entrar.',
  })
  participantNames: string[];

  @ApiProperty({
    type: String,
    enum: ['ROOM_FULL', 'ROOM_CLOSED'],
    nullable: true,
    description: 'Motivo por el que no se puede entrar, o null si se puede.',
  })
  cannotJoinReason: 'ROOM_FULL' | 'ROOM_CLOSED' | null;
}

export class JoinRoomResponseDto {
  @ApiProperty({ type: ParticipantDto })
  participant: ParticipantDto;

  @ApiProperty({
    type: String,
    description:
      'Token del enlace personal: /p#<participantToken>. Se devuelve solo esta vez.',
  })
  participantToken: string;
}

export class WishlistDto {
  @ApiProperty({ type: String, enum: ['link', 'file'] })
  kind: 'link' | 'file';

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://ejemplo.com/mi-lista',
    description: 'Solo si kind = link.',
  })
  url: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'lista-deseos.pdf',
    description: 'Solo si kind = file. La descarga se pide aparte.',
  })
  fileName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['PDF', 'JPEG', 'PNG', 'WebP'],
  })
  fileType: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 1258291 })
  fileSize: number | null;
}

export class ParticipantWithWishlistDto extends ParticipantDto {
  @ApiProperty({ type: WishlistDto, nullable: true })
  wishlist: WishlistDto | null;
}

export class PairDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 2,
    maxItems: 2,
  })
  participantIds: string[];
}

export class ParticipantViewDto {
  @ApiProperty({ type: RoomDto })
  room: RoomDto;

  @ApiProperty({ type: ParticipantDto })
  me: ParticipantDto;

  @ApiProperty({
    type: [ParticipantWithWishlistDto],
    description:
      'Todos los participantes con su lista de deseos (visible para todos).',
  })
  participants: ParticipantWithWishlistDto[];

  @ApiProperty({ type: [PairDto] })
  pairs: PairDto[];

  @ApiProperty({ type: Number, example: MAX_PARTICIPANTS })
  maxParticipants: number;
}

export class OrganizerViewDto {
  @ApiProperty({ type: RoomDto })
  room: RoomDto;

  @ApiProperty({
    type: String,
    description: 'Código del enlace de invitación.',
  })
  inviteCode: string;

  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];

  @ApiProperty({ type: [PairDto] })
  pairs: PairDto[];

  @ApiProperty({ type: Number, example: MAX_PARTICIPANTS })
  maxParticipants: number;
}

// Edición de los datos de la sala. Solo se cambian los campos enviados;
// null en la fecha o el presupuesto los borra.
export class UpdateRoomDto {
  @ApiPropertyOptional({
    type: String,
    minLength: ROOM_NAME_MIN,
    maxLength: ROOM_NAME_MAX,
  })
  @ValidateIf((o: UpdateRoomDto) => o.name !== undefined)
  @Transform(clean)
  @IsString({ message: 'El nombre de la sala es obligatorio' })
  @MinLength(ROOM_NAME_MIN, {
    message: `El nombre de la sala debe tener al menos ${ROOM_NAME_MIN} caracteres`,
  })
  @MaxLength(ROOM_NAME_MAX, {
    message: `El nombre de la sala puede tener como mucho ${ROOM_NAME_MAX} caracteres`,
  })
  @Matches(ROOM_NAME_PATTERN, {
    message: 'El nombre de la sala tiene caracteres no permitidos',
  })
  name?: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @Validate(GiftDateConstraint)
  giftDate?: string | null;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'El presupuesto debe ser un importe con hasta 2 decimales' },
  )
  @Min(1, { message: 'El presupuesto mínimo es 1 €' })
  @Max(1000, { message: 'El presupuesto máximo es 1000 €' })
  budget?: number | null;
}

export class SetPairRuleDto {
  @ApiProperty({ type: Boolean, example: true })
  @IsBoolean({ message: 'Indica si la regla está activa (true o false)' })
  enabled: boolean;
}

export class CreatePairDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 2,
    maxItems: 2,
    description: 'Los dos participantes, sin pareja, de la misma sala.',
  })
  @IsArray({ message: 'Indica las dos personas de la pareja' })
  @ArrayMinSize(2, { message: 'Una pareja son dos personas' })
  @ArrayMaxSize(2, { message: 'Una pareja son dos personas' })
  @IsUUID('all', { each: true, message: 'Participante no válido' })
  participantIds: string[];
}

export class WishlistLinkDto {
  @ApiProperty({
    type: String,
    maxLength: 2000,
    example: 'https://ejemplo.com/mi-lista',
    description: 'Solo https.',
  })
  @IsString({ message: 'Escribe un enlace' })
  @MaxLength(2000, { message: 'El enlace es demasiado largo' })
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
      require_tld: true,
      disallow_auth: true,
    },
    { message: 'El enlace debe empezar por https://' },
  )
  url: string;
}

export class DownloadUrlDto {
  @ApiProperty({
    type: String,
    description:
      'URL firmada y temporal del almacenamiento. Descarga el archivo como adjunto.',
  })
  url: string;

  @ApiProperty({ type: Number, example: 300 })
  expiresInSeconds: number;
}
