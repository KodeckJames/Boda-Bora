// Illustrative example rider for the public landing page. The app itself uses live API data.

export type SubScores = {
  braking: number;
  cornering: number;
  acceleration: number;
  nightExposure: number;
  routeRisk: number;
};

export const currentRider = {
  name: "Kevin Mwangi",
  stage: "Githurai 45",
  score: 64,
  subScores: { braking: 58, cornering: 66, acceleration: 61, nightExposure: 55, routeRisk: 70 } satisfies SubScores,
};

export const coachingMessage = {
  sw: "Kevin, wiki hii breki zako za ghafla zimeongezeka karibu na mzunguko wa Githurai 45 kati ya saa 12:30 na saa 1:30 jioni (mara 3). Punguza mwendo hadi 30 km/h ukikaribia mzunguko, na uache nafasi ya mita 10 nyuma ya matatu. Ukifanya hivi wiki ijayo, alama yako inaweza kupanda hadi 70.",
  en: "Kevin, your harsh braking rose this week near the Githurai 45 roundabout between 6:30 and 7:30 pm (3 times). Slow to 30 km/h on approach and keep 10 metres behind matatus. Do this next week and your score could rise to 70.",
};
