import type {Post} from '@mattermost/types/posts';
import type {Store} from 'redux';

import {openThreadForPost} from './openThread';
import {CLEAR_PENDING_REPLY, PLUGIN_STATE_KEY, SET_PENDING_REPLY, type PendingReply, type ReplyContext} from '../types/store';

function getRootPostId(post: Post): string {
    return post.root_id || post.id;
}

function closeRhs(store: Store): void {
    store.dispatch({
        type: 'UPDATE_RHS_STATE',
        state: null,
    });
    store.dispatch({
        type: 'SELECT_POST',
        postId: '',
        channelId: '',
        timestamp: 0,
    });
}

function focusComposer(context: ReplyContext): void {
    const selectors = context === 'thread' ? [
        '.sidebar--right .AdvancedTextEditor [contenteditable="true"]',
        '.sidebar--right textarea',
    ] : [
        '#post-create .AdvancedTextEditor [contenteditable="true"]',
        '#post_textbox',
        'textarea#post_textbox',
    ];

    window.setTimeout(() => {
        for (const selector of selectors) {
            const element = document.querySelector(selector) as HTMLElement | null;
            if (element) {
                element.focus();
                break;
            }
        }
    }, 250);
}

export function setPendingReply(store: Store, pendingReply: PendingReply | null): void {
    store.dispatch({
        type: SET_PENDING_REPLY,
        data: pendingReply,
    });
}

export function clearPendingReply(store: Store): void {
    store.dispatch({
        type: CLEAR_PENDING_REPLY,
    });
}

export function getPendingReply(store: Store): PendingReply | null {
    const state = store.getState() as Record<string, {pendingReply: PendingReply | null} | undefined>;
    return state[PLUGIN_STATE_KEY]?.pendingReply || null;
}

export function isReplyInThreadView(element: HTMLElement): boolean {
    return Boolean(element.closest('.sidebar--right, .ThreadViewer'));
}

type StartReplyOptions = {
    context: ReplyContext;
};

export async function startReplyToPost(
    store: Store,
    post: Post,
    options: StartReplyOptions,
): Promise<boolean> {
    const {context} = options;
    const pendingReply: PendingReply = {
        replyToPostId: post.id,
        channelId: post.channel_id,
        rootId: context === 'thread' ? getRootPostId(post) : '',
        context,
    };

    setPendingReply(store, pendingReply);

    if (context === 'thread') {
        const opened = await openThreadForPost(store, post.id);
        focusComposer('thread');
        return opened;
    }

    closeRhs(store);
    focusComposer('channel');

    return true;
}
