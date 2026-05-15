export interface LoginResponse {
  result: {
    token: string;
    userId: string;
    username: string;
    role: string[];
    isPremium?: boolean;
    premiumExpiredAt?: string;
  };
}

export interface RegisterResponse {
  result: {
    id: string;
    username: string;
    password: string;
  };
}
