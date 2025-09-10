// Supabase Edge Function: search
// Handles search queries across files table (filenames) and file_content table (indexed text)
// 
// Usage: GET /functions/v1/search?q=search+query
// Returns: JSON array of matching file objects

import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get search query from URL parameters
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('q');

    if (!searchQuery || searchQuery.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Search query parameter "q" is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch },
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    console.log(`Searching for: "${searchQuery}"`);

    // Prepare search terms for SQL ILIKE queries
    const searchTerms = searchQuery.trim().toLowerCase();
    const searchPattern = `%${searchTerms}%`;

    // Query files table for filename matches and join with file_content for text matches
    const { data: searchResults, error: searchError } = await supabase
      .from('files')
      .select(`
        id,
        filename,
        file_type,
        size,
        upload_date,
        storage_path,
        user_id,
        file_content (
          indexed_text
        )
      `)
      .or(`filename.ilike.${searchPattern},file_content.indexed_text.ilike.${searchPattern}`)
      .order('upload_date', { ascending: false });

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(
        JSON.stringify({ error: 'Search failed', details: searchError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform results to match expected format
    const formattedResults = (searchResults || []).map(file => ({
      id: file.id,
      filename: file.filename,
      file_type: file.file_type,
      size: file.size,
      upload_date: file.upload_date,
      storage_path: file.storage_path,
      user_id: file.user_id,
      has_content: !!file.file_content?.indexed_text,
      content_preview: file.file_content?.indexed_text 
        ? file.file_content.indexed_text.substring(0, 200) + '...'
        : null,
      // Calculate relevance score based on where the match was found
      relevance_score: file.filename.toLowerCase().includes(searchTerms) 
        ? (file.file_content?.indexed_text?.toLowerCase().includes(searchTerms) ? 3 : 2)
        : 1
    }));

    // Sort by relevance score (higher first) then by upload date
    formattedResults.sort((a, b) => {
      if (a.relevance_score !== b.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }
      return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
    });

    console.log(`Found ${formattedResults.length} results for query: "${searchQuery}"`);

    return new Response(
      JSON.stringify({
        success: true,
        query: searchQuery,
        results: formattedResults,
        total_count: formattedResults.length
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});