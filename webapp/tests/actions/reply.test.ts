import type {Store} from 'redux';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {PendingReply} from '../../src/types/store';
import {CLEAR_PENDING_REPLY, PLUGIN_STATE_KEY, SET_PENDING_REPLY} from '../../src/types/store';
import {post} from '../helpers';

vi.mock('../../src/actions/openThread', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/actions/openThread')>();
    return {...actual, openThreadForPost: vi.fn()};
});

import {openThreadForPost} from '../../src/actions/openThread';
import {
    clearPendingReply,
    getPendingReply,
    isReplyInThreadView,
    setPendingReply,
    startReplyToPost,
} from '../../src/actions/reply';

function testStore(state: unknown = {}) {
    const dispatch = vi.fn();
    const store = {dispatch, getState: () => state} as unknown as Store;
    return {dispatch, store};
}

describe('pending reply actions', () => {
    it('sets, clears, and reads pending replies', () => {
        const pendingReply: PendingReply = {
            replyToPostId: 'post',
            channelId: 'channel',
            rootId: '',
            context: 'channel',
        };
        const {dispatch, store} = testStore({[PLUGIN_STATE_KEY]: {pendingReply}});

        setPendingReply(store, pendingReply);
        clearPendingReply(store);

        expect(dispatch).toHaveBeenNthCalledWith(1, {type: SET_PENDING_REPLY, data: pendingReply});
        expect(dispatch).toHaveBeenNthCalledWith(2, {type: CLEAR_PENDING_REPLY});
        expect(getPendingReply(store)).toBe(pendingReply);
        expect(getPendingReply(testStore().store)).toBeNull();
    });

    it('detects controls rendered inside the thread sidebar', () => {
        document.body.innerHTML = '<div class="sidebar--right"><button id="inside"></button></div><button id="outside"></button>';

        expect(isReplyInThreadView(document.querySelector('#inside') as HTMLElement)).toBe(true);
        expect(isReplyInThreadView(document.querySelector('#outside') as HTMLElement)).toBe(false);
    });
});

describe('startReplyToPost', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('selects a channel reply, closes the RHS, and focuses the channel composer', async () => {
        document.body.innerHTML = '<div id="post-create"><textarea id="post_textbox"></textarea></div>';
        const selectedPost = post({id: 'source', channel_id: 'channel'});
        const {dispatch, store} = testStore();

        await expect(startReplyToPost(store, selectedPost, {context: 'channel'})).resolves.toBe(true);
        vi.advanceTimersByTime(250);

        expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
            {
                type: SET_PENDING_REPLY,
                data: {replyToPostId: 'source', channelId: 'channel', rootId: '', context: 'channel'},
            },
            {type: 'UPDATE_RHS_STATE', state: null},
            {type: 'SELECT_POST', postId: '', channelId: '', timestamp: 0},
        ]);
        expect(document.activeElement).toBe(document.querySelector('#post_textbox'));
    });

    it('opens the root thread and focuses its composer', async () => {
        document.body.innerHTML = '<div class="sidebar--right"><textarea id="thread-composer"></textarea></div>';
        const selectedPost = post({id: 'reply', channel_id: 'channel', root_id: 'root'});
        const {dispatch, store} = testStore();
        vi.mocked(openThreadForPost).mockResolvedValue(true);

        await expect(startReplyToPost(store, selectedPost, {context: 'thread'})).resolves.toBe(true);
        vi.advanceTimersByTime(250);

        expect(dispatch).toHaveBeenCalledWith({
            type: SET_PENDING_REPLY,
            data: {replyToPostId: 'reply', channelId: 'channel', rootId: 'root', context: 'thread'},
        });
        expect(openThreadForPost).toHaveBeenCalledWith(store, 'reply');
        expect(document.activeElement).toBe(document.querySelector('#thread-composer'));
    });

    it('uses a root post own id as the thread root', async () => {
        const selectedPost = post({id: 'root', root_id: ''});
        const {dispatch, store} = testStore();
        vi.mocked(openThreadForPost).mockResolvedValue(false);

        await expect(startReplyToPost(store, selectedPost, {context: 'thread'})).resolves.toBe(false);

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({rootId: 'root'}),
        }));
    });
});
