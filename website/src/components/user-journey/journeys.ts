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
    slug: "rbc-morgan-stanley",
    title: "RBC and Morgan Stanley",
    logo: "https://github.com/user-attachments/assets/b2c275da-d858-4b39-a81f-5c889dc648f6",
    to: "/users/rbc-morgan-stanley",
  },
];
