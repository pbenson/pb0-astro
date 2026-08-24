/**
 * Plain-English glosses for the terms that block a non-specialist reader.
 *
 * Kept here rather than inline in the MDX so a term reads the same on every
 * page that uses it, and so the articles stay legible as prose. Two sentences
 * is the budget: the first says what the thing is, the second says why it
 * matters here. Anything longer belongs in the article.
 */
export interface GlossaryEntry {
  /** Heading shown in the popover. */
  title: string;
  gloss: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'covariance-matrix': {
    title: 'Covariance matrix',
    gloss:
      'A table holding, for every pair of assets, how much they tend to move together. ' +
      'With a thousand assets it has a million entries, which is why avoiding it is worth the trouble.',
  },
  'monte-carlo': {
    title: 'Monte Carlo',
    gloss:
      'Answering a question by simulating it many times and looking at the spread of outcomes, ' +
      'instead of solving it with algebra. The more runs, the sharper the picture.',
  },
  'value-at-risk': {
    title: 'Value at risk',
    gloss:
      'A loss level a portfolio should exceed only rarely — a 95% one-day VaR is the loss ' +
      'you expect to be worse than on about one trading day in twenty.',
  },
  'log-return': {
    title: 'Log return',
    gloss:
      'The natural logarithm of today’s price divided by yesterday’s. It behaves better ' +
      'than a percentage change when returns are added up over time.',
  },
  'cholesky': {
    title: 'Cholesky decomposition',
    gloss:
      'A way of splitting a covariance matrix into a factor times its own transpose, so that ' +
      'multiplying independent random numbers by that factor produces correlated ones.',
  },
  'credit-basket': {
    title: 'Credit basket',
    gloss:
      'A group of borrowers held together, each of which might default. The question is never ' +
      'about one borrower but about how many of them fail at once.',
  },
  'default-probability': {
    title: 'Default probability',
    gloss:
      'The chance a single borrower fails to pay over the period in question. Here every name ' +
      'in the basket carries the same one.',
  },
  'asset-correlation': {
    title: 'Asset correlation',
    gloss:
      'How much the borrowers’ fortunes move together. At zero each fails on its own account; ' +
      'at one they share a single fate.',
  },
  'gaussian-copula': {
    title: 'Gaussian copula',
    gloss:
      'The standard way of tying individual default chances together into a joint one, by giving ' +
      'each borrower a hidden bell-curve score and defaulting the ones whose score falls low enough.',
  },
  'binomial': {
    title: 'Binomial distribution',
    gloss:
      'The distribution of how many successes you get from a fixed number of independent tries. ' +
      'It is what the default count collapses to when the borrowers are unrelated.',
  },
};

/**
 * Monotonic counter for popover element ids. A random suffix would work but
 * would change the built HTML on every build for no reason; this keeps a given
 * source tree building byte-identically.
 */
let termCount = 0;

export function nextTermId(): number {
  return ++termCount;
}
