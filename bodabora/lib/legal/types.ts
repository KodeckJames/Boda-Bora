// A legal document in one language. A body item is a paragraph, or a bullet list when it's an array.
export type LegalSection = { title: string; body: (string | string[])[] };
export type LegalDoc = {
  title: string;
  description: string;
  updatedLabel: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
};

export const CONTACT_URL = "https://github.com/KodeckJames/Boda-Bora/issues";
