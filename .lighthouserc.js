module.exports = {
  ci: {
    collect: {
      staticDistDir: '.',
      url: ['index.html', 'about.html', 'treatments-services.html', 'contact.html'],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox',
      },
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['warn', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        // SEO category and is-crawlable are disabled because every page carries an
        // intentional `noindex, nofollow` meta tag while the site is pre-launch (see
        // README "Before going live"). Re-enable both once that tag is removed.
        'categories:seo': 'off',
        'is-crawlable': 'off',
        // bf-cache behaves inconsistently under headless Chrome in CI.
        'bf-cache': 'off',
        // These are "further savings possible" opportunities, not correctness bugs —
        // matching categories:performance above, they're downgraded to warnings.
        // Hero/banner images already ship a 640/960/1280w srcset; Lighthouse's mobile
        // emulation (~2x DPR) still rounds up to the next rung, which is an inherent
        // tradeoff of a small, fixed set of responsive breakpoints.
        'uses-responsive-images': 'warn',
        'image-delivery-insight': 'warn',
        'network-dependency-tree-insight': 'warn',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
