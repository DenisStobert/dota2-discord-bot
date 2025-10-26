declare module 'dota2' {
  import { EventEmitter } from 'events';
  import SteamUser from 'steam-user';

  export namespace schema {
    export function lookupEnum(name: string): any;
  }

  export class Dota2Client extends EventEmitter {
    constructor(steamClient: SteamUser, debug?: boolean, debugMore?: boolean);

    launch(): void;
    exit(): void;

    createPracticeLobby(options: any, callback: (err: any, body: any) => void): void;
    leavePracticeLobby(callback?: () => void): void;
    destroyLobby(callback?: () => void): void;
    joinPracticeLobby(id: string, callback?: (err: any, body: any) => void): void;

    on(event: 'ready', listener: () => void): this;
    on(event: 'unready', listener: () => void): this;
    on(event: 'practiceLobbyUpdate', listener: (lobby: any) => void): this;
    on(event: 'practiceLobbyResponse', listener: (result: any, response: any) => void): this;
    on(event: string, listener: Function): this;

    once(event: 'ready', listener: () => void): this;
    once(event: string, listener: Function): this;
  }
}