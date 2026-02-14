/**
 * User security status helpers
 */

export async function isUserDisabled(db: D1Database, email: string): Promise<boolean> {
  const row = await db.prepare(`
    SELECT is_disabled
    FROM user_security_status
    WHERE email = ?
    LIMIT 1
  `).bind(email).first<{ is_disabled: number }>();

  return (row?.is_disabled ?? 0) === 1;
}

export async function setUserDisabled(
  db: D1Database,
  email: string,
  isDisabled: boolean,
  reason: string | null,
  updatedAt: number
): Promise<void> {
  await db.prepare(`
    INSERT INTO user_security_status (email, is_disabled, disabled_reason, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      is_disabled = excluded.is_disabled,
      disabled_reason = excluded.disabled_reason,
      updated_at = excluded.updated_at
  `).bind(email, isDisabled ? 1 : 0, reason, updatedAt).run();
}
