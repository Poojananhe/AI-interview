import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai/service';

export async function POST(request: Request) {
  try {
    const { domain, difficulty, section } = await request.json();
    const sectionNum = typeof section === 'number' ? section : 1;

    if (!domain || !difficulty) {
      return NextResponse.json({ error: 'Domain and difficulty are required' }, { status: 400 });
    }

    const questions = await AIService.generateQuestions(domain, difficulty, sectionNum);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error generating questions API:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
