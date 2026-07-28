import { IsNotEmpty, IsString } from 'class-validator';

/** OAuth 제공자가 리다이렉트로 돌려주는 쿼리. */
export class AuthCallbackDto {
  @IsString()
  @IsNotEmpty({ message: '잘못된 인증 요청입니다.' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: '잘못된 인증 요청입니다.' })
  state: string;
}
