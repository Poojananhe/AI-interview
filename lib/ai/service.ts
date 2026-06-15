import Groq from 'groq-sdk';
import retry from 'async-retry';
import { LRUCache } from 'lru-cache';
import { getSectionSubtopic } from './subtopics';

// Environment variable validation
const API_KEY = process.env.GROQ_API_KEY;
if (!API_KEY) {
  console.warn('GROQ_API_KEY is not defined in environment variables.');
}

// Model configuration
export type AIModel = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant' | 'mixtral-8x7b-32768';

// Configuration interface
interface AIRequestConfig {
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  useCache?: boolean;
}

// Request/Response cache setup
const cache = new LRUCache<string, string>({
  max: 500,
  ttl: Number(process.env.AI_CACHE_TTL) || 1000 * 60 * 60, // 1 hour default
});

const groq = new Groq({
  apiKey: API_KEY || 'mock_key', // prevent SDK from throwing immediately if key is missing
  dangerouslyAllowBrowser: true, // prevent SDK from throwing when bundled in browser context
});

export class AIService {
  private static defaultModel: AIModel = (process.env.DEFAULT_AI_MODEL as AIModel) || 'llama-3.3-70b-versatile';

  /**
   * Helper to extract JSON from markdown or raw text
   */
  private static cleanAndParseJSON<T>(text: string): T {
    try {
      // Find JSON block if it is inside markdown backticks
      const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
      const match = text.match(jsonRegex);
      const jsonString = match ? match[1] : text;
      
      return JSON.parse(jsonString.trim()) as T;
    } catch (e) {
      console.error('Failed to parse JSON from AI response:', text);
      throw new Error('AI response was not valid JSON: ' + (e as Error).message);
    }
  }

  /**
   * Generates a completion using Groq with built-in retries, caching, and error handling.
   */
  static async complete(prompt: string, config: AIRequestConfig = {}) {
    if (!API_KEY) {
      console.warn('AI Request skipped: GROQ_API_KEY is missing. Returning mocked content.');
      return '';
    }

    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2048,
      useCache = true,
    } = config;

    const cacheKey = `${model}:${prompt}:${temperature}:${maxTokens}`;

    if (useCache && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const result = await retry(
        async (bail) => {
          try {
            const chatCompletion = await groq.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model,
              temperature,
              max_tokens: maxTokens,
            });

            const content = chatCompletion.choices[0]?.message?.content;
            if (!content) {
              bail(new Error('AI returned an empty response.'));
              return '';
            }
            return content;
          } catch (error) {
            // Do not retry on 400s or 401s
            const err = error as { status?: number };
            if (err?.status === 400 || err?.status === 401) {
              bail(error as Error);
              return '';
            }
            throw error; // Trigger retry
          }
        },
        {
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 5000,
          onRetry: (error, attempt) => {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`AI Request Attempt ${attempt} failed: ${msg}`);
          },
        }
      );

      if (useCache && result) {
        cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Final AI Service Error:', msg);
      throw new Error(`AI Service failed after retries: ${msg}`);
    }
  }

  /**
   * Generates 5 interview questions for a given domain, difficulty, and section.
   */
  static async generateQuestions(domain: string, difficulty: string, section: number = 1): Promise<Array<{ text: string; type: string }>> {
    const subtopic = getSectionSubtopic(domain, section);
    const prompt = `You are an expert interviewer for the domain: "${domain}" (Difficulty level: "${difficulty}").
Specifically, curation is for "${subtopic}" (which is Section ${section} out of 100 sections of practice).
Generate exactly 5 relevant mock interview questions. The questions should test the candidate's core domain knowledge, logical thinking, and experience level, with a strong focus on the sub-topic: "${subtopic}".
Include a mix of technical, behavioral, and situational questions appropriate for this domain, level, and sub-topic.

Return ONLY a valid JSON array of objects. Do not include markdown codeblocks, text explanations, or any text before/after the JSON.
Each object must have exactly these keys:
- "text": The full question string (be descriptive, like "Explain the difference between let, const, and var in JavaScript" or "Tell me about a time you resolved a conflict on your team").
- "type": The type of the question, which must be either "Technical", "Behavioral", or "Situational".

Format Example:
[
  {"text": "Explain X and Y.", "type": "Technical"},
  {"text": "Tell me about a time when...", "type": "Behavioral"}
]`;

    try {
      const response = await this.complete(prompt, {
        temperature: 0.5, // slightly creative but structured
        useCache: false // always get fresh questions
      });

      if (!response) {
        // Fallback mock questions in case API is offline
        return this.getMockQuestions(domain);
      }

      return this.cleanAndParseJSON<Array<{ text: string; type: string }>>(response);
    } catch (error) {
      console.error('Error generating questions via AI:', error);
      return this.getMockQuestions(domain);
    }
  }

  /**
   * Evaluates a single answer.
   */
  static async evaluateAnswer(
    question: string,
    answer: string,
    domain: string,
    difficulty: string
  ): Promise<{
    communication_score: number;
    technical_score: number;
    tone_score: number;
    overall_score: number;
    strength: string;
    improvement: string;
    example_answer: string;
  }> {
    const prompt = `You are an AI Mock Interview evaluator.
Evaluate the candidate's answer for the following question under the "${domain}" domain (Difficulty: "${difficulty}").

Question: "${question}"
Candidate's Answer: "${answer}"

Provide scoring and feedback. You must score the candidate's response on three criteria (each out of 10):
1. Communication Clarity (Was the explanation clear, structured, and easy to follow?)
2. Technical Accuracy (Was the technical/domain information correct and deep enough?)
3. Confidence & Tone (Was the language professional, assertive, and appropriate?)

Also calculate an "overall_score" out of 100 based on these criteria.
Provide:
- "strength": One key highlight of their answer (be specific and constructive).
- "improvement": One specific action they can take to improve this answer.
- "example_answer": An ideal, comprehensive model answer snippet (maximum 100 words) that demonstrates how a top-tier candidate would answer.

Return ONLY a valid JSON object. Do not include markdown codeblocks, intro text, explanations, or any text before/after the JSON.
Required JSON format:
{
  "communication_score": 8,
  "technical_score": 7,
  "tone_score": 8,
  "overall_score": 77,
  "strength": "You explained the concept with good vocabulary and structured it logically.",
  "improvement": "Try adding a concrete example of where you would apply this in a real project.",
  "example_answer": "In JavaScript, let and const are block-scoped..."
}`;

    try {
      const response = await this.complete(prompt, {
        temperature: 0.3, // low temperature for precise scoring and strict JSON format
        useCache: false
      });

      if (!response) {
        return this.getMockEvaluation(question, answer);
      }

      return this.cleanAndParseJSON(response);
    } catch (error) {
      console.error('Error evaluating answer via AI:', error);
      return this.getMockEvaluation(question, answer);
    }
  }

  // --- Fallback Mock Generators ---

  private static getMockQuestions(domain: string): Array<{ text: string; type: string }> {
    const defaultMocks: Record<string, Array<{ text: string; type: string }>> = {
      'Software Engineering': [
        { text: 'Explain the difference between let, const, and var in JavaScript.', type: 'Technical' },
        { text: 'How do you design a high-traffic rate-limiting system?', type: 'Technical' },
        { text: 'Tell me about a time you had to deal with a difficult team member or conflict.', type: 'Behavioral' },
        { text: 'What is the difference between SQL and NoSQL databases, and when would you use which?', type: 'Technical' },
        { text: 'If a production service goes down and you do not know why, what is your step-by-step process to debug it?', type: 'Situational' },
      ],
      'Data Science': [
        { text: 'Explain the bias-variance tradeoff in Machine Learning.', type: 'Technical' },
        { text: 'How would you detect and handle outliers in a dataset?', type: 'Technical' },
        { text: 'Describe a project where you clean and preprocess complex text data.', type: 'Technical' },
        { text: 'How would you explain the p-value concept to a non-technical marketing manager?', type: 'Behavioral' },
        { text: 'If your model performance drops suddenly in production, how would you troubleshoot it?', type: 'Situational' },
      ],
      'Marketing': [
        { text: 'Explain the difference between SEO and SEM, and when to prioritize each.', type: 'Technical' },
        { text: 'How would you measure the success of a branding campaign?', type: 'Technical' },
        { text: 'Describe a time you ran a marketing campaign that failed. What did you learn?', type: 'Behavioral' },
        { text: 'If your organic search traffic drops by 30% overnight, what is your initial analysis?', type: 'Situational' },
        { text: 'How do you segment an audience for a B2B SaaS email campaign?', type: 'Technical' },
      ],
      'Finance': [
        { text: 'What is Working Capital, and how does it affect a company\'s liquidity?', type: 'Technical' },
        { text: 'How do the three financial statements link together?', type: 'Technical' },
        { text: 'Tell me about a time you made an analytical error. How did you catch and fix it?', type: 'Behavioral' },
        { text: 'If a client asks you to evaluate whether to buy or lease an expensive piece of equipment, how would you approach the analysis?', type: 'Situational' },
        { text: 'What is EBITDA, and why do analysts use it instead of Net Income?', type: 'Technical' },
      ],
      'HR / Management': [
        { text: 'How do you resolve a performance issue with a high-performing but disruptive employee?', type: 'Situational' },
        { text: 'What is your strategy for maintaining high employee retention during organizational changes?', type: 'Technical' },
        { text: 'Tell me about a time you had to deliver difficult feedback to a direct report.', type: 'Behavioral' },
        { text: 'How do you balance company-wide policies with individual employee exceptions?', type: 'Situational' },
        { text: 'What key metrics do you track to measure the effectiveness of an onboarding program?', type: 'Technical' },
      ],
    };

    const domainKey = Object.keys(defaultMocks).find(k => k.toLowerCase().includes(domain.toLowerCase())) || 'Software Engineering';
    return defaultMocks[domainKey];
  }

  private static getMockEvaluation(question: string, answer: string) {
    // Simple heuristic-based mock evaluation
    const wordCount = answer.trim().split(/\s+/).length;
    const isShort = wordCount < 30;

    const scoreClarity = isShort ? 6 : 8;
    let scoreTech = isShort ? 5 : 7;
    let scoreTone = 8;

    if (answer.toLowerCase().includes('not sure') || answer.toLowerCase().includes('don\'t know')) {
      scoreTech = Math.max(3, scoreTech - 3);
      scoreTone = Math.max(4, scoreTone - 2);
    }

    const overallScore = Math.round(((scoreClarity + scoreTech + scoreTone) / 3) * 10);

    return {
      communication_score: scoreClarity,
      technical_score: scoreTech,
      tone_score: scoreTone,
      overall_score: overallScore,
      strength: isShort 
        ? "You attempted to answer, but the explanation is very brief."
        : "You structured your response logically and showed a good basic understanding.",
      improvement: isShort
        ? "Try expanding your answer. Aim for at least 50 words to explain your ideas, using the STAR method if applicable."
        : "You could improve by sharing a concrete example from your past work or projects to make the explanation more practical.",
      example_answer: `Here is a structured approach to answer "${question}": Start with a brief, clear definition. Then, expand on the core differences, advantages, and drawbacks. For instance, you could provide a real-world scenario (like using Block scoping vs Function scoping in modern JS, or comparing options in a marketing funnel) to show deep technical expertise and keep the tone professional.`
    };
  }
}
