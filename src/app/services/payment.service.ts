import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { CreatePaymentRequest, PaymentResponse } from '../models/payment.model';
import { ApiResponse } from '../models/ApiResponse.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private momoBaseUrl = `${environment.apiUrl}/api/momo`;

  constructor(private http: HttpClient) { }

  /**
   * Tạo phiên thanh toán MoMo cho gói hội viên Premium
   * POST /api/momo/create
   */
  createPayment(request: CreatePaymentRequest): Observable<PaymentResponse> {
    return this.http.post<ApiResponse<PaymentResponse>>(
      `${this.momoBaseUrl}/create`,
      request
    ).pipe(
      map(res => res.result),
      catchError(this.handleError)
    );
  }

  /**
   * Kiểm tra trạng thái thanh toán
   * GET /api/momo/status/{orderId}
   */
  checkPaymentStatus(orderId: string): Observable<PaymentResponse> {
    return this.http.get<ApiResponse<PaymentResponse>>(
      `${this.momoBaseUrl}/status/${orderId}`
    ).pipe(
      map(res => res.result),
      catchError(this.handleError)
    );
  }

  /**
   * [DEV ONLY] Giả lập thanh toán thành công
   * POST /api/momo/dev/simulate/{orderId}
   */
  simulatePaymentSuccess(orderId: string): Observable<PaymentResponse> {
    return this.http.post<ApiResponse<PaymentResponse>>(
      `${this.momoBaseUrl}/dev/simulate/${orderId}`,
      {}
    ).pipe(
      map(res => res.result),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    let msg = 'Đã xảy ra lỗi trong quá trình thanh toán';
    if (error?.error?.message) {
      msg = error.error.message;
    }
    return throwError(() => new Error(msg));
  }
}
