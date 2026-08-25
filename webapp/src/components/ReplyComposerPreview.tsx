import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {useSelector, useStore} from 'react-redux';

import type {GlobalState} from '@mattermost/types/store';

import {clearPendingReply} from '../actions/reply';
import {PLUGIN_STATE_KEY} from '../types/store';
import {getPostFromState, getUserFromState, getDisplayName} from '../utils/posts';
import ReplyQuote from './ReplyQuote';

const ReplyComposerPreview: React.FC = () => {
    const store = useStore();
    const pendingReply = useSelector((state: GlobalState) => {
        const pluginState = (state as unknown as Record<string, {pendingReply: unknown}>)[PLUGIN_STATE_KEY];
        return pluginState?.pendingReply as {
            replyToPostId: string;
            channelId: string;
            rootId: string;
            context: 'channel' | 'thread';
        } | null;
    });

    const replyPost = useSelector((state: GlobalState) => {
        if (!pendingReply) {
            return undefined;
        }
        return getPostFromState(state, pendingReply.replyToPostId);
    });

    const replyUser = useSelector((state: GlobalState) => {
        if (!replyPost) {
            return undefined;
        }
        return getUserFromState(state, replyPost.user_id);
    });

    const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!pendingReply) {
            setPortalHost(null);
            return undefined;
        }

        let hostElement: HTMLDivElement | null = null;

        const mountPreview = () => {
            const mountTarget = (
                pendingReply.context === 'thread' ?
                    document.querySelector('.sidebar--right .AdvancedTextEditor__cell') :
                    document.querySelector('#post-create .AdvancedTextEditor__cell')
            ) as HTMLElement | null;

            if (!mountTarget) {
                return;
            }

            if (!hostElement || hostElement.parentElement !== mountTarget) {
                hostElement?.remove();
                hostElement = document.createElement('div');
                hostElement.className = 'quoted-reply-composer-host';
                mountTarget.insertBefore(hostElement, mountTarget.firstChild);
                setPortalHost(hostElement);
            }
        };

        mountPreview();
        const intervalId = window.setInterval(mountPreview, 150);
        const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 3000);

        return () => {
            window.clearInterval(intervalId);
            window.clearTimeout(timeoutId);
            hostElement?.remove();
            setPortalHost(null);
        };
    }, [pendingReply]);

    if (!pendingReply || !replyPost || !portalHost) {
        return null;
    }

    return createPortal(
        <div className='quoted-reply-composer-preview'>
            <ReplyQuote
                post={replyPost}
                username={getDisplayName(replyUser)}
                user={replyUser}
                onClose={() => clearPendingReply(store)}
            />
        </div>,
        portalHost,
    );
};

export default ReplyComposerPreview;
