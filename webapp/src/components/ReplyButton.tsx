import React from 'react';
import {useStore} from 'react-redux';

import type {Post} from '@mattermost/types/posts';

import {startReplyToPost, isReplyInThreadView} from '../actions/reply';
import {isReplyablePost} from '../actions/openThread';

type Props = {
    post: Post;
};

const ReplyIcon = () => (
    <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        aria-hidden='true'
    >
        <path
            d='M10 8.5V6a1 1 0 0 1 1.707-.707l6 6a1 1 0 0 1 0 1.414l-6 6A1 1 0 0 1 10 18v-2.5H6a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h4Z'
            fill='currentColor'
        />
    </svg>
);

const ReplyButton: React.FC<Props> = ({post}) => {
    const store = useStore();

    if (!isReplyablePost(post)) {
        return null;
    }

    const handleClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const context = isReplyInThreadView(event.currentTarget as HTMLElement) ? 'thread' : 'channel';
        void startReplyToPost(store, post, {context});
    };

    return (
        <button
            type='button'
            className='quoted-reply-post-action'
            aria-label='Reply'
            title='Reply to message'
            onClick={handleClick}
        >
            <ReplyIcon/>
            <span className='quoted-reply-post-action__label'>Reply</span>
        </button>
    );
};

export default ReplyButton;
