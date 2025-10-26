declare module 'node-dota2-user' {
  import { EventEmitter } from 'events';
  import SteamUser from 'steam-user';

  export default class Dota2Client extends EventEmitter {
    constructor(steamClient: SteamUser, options?: any);
    launch(): void;
    exit(): void;
    createPracticeLobby(options: any): Promise<any>;
    destroyLobby(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}
