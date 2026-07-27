import { Module } from '@nestjs/common';
import { GuildModule } from '../guild/guild.module';
import { DiscordService } from './discord.service';
import { SetupCommand } from './commands/setup.command';
import { RegisterButton } from './components/register.button';
import { SetupButton } from './components/setup.button';
import { SetupSelect } from './components/setup.select';
import { ChannelSetupService } from './services/channel-setup.service';
import { RegisterPanelService } from './services/register-panel.service';
import { PendingRegisterService } from './services/pending-register.service';
import { MinecraftLinkedListener } from './listeners/minecraft-linked.listener';

@Module({
  imports: [GuildModule],
  providers: [
    DiscordService,
    SetupCommand,
    RegisterButton,
    SetupButton,
    SetupSelect,
    ChannelSetupService,
    RegisterPanelService,
    PendingRegisterService,
    MinecraftLinkedListener,
  ],
})
export class DiscordModule {}
