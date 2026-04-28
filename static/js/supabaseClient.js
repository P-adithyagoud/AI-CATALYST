/**
 * Supabase Service Layer
 * 
 * Provides a clean and reusable database client for the frontend.
 * Make sure to load the Supabase CDN script in your HTML before this file:
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */

class DatabaseService {
    constructor() {
        // These should ideally be injected via environment variables or a configuration endpoint
        // For local development, these match the default Supabase CLI local instances.
        // Update these with production values when deploying to Vercel/production.
        this.supabaseUrl = window.ENV?.SUPABASE_URL || 'http://127.0.0.1:54321';
        this.supabaseAnonKey = window.ENV?.SUPABASE_ANON_KEY || 'your-anon-key-here';
        
        if (typeof supabase === 'undefined') {
            console.error("Supabase client library not loaded. Please include the CDN script.");
            return;
        }
        
        this.client = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
    }

    // --- Profiles ---
    
    async getProfile(userId) {
        const { data, error } = await this.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        return data;
    }

    async updateProfile(userId, updates) {
        const { data, error } = await this.client
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select();
            
        if (error) throw error;
        return data;
    }

    // --- Resume Analysis ---

    async saveResumeAnalysis(userId, fileUrl, atsScore, aiFeedback, improvementSuggestions) {
        const { data, error } = await this.client
            .from('resume_analysis')
            .insert([{
                user_id: userId,
                resume_file_url: fileUrl,
                ats_score: atsScore,
                ai_feedback: aiFeedback,
                improvement_suggestions: improvementSuggestions
            }])
            .select();
            
        if (error) throw error;
        return data;
    }

    async getLatestResumeAnalysis(userId) {
        const { data, error } = await this.client
            .from('resume_analysis')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Results contain 0 rows"
        return data;
    }

    // --- Storage ---
    
    async uploadResume(userId, file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { data, error } = await this.client.storage
            .from('resumes')
            .upload(filePath, file);

        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = this.client.storage
            .from('resumes')
            .getPublicUrl(filePath);
            
        return urlData.publicUrl;
    }

    // --- Recent Searches ---

    async saveSearch(query, level, language) {
        const { data, error } = await this.client
            .from('recent_searches')
            .insert([{
                query: query,
                level: level,
                language: language
            }]);
            
        if (error) {
            console.error("Failed to save search:", error);
        }
        return data;
    }

    async getRecentSearches(limit = 10) {
        const { data, error } = await this.client
            .from('recent_searches')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
            
        if (error) {
            console.error("Failed to fetch recent searches:", error);
            return [];
        }
        return data;
    }
}

// Export a singleton instance
const db = new DatabaseService();
window.db = db;
