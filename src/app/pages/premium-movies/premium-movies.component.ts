import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Movie } from '../../models/movie.model';
import { MovieService } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { PaymentService } from '../../services/payment.service';
import { NotificationService } from '../../services/notification.service';
import {
  PaymentResponse,
  PaymentStatus,
  PlanType,
  SubscriptionPlan,
  SUBSCRIPTION_PLANS
} from '../../models/payment.model';

@Component({
  selector: 'app-premium-movies',
  templateUrl: './premium-movies.component.html',
  styleUrls: ['./premium-movies.component.scss']
})
export class PremiumMoviesComponent implements OnInit, OnDestroy {

  // ==================== State ====================
  premiumMovies: Movie[] = [];
  loading = true;
  error: string | null = null;

  // Gói hội viên
  plans: SubscriptionPlan[] = SUBSCRIPTION_PLANS;
  selectedPlan: SubscriptionPlan | null = null;

  // Thanh toán
  showPaymentModal = false;
  paymentLoading = false;
  paymentStep: 'confirm' | 'qr' | 'success' | 'failed' = 'confirm';
  currentPayment: PaymentResponse | null = null;

  private statusCheckInterval: any;
  private checkCount = 0;
  private readonly MAX_CHECKS = 60;

  readonly PlanType = PlanType;

  constructor(
    private movieService: MovieService,
    private authService: AuthService,
    private userService: UserService,
    private paymentService: PaymentService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPremiumMovies();
  }

  ngOnDestroy(): void {
    this.stopStatusCheck();
  }

  // ==================== Movie Loading ====================

  private loadPremiumMovies(): void {
    this.loading = true;
    this.movieService.getAllMovies().subscribe({
      next: (movies) => {
        // Lấy các phim có isPremium = true, hoặc lấy ngẫu nhiên nếu chưa có field
        const premiumList = movies.filter(m => m.isPremium);
        this.premiumMovies = premiumList.length > 0
          ? premiumList
          : movies.slice(0, Math.min(12, movies.length));
        this.loading = false;
      },
      error: () => {
        this.error = 'Không thể tải danh sách phim. Vui lòng thử lại sau.';
        this.loading = false;
      }
    });
  }

  // ==================== Plan Selection ====================

  selectPlan(plan: SubscriptionPlan): void {
    if (!this.authService.isLoggedIn()) {
      this.notification.show('Vui lòng đăng nhập để mua gói hội viên!', 'warning');
      this.router.navigate(['/login']);
      return;
    }
    this.selectedPlan = plan;
    this.paymentStep = 'confirm';
    this.currentPayment = null;
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedPlan = null;
    this.currentPayment = null;
    this.paymentStep = 'confirm';
    this.stopStatusCheck();
  }

  // ==================== Payment ====================

  confirmPayment(): void {
    if (!this.selectedPlan) return;

    const userId = this.authService.getUserId();
    if (!userId) {
      this.notification.show('Phiên đăng nhập đã hết hạn!', 'error');
      return;
    }

    this.paymentLoading = true;
    this.paymentService.createPayment({
      planType: this.selectedPlan.id,
      userId: userId
    }).subscribe({
      next: (payment) => {
        this.currentPayment = payment;
        this.paymentStep = 'qr';
        this.paymentLoading = false;
        this.startStatusCheck(payment.orderId);
      },
      error: (err) => {
        this.paymentLoading = false;
        this.notification.show(err.message || 'Không thể tạo đơn thanh toán!', 'error');
      }
    });
  }

  openMomoApp(): void {
    if (this.currentPayment?.payUrl) {
      const targetUrl = this.currentPayment.payUrl;
      console.log('Redirecting to MoMo:', targetUrl);
      const win = window.open(targetUrl, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = targetUrl;
      }
    } else {
      this.notification.show('Không tìm thấy liên kết thanh toán MoMo!', 'error');
    }
  }

  // ==================== Status Polling ====================

  private startStatusCheck(orderId: string): void {
    this.checkCount = 0;
    this.stopStatusCheck();
    this.statusCheckInterval = setInterval(() => {
      this.checkCount++;
      if (this.checkCount > this.MAX_CHECKS) {
        this.stopStatusCheck();
        this.paymentStep = 'failed';
        return;
      }
      this.paymentService.checkPaymentStatus(orderId).subscribe({
        next: (payment) => {
          if (payment.status === PaymentStatus.SUCCESS) {
            this.stopStatusCheck();
            this.currentPayment = payment;
            this.paymentStep = 'success';
            // Kích hoạt Premium trong localStorage ngay lập tức
            this.authService.activatePremium();
            // Đồng bộ thêm premiumExpiredAt từ API user
            const userId = this.authService.getUserId();
            if (userId) {
              this.userService.getUserById(userId).subscribe({
                next: (user) => {
                  this.authService.syncPremiumStatus(user.isPremium ?? false, user.premiumExpiredAt);
                },
                error: () => {}
              });
            }
            this.notification.show('🎉 Kích hoạt hội viên thành công! Chào mừng bạn đến với Lumix Premium!', 'success');
          } else if (payment.status === PaymentStatus.FAILED) {
            this.stopStatusCheck();
            this.currentPayment = payment;
            this.paymentStep = 'failed';
            this.notification.show('Thanh toán thất bại. Vui lòng thử lại!', 'error');
          }
        },
        error: () => {}
      });
    }, 5000);
  }

  private stopStatusCheck(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  // ==================== Helpers ====================

  getPlanDurationLabel(planType?: PlanType): string {
    switch (planType) {
      case PlanType.QUARTERLY: return '3 tháng';
      case PlanType.YEARLY:    return '1 năm';
      default:                 return '1 tháng';
    }
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  browsePremiumMovies(): void {
    this.closePaymentModal();
  }
}
