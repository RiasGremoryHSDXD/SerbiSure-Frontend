import { API_BASE_URL } from '../api/config';
import { RealtimeClient } from './RealtimeClient';
export const realtime = new RealtimeClient(API_BASE_URL);
