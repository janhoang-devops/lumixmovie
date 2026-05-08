import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Movie } from '../../models/movie.model';
import { MovieService } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { NotificationService } from '../../services/notification.service';
import { PaymentResponse, PaymentStatus } from '../../models/payment.model';

// Giá phim tĩnh (mô phỏng) theo ID hoặc đặt mặc định
const MOVIE_PRICES: { [key: string]: number } = {};

function getPriceForMovie(movie: Movie): number {
  // Gán giá ngẫu nhiên nhưng ổn định dựa theo hash của id
  if (MOVIE_PRICES[movie.id]) return MOVIE_PRICES[movie.id];
  const prices = [1000,2000,3000,4000,5000,6000];
  let hash = 0;
  for (let i = 0; i < movie.id.length; i++) {
    hash = (hash << 5) - hash + movie.id.charCodeAt(i);
    hash |= 0;
  }
  MOVIE_PRICES[movie.id] = prices[Math.abs(hash) % prices.length];
  return MOVIE_PRICES[movie.id];
}

@Component({
  selector: 'app-premium-movies',
  templateUrl: './premium-movies.component.html',
  styleUrls: ['./premium-movies.component.scss']
})
export class PremiumMoviesComponent implements OnInit {
  premiumMovies: Movie[] = [];
  loading = true;
  error: string | null = null;

  // Thanh toán
  showPaymentModal = false;
  selectedMovie: Movie | null = null;
  selectedMoviePrice = 0;
  paymentLoading = false;
  paymentStep: 'confirm' | 'qr' | 'checking' | 'success' | 'failed' = 'confirm';
  currentPayment: PaymentResponse | null = null;
  private statusCheckInterval: any;
  private checkCount = 0;
  private readonly MAX_CHECKS = 60; // 5 phút

  getPriceForMovie = getPriceForMovie;

  constructor(
    private movieService: MovieService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private notification: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPremiumMovies();
  }

  private loadPremiumMovies(): void {
    this.loading = true;
    this.movieService.getAllMovies().subscribe({
      next: (movies) => {
        // Lấy ngẫu nhiên một subset phim và gán làm "premium"
        // Trong thực tế: backend sẽ có field isPremium/price
        const shuffled = [...movies].sort(() => Math.random() - 0.5);
        this.premiumMovies = shuffled.slice(0, Math.min(12, shuffled.length));
        this.loading = false;
      },
      error: () => {
        this.error = 'Không thể tải danh sách phim trả phí. Vui lòng thử lại sau.';
        this.loading = false;
      }
    });
  }

  openPaymentModal(movie: Movie): void {
    if (!this.authService.isLoggedIn()) {
      this.notification.show('Vui lòng đăng nhập để mua phim!', 'warning');
      this.router.navigate(['/login']);
      return;
    }
    this.selectedMovie = movie;
    this.selectedMoviePrice = getPriceForMovie(movie);
    this.paymentStep = 'confirm';
    this.currentPayment = null;
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedMovie = null;
    this.currentPayment = null;
    this.paymentStep = 'confirm';
    this.stopStatusCheck();
  }

  confirmPayment(): void {
    if (!this.selectedMovie) return;
    const userId = this.authService.getUserId();
    if (!userId) {
      this.notification.show('Phiên đăng nhập đã hết hạn!', 'error');
      return;
    }

    this.paymentLoading = true;
    this.paymentService.createPayment({
      amount: this.selectedMoviePrice,
      orderInfo: `Mua phim: ${this.selectedMovie.title}`,
      userId: userId,
      movieId: this.selectedMovie.id
    }).subscribe({
      next: (payment) => {
        this.currentPayment = payment;
        this.paymentStep = 'qr';
        this.paymentLoading = false;
        // Bắt đầu polling trạng thái
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
      // Sử dụng payUrl vì đây là link thông minh, tự động chuyển hướng app trên mobile và hiện QR trên desktop
      const targetUrl = this.currentPayment.payUrl;

      console.log('Redirecting to MoMo:', targetUrl);

      // Thử mở trong tab mới
      const win = window.open(targetUrl, '_blank');

      // Nếu trình duyệt chặn popup, điều hướng trực tiếp ở tab hiện tại
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = targetUrl;
      }
    } else {
      this.notification.show('Không tìm thấy liên kết thanh toán MoMo!', 'error');
    }
  }

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
            this.notification.show('Thanh toán thành công! Chúc bạn xem phim vui vẻ 🎬', 'success');
          } else if (payment.status === PaymentStatus.FAILED) {
            this.stopStatusCheck();
            this.currentPayment = payment;
            this.paymentStep = 'failed';
            this.notification.show('Thanh toán thất bại. Vui lòng thử lại!', 'error');
          }
        },
        error: () => { }
      });
    }, 5000);
  }

  private stopStatusCheck(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  watchMovie(movie: Movie): void {
    this.closePaymentModal();
    this.router.navigate(['/movies', movie.id]);
  }

  retryPayment(): void {
    this.paymentStep = 'confirm';
    this.currentPayment = null;
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  ngOnDestroy(): void {
    this.stopStatusCheck();
  }
}
