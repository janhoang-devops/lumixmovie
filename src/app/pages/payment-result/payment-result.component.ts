import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { PaymentStatus } from '../../models/payment.model';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  styleUrls: ['./payment-result.component.scss']
})
export class PaymentResultComponent implements OnInit {
  loading = true;
  status: PaymentStatus | null = null;
  orderId: string | null = null;
  amount = 0;
  orderInfo = '';
  errorMessage = '';

  PaymentStatus = PaymentStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    // MoMo redirect về với query params: orderId, resultCode, message, ...
    this.route.queryParams.subscribe(params => {
      this.orderId    = params['orderId']    || null;
      const resultCode = Number(params['resultCode'] ?? -1);
      this.orderInfo  = params['orderInfo']  || '';
      this.amount     = Number(params['amount'] || 0);

      if (!this.orderId) {
        this.loading = false;
        this.status = PaymentStatus.FAILED;
        this.errorMessage = 'Không tìm thấy mã đơn hàng.';
        return;
      }

      // Gọi API để lấy trạng thái chính thức từ backend
      this.paymentService.checkPaymentStatus(this.orderId).subscribe({
        next: (payment) => {
          this.status   = payment.status;
          this.amount   = payment.amount;
          this.orderInfo = payment.orderInfo || this.orderInfo;
          this.loading  = false;
        },
        error: () => {
          // Fallback: dùng resultCode từ MoMo param
          this.status  = resultCode === 0 ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
          this.loading = false;
        }
      });
    });
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goPremium(): void {
    this.router.navigate(['/premium']);
  }

  formatPrice(p: number): string {
    return p.toLocaleString('vi-VN') + 'đ';
  }
}
