import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const MAX_ATTEMPTS = 3
const RATE_LIMIT_WINDOW_HOURS = 24

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const cfConnectingIp = req.headers.get('cf-connecting-ip')
    const clientIp = cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'

    console.log(`Resend verification request from IP: ${clientIp} for email: ${email}`)

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

    // Check rate limit
    const windowStart = new Date()
    windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS)

    const { data: existingLimit, error: limitError } = await supabaseAdmin
      .from('email_rate_limits')
      .select('*')
      .eq('ip_address', clientIp)
      .eq('email', email)
      .gte('first_attempt_at', windowStart.toISOString())
      .maybeSingle()

    if (limitError) {
      console.error('Error checking rate limit:', limitError)
    }

    // Check if rate limit exceeded
    if (existingLimit && existingLimit.attempts >= MAX_ATTEMPTS) {
      const resetTime = new Date(existingLimit.first_attempt_at)
      resetTime.setHours(resetTime.getHours() + RATE_LIMIT_WINDOW_HOURS)
      const remainingMinutes = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60))
      
      console.log(`Rate limit exceeded for IP: ${clientIp}, email: ${email}. Attempts: ${existingLimit.attempts}`)
      
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. You can only request ${MAX_ATTEMPTS} verification emails per ${RATE_LIMIT_WINDOW_HOURS} hours. Try again in ${remainingMinutes} minutes.`,
          rateLimited: true,
          attemptsRemaining: 0,
          resetInMinutes: remainingMinutes
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user exists and is not already confirmed
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No account found with this email address' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: 'Email is already verified. Please sign in.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update or insert rate limit record
    if (existingLimit) {
      const { error: updateError } = await supabaseAdmin
        .from('email_rate_limits')
        .update({ 
          attempts: existingLimit.attempts + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', existingLimit.id)
      
      if (updateError) {
        console.error('Error updating rate limit:', updateError)
      }
    } else {
      // Delete any old records for this IP/email combo first
      await supabaseAdmin
        .from('email_rate_limits')
        .delete()
        .eq('ip_address', clientIp)
        .eq('email', email)

      const { error: insertError } = await supabaseAdmin
        .from('email_rate_limits')
        .insert({
          ip_address: clientIp,
          email: email,
          attempts: 1,
          first_attempt_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('Error inserting rate limit:', insertError)
      }
    }

    // Use inviteUserByEmail to resend email - this triggers the email confirmation flow
    // This will send a new confirmation email to the user
    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${req.headers.get('origin') || 'https://pgpay.lovable.app'}/`
      }
    })

    if (resendError) {
      console.error('Error resending verification email:', resendError)
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const attemptsRemaining = MAX_ATTEMPTS - ((existingLimit?.attempts || 0) + 1)
    console.log(`Verification email resent to ${email}. Attempts remaining: ${attemptsRemaining}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification email sent successfully',
        attemptsRemaining: attemptsRemaining
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
