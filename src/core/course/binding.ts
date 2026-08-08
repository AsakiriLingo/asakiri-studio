export type PortableValue =
  | string
  | number
  | boolean
  | null
  | readonly PortableValue[]
  | { readonly [key: string]: PortableValue };

export type Binding =
  | { readonly kind: "record"; readonly recordId: string }
  | { readonly kind: "field"; readonly recordId: string; readonly fieldId: string }
  | {
      readonly kind: "item";
      readonly recordId: string;
      readonly fieldId: string;
      readonly itemId: string;
    }
  | { readonly kind: "asset"; readonly assetId: string }
  | { readonly kind: "literal"; readonly value: PortableValue };

export interface RenderFragment {
  readonly id: string;
  readonly role: string;
  readonly binding: Binding;
}

export interface AcceptedValue {
  readonly binding: Binding;
}
