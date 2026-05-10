import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PaymentAdminResponse, PaymentStatsResponse } from '../../../models/payment-admin.model';
import { PaymentAdminService } from '../../../services/payment-admin.service';
import { PaymentStatus, PlanType } from '../../../models/payment.model';
import { Client } from '@stomp/stompjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-order-management',
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss']
})
export class OrderManagementComponent implements OnInit, OnDestroy {

  // ==================== State ====================
  allOrders: PaymentAdminResponse[] = [];
  filteredOrders: PaymentAdminResponse[] = [];
  stats: PaymentStatsResponse | null = null;

  loading = true;
  statsLoading = true;
  error: string | null = null;

  // Filters
  searchQuery = '';
  statusFilter: PaymentStatus | 'ALL' = 'ALL';
  planFilter: PlanType | 'ALL' = 'ALL';

  // Pagination
  currentPage = 1;
  pageSize = 15;

  // WebSocket
  private stompClient: Client | null = null;

  readonly PaymentStatus = PaymentStatus;
  readonly PlanType = PlanType;

  readonly STATUS_LABELS: Record<string, string> = {
    SUCCESS: 'Thành công',
    PENDING: 'Chờ xử lý',
    FAILED: 'Thất bại',
    ALL: 'Tất cả'
  };

  readonly PLAN_LABELS: Record<string, string> = {
    MONTHLY: 'Tháng',
    QUARTERLY: 'Quý (3 tháng)',
    YEARLY: 'Năm',
    ALL: 'Tất cả'
  };

  constructor(private paymentAdminService: PaymentAdminService) {}

  ngOnInit(): void {
    this.loadAll();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.stompClient?.deactivate();
  }

  // ==================== Data Loading ====================

  loadAll(): void {
    this.loading = true;
    this.statsLoading = true;
    this.error = null;

    this.paymentAdminService.getAllPayments().subscribe({
      next: (orders) => {
        this.allOrders = orders;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });

    this.paymentAdminService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.statsLoading = false;
      },
      error: () => { this.statsLoading = false; }
    });
  }

  // ==================== Filters ====================

  applyFilters(): void {
    this.currentPage = 1;
    let result = [...this.allOrders];

    if (this.statusFilter !== 'ALL') {
      result = result.filter(o => o.status === this.statusFilter);
    }
    if (this.planFilter !== 'ALL') {
      result = result.filter(o => o.planType === this.planFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(o =>
        o.orderId?.toLowerCase().includes(q) ||
        o.username?.toLowerCase().includes(q) ||
        o.userEmail?.toLowerCase().includes(q)
      );
    }

    this.filteredOrders = result;
  }

  onSearchChange(): void { this.applyFilters(); }
  onStatusChange(val: string): void { this.statusFilter = val as PaymentStatus | 'ALL'; this.applyFilters(); }
  onPlanChange(val: string): void { this.planFilter = val as PlanType | 'ALL'; this.applyFilters(); }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'ALL';
    this.planFilter = 'ALL';
    this.applyFilters();
  }

  // ==================== Pagination ====================

  get totalPages(): number {
    return Math.ceil(this.filteredOrders.length / this.pageSize);
  }

  get pagedOrders(): PaymentAdminResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  // ==================== WebSocket ====================

  private connectWebSocket(): void {
    const wsUrl = environment.apiUrl.replace('http', 'ws') + '/ws';
    this.stompClient = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      onConnect: () => {
        this.stompClient?.subscribe('/topic/payments', (msg) => {
          try {
            const newOrder = JSON.parse(msg.body);
            const idx = this.allOrders.findIndex(o => o.orderId === newOrder.orderId);
            if (idx !== -1) {
              this.allOrders[idx] = { ...this.allOrders[idx], ...newOrder };
            } else {
              this.allOrders = [newOrder, ...this.allOrders];
            }
            this.applyFilters();
            // Reload stats sau khi có đơn mới
            this.paymentAdminService.getStats().subscribe(s => this.stats = s);
          } catch {}
        });
      }
    });
    this.stompClient.activate();
  }

  // ==================== Helpers ====================

  formatPrice(amount: number): string {
    return amount?.toLocaleString('vi-VN') + 'đ';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getStatusClass(status: PaymentStatus): string {
    return { SUCCESS: 'status-success', PENDING: 'status-pending', FAILED: 'status-failed' }[status] ?? '';
  }

  getPlanLabel(plan?: PlanType): string {
    return this.PLAN_LABELS[plan ?? ''] ?? '—';
  }

  shortOrderId(orderId: string): string {
    return orderId ? orderId.substring(0, 12).toUpperCase() + '...' : '—';
  }
}
