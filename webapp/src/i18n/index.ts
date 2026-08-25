const THREAD_TRANSLATION_KEYS = [
    'post_info.reply',
    'post_info.comment_icon.tooltip.reply',
] as const;

function getThreadLabel(locale: string): string {
    return locale.toLowerCase().startsWith('ru') ? 'Тред' : 'Thread';
}

export function getTranslationsForLocale(locale: string): Record<string, string> {
    const threadLabel = getThreadLabel(locale);

    return THREAD_TRANSLATION_KEYS.reduce<Record<string, string>>((translations, key) => {
        translations[key] = threadLabel;
        return translations;
    }, {});
}
