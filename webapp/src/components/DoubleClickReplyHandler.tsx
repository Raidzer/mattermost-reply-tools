import React, {useEffect} from 'react';
import {useStore} from 'react-redux';

import {isReplyInThreadView, startReplyToPost} from '../actions/reply';
import {getPostFromStore, isReplyablePost} from '../actions/openThread';

const POST_BODY_SELECTOR = '[data-testid="post-body"], .post__body';
const POST_SELECTOR = '.post[id^="post_"], .post[id^="rhsPost_"]';
const POST_ID_PATTERN = /^(?:post|rhsPost)_(.+)$/;

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

const DoubleClickReplyHandler: React.FC = () => {
    const store = useStore();

    useEffect(() => {
        const handleDoubleClick = (event: MouseEvent) => {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                !(event.target instanceof Element)
            ) {
                return;
            }

            const postBody = event.target.closest<HTMLElement>(POST_BODY_SELECTOR);
            if (!postBody) {
                return;
            }

            const interactiveContent = event.target.closest(INTERACTIVE_CONTENT_SELECTOR);
            if (interactiveContent && postBody.contains(interactiveContent)) {
                return;
            }

            const postElement = postBody.closest<HTMLElement>(POST_SELECTOR);
            if (
                !postElement ||
                postElement.classList.contains('post--editing') ||
                postElement.classList.contains('post--modal')
            ) {
                return;
            }

            const postId = getPostId(postElement);
            if (!postId) {
                return;
            }

            const post = getPostFromStore(store, postId);
            if (!post || !isReplyablePost(post)) {
                return;
            }

            const context = isReplyInThreadView(postElement) ? 'thread' : 'channel';
            void startReplyToPost(store, post, {context});
        };

        document.addEventListener('dblclick', handleDoubleClick);
        return () => {
            document.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [store]);

    return null;
};

export default DoubleClickReplyHandler;
