export interface DomainEvent<TPayload = Record<string, unknown>> {
  tenantId: string;
  type: string;
  payload: TPayload;
}
