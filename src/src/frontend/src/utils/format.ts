export function formatRupees(paise: bigint): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(rupees);
}

export function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortPrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
}
