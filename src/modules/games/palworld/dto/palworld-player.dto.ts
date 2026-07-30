import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

/** SteamID64 는 7656 으로 시작하는 17자리 숫자다. */
const STEAM_ID_64 = /^\d{17}$/;

export class PalworldPlayerDto {
  @Matches(STEAM_ID_64, { message: 'steamId 형식이 올바르지 않습니다.' })
  steamId: string;

  @IsString()
  @IsNotEmpty()
  playerName: string;
}

/** 입장·퇴장 push. at 은 순서 역전 판정에 쓰므로 필수다. */
export class PalworldPlayerEventDto extends PalworldPlayerDto {
  @IsDateString()
  at: string;
}

/**
 * 60초마다 오는 접속자 전체 목록.
 * 입/퇴장 push 를 놓쳐도 이걸로 세션이 보정되므로 세션의 기준이다.
 */
export class PalworldHeartbeatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PalworldPlayerDto)
  players: PalworldPlayerDto[];

  @IsDateString()
  at: string;
}
