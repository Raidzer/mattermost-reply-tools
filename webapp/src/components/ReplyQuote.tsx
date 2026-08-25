import React, {useState} from 'react';

import type {Post} from '@mattermost/types/posts';
import type {UserProfile} from '@mattermost/types/users';

import {
    getQuotedPostDisplayMessage,
    getUserAvatarFallbackUrl,
    getUserAvatarUrl,
    getUserInitials,
    truncateMessage,
} from '../utils/posts';

type Props = {
    post: Post;
    username: string;
    user?: UserProfile;
    permalink?: string | null;
    onClose?: () => void;
    onNavigate?: () => void;
    compact?: boolean;
};

const ReplyQuoteAvatar: React.FC<{
    user?: UserProfile;
    username: string;
    compact?: boolean;
}> = ({user, username, compact = false}) => {
    const avatarUrl = getUserAvatarUrl(user);
    const [showInitials, setShowInitials] = useState(!avatarUrl);

    if (!user) {
        return null;
    }

    const className = [
        'quoted-reply-quote__avatar',
        compact ? 'quoted-reply-quote__avatar--compact' : '',
    ].filter(Boolean).join(' ');

    if (showInitials) {
        return (
            <span
                className={`${className} quoted-reply-quote__avatar--initials`}
                aria-hidden='true'
            >
                {getUserInitials(user)}
            </span>
        );
    }

    return (
        <img
            className={className}
            src={avatarUrl || undefined}
            alt={`${username} profile picture`}
            onError={(event) => {
                const fallbackUrl = getUserAvatarFallbackUrl(user);
                if (fallbackUrl && event.currentTarget.src !== fallbackUrl) {
                    event.currentTarget.src = fallbackUrl;
                    return;
                }

                setShowInitials(true);
            }}
        />
    );
};

const ReplyQuote: React.FC<Props> = ({
    post,
    username,
    user,
    permalink,
    onClose,
    onNavigate,
    compact = false,
}) => {
    const message = truncateMessage(getQuotedPostDisplayMessage(post));
    const isClickable = Boolean(permalink || onNavigate);

    const handleNavigate = (event: React.MouseEvent) => {
        if (!isClickable) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onNavigate?.();
    };

    const className = [
        'quoted-reply-quote',
        compact ? 'quoted-reply-quote--compact' : '',
        isClickable ? 'quoted-reply-quote--clickable' : '',
    ].filter(Boolean).join(' ');

    const content = (
        <>
            <div
                className='quoted-reply-quote__bar'
                aria-hidden='true'
            />
            <ReplyQuoteAvatar
                user={user}
                username={username}
                compact={compact}
            />
            <div className='quoted-reply-quote__content'>
                <div className='quoted-reply-quote__header'>
                    <span className='quoted-reply-quote__author'>{username}</span>
                </div>
                <div className='quoted-reply-quote__message'>{message || 'Attachment'}</div>
            </div>
            {onClose && (
                <button
                    type='button'
                    className='quoted-reply-quote__close'
                    aria-label='Cancel reply'
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onClose();
                    }}
                >
                    ×
                </button>
            )}
        </>
    );

    if (isClickable && permalink) {
        return (
            <a
                href={permalink}
                className={className}
                aria-label={`Jump to message from ${username}`}
                onClick={handleNavigate}
            >
                {content}
            </a>
        );
    }

    if (isClickable && onNavigate) {
        return (
            <button
                type='button'
                className={className}
                aria-label={`Jump to message from ${username}`}
                onClick={handleNavigate}
            >
                {content}
            </button>
        );
    }

    return (
        <div className={className}>
            {content}
        </div>
    );
};

export default ReplyQuote;
