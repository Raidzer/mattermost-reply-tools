import type {Post} from '@mattermost/types/posts';
import type {UserProfile} from '@mattermost/types/users';

import {QUOTED_REPLY_BODY_PROP, QUOTED_REPLY_POST_TYPE, QUOTED_REPLY_PROP} from '../constants';

type MattermostState = {
    entities: {
        posts: {
            posts: Record<string, Post>;
        };
        users: {
            profiles: Record<string, UserProfile>;
        };
    };
};

export function getPostFromState(state: unknown, postId: string): Post | undefined {
    const mattermostState = state as MattermostState;
    return mattermostState.entities?.posts?.posts?.[postId];
}

export function getUserFromState(state: unknown, userId: string): UserProfile | undefined {
    const mattermostState = state as MattermostState;
    return mattermostState.entities?.users?.profiles?.[userId];
}

export function getDisplayName(user?: UserProfile): string {
    if (!user) {
        return 'Unknown user';
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    if (fullName) {
        return fullName;
    }

    return user.username;
}

export function getUserAvatarUrl(user?: UserProfile): string | null {
    if (!user?.id) {
        return null;
    }

    return `/api/v4/users/${user.id}/image?_=${user.last_picture_update || 0}`;
}

export function getUserAvatarFallbackUrl(user?: UserProfile): string | null {
    if (!user?.id) {
        return null;
    }

    return `/api/v4/users/${user.id}/image/default`;
}

export function getUserInitials(user?: UserProfile): string {
    const displayName = getDisplayName(user);
    if (displayName === 'Unknown user') {
        return '?';
    }

    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return displayName.slice(0, 2).toUpperCase();
}

export function truncateMessage(message: string, maxLength = 500): string {
    const normalized = message.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 1)}…`;
}

function stripMobileQuotePrefix(message: string): string {
    if (!message.startsWith('> ')) {
        return message;
    }

    const separatorIndex = message.indexOf('\n\n');
    if (separatorIndex === -1) {
        return message;
    }

    const prefix = message.slice(0, separatorIndex);
    if (!prefix.split('\n').every((line) => line.startsWith('> '))) {
        return message;
    }

    return message.slice(separatorIndex + 2);
}

function isQuotedReplyPost(post: Post): boolean {
    return (post.type as string) === QUOTED_REPLY_POST_TYPE || Boolean(post.props?.[QUOTED_REPLY_PROP]);
}

export function getQuotedReplyBody(post: Post): string {
    const message = post.message || '';

    if (isQuotedReplyPost(post)) {
        const stripped = stripMobileQuotePrefix(message);
        if (stripped) {
            return stripped;
        }

        const bodyFromProps = post.props?.[QUOTED_REPLY_BODY_PROP];
        if (typeof bodyFromProps === 'string') {
            return bodyFromProps;
        }
    }

    return message;
}

export function getQuotedPostDisplayMessage(post: Post): string {
    if (isQuotedReplyPost(post)) {
        return getQuotedReplyBody(post);
    }

    return post.message || '';
}
