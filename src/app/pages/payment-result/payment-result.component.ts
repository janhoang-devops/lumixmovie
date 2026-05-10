import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { PaymentStatus } from '../../models/payment.model';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  styleUrls: ['./payment-result.component.scss']
})
export class PaymentResultComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const orderId    = params['orderId']    || null;
      const resultCode = Number(params['resultCode'] ?? -1);

      if (!orderId) {
        // Không có orderId → redirect về premium với trạng thái lỗi
        this.redirectToPremium('failed');
        return;
      }

      // Gọi API lấy trạng thái chính thức từ backend
      this.paymentService.checkPaymentStatus(orderId).subscribe({
        next: (payment) => {
          if (payment.status === PaymentStatus.SUCCESS) {
            // Kích hoạt Premium trong localStorage ngay lập tức
            this.authService.activatePremium();
            // Đồng bộ premiumExpiredAt từ API user
            const userId = this.authService.getUserId();
            if (userId) {
              this.userService.getUserById(userId).subscribe({
                next: (user) => {
                  this.authService.syncPremiumStatus(user.isPremium ?? false, user.premiumExpiredAt);
                },
                error: () => {}
              });
            }
            this.redirectToPremium('success');
          } else {
            this.redirectToPremium('failed');
          }
        },
        error: () => {
          // Fallback dùng resultCode từ MoMo param
          if (resultCode === 0) {
            this.authService.activatePremium();
            this.redirectToPremium('success');
          } else {
            this.redirectToPremium('failed');
          }
        }
      });
    });
  }

  private redirectToPremium(result: 'success' | 'failed'): void {
    this.router.navigate(['/premium'], {
      queryParams: { payResult: result }
    });
  }
}
