// Supabase Edge Function: auto-tag-file
// Analyzes file text content and automatically assigns relevant tags
// 
// Usage: POST /functions/v1/auto-tag-file
// Body: { file_id: number, file_text: string }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Predefined keyword-based tag mappings for fast classification
const KEYWORD_TAGS = {
  'invoice': ['invoice', 'bill', 'payment', 'due date', 'total', 'subtotal', 'tax', 'amount due', 'billing'],
  'contract': ['contract', 'agreement', 'terms', 'conditions', 'signature', 'party', 'clause', 'obligations'],
  'receipt': ['receipt', 'purchase', 'transaction', 'refund', 'payment received', 'store'],
  'report': ['report', 'analysis', 'summary', 'findings', 'conclusion', 'data', 'statistics'],
  'legal': ['legal', 'law', 'attorney', 'court', 'litigation', 'lawsuit', 'defendant', 'plaintiff'],
  'financial': ['financial', 'budget', 'revenue', 'profit', 'loss', 'quarterly', 'annual', 'fiscal'],
  'medical': ['medical', 'health', 'patient', 'diagnosis', 'treatment', 'doctor', 'hospital', 'prescription'],
  'insurance': ['insurance', 'policy', 'premium', 'claim', 'coverage', 'deductible', 'beneficiary'],
  'tax': ['tax', 'irs', '1099', 'w2', 'deduction', 'withholding', 'refund', 'filing'],
  'hr': ['employee', 'payroll', 'benefits', 'vacation', 'hr', 'human resources', 'personnel'],
};

async function identifyTagsWithKeywords(text: string): Promise<string[]> {
  const foundTags: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [tag, keywords] of Object.entries(KEYWORD_TAGS)) {
    const matchCount = keywords.filter(keyword => lowerText.includes(keyword)).length;
    // If at least 2 keywords match, or 1 keyword for shorter lists, include the tag
    const threshold = keywords.length > 5 ? 2 : 1;
    if (matchCount >= threshold) {
      foundTags.push(tag);
    }
  }
  
  return foundTags;
}

async function identifyTagsWithAI(text: string, openAIApiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a document classifier. Analyze the given text and identify relevant tags/categories. 
            Return ONLY a JSON array of strings containing 3-7 most relevant tags. 
            Use simple, descriptive tags like: invoice, contract, report, legal, financial, medical, insurance, tax, hr, receipt, etc.
            Example response: ["invoice", "financial", "tax"]`
          },
          {
            role: 'user',
            content: `Analyze this document text and provide relevant tags:\n\n${text.substring(0, 2000)}...`
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      return [];
    }
    
    const content = data.choices[0]?.message?.content?.trim();
    if (!content) return [];
    
    // Parse JSON response
    try {
      const tags = JSON.parse(content);
      return Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string') : [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return [];
    }
  } catch (error) {
    console.error('AI tag identification failed:', error);
    return [];
  }
}

async function ensureTagExists(supabase: any, tagName: string): Promise<number> {
  // First try to find existing tag
  const { data: existingTag, error: findError } = await supabase
    .from('tags')
    .select('id')
    .eq('tag_name', tagName.toLowerCase())
    .single();
    
  if (existingTag && !findError) {
    return existingTag.id;
  }
  
  // If not found, create new tag
  const { data: newTag, error: createError } = await supabase
    .from('tags')
    .insert({ tag_name: tagName.toLowerCase() })
    .select('id')
    .single();
    
  if (createError) {
    console.error('Failed to create tag:', createError);
    throw new Error(`Failed to create tag: ${tagName}`);
  }
  
  return newTag.id;
}

async function linkFileTags(supabase: any, fileId: number, tagIds: number[]): Promise<void> {
  // Remove existing file tags
  await supabase
    .from('file_tags')
    .delete()
    .eq('file_id', fileId);
  
  // Add new file tags
  if (tagIds.length > 0) {
    const fileTagInserts = tagIds.map(tagId => ({
      file_id: fileId,
      tag_id: tagId
    }));
    
    const { error: linkError } = await supabase
      .from('file_tags')
      .insert(fileTagInserts);
      
    if (linkError) {
      console.error('Failed to link file tags:', linkError);
      throw new Error('Failed to link file with tags');
    }
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { file_id, file_text } = await req.json();
    
    if (!file_id || !file_text) {
      return new Response(
        JSON.stringify({ error: 'file_id and file_text are required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Auto-tagging file ${file_id} with ${file_text.length} characters of text`);

    // Use admin client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
      global: { fetch } 
    });

    // Step 1: Identify tags using both keyword matching and AI (if available)
    let identifiedTags: string[] = [];
    
    // Always use keyword matching as baseline
    const keywordTags = await identifyTagsWithKeywords(file_text);
    identifiedTags = [...keywordTags];
    
    // Use AI for additional tag identification if API key is available
    if (OPENAI_API_KEY && file_text.length > 50) {
      const aiTags = await identifyTagsWithAI(file_text, OPENAI_API_KEY);
      // Combine AI tags with keyword tags, removing duplicates
      identifiedTags = [...new Set([...identifiedTags, ...aiTags])];
    }
    
    console.log(`Identified tags: ${identifiedTags.join(', ')}`);
    
    if (identifiedTags.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No relevant tags identified',
          tags: [] 
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 2: Ensure all tags exist in database
    const tagIds: number[] = [];
    for (const tagName of identifiedTags) {
      try {
        const tagId = await ensureTagExists(supabase, tagName);
        tagIds.push(tagId);
      } catch (error) {
        console.error(`Failed to ensure tag exists: ${tagName}`, error);
      }
    }

    // Step 3: Link file with tags
    if (tagIds.length > 0) {
      await linkFileTags(supabase, file_id, tagIds);
    }

    console.log(`Successfully tagged file ${file_id} with ${tagIds.length} tags`);

    return new Response(
      JSON.stringify({
        success: true,
        file_id,
        tags: identifiedTags,
        tag_count: tagIds.length,
        message: `File tagged with ${tagIds.length} tags`
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Auto-tagging error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Auto-tagging failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});