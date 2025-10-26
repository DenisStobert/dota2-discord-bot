let registrationMessageId: string | null = null;

export function setRegistrationMessageId(id: string | null) {
  registrationMessageId = id;
}

export function getRegistrationMessageId(): string | null {
  return registrationMessageId;
}
