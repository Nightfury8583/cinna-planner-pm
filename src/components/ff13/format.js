export const formatNumber = (n) => Number(n).toLocaleString('en-US')

export const formatGil = (n) => `${formatNumber(n)} gil`

/** [{label: 'Str', value: 115}, ...] -> "Str 115 / Mag 115" ("none" when empty). */
export const formatStats = (stats) =>
    stats.length === 0 ? 'no stats' : stats.map((s) => `${s.label} ${formatNumber(s.value)}`).join(' / ')
