export class MissingAuditActorError extends Error {
  constructor() {
    super("audit entries require an identifiable actor");
  }
}

export interface AuditEntryProps {
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  eventId: string;
}

/** spec: foundation/audit - every entry must be attributable to a known actor. */
export class AuditEntry {
  private constructor(private readonly props: AuditEntryProps) {}

  static create(props: AuditEntryProps): AuditEntry {
    if (!props.actorUserId) {
      throw new MissingAuditActorError();
    }
    return new AuditEntry(props);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get actorUserId(): string {
    return this.props.actorUserId;
  }

  get action(): string {
    return this.props.action;
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): string | null {
    return this.props.entityId;
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata;
  }

  get eventId(): string {
    return this.props.eventId;
  }
}
