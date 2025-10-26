// src/types/dota2-fork.d.ts
declare module 'dota2-fork' {
  import { EventEmitter } from 'events';

  export class Dota2Client extends EventEmitter {
    constructor(steamClient: any, debug?: boolean);

    launch(): void;
    exit(): void;
    createPracticeLobby(options: any, callback?: (err: any, body: any) => void): void;
    destroyLobby(callback?: () => void): void;
    leavePracticeLobby(callback?: () => void): void;

    joinPracticeLobby(lobby_id: string, password?: string): void;
    joinPracticeLobbyTeam(team: number, slot?: number): void;
    practiceLobbyKick(user_id: string): void;
    practiceLobbySetDetails(details: any): void;
    practiceLobbyLeave(): void;

    on(event: 'ready', listener: () => void): this;
    on(event: 'unready', listener: () => void): this;
    on(event: 'practiceLobbyUpdate', listener: (lobby: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  const Dota2: {
    Dota2Client: typeof Dota2Client;
  };

  export default Dota2;
}
