import { ConfigService } from '@nestjs/config';
import { PublicClientApplication } from '@azure/msal-node';

export const MSAL_CLIENT = 'MSAL_CLIENT';

export const msalProvider = {
  provide: MSAL_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    new PublicClientApplication({
      auth: {
        clientId: configService.get<string>('MS_CLIENT_ID') ?? '',
        authority: 'https://login.microsoftonline.com/consumers',
      },
    }),
};
