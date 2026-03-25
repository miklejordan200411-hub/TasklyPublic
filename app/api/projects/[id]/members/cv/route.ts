// app/api/projects/[id]/members/cv/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { extractText } from 'unpdf'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const formData = await req.formData()
    const file = formData.get('cv') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    let text = ''

    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdfBuffer = await file.arrayBuffer()
        const { text: extracted } = await extractText(new Uint8Array(pdfBuffer), { mergePages: true })
        text = extracted
      } catch (pdfError: any) {
        console.error('PDF parsing error:', pdfError.message)
        return NextResponse.json(
          { error: 'Failed to parse PDF file: ' + pdfError.message },
          { status: 422 }
        )
      }
    } else if (file.type === 'text/plain') {
      text = await file.text()
    } else {
      return NextResponse.json(
        { error: 'Only PDF and TXT files are supported' },
        { status: 400 }
      )
    }

    // ════════════════════════════════════════════════════════
    // ШАГ 4: ОЧИСТИТЬ ТЕКСТ
    // ════════════════════════════════════════════════════════
    text = text.replace(/\s+/g, ' ').trim().slice(0, 6000)

    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: 'No text could be extracted from the file' },
        { status: 422 }
      )
    }

    // ════════════════════════════════════════════════════════
    // ШАГ 5: ОТПРАВИТЬ В OPENAI
    // ════════════════════════════════════════════════════════
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract the top 15 tech skills from the CV text. Return ONLY valid JSON: {"skills": ["React", "Node.js"]}',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiResponse.ok) {
      const error = await aiResponse.text()
      console.error('OpenAI error:', error)
      throw new Error('OpenAI API request failed')
    }

    const aiData = await aiResponse.json()

    try {
      const content = JSON.parse(aiData.choices[0].message.content)
      return NextResponse.json({
        skills: Array.isArray(content.skills) ? content.skills : [],
      })
    } catch {
      return NextResponse.json({
        skills: [],
      })
    }

  } catch (error: any) {
    console.error('CV Route Error:', error.message)
    return NextResponse.json(
      {
        error: 'Failed to process CV',
        details: error.message,
      },
      { status: 500 }
    )
  }
}