export function getVisitorLanguageLabel(languageCode: string | null): string | null {
  if (!languageCode) return null;

  const [language, ...variants] = languageCode.split('-');
  if (language.toLowerCase() === 'zh') {
    const isTraditional = variants.some((variant) =>
      ['hant', 'tw', 'hk', 'mo'].includes(variant.toLowerCase()),
    );
    return isTraditional ? '繁中' : '简中';
  }

  try {
    return (
      new Intl.DisplayNames([languageCode], { type: 'language', fallback: 'none' }).of(language) ??
      languageCode
    );
  } catch {
    return languageCode;
  }
}
