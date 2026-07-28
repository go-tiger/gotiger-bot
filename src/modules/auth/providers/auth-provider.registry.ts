import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ServiceId } from '../../discord/discord.constants';
import { AUTH_PROVIDERS, type AuthProvider } from './auth-provider.interface';

@Injectable()
export class AuthProviderRegistry {
  private readonly byIdMap: Map<ServiceId, AuthProvider>;

  constructor(@Inject(AUTH_PROVIDERS) providers: AuthProvider[]) {
    this.byIdMap = new Map(
      providers.map((provider) => [provider.id, provider]),
    );
  }

  getOrThrow(id: string): AuthProvider {
    const provider = this.byIdMap.get(id as ServiceId);
    if (!provider) {
      throw new NotFoundException(`알 수 없는 서비스입니다: ${id}`);
    }
    return provider;
  }
}
