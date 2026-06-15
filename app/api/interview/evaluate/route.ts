import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai/service';

export async function POST(request: Request) {
  try {
    const { question, answer, domain, difficulty } = await request.json();

    if (!question || answer === undefined || !domain || !difficulty) {
      return NextResponse.json({ error: 'Missing required evaluation fields' }, { status: 400 });
    }

    const evaluation = await AIService.evaluateAnswer(question, answer, domain, difficulty);
    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('Error evaluating answer API:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
