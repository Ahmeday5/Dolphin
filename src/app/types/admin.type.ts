export interface Admin {
  id: string; // غيرنا من number إلى string لأن الـ id هو UUID
  userName: string;
  email: string;
  passwordHash?: string;
  roles: string;
}

export type AdminsResponse = Admin[];
