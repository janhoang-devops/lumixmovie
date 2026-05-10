import { PaymentStatus, PlanType } from './payment.model';

export interface PaymentAdminResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  orderInfo: string;
  status: PaymentStatus;
  planType?: PlanType;
  userId?: string;
  userEmail?: string;
  username?: string;
  transId?: number;
  resultCode?: number;
  message?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentStatsResponse {
  totalOrders: number;
  successOrders: number;
  pendingOrders: number;
  failedOrders: number;
  totalRevenue: number;
}
