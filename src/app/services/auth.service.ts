import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginResponse, RegisterResponse } from '../models/auth.model';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authUrl = `${environment.apiUrl}/auth`;
  private userUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient, private router: Router) {}

  private readonly USER_ID_KEY        = 'userId';
  private readonly USERNAME_KEY       = 'username';
  private readonly ROLE_KEY           = 'roles';
  private readonly IS_PREMIUM_KEY     = 'isPremium';
  private readonly PREMIUM_EXPIRED_KEY = 'premiumExpiredAt';

  // ✅ Reactive Premium state – emit mỗi khi trạng thái thay đổi
  private _isPremium$ = new BehaviorSubject<boolean>(
    localStorage.getItem(this.IS_PREMIUM_KEY) === 'true'
  );
  /** Observable dùng trong component để reactive update */
  readonly isPremium$ = this._isPremium$.asObservable();

  // ========== AUTH ==========

  login(username: string, password: string): Observable<LoginResponse> {
    const credentials = { username, password };
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap(res => {
        if (res?.result?.userId) {
          localStorage.setItem(this.USER_ID_KEY, res.result.userId);
          if (res.result.username) {
            localStorage.setItem(this.USERNAME_KEY, res.result.username);
          }
          if (res.result.role && Array.isArray(res.result.role)) {
            const isAdmin = res.result.role.some(role => role === 'ADMIN');
            if (isAdmin) {
              localStorage.setItem(this.ROLE_KEY, 'ADMIN');
            } else {
              localStorage.removeItem(this.ROLE_KEY);
            }
          }
          // ✅ Fix bug 1: Lưu & emit trạng thái Premium ngay sau khi đăng nhập
          this._setPremiumState(res.result.isPremium ?? false, res.result.premiumExpiredAt);
        }
      })
    );
  }

  refresh(): Observable<any> {
    return this.http.post(`${this.authUrl}/refresh`, {}, { withCredentials: true });
  }

  logout(): void {
    this.http.post(`${this.authUrl}/logout`, {}).subscribe({
      next: () => {
        this._clearSession();
        this.router.navigate(['/login']);
      },
      error: () => {
        this._clearSession();
        this.router.navigate(['/login']);
      }
    });
  }

  register(username: string, password: string, email: string): Observable<RegisterResponse> {
    const newUser = { username, password, email };
    return this.http.post<RegisterResponse>(this.userUrl, newUser, { withCredentials: true });
  }

  getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.USER_ID_KEY);
  }

  handleOauthLogin(userId: string, username: string): void {
    localStorage.setItem(this.USER_ID_KEY, userId);
    localStorage.setItem(this.USERNAME_KEY, username);
    // Sau OAuth login cũng sync Premium
    this.syncPremiumOnStartup();
  }

  isAdmin(): boolean {
    return this.isLoggedIn() && localStorage.getItem(this.ROLE_KEY) === 'ADMIN';
  }

  // ========== PREMIUM MEMBERSHIP ==========

  /** Giá trị tức thì (đồng bộ) */
  isPremium(): boolean {
    return this._isPremium$.getValue();
  }

  /** Lấy ngày hết hạn Premium */
  getPremiumExpiredAt(): string | null {
    return localStorage.getItem(this.PREMIUM_EXPIRED_KEY);
  }

  /** Kích hoạt Premium sau thanh toán thành công */
  activatePremium(expiredAt?: string): void {
    this._setPremiumState(true, expiredAt);
  }

  /** Đồng bộ từ API user response */
  syncPremiumStatus(isPremium: boolean, premiumExpiredAt?: string | null): void {
    this._setPremiumState(isPremium, premiumExpiredAt ?? undefined);
  }

  /**
   * Gọi khi app khởi động: fetch user từ backend để đồng bộ isPremium.
   * ✅ Fix bug 2: Giải quyết mất Premium sau reload trang / mở tab mới.
   */
  syncPremiumOnStartup(): void {
    if (!this.isLoggedIn()) return;
    const userId = this.getUserId();
    if (!userId) return;

    this.http.get<any>(`${this.userUrl}/${userId}`, { withCredentials: true }).subscribe({
      next: (res) => {
        const user = res?.result ?? res;
        const premium = user?.isPremium ?? false;
        const expiredAt = user?.premiumExpiredAt ?? null;
        this._setPremiumState(premium, expiredAt);
        console.log('[AuthService] syncPremiumOnStartup → isPremium:', premium);
      },
      error: () => {
        console.warn('[AuthService] Không thể đồng bộ Premium khi khởi động');
      }
    });
  }

  // ========== PRIVATE HELPERS ==========

  /** Ghi localStorage VÀ emit BehaviorSubject cùng lúc */
  private _setPremiumState(isPremium: boolean, expiredAt?: string | null): void {
    if (isPremium) {
      localStorage.setItem(this.IS_PREMIUM_KEY, 'true');
      if (expiredAt) {
        localStorage.setItem(this.PREMIUM_EXPIRED_KEY, expiredAt);
      }
    } else {
      localStorage.removeItem(this.IS_PREMIUM_KEY);
      localStorage.removeItem(this.PREMIUM_EXPIRED_KEY);
    }
    this._isPremium$.next(isPremium);
  }

  private _clearSession(): void {
    localStorage.removeItem(this.USERNAME_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem('rememberMe');
    this._setPremiumState(false);
  }
}
