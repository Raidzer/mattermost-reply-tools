import {describe, expect, it} from 'vitest';

import {getTranslationsForLocale} from '../src/i18n';
import reducer from '../src/reducers';
import {CLEAR_PENDING_REPLY, SET_PENDING_REPLY, type PendingReply} from '../src/types/store';

describe('plugin reducer', () => {
    const pendingReply: PendingReply = {
        replyToPostId: 'post',
        channelId: 'channel',
        rootId: '',
        context: 'channel',
    };

    it('initializes, sets, and clears a pending reply', () => {
        const initial = reducer(undefined, {type: 'UNKNOWN'});
        const selected = reducer(initial, {type: SET_PENDING_REPLY, data: pendingReply});
        const cleared = reducer(selected, {type: CLEAR_PENDING_REPLY});

        expect(initial).toEqual({pendingReply: null});
        expect(selected).toEqual({pendingReply});
        expect(cleared).toEqual({pendingReply: null});
    });

    it('keeps state identity for unrelated actions and treats missing data as null', () => {
        const initial = {pendingReply};

        expect(reducer(initial, {type: 'UNKNOWN'})).toBe(initial);
        expect(reducer(initial, {type: SET_PENDING_REPLY})).toEqual({pendingReply: null});
    });
});

describe('translations', () => {
    it('returns Russian labels for all Russian locale variants', () => {
        expect(getTranslationsForLocale('ru-RU')).toEqual({
            'post_info.reply': 'Тред',
            'post_info.comment_icon.tooltip.reply': 'Тред',
        });
    });

    it('uses English labels for other locales', () => {
        expect(getTranslationsForLocale('en-US')).toEqual({
            'post_info.reply': 'Thread',
            'post_info.comment_icon.tooltip.reply': 'Thread',
        });
    });
});
