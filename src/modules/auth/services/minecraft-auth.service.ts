import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

const XBOX_AUTH = {
  userAuthUrl: 'https://user.auth.xboxlive.com/user/authenticate',
  xstsUrl: 'https://xsts.auth.xboxlive.com/xsts/authorize',
  relyingParty: 'rp://api.minecraftservices.com/',
} as const;

const MINECRAFT_API = {
  loginUrl: 'https://api.minecraftservices.com/authentication/login_with_xbox',
  profileUrl: 'https://api.minecraftservices.com/minecraft/profile',
} as const;

export interface MinecraftProfile {
  uuid: string;
  username: string;
}

interface XboxAuthResponse {
  Token: string;
  DisplayClaims: { xui: { uhs: string }[] };
}

interface MinecraftLoginResponse {
  access_token: string;
}

interface MinecraftProfileResponse {
  id: string;
  name: string;
}

@Injectable()
export class MinecraftAuthService {
  private readonly logger = new Logger(MinecraftAuthService.name);

  async fetchProfile(microsoftToken: string): Promise<MinecraftProfile> {
    const xbl = await this.authenticateXbox(microsoftToken);
    this.logger.log('Xbox Live 인증 완료');

    const xsts = await this.authorizeXsts(xbl.Token);
    this.logger.log('XSTS 인증 완료');

    const userHash = xsts.DisplayClaims.xui[0].uhs;
    const minecraftToken = await this.loginMinecraft(userHash, xsts.Token);
    this.logger.log('Minecraft 인증 완료');

    const profile = await this.getProfile(minecraftToken);
    this.logger.log(`프로필 조회: ${profile.username} (${profile.uuid})`);

    return profile;
  }

  private async authenticateXbox(
    microsoftToken: string,
  ): Promise<XboxAuthResponse> {
    const response = await fetch(XBOX_AUTH.userAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${microsoftToken}`,
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Xbox Live 인증에 실패했습니다.');
    }

    return response.json() as Promise<XboxAuthResponse>;
  }

  private async authorizeXsts(xblToken: string): Promise<XboxAuthResponse> {
    const response = await fetch(XBOX_AUTH.xstsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xblToken],
        },
        RelyingParty: XBOX_AUTH.relyingParty,
        TokenType: 'JWT',
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException(
        'Xbox 계정을 확인할 수 없습니다. Xbox Live 프로필이 없거나 연령 제한이 있을 수 있습니다.',
      );
    }

    return response.json() as Promise<XboxAuthResponse>;
  }

  private async loginMinecraft(
    userHash: string,
    xstsToken: string,
  ): Promise<string> {
    const response = await fetch(MINECRAFT_API.loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Minecraft 인증에 실패했습니다.');
    }

    const data = (await response.json()) as MinecraftLoginResponse;
    return data.access_token;
  }

  private async getProfile(minecraftToken: string): Promise<MinecraftProfile> {
    const response = await fetch(MINECRAFT_API.profileUrl, {
      headers: { Authorization: `Bearer ${minecraftToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException(
        'Minecraft 프로필을 찾을 수 없습니다. 게임을 소유하고 있는지 확인해주세요.',
      );
    }

    const data = (await response.json()) as MinecraftProfileResponse;
    return { uuid: data.id, username: data.name };
  }
}
