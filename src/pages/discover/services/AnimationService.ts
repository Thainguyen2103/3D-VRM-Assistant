import { supabase } from '../../../core/auth';

const ANIM_API_BASE = 'http://localhost:3000/api/animations';

export class AnimationService {
    static async getDiscoverAnimations() {
        const response = await fetch(`${ANIM_API_BASE}`);
        if (!response.ok) throw new Error('Failed to fetch animations');
        return response.json();
    }

    static async getMyUploads(userId: string) {
        const response = await fetch(`${ANIM_API_BASE}/my-uploads?creator_id=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch my uploaded animations');
        return response.json();
    }

    static async deleteAnimation(animId: string, userId: string) {
        const response = await fetch(`${ANIM_API_BASE}/${animId}?creator_id=${userId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete animation');
        return response.json();
    }
}
