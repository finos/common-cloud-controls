export interface UserJourneyItem {
  slug: string;
  title: string;
  logo: string;
  to: string;
}

export const userJourneyItems: UserJourneyItem[] = [
  {
    slug: "financial-institutions",
    title: "Financial Institutions",
    logo: "/img/user-journey/financial-institutions.svg",
    to: "/users/financial-institutions",
  },
  {
    slug: "smaller-organizations",
    title: "Smaller Organizations",
    logo: "/img/user-journey/smaller-organizations.svg",
    to: "/users/smaller-organizations",
  },
  {
    slug: "morgan-stanley",
    title: "Morgan Stanley",
    logo: "/img/firms/MorganStanley.svg",
    to: "/users/Morgan-Stanley",
  },
  {
    slug: "rbc",
    title: "RBC",
    logo: "/img/firms/RBC_Royal_Bank.svg",
    to: "/users/RBC",
  },
];
