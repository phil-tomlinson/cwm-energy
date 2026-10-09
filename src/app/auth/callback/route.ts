import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Kept so sign-in links already sitting in people's inboxes still work.
// All sign-in links are now handled by /auth/confirm.
export function GET(request: NextRequest) {
  const { search, origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/auth/confirm${search}`)
}
