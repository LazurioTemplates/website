// Dates as people in the website's language read them, by its locale
// (`locale` of data/v2/<language>/site.yaml, such as cs_CZ or en_GB).
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale.replace("_", "-"), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// A phone number as a tel: link: digits and the leading plus only.
export const telHref = (phone: string): string => `tel:${phone.replace(/[^+0-9]/g, "")}`;
