export class InvalidLeadError extends Error {}

export interface LeadProps {
  id: string;
  establishmentName: string;
  email: string;
  businessType: string;
}

/** A prospective establishment submitted through the marketing landing page CTA (spec: marketing/lead-capture). */
export class Lead {
  private constructor(private readonly props: LeadProps) {}

  static create(props: LeadProps): Lead {
    if (!props.establishmentName || props.establishmentName.trim().length === 0) {
      throw new InvalidLeadError("establishmentName is required");
    }
    if (!props.email || !props.email.includes("@")) {
      throw new InvalidLeadError("email must be a valid email address");
    }
    if (!props.businessType || props.businessType.trim().length === 0) {
      throw new InvalidLeadError("businessType is required");
    }
    return new Lead(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentName(): string {
    return this.props.establishmentName;
  }

  get email(): string {
    return this.props.email;
  }

  get businessType(): string {
    return this.props.businessType;
  }
}
