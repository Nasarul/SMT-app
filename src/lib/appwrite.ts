import { Client, Account, Databases, Storage } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string;
export const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;

export const client = new Client()
    .setEndpoint(endpoint || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(projectId || '');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'hr_manager'
  | 'accounts_manager'
  | 'sales_agent'
  | 'tour_manager'
  | 'b2b_agent'
  | 'customer';

export interface Profile {
  $id: string;
  full_name: string;
  username?: string;
  role: UserRole;
  phone: string;
  address?: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
}
