import { Module } from '@nestjs/common';
import { GuildModule } from '../guild/guild.module';
import { DiscordService } from './discord.service';
import { SetupCommand } from './commands/setup.command';
import { RegisterButton } from './components/register.button';
import { SetupButton } from './components/setup.button';
import { SetupSelect } from './components/setup.select';
import { ServiceToggleButton } from './components/service-toggle.button';
import { SetupNavButton } from './components/setup-nav.button';
import { ChannelSetupService } from './services/channel-setup.service';
import { SetupDashboardService } from './services/setup-dashboard.service';
import { RegisterPanelService } from './services/register-panel.service';
import { PendingRegisterService } from './services/pending-register.service';
import { MinecraftLinkedListener } from './listeners/minecraft-linked.listener';
import { ChzzkLinkedListener } from './listeners/chzzk-linked.listener';
import {
  LINK_PROVIDERS,
  type LinkProvider,
} from './providers/link-provider.interface';
import { LinkProviderRegistry } from './providers/link-provider.registry';
import { MinecraftProvider } from './providers/minecraft.provider';
import { PalworldProvider } from './providers/palworld.provider';
import { ChzzkProvider } from './providers/chzzk.provider';

/**
 * 배열 순서가 곧 /설정 대시보드의 노출 순서다.
 * 새 서비스는 LinkProvider 구현체를 만들어 여기에만 추가하면 된다.
 */
const linkProviders = [MinecraftProvider, PalworldProvider, ChzzkProvider];

@Module({
  imports: [GuildModule],
  providers: [
    DiscordService,
    SetupCommand,
    RegisterButton,
    SetupButton,
    SetupSelect,
    ServiceToggleButton,
    SetupNavButton,
    ChannelSetupService,
    SetupDashboardService,
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
