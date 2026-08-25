import {describe, expect, it} from 'vitest';

import {
    getDisplayName,
    getPostFromState,
    getQuotedPostDisplayMessage,
    getQuotedReplyBody,
    getUserAvatarFallbackUrl,
    getUserAvatarUrl,
    getUserFromState,
    getUserInitials,
    truncateMessage,
} from '../../src/utils/posts';
import {QUOTED_REPLY_BODY_PROP, QUOTED_REPLY_POST_TYPE, QUOTED_REPLY_PROP} from '../../src/constants';
import {post, user} from '../helpers';

describe('post selectors', () => {
    it('reads posts and users from the Mattermost state', () => {
        const selectedPost = post();
        const selectedUser = user();
        const state = {
            entities: {
                posts: {posts: {[selectedPost.id]: selectedPost}},
                users: {profiles: {[selectedUser.id]: selectedUser}},
            },
        };

        expect(getPostFromState(state, selectedPost.id)).toBe(selectedPost);
        expect(getUserFromState(state, selectedUser.id)).toBe(selectedUser);
        expect(getPostFromState({}, selectedPost.id)).toBeUndefined();
        expect(getUserFromState({}, selectedUser.id)).toBeUndefined();
    });
});

describe('user presentation', () => {
    it('prefers a full name and falls back to username or an unknown label', () => {
        expect(getDisplayName(user({first_name: ' Ada ', last_name: 'Lovelace'}))).toBe('Ada  Lovelace');
        expect(getDisplayName(user({username: 'ada'}))).toBe('ada');
        expect(getDisplayName()).toBe('Unknown user');
    });

    it('builds avatar URLs only for identified users', () => {
        const selectedUser = user({id: 'user/1', last_picture_update: 42});

        expect(getUserAvatarUrl(selectedUser)).toBe('/api/v4/users/user/1/image?_=42');
        expect(getUserAvatarFallbackUrl(selectedUser)).toBe('/api/v4/users/user/1/image/default');
        expect(getUserAvatarUrl(user({id: ''}))).toBeNull();
        expect(getUserAvatarFallbackUrl()).toBeNull();
    });

    it('creates initials from names, usernames, and unknown users', () => {
        expect(getUserInitials(user({first_name: 'Ada', last_name: 'Lovelace'}))).toBe('AL');
        expect(getUserInitials(user({username: 'grace'}))).toBe('GR');
        expect(getUserInitials()).toBe('?');
    });
});

describe('message presentation', () => {
    it('normalizes whitespace and truncates with an ellipsis', () => {
        expect(truncateMessage('  one\n\t two  ')).toBe('one two');
        expect(truncateMessage('123456', 5)).toBe('1234…');
        expect(truncateMessage('12345', 5)).toBe('12345');
    });

    it('returns an ordinary post body unchanged', () => {
        const selectedPost = post({message: 'Ordinary body'});

        expect(getQuotedReplyBody(selectedPost)).toBe('Ordinary body');
        expect(getQuotedPostDisplayMessage(selectedPost)).toBe('Ordinary body');
    });

    it('removes the portable Markdown quote from a quoted reply', () => {
        const selectedPost = post({
            type: QUOTED_REPLY_POST_TYPE,
            message: '> **Ada**\n> Original message\n\nReply body',
        });

        expect(getQuotedReplyBody(selectedPost)).toBe('Reply body');
        expect(getQuotedPostDisplayMessage(selectedPost)).toBe('Reply body');
    });

    it('uses the stored body when a quoted reply has no visible message', () => {
        const selectedPost = post({
            message: '',
            props: {
                [QUOTED_REPLY_PROP]: 'source-id',
                [QUOTED_REPLY_BODY_PROP]: 'Stored body',
            },
        });

        expect(getQuotedReplyBody(selectedPost)).toBe('Stored body');
    });

    it('does not strip a malformed or incomplete quote prefix', () => {
        const incomplete = post({type: QUOTED_REPLY_POST_TYPE, message: '> Quote only'});
        const malformed = post({
            type: QUOTED_REPLY_POST_TYPE,
            message: '> Quote\nnot quoted\n\nReply',
        });

        expect(getQuotedReplyBody(incomplete)).toBe('> Quote only');
        expect(getQuotedReplyBody(malformed)).toBe('> Quote\nnot quoted\n\nReply');
    });
});
