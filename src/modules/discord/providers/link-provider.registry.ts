import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  LINK_PROVIDERS,
  type LinkProvider,
  type ServiceCategory,
  type ServiceId,
} from './link-provider.interface';

@Injectable()
export class LinkProviderRegistry {
  private readonly byIdMap: Map<ServiceId, LinkProvider>;

  constructor(
    @Inject(LINK_PROVIDERS) private readonly providers: LinkProvider[],
  ) {
    this.byIdMap = new Map(
      providers.map((provider) => [provider.id, provider]),
    );
  }

  all(): LinkProvider[] {
    return this.providers;
  }

  /** 해당 분류의 서비스 목록. 아직 없으면 빈 배열이다. */
  byCategory(category: ServiceCategory): LinkProvider[] {
    return this.providers.filter((provider) => provider.category === category);
  }

  find(id: string): LinkProvider | undefined {
    return this.byIdMap.get(id as ServiceId);
  }

  getOrThrow(id: string): LinkProvider {
    const provider = this.find(id);
    if (!provider) {
      throw new NotFoundException(`알 수 없는 서비스입니다: ${id}`);
    }
    return provider;
  }
}
