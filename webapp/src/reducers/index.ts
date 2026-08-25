import type {PendingReply, PluginState} from '../types/store';
import {CLEAR_PENDING_REPLY, SET_PENDING_REPLY} from '../types/store';

const initialState: PluginState = {
    pendingReply: null,
};

type PluginAction = {
    type: string;
    data?: PendingReply | null;
};

export default function reducer(state: PluginState = initialState, action: PluginAction): PluginState {
    switch (action.type) {
    case SET_PENDING_REPLY:
        return {
            ...state,
            pendingReply: action.data || null,
        };
    case CLEAR_PENDING_REPLY:
        return {
            ...state,
            pendingReply: null,
        };
    default:
        return state;
    }
}
