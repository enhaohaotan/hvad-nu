// Reference episode URLs let the existing DR resolver locate each show's feed.
// The latest episode is resolved on every request; this is not the episode selected.
export const PODCAST_CATALOG = new Map([
  ["genstart", {
    name: "Genstart",
    slug: "genstart",
    referenceUrl: "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/sort-mand-paa-plakaten-11802650176",
  }],
]);
