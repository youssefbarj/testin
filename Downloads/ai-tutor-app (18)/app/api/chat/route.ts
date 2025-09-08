import { type NextRequest, NextResponse } from "next/server"

// Universal CORS headers for any environment
const universalHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, Referer, User-Agent",
  "Access-Control-Allow-Credentials": "false",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: universalHeaders,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Add universal headers to all responses
    const responseHeaders = { ...universalHeaders }

    const { messages } = await request.json()

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format:", messages)
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400, headers: responseHeaders })
    }

    const apiKey = process.env.OPENROUTER_API_KEY

    // Enhanced logging for deployment debugging
    console.log("Environment check:", {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    })

    if (!apiKey) {
      console.error("No API key found in environment variables")
      return NextResponse.json(
        {
          error: "API configuration missing",
          debug:
            process.env.NODE_ENV === "development" ? "Set OPENROUTER_API_KEY in Vercel Project Settings" : undefined,
        },
        { status: 500, headers: responseHeaders },
      )
    }

    // Get referer with fallbacks
    const referer =
      request.headers.get("referer") ||
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL ||
      "https://elumy-digital-platform.vercel.app"

    console.log("API Request - Messages:", messages.length, "Referer:", referer)

    // Make API call with robust error handling
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": "E-lumy Digital Beauty Academy - Microneedling Course Assistant",
        "Content-Type": "application/json",
        "User-Agent": "E-lumy-Digital-Beauty-Academy-AI-Tutor/1.0",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000,
        stream: false,
      }),
    })

    console.log("OpenRouter response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`)

      // Return user-friendly error based on status
      let userError = "Service temporarily unavailable"
      if (response.status === 401) userError = "Authentication error"
      if (response.status === 429) userError = "Too many requests, please wait"
      if (response.status >= 500) userError = "Server error, please try again"

      return NextResponse.json(
        { error: userError, code: response.status },
        { status: response.status, headers: responseHeaders },
      )
    }

    const data = await response.json()

    // Validate response structure
    if (!data?.choices?.[0]?.message?.content) {
      console.error("Invalid response structure:", data)
      return NextResponse.json({ error: "Invalid response from AI service" }, { status: 500, headers: responseHeaders })
    }

    const content = data.choices[0].message.content.trim()

    if (!content || content.length < 10) {
      console.error("Response too short or empty:", content)
      return NextResponse.json(
        { error: "Response generation failed, please try again" },
        { status: 500, headers: responseHeaders },
      )
    }

    if (data.choices[0].finish_reason === "length") {
      console.warn("Response truncated due to token limit")
      // Still return the response but log the issue
    }

    const hasValidStructure = content.includes(" ") && !/^[^a-zA-Z]*$/.test(content)
    if (!hasValidStructure) {
      console.error("Response appears malformed:", content.substring(0, 100))
      return NextResponse.json(
        { error: "Response formatting error, please try again" },
        { status: 500, headers: responseHeaders },
      )
    }

    console.log("Successful API response, content length:", content.length)
    return NextResponse.json({ content }, { headers: responseHeaders })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      {
        error: "Connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: process.env.NODE_ENV === "development" ? "Check Vercel function logs" : undefined,
      },
      {
        status: 500,
        headers: universalHeaders,
      },
    )
  }
}
