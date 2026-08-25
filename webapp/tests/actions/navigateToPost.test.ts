import type {Store} from 'redux';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {getPermalinkPath, getPermalinkUrl, navigateToQuotedPost} from '../../src/actions/navigateToPost';
import {jsonResponse, post} from '../helpers';

type TestState = {
    entities: {
        general: {config: {SiteURL: string}};
        posts: {posts: Record<string, ReturnType<typeof post>>};
        channels: {channels: Record<string, {team_id?: string}>};
        teams: {currentTeamId: string; teams: Record<string, {name: string}>};
    };
    views?: {
        rhs?: {
            selectedPostId?: string;
            isSidebarOpen?: boolean;
            highlightedPostId?: string;
        };
        rhsSuppressed?: boolean;
    };
};

function stateWith(selectedPosts: Record<string, ReturnType<typeof post>> = {}): TestState {
    return {
        entities: {
            general: {config: {SiteURL: 'https://mattermost.example/'}},
            posts: {posts: selectedPosts},
            channels: {channels: {'channel-id': {team_id: 'team-id'}}},
            teams: {currentTeamId: 'current-team', teams: {'team-id': {name: 'developers'}}},
        },
    };
}

function testStore(state: TestState) {
    const dispatch = vi.fn((action: {type: string; data?: ReturnType<typeof post>; postId?: string}) => {
        if (action.type === 'RECEIVED_POST' && action.data) {
            state.entities.posts.posts[action.data.id] = action.data;
        }
        if (action.type === 'HIGHLIGHT_REPLY' && state.views?.rhs) {
            state.views.rhs.highlightedPostId = action.postId;
        }
    });
    const store = {dispatch, getState: () => state} as unknown as Store;
    return {dispatch, store};
}

describe('permalinks', () => {
    it('builds paths from the post team and absolute URLs without a duplicate slash', () => {
        const selectedPost = post();
        const state = stateWith({[selectedPost.id]: selectedPost});
        const {store} = testStore(state);

        expect(getPermalinkPath(state, selectedPost.id)).toBe('/developers/pl/post-id');
        expect(getPermalinkUrl(store, selectedPost.id)).toBe('https://mattermost.example/developers/pl/post-id');
    });

    it('falls back to the current team and rejects incomplete state', () => {
        const selectedPost = post({channel_id: 'channel-without-team'});
        const state = stateWith({[selectedPost.id]: selectedPost});
        state.entities.teams.teams['current-team'] = {name: 'fallback-team'};

        expect(getPermalinkPath(state, selectedPost.id)).toBe('/fallback-team/pl/post-id');
        expect(getPermalinkPath(state, 'missing')).toBeNull();
        delete state.entities.teams.teams['current-team'];
        expect(getPermalinkPath(state, selectedPost.id)).toBeNull();
    });
});

describe('navigateToQuotedPost', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('highlights a post already visible in the open thread and clears it later', async () => {
        const selectedPost = post({id: 'reply', root_id: 'root'});
        const state = stateWith({reply: selectedPost});
        state.views = {rhs: {isSidebarOpen: true, selectedPostId: 'root'}};
        const {dispatch, store} = testStore(state);

        await expect(navigateToQuotedPost(store, 'reply')).resolves.toBe(true);
        expect(dispatch).toHaveBeenCalledWith({type: 'HIGHLIGHT_REPLY', postId: 'reply'});

        vi.advanceTimersByTime(5000);
        expect(dispatch).toHaveBeenCalledWith({type: 'CLEAR_HIGHLIGHT_REPLY'});
    });

    it('restarts the highlight animation when the same post is selected', async () => {
        const selectedPost = post({id: 'reply', root_id: 'root'});
        const state = stateWith({reply: selectedPost});
        state.views = {rhs: {isSidebarOpen: true, selectedPostId: 'root', highlightedPostId: 'reply'}};
        const {dispatch, store} = testStore(state);
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            callback(0);
            return 1;
        });

        await expect(navigateToQuotedPost(store, 'reply')).resolves.toBe(true);

        expect(dispatch.mock.calls.slice(0, 2).map(([action]) => action)).toEqual([
            {type: 'CLEAR_HIGHLIGHT_REPLY'},
            {type: 'HIGHLIGHT_REPLY', postId: 'reply'},
        ]);
    });

    it('uses Mattermost browser history outside the currently open thread', async () => {
        const selectedPost = post();
        const state = stateWith({[selectedPost.id]: selectedPost});
        const {store} = testStore(state);
        const push = vi.fn();
        window.WebappUtils = {browserHistory: {push}};

        await expect(navigateToQuotedPost(store, selectedPost.id)).resolves.toBe(true);
        expect(push).toHaveBeenCalledWith('/developers/pl/post-id');
    });

    it('fetches a missing post before navigating to it', async () => {
        const selectedPost = post({id: 'remote'});
        const state = stateWith();
        const {dispatch, store} = testStore(state);
        const push = vi.fn();
        window.WebappUtils = {browserHistory: {push}};
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(selectedPost)));

        await expect(navigateToQuotedPost(store, 'remote')).resolves.toBe(true);

        expect(dispatch).toHaveBeenCalledWith({type: 'RECEIVED_POST', data: selectedPost});
        expect(push).toHaveBeenCalledWith('/developers/pl/remote');
    });

    it('returns false when a missing post cannot be fetched', async () => {
        const {store} = testStore(stateWith());
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, {ok: false, status: 404})));

        await expect(navigateToQuotedPost(store, 'missing')).resolves.toBe(false);
    });
});
