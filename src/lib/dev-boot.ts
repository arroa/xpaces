/** Identificador único por arranque del servidor (invalida sesiones dev al reiniciar). */
export function getDevBootId(): string {
  return process.env.XSPACES_DEV_BOOT_ID ?? "dev-boot-unset";
}
