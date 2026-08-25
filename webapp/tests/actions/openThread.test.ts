import type {Store} from 'redux';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {getPostFromStore, isReplyablePost, openThreadForPost} from '../../src/actions/openThread';
import {jsonResponse, post} from '../helpers';

function testStore(posts: Record<string, ReturnType<typeof post>> = {}, siteUrl = 'https://mattermost.example') {
    const state = {
        entities: {
            general: {config: {SiteURL: siteUrl}},
            posts: {posts},
        },
    };
    const dispatch = vi.fn();
    const store = {getState: () => state, dispatch} as unknown as Store;

    return {dispatch, state, store};
}

describe('openThreadForPost', () => {
    beforeEach(() => {
        vi.spyOn(Date, 'now').mockReturnValue(12345);
    });

    it('loads a thread for a post already present in the store', async () => {
        const selectedPost = post({id: 'reply', root_id: 'root', channel_id: 'channel'});
        const {dispatch, store} = testStore({reply: selectedPost});
        const thread = {order: ['root', 'reply'], posts: {root: post({id: 'root'}), reply: selectedPost}};
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(thread));
        vi.stubGlobal('fetch', fetchMock);

        await expect(openThreadForPost(store, 'reply')).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledWith(
            'https://mattermost.example/api/v4/posts/root/thread?perPage=200',
            {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}},
        );
        expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
            {type: 'RECEIVED_POSTS', data: thread},
            {type: 'RECEIVED_POSTS_IN_THREAD', data: thread, rootId: 'root'},
            {type: 'SELECT_POST', postId: 'root', channelId: 'channel', timestamp: 12345},
        ]);
    });

    it('fetches and stores a missing post before opening its thread', async () => {
        const selectedPost = post({id: 'root', channel_id: 'channel'});
        const thread = {order: ['root'], posts: {root: selectedPost}};
        const {dispatch, store} = testStore();
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse(selectedPost))
            .mockResolvedValueOnce(jsonResponse(thread));
        vi.stubGlobal('fetch', fetchMock);

        await expect(openThreadForPost(store, 'root')).resolves.toBe(true);

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            'https://mattermost.example/api/v4/posts/root',
            {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}},
        );
        expect(dispatch).toHaveBeenNthCalledWith(1, {
            type: 'RECEIVED_POSTS',
            data: {order: ['root'], posts: {root: selectedPost}},
        });
    });

    it('does not open deleted posts', async () => {
        const deletedPost = post({id: 'deleted', state: 'DELETED'});
        const {dispatch, store} = testStore({deleted: deletedPost});
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        await expect(openThreadForPost(store, 'deleted')).resolves.toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('surfaces API failures with the response status', async () => {
        const {store} = testStore();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, {ok: false, status: 503})));

        await expect(openThreadForPost(store, 'missing')).rejects.toThrow('API request failed: 503');
    });
});

describe('post checks', () => {
    it('reads a post directly from the store', () => {
        const selectedPost = post({id: 'selected'});
        const {store} = testStore({selected: selectedPost});

        expect(getPostFromStore(store, 'selected')).toBe(selectedPost);
    });

    it('accepts only live, non-system posts', () => {
        expect(isReplyablePost(post())).toBe(true);
        expect(isReplyablePost()).toBe(false);
        expect(isReplyablePost(post({state: 'DELETED'}))).toBe(false);
        expect(isReplyablePost(post({delete_at: 1}))).toBe(false);
        expect(isReplyablePost(post({type: 'system_join_channel'}))).toBe(false);
    });
});
