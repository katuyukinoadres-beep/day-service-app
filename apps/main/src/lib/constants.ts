export const DOMAIN_TAGS = [
  "健康・生活",
  "運動・感覚",
  "認知・行動",
  "言語・コミュニケーション",
  "人間関係・社会性",
] as const;

export type DomainTag = (typeof DOMAIN_TAGS)[number];
