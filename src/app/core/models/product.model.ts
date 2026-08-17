export interface ProductImageVariant {
  width: number;
  url: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
  variants?: ProductImageVariant[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  sku: string;
  images: ProductImage[];
  tags: string[];
  isActive: boolean;
  createdAt: string;
}

export const LOW_STOCK_THRESHOLD = 10;

export interface ProductImagePayload {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
  variants?: ProductImageVariant[];
}

export interface ProductPayload {
  name: string;
  categoryId: string;
  price: number;
  discountPrice?: number;
  stock?: number;
  sku?: string;
  description?: string;
  tags?: string[];
  images?: ProductImagePayload[];
  isActive?: boolean;
}
