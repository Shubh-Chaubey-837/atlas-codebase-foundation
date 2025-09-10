// Supabase Edge Function: files
// Fetches list of uploaded files with optional filtering and pagination
// 
// Usage: GET /functions/v1/files?limit=10&offset=0&search=query

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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse URL parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const searchQuery = url.searchParams.get('search');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { fetch },
    });

    console.log(`Fetching files: limit=${limit}, offset=${offset}, search=${searchQuery || 'none'}`);

    // Build query
    let query = supabase
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
        ),
        file_tags (
          tags (
            tag_name
          )
        )
      `)
      .order('upload_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter if provided
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      query = query.ilike('filename', `%${searchTerm}%`);
    }

    const { data: files, error: filesError } = await query;

    if (filesError) {
      console.error('Files fetch error:', filesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch files', details: filesError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('files')
      .select('*', { count: 'exact', head: true });

    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      countQuery = countQuery.ilike('filename', `%${searchTerm}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
    }

    // Transform results
    const formattedFiles = (files || []).map(file => {
      const content = Array.isArray(file.file_content)
        ? file.file_content[0]?.indexed_text
        : file.file_content?.indexed_text;
      const tags = Array.isArray(file.file_tags)
        ? file.file_tags.map((ft: any) => ft?.tags?.tag_name).filter(Boolean)
        : [];
      return {
        id: file.id,
        filename: file.filename,
        file_type: file.file_type,
        size: file.size,
        upload_date: file.upload_date,
        storage_path: file.storage_path,
        user_id: file.user_id,
        has_content: !!content,
        content_preview: content ? String(content).substring(0, 150) + '...' : null,
        tags,
      };
    });

    console.log(`Retrieved ${formattedFiles.length} files (total: ${count || 'unknown'})`);

    return new Response(
      JSON.stringify({
        success: true,
        files: formattedFiles,
        pagination: {
          limit,
          offset,
          total: count || 0,
          has_more: count ? (offset + limit) < count : false
        },
        search_query: searchQuery
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