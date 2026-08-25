import React, {useEffect} from 'react';
import {useStore} from 'react-redux';

import type {Post} from '@mattermost/types/posts';
import type {Store} from 'redux';

import {isReplyInThreadView, startReplyToPost} from '../actions/reply';
import {getPostFromStore, isReplyablePost} from '../actions/openThread';

const POST_BODY_SELECTOR = '[data-testid="post-body"], .post__body';
const POST_SELECTOR = '.post[id^="post_"], .post[id^="rhsPost_"]';
const POST_ID_PATTERN = /^(?:post|rhsPost)_(.+)$/;
const SINGLE_CLICK_DELAY_MS = 500;

const INTERACTIVE_CONTENT_SELECTOR = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'summary',
    'audio',
    'video',
    'iframe',
    '[contenteditable="true"]',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="textbox"]',
    'code',
    'pre',
    '.hljs',
    '.post-image__column',
    '.embed-responsive-item',
    '.attachment',
    '.suggestion-list',
    '.select-suggestion-container',
    '.post-attachment-dropdown',
    '.mm-blocks-select',
].join(', ');

function getPostId(postElement: HTMLElement): string | null {
    return POST_ID_PATTERN.exec(postElement.id)?.[1] || null;
}

type ReplyTarget = {
    post: Post;
    postElement: HTMLElement;
};

function getReplyTarget(store: Store, event: MouseEvent): ReplyTarget | null {
    if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !(event.target instanceof Element)
    ) {
        return null;
    }

    const postBody = event.target.closest<HTMLElement>(POST_BODY_SELECTOR);
    if (!postBody) {
        return null;
    }

    const interactiveContent = event.target.closest(INTERACTIVE_CONTENT_SELECTOR);
    if (interactiveContent && postBody.contains(interactiveContent)) {
        return null;
    }

    const postElement = postBody.closest<HTMLElement>(POST_SELECTOR);
    if (
        !postElement ||
        postElement.classList.contains('post--editing') ||
        postElement.classList.contains('post--modal')
    ) {
        return null;
    }

    const postId = getPostId(postElement);
    if (!postId) {
        return null;
    }

    const post = getPostFromStore(store, postId);
    if (!post || !isReplyablePost(post)) {
        return null;
    }

    return {post, postElement};
}

const DoubleClickReplyHandler: React.FC = () => {
    const store = useStore();

    useEffect(() => {
        const pendingClicks = new Map<Element, number>();

        const cancelPendingClick = (target: Element) => {
            const timeoutId = pendingClicks.get(target);
            if (timeoutId === undefined) {
                return;
            }

            window.clearTimeout(timeoutId);
            pendingClicks.delete(target);
        };

        const delayNativeClickToReply = (event: MouseEvent) => {
            if (!event.isTrusted || event.detail < 1 || !getReplyTarget(store, event) || !(event.target instanceof Element)) {
                return;
            }

            event.stopPropagation();

            const target = event.target;
            cancelPendingClick(target);

            if (event.detail > 1) {
                return;
            }

            const replayedClickInit: MouseEventInit = {
                bubbles: true,
                cancelable: true,
                composed: event.composed,
                view: event.view,
                detail: 1,
                screenX: event.screenX,
                screenY: event.screenY,
                clientX: event.clientX,
                clientY: event.clientY,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                metaKey: event.metaKey,
                button: event.button,
                buttons: event.buttons,
                relatedTarget: event.relatedTarget,
            };

            const timeoutId = window.setTimeout(() => {
                pendingClicks.delete(target);
                if (target.isConnected) {
                    target.dispatchEvent(new MouseEvent('click', replayedClickInit));
                }
            }, SINGLE_CLICK_DELAY_MS);

            pendingClicks.set(target, timeoutId);
        };

        const handleDoubleClick = (event: MouseEvent) => {
            const replyTarget = getReplyTarget(store, event);
            if (!replyTarget) {
                return;
            }

            if (event.target instanceof Element) {
                cancelPendingClick(event.target);
            }

            const {post, postElement} = replyTarget;
            const context = isReplyInThreadView(postElement) ? 'thread' : 'channel';
            void startReplyToPost(store, post, {context});
        };

        document.addEventListener('click', delayNativeClickToReply, true);
        document.addEventListener('dblclick', handleDoubleClick);
        return () => {
            document.removeEventListener('click', delayNativeClickToReply, true);
            document.removeEventListener('dblclick', handleDoubleClick);
            pendingClicks.forEach((timeoutId) => window.clearTimeout(timeoutId));
            pendingClicks.clear();
        };
    }, [store]);

    return null;
};

export default DoubleClickReplyHandler;
