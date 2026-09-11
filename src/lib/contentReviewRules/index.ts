import { CONTENT_REVIEW_RULES_AR } from './ar'
import { CONTENT_REVIEW_RULES_EN } from './en'
import { CONTENT_REVIEW_RULES_ES } from './es'
import { CONTENT_REVIEW_RULES_FR } from './fr'

export { CONTENT_REVIEW_RULES_AR, CONTENT_REVIEW_RULES_EN, CONTENT_REVIEW_RULES_ES, CONTENT_REVIEW_RULES_FR }

export const CONTENT_REVIEW_RULES = CONTENT_REVIEW_RULES_EN.map((group, index) => ({
  category: group.category,
  terms: [
    ...group.terms,
    ...CONTENT_REVIEW_RULES_AR[index].terms,
    ...CONTENT_REVIEW_RULES_FR[index].terms,
    ...CONTENT_REVIEW_RULES_ES[index].terms,
  ],
}))