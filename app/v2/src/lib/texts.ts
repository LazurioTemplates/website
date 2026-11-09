import type { Language } from "../content/language";

// Every word of the interface the code writes itself, in each language of the
// website, in one place. The website's own content (pages, services, news,
// contacts, the call to action) lives in data/v2/<language>/ and never here.
// A page shows the words of one language only: the website's.
const cs = {
  skipToContent: "Přeskočit na obsah",
  menu: "Menu",
  mainNavigation: "Hlavní navigace",
  footerNavigation: "Odkazy",
  homeLink: (name: string) => `${name}, úvodní stránka`,
  home: "Úvod",
  servicesHeading: "Co pro vás uděláme",
  servicesList: "Přehled služeb",
  allServices: "Všechny služby",
  serviceMore: "Více o službě",
  noServices: "Služby zatím připravujeme.",
  price: "Cena",
  newsHeading: "Aktuality",
  newsList: "Přehled aktualit",
  allNews: "Všechny aktuality",
  noNews: "Zatím tu nejsou žádné aktuality.",
  published: "Zveřejněno",
  backToNews: "Zpět na aktuality",
  contactsHeading: "Kontakt",
  address: "Adresa",
  emailAndPhone: "E-mail a telefon",
  hours: "Kdy nás zastihnete",
  people: "S kým mluvit",
  companyDetails: "Fakturační údaje",
  companyId: "IČO",
  vatId: "DIČ",
  notFoundTitle: "Tuto stránku jsme nenašli",
  notFoundText:
    "Adresa může být zastaralá nebo v ní je překlep. Pokračujte na úvodní stránku, nebo nám napište.",
  notFoundHome: "Na úvodní stránku",
};

const en: typeof cs = {
  skipToContent: "Skip to content",
  menu: "Menu",
  mainNavigation: "Main navigation",
  footerNavigation: "Links",
  homeLink: (name: string) => `${name}, home page`,
  home: "Home",
  servicesHeading: "What we do for you",
  servicesList: "All our services",
  allServices: "All services",
  serviceMore: "More about the service",
  noServices: "Our services are coming soon.",
  price: "Price",
  newsHeading: "News",
  newsList: "All news items",
  allNews: "All news",
  noNews: "There is no news yet.",
  published: "Published",
  backToNews: "Back to news",
  contactsHeading: "Contact",
  address: "Address",
  emailAndPhone: "E-mail and phone",
  hours: "When to reach us",
  people: "Who to talk to",
  companyDetails: "Company details",
  companyId: "Company ID",
  vatId: "VAT ID",
  notFoundTitle: "We could not find this page",
  notFoundText:
    "The address may be out of date or mistyped. Continue to the home page, or write to us.",
  notFoundHome: "To the home page",
};

export type Texts = typeof cs;
export const texts: Record<Language, Texts> = { cs, en };
