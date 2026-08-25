import React, {useCallback, useMemo} from 'react';
import {useSelector, useStore} from 'react-redux';

import type {Post} from '@mattermost/types/posts';
import type {GlobalState} from '@mattermost/types/store';

import {getPermalinkUrl, navigateToQuotedPost} from '../actions/navigateToPost';
import {QUOTED_REPLY_PROP} from '../constants';
import {getPostFromState, getUserFromState, getDisplayName, getQuotedReplyBody} from '../utils/posts';
import ReplyQuote from './ReplyQuote';

type PostFormatOptions = {
    postId?: string;
    editedAt?: number;
};

declare global {
    interface Window {
        PostUtils: {
            formatText: (message: string, options?: PostFormatOptions) => string;
            messageHtmlToComponent: (html: string, isRHS?: boolean, options?: PostFormatOptions) => React.ReactNode;
        };
    }
}

type Props = {
    post: Post;
};

const QuotedReplyPost: React.FC<Props> = ({post}) => {
    const store = useStore();
    const replyToPostId = post.props?.[QUOTED_REPLY_PROP] as string | undefined;

    const replyPost = useSelector((state: GlobalState) => {
        if (!replyToPostId) {
            return undefined;
        }
        return getPostFromState(state, replyToPostId);
    });

    const replyUser = useSelector((state: GlobalState) => {
        if (!replyPost) {
            return undefined;
        }
        return getUserFromState(state, replyPost.user_id);
    });

    const permalink = useMemo(() => {
        if (!replyToPostId) {
            return null;
        }
        return getPermalinkUrl(store, replyToPostId);
    }, [replyToPostId, store]);

    const handleQuoteClick = useCallback(() => {
        if (!replyToPostId) {
            return;
        }

        void navigateToQuotedPost(store, replyToPostId);
    }, [replyToPostId, store]);

    const replyBody = getQuotedReplyBody(post);
    const formattedBody = useMemo(() => {
        const formatOptions: PostFormatOptions = {
            postId: post.id,
            editedAt: post.edit_at || 0,
        };
        const formattedText = window.PostUtils.formatText(replyBody, formatOptions);

        return window.PostUtils.messageHtmlToComponent(formattedText, false, formatOptions);
    }, [post.edit_at, post.id, replyBody]);

    return (
        <div className='quoted-reply-post'>
            {replyPost && (
                <ReplyQuote
                    post={replyPost}
                    username={getDisplayName(replyUser)}
                    user={replyUser}
                    permalink={permalink}
                    onNavigate={handleQuoteClick}
                    compact={true}
                />
            )}
            <div className='quoted-reply-post__body'>
                {formattedBody}
            </div>
        </div>
    );
};

export default QuotedReplyPost;
