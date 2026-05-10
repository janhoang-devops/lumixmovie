import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PaymentAdminResponse, PaymentStatsResponse } from '../models/payment-admin.model';
import { ApiResponse } from '../models/ApiResponse.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentAdminService {
  private base = `${environment.apiUrl}/api/momo/admin`;

  constructor(private http: HttpClient) {}

  /** GET /api/momo/admin/all – Toàn bộ giao dịch (mới nhất trước) */
  getAllPayments(): Observable<PaymentAdminResponse[]> {
    return this.http
      .get<ApiResponse<PaymentAdminResponse[]>>(`${this.base}/all`, { withCredentials: true })
      .pipe(map(r => r.result), catchError(this.handleError));
  }

  /** GET /api/momo/admin/stats – Thống kê tổng hợp */
  getStats(): Observable<PaymentStatsResponse> {
    return this.http
      .get<ApiResponse<PaymentStatsResponse>>(`${this.base}/stats`, { withCredentials: true })
      .pipe(map(r => r.result), catchError(this.handleError));
  }

  private handleError(err: any) {
    const msg = err?.error?.message || 'Lỗi khi tải dữ liệu đơn hàng';
    return throwError(() => new Error(msg));
  }
}
