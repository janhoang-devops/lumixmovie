export interface User {
  userId: string;
  username: string;
  email:string;
  createdAt:string;
  roles:Role[];
  isPremium?: boolean;
  premiumExpiredAt?: string;
}
export interface Role{
  name:string;
}
