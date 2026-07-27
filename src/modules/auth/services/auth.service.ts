import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PublicClientApplication } from '@azure/msal-node';
import { MSAL_CLIENT } from '../providers/msal.provider';
import { MinecraftAuthService } from './minecraft-auth.service';
import { User } from '../../../common/entities/user.entity';
import { Minecraft } from '../../../common/entities/minecraft.entity';
import {
  MINECRAFT_LINKED_EVENT,
  MinecraftLinkedEvent,
} from '../../../common/events/minecraft-linked.event';

const MSAL_SCOPES = ['XboxLive.signin'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(MSAL_CLIENT)
    private readonly msalClient: PublicClientApplication,
    private readonly configService: ConfigService,
    private readonly minecraftAuthService: MinecraftAuthService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Minecraft)
    private readonly minecraftRepository: Repository<Minecraft>,
  ) {}

  async createAuthUrl(discordId: string, guildId: string): Promise<string> {
    const state = `${discordId}:${guildId}`;

    return this.msalClient.getAuthCodeUrl({
      scopes: MSAL_SCOPES,
      redirectUri: this.redirectUri,
      state,
      prompt: 'select_account',
    });
  }

  async handleCallback(code: string, state: string): Promise<Minecraft> {
    const [discordId, guildId] = state.split(':');
    if (!discordId || !guildId) {
      throw new BadRequestException('잘못된 인증 요청입니다.');
    }

    const result = await this.msalClient.acquireTokenByCode({
      code,
      scopes: MSAL_SCOPES,
      redirectUri: this.redirectUri,
    });

    const profile = await this.minecraftAuthService.fetchProfile(
      result.accessToken,
    );

    const minecraft = await this.link(
      discordId,
      profile.uuid,
      profile.username,
    );
    this.logger.log(
      `계정 연결 완료: discordId=${discordId} username=${profile.username}`,
    );

    this.eventEmitter.emit(
      MINECRAFT_LINKED_EVENT,
      new MinecraftLinkedEvent(
        discordId,
        guildId,
        profile.uuid,
        profile.username,
      ),
    );

    return minecraft;
  }

  private async link(
    discordId: string,
    uuid: string,
    username: string,
  ): Promise<Minecraft> {
    const user = await this.findOrCreateUser(discordId);

    const owner = await this.minecraftRepository.findOne({ where: { uuid } });
    if (owner && owner.userId !== user.id) {
      throw new BadRequestException(
        '이미 다른 Discord 계정에 연결된 Minecraft 계정입니다.',
      );
    }

    const existing = await this.minecraftRepository.findOne({
      where: { userId: user.id },
    });

    if (existing) {
      existing.uuid = uuid;
      existing.username = username;
      return this.minecraftRepository.save(existing);
    }

    return this.minecraftRepository.save(
      this.minecraftRepository.create({ userId: user.id, uuid, username }),
    );
  }

  private async findOrCreateUser(discordId: string): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { discordId },
    });
    if (existing) return existing;

    return this.userRepository.save(this.userRepository.create({ discordId }));
  }

  private get redirectUri(): string {
    return this.configService.get<string>('MS_REDIRECT_URI') ?? '';
  }
}
