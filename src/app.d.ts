import type { User } from '$lib/server/db';

declare global {
  namespace App {
    interface Locals {
      user: User | null;
      visitorId: string;
    }
  }
}
export {};
