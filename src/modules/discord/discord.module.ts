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
import { LINK_PROVIDERS } from './providers/link-provider.interface';
import { LinkProviderRegistry } from './providers/link-provider.registry';
import { MinecraftProvider } from './providers/minecraft.provider';
import { PalworldProvider } from './providers/palworld.provider';
import { ChzzkProvider } from './providers/chzzk.provider';

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
    MinecraftProvider,
    PalworldProvider,
    ChzzkProvider,
    {
      // 배열 순서가 곧 /설정 대시보드의 노출 순서다.
      provide: LINK_PROVIDERS,
      useFactory: (
        minecraft: MinecraftProvider,
        palworld: PalworldProvider,
        chzzk: ChzzkProvider,
      ) => [minecraft, palworld, chzzk],
      inject: [MinecraftProvider, PalworldProvider, ChzzkProvider],
    },
    LinkProviderRegistry,
  ],
})
export class DiscordModule {}
