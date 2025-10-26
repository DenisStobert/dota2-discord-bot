export enum TournamentPhase {
  Idle = "IDLE",                // ничего не идёт
  Registration = "REGISTRATION", // идёт регистрация
  Running = "RUNNING",           // турнир запущен
}

let currentPhase: TournamentPhase = TournamentPhase.Idle;

export function getTournamentPhase() {
  return currentPhase;
}

export function setTournamentPhase(phase: TournamentPhase) {
  currentPhase = phase;
}
