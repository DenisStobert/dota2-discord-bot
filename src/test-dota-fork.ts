import SteamUser from 'steam-user';
import Dota2 from 'dota2-fork';
import dotenv from 'dotenv';
dotenv.config();

console.log('🟢 Starting Dota2 bot via dota2-fork...');

const steam = new SteamUser();
const dota2 = new Dota2.Dota2Client(steam, false);

steam.on('loggedOn', () => {
  console.log('✅ Logged into Steam');
  steam.setPersona(SteamUser.EPersonaState.Online);
  console.log('🎮 Launching Dota 2...');
  steam.gamesPlayed([570]);

  // 👇 Добавь
  setTimeout(() => {
    console.log('🟢 Launching Dota2 client...');
    dota2.launch();
  }, 5000);
});

steam.on('playingState', (blocked: boolean, appID: number) => {
  console.log(`🎲 Steam playing state changed: blocked=${blocked}, app=${appID}`);
});

steam.on('gamesPlayed', (apps: number[]) => {
  console.log('🔔 Steam gamesPlayed event, apps:', apps);
});

steam.on('error', (err) => console.error('❌ Steam error:', err));
steam.on('disconnected', (eresult, msg) =>
  console.warn('⚠️ Disconnected from Steam:', eresult, msg)
);

dota2.on('ready', () => {
  console.log('🎮 Connected to Game Coordinator — ready!');

  const lobbyOptions = {
    game_name: 'ChatGPT Test Lobby',
    pass_key: 'test1234',
    server_region: 3,
    game_mode: 22,
    allow_spectating: true,
    fill_with_bots: false,
    visibility: 1,
  };

  console.log('🚀 Creating lobby...');
  dota2.createPracticeLobby(lobbyOptions, (err: any, body: any) => {
    if (err) {
      console.error('❌ Failed to create lobby:', err);
      return;
    }

    console.log('✅ Lobby created successfully!');
    console.log('📡 Lobby data:', body);

    setTimeout(() => {
      console.log('🧹 Destroying lobby...');
      dota2.destroyLobby();
      console.log('✅ Lobby destroyed');
      process.exit(0);
    }, 20000);
  });
});

dota2.on('debug', (msg: string) => console.log('🪲 [Dota2 debug]', msg));
dota2.on('connectedToGC', () => console.log('✅ ConnectedToGC event fired'));
dota2.on('disconnectedFromGC', () => console.log('⚠️ DisconnectedFromGC'));

dota2.on('unready', () => {
  console.warn('⚠️ Dota2 client unready');
});

setTimeout(() => {
  console.error('❌ Timeout: Dota2 ready event not fired in 30s');
  process.exit(1);
}, 30000);

(async () => {
  const { STEAM_USERNAME, STEAM_PASSWORD, STEAM_GUARD_CODE } = process.env;
  if (!STEAM_USERNAME || !STEAM_PASSWORD) {
    console.error('⚠️ Missing STEAM_USERNAME or STEAM_PASSWORD in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to Steam...');
  steam.logOn({
    accountName: STEAM_USERNAME,
    password: STEAM_PASSWORD,
    authCode: STEAM_GUARD_CODE || undefined,
  });
})();
