import type {Post} from '@mattermost/types/posts';
import type {Store} from 'redux';

import {QUOTED_REPLY_BODY_PROP, QUOTED_REPLY_POST_TYPE, QUOTED_REPLY_PROP} from '../constants';
import {getDisplayName, getPostFromState, getUserFromState, getQuotedPostDisplayMessage, truncateMessage} from './posts';

export function formatMobileQuoteBlock(authorName: string, quotedMessage: string): string {
    const author = authorName.trim() || 'Unknown user';
    const message = truncateMessage(quotedMessage || 'Attachment', 500);
    const messageLines = message.split('\n').map((line) => `> ${line}`);

    return [`> **${author}**`, ...messageLines].join('\n');
}

export function buildQuotedReplyPost(post: Post, replyToPostId: string, store: Store): Post {
    const replyBody = post.message || '';
    const state = store.getState();
    const quotedPost = getPostFromState(state, replyToPostId);
    const quotedUser = quotedPost ? getUserFromState(state, quotedPost.user_id) : undefined;
    const mobileQuote = quotedPost
        ? formatMobileQuoteBlock(getDisplayName(quotedUser), getQuotedPostDisplayMessage(quotedPost))
        : '';

    return {
        ...post,
        type: QUOTED_REPLY_POST_TYPE as Post['type'],
        message: mobileQuote ? `${mobileQuote}\n\n${replyBody}` : replyBody,
        props: {
            ...post.props,
            [QUOTED_REPLY_PROP]: replyToPostId,
            [QUOTED_REPLY_BODY_PROP]: replyBody,
        },
    };
}
