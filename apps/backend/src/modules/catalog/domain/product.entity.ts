export class InvalidProductError extends Error {}

export interface ProductVariantProps {
  id: string;
  productId: string;
  tenantId: string;
  name: string;
  priceCents: number;
  /**
   * Resource whose capacity this variant consumes when purchased, fixed
   * for the life of the variant (spec: catalog/product - "Variant
   * capacity linkage"). Null means the variant holds no capacity.
   */
  resourceId?: string | null;
}

/** A purchasable line within a Product (e.g. adult ticket, child ticket). */
export class ProductVariant {
  private constructor(private readonly props: ProductVariantProps) {}

  static create(props: ProductVariantProps): ProductVariant {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidProductError("variant name is required");
    }
    if (!Number.isInteger(props.priceCents) || props.priceCents < 0) {
      throw new InvalidProductError("variant price is required and must be a non-negative integer");
    }
    return new ProductVariant(props);
  }

  get id(): string {
    return this.props.id;
  }

  get productId(): string {
    return this.props.productId;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get priceCents(): number {
    return this.props.priceCents;
  }

  get resourceId(): string | null {
    return this.props.resourceId ?? null;
  }
}

export interface ProductProps {
  id: string;
  tenantId: string;
  venueId: string;
  name: string;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  /** Whitelist of channels this product may be sold through. Empty = all channels. */
  channels?: string[];
  variants: ProductVariant[];
}

/** Something a Venue sells (spec: catalog/product). */
export class Product {
  private constructor(private readonly props: ProductProps) {}

  static create(props: ProductProps): Product {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidProductError("name is required");
    }
    if (props.variants.length === 0) {
      throw new InvalidProductError("at least one variant is required");
    }
    if (
      props.availableFrom &&
      props.availableUntil &&
      props.availableFrom.getTime() > props.availableUntil.getTime()
    ) {
      throw new InvalidProductError("availableFrom must not be after availableUntil");
    }
    return new Product({ ...props, channels: props.channels ?? [] });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get venueId(): string {
    return this.props.venueId;
  }

  get name(): string {
    return this.props.name;
  }

  get availableFrom(): Date | null {
    return this.props.availableFrom ?? null;
  }

  get availableUntil(): Date | null {
    return this.props.availableUntil ?? null;
  }

  get channels(): string[] {
    return this.props.channels ?? [];
  }

  get variants(): ProductVariant[] {
    return this.props.variants;
  }

  /** spec: catalog/product - "Product availability window". */
  isAvailableAt(date: Date): boolean {
    if (this.availableFrom && date.getTime() < this.availableFrom.getTime()) return false;
    if (this.availableUntil && date.getTime() > this.availableUntil.getTime()) return false;
    return true;
  }

  /** spec: catalog/product - "Product channel visibility". */
  isVisibleOnChannel(channel: string): boolean {
    if (this.channels.length === 0) return true;
    return this.channels.includes(channel);
  }
}
