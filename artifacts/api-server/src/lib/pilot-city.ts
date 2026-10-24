/** Public configuration only; this is not a claim of municipal endorsement. */
const configured = process.env.CITY_NAME?.trim() || "Homs / حمص";
const parts = configured.split("/").map((part) => part.trim()).filter(Boolean);
const arabic = parts.find((part) => /[\u0600-\u06ff]/u.test(part));
const english = parts.find((part) => !/[\u0600-\u06ff]/u.test(part));
export const pilotCity = {
  cityName: arabic ?? parts[0] ?? configured,
  cityNameAr: arabic ?? configured,
  cityNameEn: english ?? (arabic === "حمص" ? "Homs" : configured),
};
