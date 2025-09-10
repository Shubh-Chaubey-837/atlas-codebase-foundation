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

// Advanced keyword extraction using RAKE-like algorithm (free alternative to OpenAI)
function extractKeywordsAndTags(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  
  // Clean and normalize text
  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'must', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);
  
  // Extract words and filter
  const words = cleanText.split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)); // Remove pure numbers
  
  // Count word frequencies
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });
  
  // Enhanced domain categorization with more comprehensive keywords
  const domainKeywords = {
    'technology': ['software', 'computer', 'programming', 'code', 'algorithm', 'database', 'api', 'javascript', 'python', 'react', 'nodejs', 'html', 'css', 'sql', 'github', 'git', 'framework', 'library', 'development', 'developer', 'tech', 'digital', 'cyber', 'network', 'server', 'cloud', 'aws', 'google', 'microsoft', 'apple', 'website', 'application', 'mobile', 'web', 'system', 'platform', 'service', 'infrastructure', 'security', 'encryption', 'protocol'],
    'business': ['company', 'enterprise', 'corporation', 'business', 'finance', 'financial', 'revenue', 'profit', 'loss', 'investment', 'market', 'marketing', 'sales', 'customer', 'client', 'strategy', 'management', 'leadership', 'team', 'employee', 'budget', 'cost', 'expense', 'income', 'startup', 'entrepreneur', 'commerce', 'trade', 'industry', 'organization', 'partnership', 'acquisition', 'merger'],
    'science': ['research', 'study', 'experiment', 'hypothesis', 'theory', 'data', 'analysis', 'statistics', 'biology', 'chemistry', 'physics', 'mathematics', 'medicine', 'health', 'medical', 'clinical', 'laboratory', 'scientific', 'academic', 'university', 'college', 'education', 'learning', 'knowledge', 'discovery', 'innovation', 'methodology', 'empirical', 'quantitative', 'qualitative'],
    'legal': ['law', 'legal', 'court', 'judge', 'lawyer', 'attorney', 'contract', 'agreement', 'terms', 'conditions', 'policy', 'regulation', 'compliance', 'litigation', 'case', 'plaintiff', 'defendant', 'evidence', 'testimony', 'verdict', 'settlement', 'rights', 'liability', 'jurisdiction', 'statute', 'legislation', 'constitutional', 'judicial', 'arbitration'],
    'finance': ['money', 'dollar', 'currency', 'bank', 'banking', 'account', 'loan', 'credit', 'debt', 'payment', 'transaction', 'invoice', 'receipt', 'tax', 'taxes', 'financial', 'finance', 'investment', 'stock', 'bond', 'portfolio', 'asset', 'liability', 'equity', 'cash', 'savings', 'insurance', 'mortgage', 'interest', 'dividend', 'capital', 'funding'],
    'health': ['health', 'medical', 'doctor', 'hospital', 'clinic', 'patient', 'treatment', 'therapy', 'medicine', 'drug', 'prescription', 'diagnosis', 'symptom', 'disease', 'illness', 'injury', 'pain', 'wellness', 'fitness', 'exercise', 'nutrition', 'diet', 'mental', 'physical', 'healthcare', 'pharmaceutical', 'preventive'],
    'education': ['school', 'university', 'college', 'student', 'teacher', 'professor', 'education', 'learning', 'study', 'course', 'class', 'lesson', 'homework', 'assignment', 'exam', 'test', 'grade', 'degree', 'diploma', 'certificate', 'academic', 'curriculum', 'syllabus', 'pedagogy', 'instruction', 'training'],
    'personal': ['family', 'friend', 'relationship', 'personal', 'private', 'diary', 'journal', 'note', 'reminder', 'memory', 'photo', 'picture', 'vacation', 'travel', 'hobby', 'interest', 'goal', 'plan', 'dream', 'wish', 'hope', 'feeling', 'emotion', 'thoughts', 'lifestyle', 'social', 'community'],
    'communication': ['email', 'message', 'letter', 'memo', 'report', 'document', 'presentation', 'meeting', 'conference', 'discussion', 'conversation', 'announcement', 'notification', 'correspondence', 'communication', 'newsletter', 'publication', 'article', 'blog', 'social', 'media'],
    'project': ['project', 'task', 'milestone', 'deadline', 'schedule', 'timeline', 'plan', 'planning', 'goal', 'objective', 'deliverable', 'requirement', 'specification', 'proposal', 'scope', 'phase', 'progress', 'status', 'update', 'review', 'approval', 'completion']
  };
  
  // Detect domain tags
  const detectedTags: string[] = [];
  const tagScores = new Map<string, number>();
  
  for (const [tag, keywords] of Object.entries(domainKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (wordFreq.has(keyword)) {
        score += wordFreq.get(keyword)! * (keyword.length > 4 ? 2 : 1); // Bonus for longer keywords
      }
    }
    if (score > 0) {
      tagScores.set(tag, score);
    }
  }
  
  // Sort by score and take top tags
  const sortedTags = Array.from(tagScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
  
  detectedTags.push(...sortedTags);
  
  // Extract high-frequency meaningful words as additional tags
  const meaningfulWords = Array.from(wordFreq.entries())
    .filter(([word, freq]) => freq >= 2 && word.length >= 4 && word.length <= 15)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
  
  detectedTags.push(...meaningfulWords);
  
  // Remove duplicates and return
  return [...new Set(detectedTags)].slice(0, 6);
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

    // Extract tags using free keyword extraction algorithm
    const identifiedTags = extractKeywordsAndTags(file_text);
    
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