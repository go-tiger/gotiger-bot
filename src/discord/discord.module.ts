import { Module } from '@nestjs/common';
import { GuildModule } from '../modules/guild/guild.module';
import { DiscordErrorListener } from './shared/discord-error.listener';
import {
  LINK_PROVIDERS,
  type LinkProvider,
} from './shared/providers/link-provider.interface';
import { LinkProviderRegistry } from './shared/providers/link-provider.registry';
import { MinecraftProvider } from './shared/providers/minecraft.provider';
import { PalworldProvider } from './shared/providers/palworld.provider';
import { ChzzkProvider } from './shared/providers/chzzk.provider';
import { SetupCommand } from './guild/setup.command';
import { SetupButton } from './guild/setup.button';
import { SetupSelect } from './guild/setup.select';
import { SetupNavButton } from './guild/setup-nav.button';
import { ServiceToggleButton } from './guild/service-toggle.button';
import { SetupDashboardService } from './guild/setup-dashboard.service';
import { ChannelSetupService } from './guild/channel-setup.service';
import { RegisterButton } from './auth/register.button';
import { RegisterPanelService } from './auth/register-panel.service';
import { PendingRegisterService } from './auth/pending-register.service';
import { MinecraftLinkedListener } from './auth/minecraft-linked.listener';
import { ChzzkLinkedListener } from './auth/chzzk-linked.listener';

/**
 * 배열 순서가 곧 /설정 대시보드의 노출 순서다.
 * 새 서비스는 LinkProvider 구현체를 만들어 여기에만 추가하면 된다.
 */
const linkProviders = [MinecraftProvider, PalworldProvider, ChzzkProvider];

@Module({
  imports: [GuildModule],
  providers: [
    DiscordErrorListener,
    // 서버 설정(/설정) UI
    SetupCommand,
    SetupButton,
    SetupSelect,
    SetupNavButton,
    ServiceToggleButton,
    SetupDashboardService,
    ChannelSetupService,
    // 계정 연결 UI
    RegisterButton,
    RegisterPanelService,
    PendingRegisterService,
    MinecraftLinkedListener,
    ChzzkLinkedListener,
    ...linkProviders,
    {
      provide: LINK_PROVIDERS,
      useFactory: (...providers: LinkProvider[]) => providers,
      inject: linkProviders,
    },
    LinkProviderRegistry,
  ],
})
export class DiscordModule {}
