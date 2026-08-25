import React from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {act} from 'react-dom/test-utils';
import {Provider} from 'react-redux';
import type {Store} from 'redux';
import {afterEach, describe, expect, it, vi} from 'vitest';

import ReplyButton from '../src/components/ReplyButton';
import ReplyComposerPreview from '../src/components/ReplyComposerPreview';
import ReplyQuote from '../src/components/ReplyQuote';
import QuotedReplyPost from '../src/components/QuotedReplyPost';
import QuotedReplyStyles from '../src/components/QuotedReplyStyles';
import {QUOTED_REPLY_POST_TYPE, QUOTED_REPLY_PROP} from '../src/constants';
import {CLEAR_PENDING_REPLY, PLUGIN_STATE_KEY, type PendingReply} from '../src/types/store';
import {post, user} from './helpers';

const roots: Root[] = [];

function render(element: React.ReactNode) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
        root.render(element);
    });

    return container;
}

function staticStore(state: unknown) {
    const dispatch = vi.fn((action) => action);
    const store = {
        dispatch,
        getState: () => state,
        subscribe: () => () => undefined,
        replaceReducer: vi.fn(),
    } as unknown as Store;

    return {dispatch, store};
}

afterEach(() => {
    act(() => {
        while (roots.length) {
            roots.pop()?.unmount();
        }
    });
});

describe('ReplyQuote', () => {
    it('renders a readable attachment fallback without an unknown avatar', () => {
        const container = render(<ReplyQuote post={post({message: ''})} username='Unknown user'/>);

        expect(container.querySelector('.quoted-reply-quote__author')?.textContent).toBe('Unknown user');
        expect(container.querySelector('.quoted-reply-quote__message')?.textContent).toBe('Attachment');
        expect(container.querySelector('.quoted-reply-quote__avatar')).toBeNull();
    });

    it('navigates through a permalink and keeps cancel as a separate action', () => {
        const onNavigate = vi.fn();
        const onClose = vi.fn();
        const container = render(
            <ReplyQuote
                post={post({message: 'Original'})}
                username='Ada'
                permalink='/developers/pl/source'
                onNavigate={onNavigate}
                onClose={onClose}
            />,
        );
        const link = container.querySelector('a') as HTMLAnchorElement;
        const close = container.querySelector('.quoted-reply-quote__close') as HTMLButtonElement;

        act(() => link.click());
        act(() => close.click());

        expect(link.getAttribute('href')).toBe('/developers/pl/source');
        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders a compact button when navigation has no permalink', () => {
        const onNavigate = vi.fn();
        const container = render(
            <ReplyQuote
                post={post()}
                username='Ada'
                compact={true}
                onNavigate={onNavigate}
            />,
        );
        const button = container.querySelector('button.quoted-reply-quote') as HTMLButtonElement;

        act(() => button.click());

        expect(button.classList.contains('quoted-reply-quote--compact')).toBe(true);
        expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('switches a broken avatar to the Mattermost fallback image', () => {
        const selectedUser = user({id: 'ada', first_name: 'Ada', last_name: 'Lovelace'});
        const container = render(
            <ReplyQuote post={post()} username='Ada Lovelace' user={selectedUser}/>,
        );
        const image = container.querySelector('img') as HTMLImageElement;

        act(() => image.dispatchEvent(new Event('error')));

        expect(image.src.endsWith('/api/v4/users/ada/image/default')).toBe(true);
    });

    it('shows initials when a profile has no image identity', () => {
        const selectedUser = user({id: '', first_name: 'Ada', last_name: 'Lovelace'});
        const container = render(
            <ReplyQuote post={post()} username='Ada Lovelace' user={selectedUser}/>,
        );

        expect(container.querySelector('.quoted-reply-quote__avatar--initials')?.textContent).toBe('AL');
    });
});

describe('ReplyButton', () => {
    it('does not render for system posts', () => {
        const {store} = staticStore({});
        const container = render(
            <Provider store={store}>
                <ReplyButton post={post({type: 'system_join_channel'})}/>
            </Provider>,
        );

        expect(container.querySelector('button')).toBeNull();
    });

    it('starts a channel reply from the message action', () => {
        vi.useFakeTimers();
        const {dispatch, store} = staticStore({});
        const selectedPost = post({id: 'source', channel_id: 'channel'});
        const container = render(
            <Provider store={store}>
                <ReplyButton post={selectedPost}/>
            </Provider>,
        );

        act(() => (container.querySelector('button') as HTMLButtonElement).click());

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: {
                replyToPostId: 'source',
                channelId: 'channel',
                rootId: '',
                context: 'channel',
            },
        }));
        expect(dispatch).toHaveBeenCalledWith({type: 'UPDATE_RHS_STATE', state: null});
    });

    it('uses the thread context when the action is rendered in the RHS', () => {
        const selectedPost = post({id: 'reply', root_id: 'root', channel_id: 'channel'});
        const state = {
            entities: {
                general: {config: {SiteURL: 'https://mattermost.example'}},
                posts: {posts: {reply: selectedPost}},
            },
        };
        const {dispatch, store} = staticStore(state);
        vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));
        const container = render(
            <div className='sidebar--right'>
                <Provider store={store}>
                    <ReplyButton post={selectedPost}/>
                </Provider>
            </div>,
        );

        act(() => (container.querySelector('button') as HTMLButtonElement).click());

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: {
                replyToPostId: 'reply',
                channelId: 'channel',
                rootId: 'root',
                context: 'thread',
            },
        }));
    });
});

describe('ReplyComposerPreview', () => {
    it('mounts next to the channel composer and clears the selection on cancel', () => {
        document.body.insertAdjacentHTML(
            'beforeend',
            '<div id="post-create"><div class="AdvancedTextEditor__cell"></div></div>',
        );
        const selectedPost = post({id: 'source', user_id: 'ada', message: 'Original'});
        let state = {
            [PLUGIN_STATE_KEY]: {
                pendingReply: {
                    replyToPostId: 'source',
                    channelId: 'channel-id',
                    rootId: '',
                    context: 'channel' as const,
                } as PendingReply | null,
            },
            entities: {
                posts: {posts: {source: selectedPost}},
                users: {profiles: {ada: user({id: 'ada', first_name: 'Ada'})}},
            },
        };
        const listeners = new Set<() => void>();
        const dispatch = vi.fn((action: {type: string}) => {
            if (action.type === CLEAR_PENDING_REPLY) {
                state = {
                    ...state,
                    [PLUGIN_STATE_KEY]: {pendingReply: null},
                };
                listeners.forEach((listener) => listener());
            }
            return action;
        });
        const store = {
            dispatch,
            getState: () => state,
            subscribe: (listener: () => void) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            },
            replaceReducer: vi.fn(),
        } as unknown as Store;

        render(
            <Provider store={store}>
                <ReplyComposerPreview/>
            </Provider>,
        );

        const host = document.querySelector('.quoted-reply-composer-host');
        expect(host?.parentElement).toBe(document.querySelector('#post-create .AdvancedTextEditor__cell'));
        expect(host?.textContent).toContain('Original');

        act(() => (host?.querySelector('.quoted-reply-quote__close') as HTMLButtonElement).click());

        expect(dispatch).toHaveBeenCalledWith({type: CLEAR_PENDING_REPLY});
        expect(document.querySelector('.quoted-reply-composer-host')).toBeNull();
    });
});

describe('QuotedReplyPost', () => {
    it('renders the source quote, formats only the reply body, and navigates on click', async () => {
        const sourcePost = post({id: 'source', user_id: 'ada', message: 'Original'});
        const quotedPost = post({
            id: 'reply',
            type: QUOTED_REPLY_POST_TYPE,
            message: '> **Ada**\n> Original\n\nAnswer',
            props: {[QUOTED_REPLY_PROP]: 'source'},
        });
        const state = {
            entities: {
                general: {config: {SiteURL: 'https://mattermost.example'}},
                posts: {posts: {source: sourcePost}},
                users: {profiles: {ada: user({id: 'ada', first_name: 'Ada'})}},
                channels: {channels: {'channel-id': {team_id: 'team'}}},
                teams: {currentTeamId: 'team', teams: {team: {name: 'developers'}}},
            },
        };
        const {store} = staticStore(state);
        window.PostUtils = {
            formatText: vi.fn((message) => `formatted:${message}`),
            messageHtmlToComponent: vi.fn((html) => <span>{html}</span>),
        };
        const push = vi.fn();
        window.WebappUtils = {browserHistory: {push}};

        const container = render(
            <Provider store={store}>
                <QuotedReplyPost post={quotedPost}/>
            </Provider>,
        );

        expect(window.PostUtils.formatText).toHaveBeenCalledWith('Answer', {postId: 'reply', editedAt: 0});
        expect(container.querySelector('.quoted-reply-post__body')?.textContent).toBe('formatted:Answer');
        expect(container.querySelector('.quoted-reply-quote__message')?.textContent).toBe('Original');
        expect((container.querySelector('a') as HTMLAnchorElement).href).toBe(
            'https://mattermost.example/developers/pl/source',
        );

        await act(async () => {
            (container.querySelector('a') as HTMLAnchorElement).click();
        });
        expect(push).toHaveBeenCalledWith('/developers/pl/source');
    });

    it('renders the body even when quoted-reply metadata is incomplete', () => {
        const state = {
            entities: {
                general: {config: {SiteURL: 'https://mattermost.example'}},
                posts: {posts: {}},
                users: {profiles: {}},
                channels: {channels: {}},
                teams: {currentTeamId: '', teams: {}},
            },
        };
        const {store} = staticStore(state);
        window.PostUtils = {
            formatText: vi.fn((message) => message),
            messageHtmlToComponent: vi.fn((html) => <span>{html}</span>),
        };

        const container = render(
            <Provider store={store}>
                <QuotedReplyPost post={post({id: 'reply', message: 'Body only'})}/>
            </Provider>,
        );

        expect(container.querySelector('.quoted-reply-quote')).toBeNull();
        expect(container.querySelector('.quoted-reply-post__body')?.textContent).toBe('Body only');
    });
});

describe('QuotedReplyStyles', () => {
    it('marks the page while the style component is mounted', () => {
        render(<QuotedReplyStyles/>);

        expect(document.body.classList.contains('quoted-reply-plugin-active')).toBe(true);

        act(() => roots.pop()?.unmount());
        expect(document.body.classList.contains('quoted-reply-plugin-active')).toBe(false);
    });
});
