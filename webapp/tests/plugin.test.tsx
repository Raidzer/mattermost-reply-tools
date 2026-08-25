import type {Post} from '@mattermost/types/posts';
import type {GlobalState} from '@mattermost/types/store';
import type {Store} from 'redux';
import {describe, expect, it, vi} from 'vitest';

import Plugin from '../src/index';
import DoubleClickReplyHandler from '../src/components/DoubleClickReplyHandler';
import ReplyComposerPreview from '../src/components/ReplyComposerPreview';
import QuotedReplyStyles from '../src/components/QuotedReplyStyles';
import {QUOTED_REPLY_BODY_PROP, QUOTED_REPLY_POST_TYPE, QUOTED_REPLY_PROP} from '../src/constants';
import {CLEAR_PENDING_REPLY, PLUGIN_STATE_KEY, type PendingReply} from '../src/types/store';
import {post, user} from './helpers';

type MessageHook = (post: Post) => {post: Post} | {error: {message: string}} | Promise<{post: Post} | {error: {message: string}}>;

function registry() {
    let messageHook: MessageHook | undefined;
    let menuAction: ((postId: string) => void) | undefined;
    let menuFilter: ((postId: string) => boolean) | undefined;

    const value = {
        registerReducer: vi.fn(),
        registerTranslations: vi.fn(),
        registerRootComponent: vi.fn(() => 'root-component'),
        registerPostActionComponent: vi.fn(() => 'post-action'),
        registerPostTypeComponent: vi.fn(() => 'post-type'),
        registerPostDropdownMenuAction: vi.fn((
            _text: React.ReactNode,
            action: (postId: string) => void,
            filter?: (postId: string) => boolean,
        ) => {
            menuAction = action;
            menuFilter = filter;
            return 'menu-action';
        }),
        registerMessageWillBePostedHook: vi.fn((hook: MessageHook) => {
            messageHook = hook;
            return 'message-hook';
        }),
    };

    return {
        get menuFilter() {
            return menuFilter;
        },
        get menuAction() {
            return menuAction;
        },
        get messageHook() {
            return messageHook;
        },
        value,
    };
}

function stateWith(pendingReply: PendingReply | null) {
    const sourcePost = post({id: 'source', channel_id: 'channel', user_id: 'ada', message: 'Original'});
    return {
        [PLUGIN_STATE_KEY]: {pendingReply},
        entities: {
            general: {config: {SiteURL: 'https://mattermost.example'}},
            posts: {
                posts: {
                    source: sourcePost,
                    system: post({id: 'system', type: 'system_join_channel'}),
                },
            },
            users: {profiles: {ada: user({id: 'ada', first_name: 'Ada'})}},
        },
    };
}

function initialize(pendingReply: PendingReply | null) {
    const state = stateWith(pendingReply);
    const dispatch = vi.fn((action: {type: string}) => {
        if (action.type === CLEAR_PENDING_REPLY) {
            state[PLUGIN_STATE_KEY].pendingReply = null;
        }
        return action;
    });
    const store = {
        dispatch,
        getState: () => state,
        subscribe: () => () => undefined,
        replaceReducer: vi.fn(),
    } as unknown as Store<GlobalState>;
    const testRegistry = registry();

    new Plugin().initialize(testRegistry.value, store);

    return {dispatch, state, store, testRegistry};
}

describe('Plugin.initialize', () => {
    it('registers the reducer, translations, UI components, menu action, and post hook', () => {
        const {testRegistry} = initialize(null);

        expect(testRegistry.value.registerReducer).toHaveBeenCalledTimes(1);
        expect(testRegistry.value.registerTranslations).toHaveBeenCalledTimes(1);
        expect(testRegistry.value.registerRootComponent).toHaveBeenNthCalledWith(1, QuotedReplyStyles);
        expect(testRegistry.value.registerRootComponent).toHaveBeenNthCalledWith(2, ReplyComposerPreview);
        expect(testRegistry.value.registerRootComponent).toHaveBeenNthCalledWith(3, DoubleClickReplyHandler);
        expect(testRegistry.value.registerPostActionComponent).toHaveBeenCalledTimes(1);
        expect(testRegistry.value.registerPostTypeComponent).toHaveBeenCalledWith(
            QUOTED_REPLY_POST_TYPE,
            expect.any(Function),
        );
        expect(testRegistry.value.registerPostDropdownMenuAction).toHaveBeenCalledTimes(1);
        expect(testRegistry.value.registerMessageWillBePostedHook).toHaveBeenCalledTimes(1);
    });

    it('exposes the Thread menu only for replyable posts', () => {
        const {testRegistry} = initialize(null);

        expect(testRegistry.menuFilter?.('source')).toBe(true);
        expect(testRegistry.menuFilter?.('system')).toBe(false);
        expect(testRegistry.menuFilter?.('missing')).toBe(false);
    });

    it('starts a thread reply from the registered menu action', () => {
        vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));
        const {dispatch, testRegistry} = initialize(null);

        testRegistry.menuAction?.('missing');
        expect(dispatch).not.toHaveBeenCalled();

        testRegistry.menuAction?.('source');
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: {
                replyToPostId: 'source',
                channelId: 'channel',
                rootId: 'source',
                context: 'thread',
            },
        }));
    });

    it('leaves a post unchanged when no pending reply is selected', () => {
        const {dispatch, testRegistry} = initialize(null);
        const outgoing = post({id: 'outgoing'});

        expect(testRegistry.messageHook?.(outgoing)).toEqual({post: outgoing});
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('converts a matching channel post and clears the pending selection', () => {
        const pendingReply: PendingReply = {
            replyToPostId: 'source',
            channelId: 'channel',
            rootId: '',
            context: 'channel',
        };
        const {dispatch, testRegistry} = initialize(pendingReply);
        const outgoing = post({id: 'outgoing', channel_id: 'channel', message: 'Answer'});

        const result = testRegistry.messageHook?.(outgoing) as {post: Post};

        expect(dispatch).toHaveBeenCalledWith({type: CLEAR_PENDING_REPLY});
        expect(result.post.type).toBe(QUOTED_REPLY_POST_TYPE);
        expect(result.post.message).toBe('> **Ada**\n> Original\n\nAnswer');
        expect(result.post.props).toEqual(expect.objectContaining({
            [QUOTED_REPLY_PROP]: 'source',
            [QUOTED_REPLY_BODY_PROP]: 'Answer',
        }));
    });

    it('keeps the selection when the outgoing post does not match its context', () => {
        const channelPending: PendingReply = {
            replyToPostId: 'source',
            channelId: 'channel',
            rootId: '',
            context: 'channel',
        };
        const channel = initialize(channelPending);
        const otherChannelPost = post({channel_id: 'other-channel'});
        const threadPost = post({channel_id: 'channel', root_id: 'root'});

        expect(channel.testRegistry.messageHook?.(otherChannelPost)).toEqual({post: otherChannelPost});
        expect(channel.testRegistry.messageHook?.(threadPost)).toEqual({post: threadPost});
        expect(channel.dispatch).not.toHaveBeenCalled();

        const thread = initialize({...channelPending, context: 'thread', rootId: 'expected-root'});
        const wrongThreadPost = post({channel_id: 'channel', root_id: 'other-root'});
        expect(thread.testRegistry.messageHook?.(wrongThreadPost)).toEqual({post: wrongThreadPost});
        expect(thread.dispatch).not.toHaveBeenCalled();
    });

    it('converts a post sent to the selected thread', () => {
        const pendingReply: PendingReply = {
            replyToPostId: 'source',
            channelId: 'channel',
            rootId: 'root',
            context: 'thread',
        };
        const {testRegistry} = initialize(pendingReply);
        const outgoing = post({channel_id: 'channel', root_id: 'root', message: 'Thread answer'});

        const result = testRegistry.messageHook?.(outgoing) as {post: Post};

        expect(result.post.type).toBe(QUOTED_REPLY_POST_TYPE);
        expect(result.post.props?.[QUOTED_REPLY_BODY_PROP]).toBe('Thread answer');
    });
});
