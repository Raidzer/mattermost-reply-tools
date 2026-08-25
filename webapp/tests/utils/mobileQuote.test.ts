import type {Store} from 'redux';
import {describe, expect, it} from 'vitest';

import {buildQuotedReplyPost, formatMobileQuoteBlock} from '../../src/utils/mobileQuote';
import {QUOTED_REPLY_BODY_PROP, QUOTED_REPLY_POST_TYPE, QUOTED_REPLY_PROP} from '../../src/constants';
import {post, user} from '../helpers';

describe('formatMobileQuoteBlock', () => {
    it('formats the author and normalized message as a Markdown quote', () => {
        expect(formatMobileQuoteBlock(' Ada ', 'First\nsecond')).toBe('> **Ada**\n> First second');
    });

    it('uses readable fallbacks for missing content', () => {
        expect(formatMobileQuoteBlock(' ', '')).toBe('> **Unknown user**\n> Attachment');
    });

    it('limits long quoted messages', () => {
        const result = formatMobileQuoteBlock('Ada', 'x'.repeat(501));

        expect(result).toHaveLength('> **Ada**\n> '.length + 500);
        expect(result.endsWith('…')).toBe(true);
    });
});

describe('buildQuotedReplyPost', () => {
    it('adds the portable quote and preserves existing post properties', () => {
        const sourcePost = post({id: 'source', user_id: 'ada', message: 'Original'});
        const sourceUser = user({id: 'ada', first_name: 'Ada', last_name: 'Lovelace'});
        const state = {
            entities: {
                posts: {posts: {source: sourcePost}},
                users: {profiles: {ada: sourceUser}},
            },
        };
        const store = {getState: () => state} as unknown as Store;
        const outgoing = post({id: 'reply', message: 'My answer', props: {existing: true}});

        const result = buildQuotedReplyPost(outgoing, sourcePost.id, store);

        expect(result).not.toBe(outgoing);
        expect(result.type).toBe(QUOTED_REPLY_POST_TYPE);
        expect(result.message).toBe('> **Ada Lovelace**\n> Original\n\nMy answer');
        expect(result.props).toEqual({
            existing: true,
            [QUOTED_REPLY_PROP]: 'source',
            [QUOTED_REPLY_BODY_PROP]: 'My answer',
        });
    });

    it('uses the visible reply body when quoting an earlier quoted reply', () => {
        const sourcePost = post({
            id: 'source',
            user_id: 'ada',
            type: QUOTED_REPLY_POST_TYPE,
            message: '> **Grace**\n> Earlier\n\nVisible answer',
        });
        const state = {
            entities: {
                posts: {posts: {source: sourcePost}},
                users: {profiles: {ada: user({id: 'ada', username: 'ada'})}},
            },
        };
        const store = {getState: () => state} as unknown as Store;

        const result = buildQuotedReplyPost(post({message: 'Next'}), 'source', store);

        expect(result.message).toContain('> Visible answer\n\nNext');
    });

    it('still records metadata when the source post is not loaded', () => {
        const state = {entities: {posts: {posts: {}}, users: {profiles: {}}}};
        const store = {getState: () => state} as unknown as Store;

        const result = buildQuotedReplyPost(post({message: 'Reply'}), 'missing', store);

        expect(result.message).toBe('Reply');
        expect(result.props?.[QUOTED_REPLY_PROP]).toBe('missing');
        expect(result.props?.[QUOTED_REPLY_BODY_PROP]).toBe('Reply');
    });
});
