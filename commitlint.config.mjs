/**
 * Conventional Commits.
 *
 * Enforced on commit by the husky `commit-msg` hook, so the rule is that a bad
 * message cannot reach the branch, not that someone remembers to check.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Keep the type list tight so `git log --oneline` stays greppable.
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "subject-max-length": [2, "always", 100],
  },
};
