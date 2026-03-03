import dbConnect from './db';
import Bundle from '@/models/Bundle';

/**
 * Evaluate a single trigger rule against child data.
 */
function evaluateRule(rule, childData) {
  const { field, operator, value } = rule;
  const actual = childData[field];

  if (actual === undefined || actual === null) return false;

  switch (operator) {
    case 'equals': return String(actual) === String(value);
    case 'gte': return Number(actual) >= Number(value);
    case 'lte': return Number(actual) <= Number(value);
    case 'in': return Array.isArray(value) && value.map(String).includes(String(actual));
    case 'exists': return actual !== undefined && actual !== null;
    default: return false;
  }
}

/**
 * Derive a flat data object from child, enrollments, passport for rule evaluation.
 */
function buildChildData(child, enrollments, passport) {
  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const sportsCount = passport?.stats?.sportsCount || activeEnrollments.length;

  // Compute max completion percent across active enrollments
  let maxCompletion = 0;
  const categorySlugs = [];
  for (const enr of activeEnrollments) {
    const prog = enr.programId;
    if (!prog) continue;
    const pct = prog.sessions ? Math.round((enr.sessionsCompleted / prog.sessions) * 100) : 0;
    if (pct > maxCompletion) maxCompletion = pct;
    const slug = prog.categoryId?.slug || prog.categoryId;
    if (slug) categorySlugs.push(String(slug));
  }

  return {
    childAge: child?.age || 0,
    sportsCount,
    completionPercent: maxCompletion,
    // For 'in' checks on category: we check each enrollment separately below
    categorySlugs,
  };
}

/**
 * Check if a bundle matches a child's data.
 * All trigger rules must pass (AND logic).
 * For 'categorySlug' field, we check if ANY of the child's categories match.
 */
function bundleMatches(bundle, childData) {
  if (!bundle.triggerRules?.length) return false;
  return bundle.triggerRules.every(rule => {
    if (rule.field === 'categorySlug') {
      // Special: check if any of the child's category slugs match the rule
      const slugRule = { ...rule, field: '_catSlug' };
      return childData.categorySlugs.some(slug => {
        return evaluateRule(slugRule, { _catSlug: slug });
      });
    }
    return evaluateRule(rule, childData);
  });
}

/**
 * Get up to 2 suggested bundles for a child.
 * @param {object} child  - { name, age }
 * @param {array}  enrollments - populated with programId.categoryId, sessions, sessionsCompleted
 * @param {object} passport    - ChildPassport document
 * @returns {Promise<Bundle[]>} max 2 matching bundles
 */
export async function getSuggestedBundles(child, enrollments, passport) {
  await dbConnect();
  const bundles = await Bundle.find({ isActive: true })
    .sort({ displayPriority: -1 })
    .lean();

  if (!bundles.length) return [];

  const childData = buildChildData(child, enrollments, passport);
  const matched = bundles.filter(b => bundleMatches(b, childData));
  return matched.slice(0, 2);
}
