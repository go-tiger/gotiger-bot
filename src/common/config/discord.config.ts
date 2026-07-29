import { ConfigService } from '@nestjs/config';
import { NecordModuleOptions } from 'necord';
import { IntentsBitField } from 'discord.js';

export const discordConfig = {
  useFactory: (configService: ConfigService): NecordModuleOptions => ({
    token: configService.get<string>('DISCORD_TOKEN') ?? '',
    intents: [IntentsBitField.Flags.Guilds],
    development: configService.get<string>('DISCORD_DEV_GUILD_ID')
      ? [configService.get<string>('DISCORD_DEV_GUILD_ID') as string]
      : undefined,
  }),
  inject: [ConfigService],
};
