import { Matches } from 'class-validator';

/** Discord 스노플레이크는 17~20 자리 숫자 문자열이다. */
const SNOWFLAKE = /^\d{17,20}$/;

/** Discord 버튼 링크가 붙여 보내는 쿼리. 키는 discord.constants 의 링크 빌더와 맞춘다. */
export class AuthLoginDto {
  @Matches(SNOWFLAKE, { message: '잘못된 인증 요청입니다.' })
  d: string;

  @Matches(SNOWFLAKE, { message: '잘못된 인증 요청입니다.' })
  g: string;
}
