import { NextRequest, NextResponse } from 'next/server'

// In production, this would connect to Supabase or another database
// For now, we'll store in a simple JSON file or environment variable endpoint

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      )
    }

    // In production: Store in database
    // For MVP: Could POST to a webhook, Google Sheet, or Supabase

    // Example: If WAITLIST_WEBHOOK_URL is set, forward there
    const webhookUrl = process.env.WAITLIST_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'wikiread-scholar-waitlist',
          timestamp: new Date().toISOString()
        }),
      })
    }

    // Log for now (visible in Vercel logs)
    console.log(`Waitlist signup: ${email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
