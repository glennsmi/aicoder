import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if a user is a developer based on their UID
 * Developer UIDs are stored in VITE_DEV_UIDS environment variable as comma-separated values
 */
export function isDeveloper(uid: string | undefined | null): boolean {
  if (!uid) return false

  const devUids = import.meta.env.VITE_DEV_UIDS
  if (!devUids) return false

  const devUidList = devUids.split(',').map((id: string) => id.trim())
  return devUidList.includes(uid)
} 