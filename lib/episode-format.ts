export function formatCachedTime(value: number): string {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatPlaybackTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatEpisodeMeta(episode: {
  publishedAt?: string;
  duration?: string;
}): string {
  const parts: string[] = [];
  if (episode.publishedAt) {
    const date = new Date(episode.publishedAt);
    if (!Number.isNaN(date.getTime())) {
      parts.push(
        new Intl.DateTimeFormat("da-DK", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(date),
      );
    }
  }
  if (episode.duration) parts.push(formatEpisodeDuration(episode.duration));
  return parts.join(" · ");
}

function formatEpisodeDuration(value: string): string {
  const units = value.split(":").map(Number);
  if (units.some((unit) => !Number.isFinite(unit))) return value;

  let totalSeconds = 0;
  for (const unit of units) totalSeconds = totalSeconds * 60 + unit;

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} t.`);
  if (minutes > 0) parts.push(`${minutes} min.`);
  if (parts.length === 0) parts.push("under 1 min.");
  return parts.join(" ");
}
