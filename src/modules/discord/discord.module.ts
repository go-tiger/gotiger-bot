import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { RegisterPanelCommand } from './commands/register-panel.command';
import { RegisterButton } from './components/register.button';

@Module({
  providers: [DiscordService, RegisterPanelCommand, RegisterButton],
})
export class DiscordModule {}
