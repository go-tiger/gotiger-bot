import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthServiceId } from '../constants/services';
import {
  AUTH_STRATEGIES,
  type AuthStrategy,
} from '../interfaces/auth-strategy.interface';

@Injectable()
export class AuthStrategyRegistry {
  private readonly byIdMap: Map<AuthServiceId, AuthStrategy>;

  constructor(@Inject(AUTH_STRATEGIES) strategies: AuthStrategy[]) {
    this.byIdMap = new Map(
      strategies.map((strategy) => [strategy.id, strategy]),
    );
  }

  getOrThrow(id: string): AuthStrategy {
    const strategy = this.byIdMap.get(id as AuthServiceId);
    if (!strategy) {
      throw new NotFoundException(`알 수 없는 서비스입니다: ${id}`);
    }
    return strategy;
  }
}
