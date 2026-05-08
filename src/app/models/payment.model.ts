export interface CreatePaymentRequest {
  amount: number;
  orderInfo: string;
  userId: string;
  movieId: string;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  orderInfo: string;
  status: PaymentStatus;
  payUrl: string;
  deeplink: string;
  qrCodeUrl: string;
  createdAt: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface PremiumMovie {
  id: string;
  title: string;
  posterUrl: string;
  description: string;
  price: number;
  genres: string[];
  rating: string;
  year: string;
  duration: string;
  isPurchased?: boolean;
}
