import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HOURS_TO_KEEP = 72
const BUCKET_NAME = 'payment-proofs'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting cleanup of old payment proofs...')

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Calculate cutoff time (72 hours ago)
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - HOURS_TO_KEEP)
    
    console.log(`Deleting files older than: ${cutoffDate.toISOString()}`)

    // List all files in the bucket
    const { data: folders, error: foldersError } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .list('', { limit: 1000 })

    if (foldersError) {
      console.error('Error listing folders:', foldersError)
      return new Response(
        JSON.stringify({ error: 'Failed to list storage folders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let deletedCount = 0
    let errorCount = 0
    const deletedFiles: string[] = []

    // Iterate through user folders
    for (const folder of folders || []) {
      if (!folder.name) continue

      // List files in each user folder
      const { data: files, error: filesError } = await supabaseAdmin
        .storage
        .from(BUCKET_NAME)
        .list(folder.name, { limit: 1000 })

      if (filesError) {
        console.error(`Error listing files in folder ${folder.name}:`, filesError)
        errorCount++
        continue
      }

      // Check each file's age
      for (const file of files || []) {
        if (!file.name || !file.created_at) continue

        const fileCreatedAt = new Date(file.created_at)
        
        if (fileCreatedAt < cutoffDate) {
          const filePath = `${folder.name}/${file.name}`
          
          // Delete the old file
          const { error: deleteError } = await supabaseAdmin
            .storage
            .from(BUCKET_NAME)
            .remove([filePath])

          if (deleteError) {
            console.error(`Error deleting file ${filePath}:`, deleteError)
            errorCount++
          } else {
            console.log(`Deleted: ${filePath} (created: ${file.created_at})`)
            deletedFiles.push(filePath)
            deletedCount++
          }
        }
      }
    }

    // Also update payment_tickets to clear the proof_url for deleted files
    if (deletedFiles.length > 0) {
      // Extract just the filenames to match against proof_url
      for (const filePath of deletedFiles) {
        const { error: updateError } = await supabaseAdmin
          .from('payment_tickets')
          .update({ proof_url: null })
          .like('proof_url', `%${filePath}%`)

        if (updateError) {
          console.error(`Error updating ticket for ${filePath}:`, updateError)
        }
      }
    }

    const summary = {
      success: true,
      message: `Cleanup completed`,
      deletedCount,
      errorCount,
      cutoffDate: cutoffDate.toISOString(),
      hoursThreshold: HOURS_TO_KEEP
    }

    console.log('Cleanup summary:', summary)

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Cleanup error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
