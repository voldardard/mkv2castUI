import { useTranslations, supportedLanguages, getLanguageFromPath } from '@/lib/i18n';

describe('i18n', () => {
  describe('supportedLanguages', () => {
    it('includes English', () => {
      expect(supportedLanguages.some(lang => lang.code === 'en')).toBe(true);
    });

    it('includes French', () => {
      expect(supportedLanguages.some(lang => lang.code === 'fr')).toBe(true);
    });

    it('includes German', () => {
      expect(supportedLanguages.some(lang => lang.code === 'de')).toBe(true);
    });

    it('includes Spanish', () => {
      expect(supportedLanguages.some(lang => lang.code === 'es')).toBe(true);
    });

    it('includes Italian', () => {
      expect(supportedLanguages.some(lang => lang.code === 'it')).toBe(true);
    });

    it('has 5 supported languages', () => {
      expect(supportedLanguages).toHaveLength(5);
    });

    it('languages have required fields', () => {
      supportedLanguages.forEach(lang => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('flag');
      });
    });
  });

  describe('getLanguageFromPath', () => {
    it('extracts language from path', () => {
      expect(getLanguageFromPath('/en/page')).toBe('en');
      expect(getLanguageFromPath('/fr/page')).toBe('fr');
    });

    it('returns default for unknown language', () => {
      expect(getLanguageFromPath('/xx/page')).toBe('en');
    });

    it('returns default for invalid path', () => {
      expect(getLanguageFromPath('/page')).toBe('en');
    });
  });

  describe('useTranslations', () => {
    it('returns translation function', () => {
      const t = useTranslations('en');
      expect(typeof t).toBe('function');
    });

    it('returns translations for valid keys', () => {
      const t = useTranslations('en');
      const result = t('hero.title');
      expect(result).toBe('Convert Videos for Chromecast');
    });

    it('works with different languages', () => {
      const tEn = useTranslations('en');
      const tFr = useTranslations('fr');

      expect(tEn('nav.convert')).toBe('Convert');
      expect(tFr('nav.convert')).toBe('Convertir');
    });

    it('handles parameter substitution', () => {
      const t = useTranslations('en');
      const result = t('upload.max_size', { size: '10GB' });
      expect(result).toBe('Max file size: 10GB');
    });

    it('handles unknown language gracefully', () => {
      const t = useTranslations('unknown' as any);
      // Should fall back to default language
      expect(typeof t).toBe('function');
      expect(t('hero.title')).toBe('Convert Videos for Chromecast');
    });

    it('returns key for missing translations', () => {
      const t = useTranslations('en');
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });
  });
});
