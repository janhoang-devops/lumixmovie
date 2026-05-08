export interface CreatePaymentRequest {
  planType: PlanType;
  userId: string;
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
  planType?: PlanType;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export enum PlanType {
  MONTHLY   = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY    = 'YEARLY'
}

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  price: number;
  duration: string;
  badge?: string;
  features: string[];
  popular?: boolean;
}

/** Các gói hội viên có sẵn */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: PlanType.MONTHLY,
    name: 'Gói Tháng',
    price: 59000,
    duration: '1 tháng',
    features: [
      'Xem không giới hạn phim Premium',
      'Chất lượng Full HD',
      'Không quảng cáo',
      'Hủy bất cứ lúc nào'
    ]
  },
  {
    id: PlanType.QUARTERLY,
    name: 'Gói 3 Tháng',
    price: 129000,
    duration: '3 tháng',
    badge: 'Tiết kiệm 27%',
    popular: true,
    features: [
      'Xem không giới hạn phim Premium',
      'Chất lượng 4K Ultra HD',
      'Không quảng cáo',
      'Tải phim xem offline',
      'Hủy bất cứ lúc nào'
    ]
  },
  {
    id: PlanType.YEARLY,
    name: 'Gói Năm',
    price: 499000,
    duration: '12 tháng',
    badge: 'Tiết kiệm 30%',
    features: [
      'Xem không giới hạn phim Premium',
      'Chất lượng 4K Ultra HD + Dolby',
      'Không quảng cáo',
      'Tải phim xem offline',
      'Ưu tiên hỗ trợ 24/7',
      'Hủy bất cứ lúc nào'
    ]
  }
];
