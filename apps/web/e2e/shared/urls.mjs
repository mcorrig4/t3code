export function resolveSmokeUrls() {
  const localWebUrl = process.env.T3_SYNC_LOCAL_WEB_URL?.trim() || "http://127.0.0.1:5734";
  const baseUrl = process.env.T3_SYNC_BASE_URL?.trim() || localWebUrl;
  return { localWebUrl, baseUrl };
}
