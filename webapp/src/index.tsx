import React from 'react';
import type {Store} from 'redux';

import type {GlobalState} from '@mattermost/types/store';
import type {Post} from '@mattermost/types/posts';

import manifest from './manifest';
import reducer from './reducers';
import ReplyButton from './components/ReplyButton';
import ReplyComposerPreview from './components/ReplyComposerPreview';
import DoubleClickReplyHandler from './components/DoubleClickReplyHandler';
import QuotedReplyPost from './components/QuotedReplyPost';
import QuotedReplyStyles from './components/QuotedReplyStyles';
import {QUOTED_REPLY_POST_TYPE} from './constants';
import {buildQuotedReplyPost} from './utils/mobileQuote';
import {getTranslationsForLocale} from './i18n';
import {clearPendingReply, getPendingReply, startReplyToPost} from './actions/reply';
import {getPostFromStore, isReplyablePost} from './actions/openThread';

type PluginRegistry = {
    registerReducer: (pluginReducer: typeof reducer) => void;
    registerPostActionComponent: (component: React.ComponentType<{post: Post}>) => string;
    registerPostDropdownMenuAction: (
        text: React.ReactNode,
        action: (postId: string) => void,
        filter?: (postId: string) => boolean,
    ) => string;
    registerRootComponent: (component: React.ComponentType) => string;
    registerPostTypeComponent: (type: string, component: React.ComponentType<{post: Post}>) => string;
    registerMessageWillBePostedHook: (
        hook: (post: Post) => {post: Post} | {error: {message: string}} | Promise<{post: Post} | {error: {message: string}}>,
    ) => string;
    registerTranslations: (getTranslationsForLocale: (locale: string) => Record<string, string>) => void;
};

export default class Plugin {
    public initialize(registry: PluginRegistry, store: Store<GlobalState>): void {
        registry.registerReducer(reducer);
        registry.registerTranslations(getTranslationsForLocale);
        registry.registerRootComponent(QuotedReplyStyles);
        registry.registerRootComponent(ReplyComposerPreview);
        registry.registerRootComponent(DoubleClickReplyHandler);
        registry.registerPostActionComponent(ReplyButton);
        registry.registerPostTypeComponent(QUOTED_REPLY_POST_TYPE, QuotedReplyPost);

        registry.registerPostDropdownMenuAction(
            'Thread',
            (postId: string) => {
                const post = getPostFromStore(store, postId);
                if (post) {
                    void startReplyToPost(store, post, {context: 'thread'});
                }
            },
            (postId: string) => {
                const post = getPostFromStore(store, postId);
                return isReplyablePost(post);
            },
        );

        registry.registerMessageWillBePostedHook((post) => {
            const pendingReply = getPendingReply(store);

            if (!pendingReply) {
                return {post};
            }

            if (post.channel_id !== pendingReply.channelId) {
                return {post};
            }

            if (pendingReply.context === 'channel') {
                if (post.root_id) {
                    return {post};
                }
            } else if ((post.root_id || '') !== pendingReply.rootId) {
                return {post};
            }

            clearPendingReply(store);

            return {
                post: buildQuotedReplyPost(post, pendingReply.replyToPostId, store),
            };
        });
    }
}

declare global {
    interface Window {
        registerPlugin: (pluginId: string, plugin: Plugin) => void;
    }
}

window.registerPlugin(manifest.id, new Plugin());
