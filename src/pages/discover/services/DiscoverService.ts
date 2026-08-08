import { supabase } from '../../../core/auth';

const API_BASE = 'http://localhost:3000/api/characters';

export class DiscoverService {
    static async getDiscoverCharacters() {
        const response = await fetch(`${API_BASE}/discover`);
        if (!response.ok) throw new Error('Failed to fetch discover characters');
        return response.json();
    }

    static async getSavedCharacters(userId: string) {
        const response = await fetch(`${API_BASE}/my-saved?creator_id=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch saved characters');
        return response.json();
    }

    static async getMyUploads(userId: string) {
        const response = await fetch(`${API_BASE}/my-uploads?creator_id=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch my uploaded characters');
        return response.json();
    }

    static async saveCharacter(charId: string, creatorId?: string) {
        const bodyData = creatorId ? { creator_id: creatorId } : {};
        const response = await fetch(`${API_BASE}/save/${charId}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        if (!response.ok) throw new Error('Failed to save character');
        // Some APIs might return text if error, but we just want to succeed if ok
        return response.text();
    }

    static async unsaveCharacter(charId: string, creatorId?: string) {
        const bodyData = creatorId ? { creator_id: creatorId } : {};
        const response = await fetch(`${API_BASE}/save/${charId}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        if (!response.ok) throw new Error('Failed to unsave character');
        return response.text();
    }

    static async deleteCharacter(charId: string, userId: string) {
        const response = await fetch(`${API_BASE}/${charId}?creator_id=${userId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete character');
        return response.json();
    }

    static async previewVoice(text: string, voice_model_id: string, speed: number = 1) {
        const response = await fetch(`${API_BASE}/preview-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice_model_id, speed })
        });
        if (!response.ok) throw new Error('Failed to preview voice');
        return response.blob();
    }
}
