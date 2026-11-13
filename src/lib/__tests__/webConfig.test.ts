import babelConfig from '../../../babel.config.js';
import appConfig from '../../../app.config.js';

describe('web export & bundler config regressions', () => {
  it('enables unstable_transformImportMeta so Zustand ESM never emits raw import.meta on web', () => {
    const out = babelConfig({ cache: () => {} });
    expect(Array.isArray(out.presets)).toBe(true);
    const expoPreset = out.presets.find((p: unknown) => Array.isArray(p) && p[0] === 'babel-preset-expo');
    expect(expoPreset).toBeDefined();
    if (!Array.isArray(expoPreset)) throw new Error('Expected tuple preset for babel-preset-expo');
    expect(expoPreset[1]).toMatchObject({ unstable_transformImportMeta: true });
  });

  it('keeps local baseUrl clean unless EXPO_BASE_URL is supplied for Pages', () => {
    const prev = process.env.EXPO_BASE_URL;
    try {
      delete process.env.EXPO_BASE_URL;
      const base = { name: 'Tally', experiments: { typedRoutes: false } };
      expect(appConfig({ config: base })).toEqual(base);

      process.env.EXPO_BASE_URL = '/tally';
      const prefixed = appConfig({ config: base });
      expect(prefixed.experiments).toMatchObject({ typedRoutes: false, baseUrl: '/tally' });
    } finally {
      if (prev === undefined) delete process.env.EXPO_BASE_URL;
      else process.env.EXPO_BASE_URL = prev;
    }
  });
});
