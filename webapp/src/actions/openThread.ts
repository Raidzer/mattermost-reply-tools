import type {Post} from '@mattermost/types/posts';
import type {Store} from 'redux';

type MattermostState = {
    entities: {
        general: {
            config: {
                SiteURL: string;
            };
        };
        posts: {
            posts: Record<string, Post>;
        };
    };
};

type PostList = {
    order: string[];
    posts: Record<string, Post>;
};

const SELECT_POST = 'SELECT_POST';
const RECEIVED_POSTS = 'RECEIVED_POSTS';
const RECEIVED_POSTS_IN_THREAD = 'RECEIVED_POSTS_IN_THREAD';

function getSiteUrl(store: Store): string {
    const state = store.getState() as MattermostState;
    return state.entities.general.config.SiteURL || window.location.origin;
}

export function getPostFromStore(store: Store, postId: string): Post | undefined {
    const state = store.getState() as MattermostState;
    return state.entities.posts.posts[postId];
}

async function apiGet<T>(store: Store, path: string): Promise<T> {
    const response = await fetch(`${getSiteUrl(store)}/api/v4${path}`, {
        credentials: 'same-origin',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

function getRootPostId(post: Post): string {
    return post.root_id || post.id;
}

export async function openThreadForPost(store: Store, postId: string): Promise<boolean> {
    const dispatch = store.dispatch.bind(store);

    let post = getPostFromStore(store, postId);
    if (!post) {
        post = await apiGet<Post>(store, `/posts/${postId}`);
        dispatch({
            type: RECEIVED_POSTS,
            data: {
                order: [post.id],
                posts: {[post.id]: post},
            },
        });
    }

    if (!post || post.state === 'DELETED' || post.delete_at !== 0) {
        return false;
    }

    const rootId = getRootPostId(post);
    const thread = await apiGet<PostList>(store, `/posts/${rootId}/thread?perPage=200`);

    dispatch({
        type: RECEIVED_POSTS,
        data: thread,
    });
    dispatch({
        type: RECEIVED_POSTS_IN_THREAD,
        data: thread,
        rootId,
    });
    dispatch({
        type: SELECT_POST,
        postId: rootId,
        channelId: post.channel_id,
        timestamp: Date.now(),
    });

    return true;
}

export function isReplyablePost(post?: Post): boolean {
    if (!post || post.state === 'DELETED' || post.delete_at !== 0) {
        return false;
    }

    if (post.type && post.type.startsWith('system_')) {
        return false;
    }

    return true;
}
