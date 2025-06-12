import { corsHeaders } from '../_shared/cors.ts'

interface BusinessInquiry {
  company_name: string
  business_type: string
  contact_name: string
  email: string
  phone: string
  additional_info?: string
  requirements?: Record<string, any>
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const inquiry: BusinessInquiry = await req.json()

    // Validate required fields
    const requiredFields = ['company_name', 'business_type', 'contact_name', 'email', 'phone']
    for (const field of requiredFields) {
      if (!inquiry[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insert business inquiry into database
    const { data, error } = await supabase
      .from('business_inquiries')
      .insert([
        {
          company_name: inquiry.company_name,
          business_type: inquiry.business_type,
          contact_name: inquiry.contact_name,
          email: inquiry.email,
          phone: inquiry.phone,
          additional_info: inquiry.additional_info,
          requirements: inquiry.requirements || {},
          status: 'pending'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save business inquiry' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Queue confirmation email
    const { error: emailError } = await supabase
      .from('email_queue')
      .insert([
        {
          recipient: inquiry.email,
          subject: 'Business Registration Inquiry Received',
          content: `
            <h2>Thank you for your business inquiry!</h2>
            <p>Dear ${inquiry.contact_name},</p>
            <p>We have received your business registration inquiry for ${inquiry.company_name}.</p>
            <p>Our team will review your submission and contact you within 24-48 hours.</p>
            <p>Best regards,<br>The Eazyy Team</p>
          `,
          metadata: {
            type: 'business_inquiry_confirmation',
            inquiry_id: data.id
          }
        }
      ])

    if (emailError) {
      console.error('Email queue error:', emailError)
      // Don't fail the request if email queuing fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Business inquiry submitted successfully',
        inquiry_id: data.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})