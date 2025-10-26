declare module 'steam-user' {
  import { EventEmitter } from 'events';

  class SteamUser extends EventEmitter {
    constructor(options?: any);

    logOn(details: {
      accountName: string;
      password: string;
      authCode?: string;
      twoFactorCode?: string;
    }): void;

    logOff(): void;
    setPersona(state: number, name?: string): void;
    gamesPlayed(apps: number[] | string[]): void;

    steamID: any;
    storage: any;

    on(event: 'loggedOn', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'disconnected', listener: (eresult: number, msg?: string) => void): this;
    on(event: string, listener: Function): this;

    once(event: string, listener: Function): this;

    static readonly EPersonaState: {
      Offline: 0;
      Online: 1;
      Busy: 2;
      Away: 3;
      Snooze: 4;
      LookingToTrade: 5;
      LookingToPlay: 6;
      Invisible: 7;
    };
  }

  export = SteamUser;
}