import dotenv from 'dotenv';

dotenv.config();

interface Config {
  discord: {
    token: string;
    commandPrefix: string;
    allowedRoleName?: string;
    lobbyChannelId?: string;
    mainChannelId?: string,
  };
  steam: {
    apiKey: string;
    username?: string;
    password?: string;
    guardCode?: string;
  };
  lobby: {
    defaultRegion: number;
    defaultGameMode: number;
  };
  database: {
    path: string;
  };
  logging: {
    level: string;
  };
}

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const config: Config = {
  discord: {
    token: getEnvVar('DISCORD_TOKEN'),
    commandPrefix: getEnvVar('COMMAND_PREFIX', false) || '!',
    allowedRoleName: getEnvVar('ALLOWED_ROLE_NAME', false),
    lobbyChannelId: getEnvVar('LOBBY_CHANNEL_ID', false),
    mainChannelId: getEnvVar('DISCORD_MAIN_CHANNEL', false),
  },
  steam: {
    apiKey: getEnvVar('STEAM_API_KEY'),
    username: getEnvVar('STEAM_USERNAME', false),
    password: getEnvVar('STEAM_PASSWORD', false),
  },
  lobby: {
    defaultRegion: parseInt(getEnvVar('DEFAULT_REGION', false) || '3'),
    defaultGameMode: parseInt(getEnvVar('DEFAULT_GAME_MODE', false) || '22'),
  },
  database: {
    path: getEnvVar('DATABASE_PATH', false) || './lobbies.db',
  },
  logging: {
    level: getEnvVar('LOG_LEVEL', false) || 'info',
  },
};