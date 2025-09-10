export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        'tauri',
        'hive',
      ],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case']],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
  },
};