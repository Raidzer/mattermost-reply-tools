import type {Post} from '@mattermost/types/posts';
import type {UserProfile} from '@mattermost/types/users';

type PostOverrides = Omit<Partial<Post>, 'type'> & {
    type?: Post['type'] | string;
};

export function post(overrides: PostOverrides = {}): Post {
    return {
        id: 'post-id',
        channel_id: 'channel-id',
        user_id: 'user-id',
        root_id: '',
        message: 'Message',
        type: '',
        props: {},
        state: '',
        delete_at: 0,
        edit_at: 0,
        ...overrides,
    } as Post;
}

export function user(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
        id: 'user-id',
        username: 'username',
        first_name: '',
        last_name: '',
        last_picture_update: 0,
        ...overrides,
    } as UserProfile;
}

export function jsonResponse<T>(data: T, options: {ok?: boolean; status?: number} = {}): Response {
    return {
        ok: options.ok ?? true,
        status: options.status ?? 200,
        json: async () => data,
    } as Response;
}
