'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { dbService, InterviewSession, UserProfile } from '@/lib/db';
import { 
  LucideClock, 
  LucideMic, 
  LucideMicOff, 
  LucideChevronLeft, 
  LucideChevronRight, 
  LucideSparkles, 
  LucideFileText, 
  LucideRefreshCw, 
  LucideCheckCircle, 
  LucideLightbulb, 
  LucideHelpCircle, 
  LucideTrendingUp, 
  LucideAward, 
  LucideCheck,
  LucideArrowRight
} from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import ProfileDropdown from '@/components/ProfileDropdown';

// Web Speech API interfaces
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;
let recognition: SpeechRecognitionType = null;
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
  }
}

export interface EvaluationResult {
  communication_score: number;
  technical_score: number;
  tone_score: number;
  overall_score: number;
  strength: string;
  improvement: string;
  example_answer: string;
}

export default function InterviewSessionPage() {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId: string };

  // Session state
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Quiz state
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading session...');
  const [questions, setQuestions] = useState<Array<{ text: string; type: string }>>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', '']);
  const [evaluations, setEvaluations] = useState<Array<EvaluationResult | null>>([null, null, null, null, null]);
  const [evaluating, setEvaluating] = useState(false);
  const [viewingFullAnswer, setViewingFullAnswer] = useState(false);
  const [mode, setMode] = useState<'question' | 'evaluation' | 'summary'>('question');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Session
  useEffect(() => {
    async function init() {
      try {
        const u = await dbService.getCurrentUser();
        setUser(u);

        const s = await dbService.getSession(sessionId);
        if (!s) {
          alert('Session not found!');
          router.push('/interview/select');
          return;
        }
        setSession(s);

        // Check if we have the questions saved in localStorage
        let activeQuestions: Array<{ text: string; type: string }> = [];
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`weintern_questions_${sessionId}`);
          if (cached) {
            try {
              activeQuestions = JSON.parse(cached);
            } catch (e) {
              console.error('Error parsing cached questions:', e);
            }
          }
        }

        // Fetch answers from local/Supabase if this session already has them
        const savedAnswers = await dbService.getAnswers(sessionId);
        
        if (savedAnswers.length > 0) {
          // Reconstruct questionnaire state
          if (activeQuestions.length === 0) {
            activeQuestions = savedAnswers.map(a => ({ text: a.question_text, type: a.question_type }));
          }
          setQuestions(activeQuestions);
          
          const ansList = savedAnswers.map(a => a.user_answer);
          const evals: Array<EvaluationResult | null> = savedAnswers.map(a => ({
            communication_score: a.communication_score,
            technical_score: a.technical_score,
            tone_score: a.tone_score,
            overall_score: a.overall_score,
            strength: a.strength,
            improvement: a.improvement,
            example_answer: a.example_answer
          }));

          // Pad arrays if less than 5
          while (ansList.length < 5) ansList.push('');
          while (evals.length < 5) evals.push(null);

          setAnswers(ansList);
          setEvaluations(evals);

          if (s.status === 'completed') {
            setMode('summary');
          } else {
            // Find first unanswered question
            const firstUnanswered = evals.findIndex(e => e === null);
            setCurrentIdx(firstUnanswered !== -1 ? firstUnanswered : 0);
            setMode('question');
          }
          setLoading(false);
        } else {
          // No answers yet. Do we have cached questions?
          if (activeQuestions.length > 0) {
            setQuestions(activeQuestions);
            setLoading(false);
          } else {
            // Generate new questions
            const sectionText = s.section ? ` - Section ${s.section}` : '';
            setLoadingText(`AI is curating ${s.domain} (${s.difficulty}${sectionText}) questions...`);
            const response = await fetch('/api/interview/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain: s.domain, difficulty: s.difficulty, section: s.section })
            });

            if (!response.ok) {
              throw new Error('Failed to generate interview questions');
            }

            const { questions: generatedQuestions } = await response.json();
            setQuestions(generatedQuestions);
            
            // Cache them
            if (typeof window !== 'undefined') {
              localStorage.setItem(`weintern_questions_${sessionId}`, JSON.stringify(generatedQuestions));
            }
            
            setLoading(false);
          }
        }
      } catch (e) {
        console.error(e);
        alert('An error occurred during startup. Redirecting...');
        router.push('/interview/select');
      }
    }
    init();
  }, [sessionId, router]);

  // Timer tick
  useEffect(() => {
    if (mode === 'question' && !loading && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            alert('Time has expired! Submitting interview.');
            handleFinishInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loading, timeLeft]);

  // Listen to profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      dbService.getCurrentUser().then(u => setUser(u));
    };
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('user-profile-updated', handleProfileUpdate);
  }, []);

  // Clean up and abort recording if we change question, mode, or unmount
  useEffect(() => {
    return () => {
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [currentIdx, mode]);

  // Voice recognition handlers
  useEffect(() => {
    if (!recognition) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setAnswers(prev => {
          const updated = [...prev];
          updated[currentIdx] = (updated[currentIdx] + ' ' + finalTranscript).trim();
          return updated;
        });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return () => {
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onstart = null;
        recognition.onend = null;
      }
    };
  }, [currentIdx]);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Safari.');
      return;
    }

    if (isRecording) {
      try {
        recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      setIsRecording(false);
    } else {
      try {
        recognition.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Error starting recognition:', e);
        const err = e as { name?: string; message?: string };
        if (err && (err.name === 'InvalidStateError' || (err.message && err.message.includes('already started')))) {
          setIsRecording(true);
        } else {
          try {
            recognition.abort();
          } catch {
            // ignore
          }
          setIsRecording(false);
        }
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIdx] = text;
      return updated;
    });
  };

  // Submit Answer for single question evaluation
  const handleSubmitAnswer = async () => {
    const answer = answers[currentIdx]?.trim() || '';
    const wordCount = answer.split(/\s+/).filter(Boolean).length;

    if (wordCount < 10) {
      alert('Please enter a more descriptive answer (at least 10 words).');
      return;
    }

    setEvaluating(true);
    if (isRecording) {
      recognition?.stop();
    }

    try {
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questions[currentIdx]?.text || '',
          answer,
          domain: session?.domain,
          difficulty: session?.difficulty
        })
      });

      if (!response.ok) throw new Error('Evaluation request failed');

      const { evaluation } = await response.json();
      
      // Save in evaluations array
      setEvaluations(prev => {
        const updated = [...prev];
        updated[currentIdx] = evaluation;
        return updated;
      });

      // Save answer in Database (Local or Supabase)
      await dbService.saveAnswer({
        session_id: sessionId,
        question_text: questions[currentIdx]?.text || '',
        question_type: questions[currentIdx]?.type || 'General',
        user_answer: answer,
        communication_score: evaluation.communication_score,
        technical_score: evaluation.technical_score,
        tone_score: evaluation.tone_score,
        overall_score: evaluation.overall_score,
        strength: evaluation.strength,
        improvement: evaluation.improvement,
        example_answer: evaluation.example_answer
      });

      // Move to evaluation view
      setMode('evaluation');
    } catch (e) {
      console.error(e);
      alert('AI evaluation failed. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  // Complete entire session
  async function handleFinishInterview() {
    // Average scores
    const completedEvals = evaluations.filter((e): e is EvaluationResult => e !== null);
    if (completedEvals.length === 0) {
      router.push('/dashboard');
      return;
    }

    const avgScore = Math.round(
      completedEvals.reduce((sum, e) => sum + e.overall_score, 0) / completedEvals.length
    );

    setLoading(true);
    setLoadingText('Saving final results...');
    
    try {
      await dbService.completeSession(sessionId, avgScore);
      setMode('summary');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleNext = () => {
    if (currentIdx < 4) {
      setCurrentIdx(currentIdx + 1);
      // Check if next question already evaluated
      if (evaluations[currentIdx + 1]) {
        setMode('evaluation');
      } else {
        setMode('question');
      }
    } else {
      // Last question evaluation complete, move to summary
      handleFinishInterview();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setMode('evaluation'); // previous questions are always evaluated
    }
  };

  // PDF Generation using jsPDF
  const generatePDFReport = async () => {
    if (!session) return;
    
    const completedEvals = evaluations.filter(e => e !== null);
    const overallScore = Math.round(
      completedEvals.reduce((sum, e) => sum + e.overall_score, 0) / completedEvals.length
    );
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });


    
    // Page Title & Header
    doc.setFillColor(30, 27, 75); // Dark Purple
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('WeIntern AI Mock Interview Report', 15, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Candidate: ${user ? user.full_name : 'Guest Candidate'}  |  Date: ${new Date(session.created_at).toLocaleDateString()}  |  Domain: ${session.domain} (${session.difficulty})`, 15, 30);
    
    // Overall score badge
    doc.setFillColor(99, 102, 241); // indigo
    doc.roundedRect(150, 10, 45, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('OVERALL SCORE', 155, 17);
    doc.setFontSize(18);
    doc.text(`${overallScore}/100`, 155, 27);
    
    let y = 60;
    
    // Score Breakdown
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Score Breakdown', 15, y);
    y += 8;
    
    const clarityScore = Math.round(completedEvals.reduce((sum, e) => sum + e.communication_score, 0) / completedEvals.length) * 10;
    const techScore = Math.round(completedEvals.reduce((sum, e) => sum + e.technical_score, 0) / completedEvals.length) * 10;
    const toneScore = Math.round(completedEvals.reduce((sum, e) => sum + e.tone_score, 0) / completedEvals.length) * 10;

    const scores = [
      { label: 'Communication Clarity', score: clarityScore },
      { label: 'Technical Accuracy', score: techScore },
      { label: 'Confidence & Tone', score: toneScore }
    ];

    scores.forEach((s) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(s.label, 15, y);
      
      // Draw progress bar
      doc.setFillColor(240, 240, 240);
      doc.rect(80, y - 3, 80, 4, 'F');
      doc.setFillColor(99, 102, 241);
      doc.rect(80, y - 3, s.score * 0.8, 4, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.text(`${s.score}/100`, 170, y);
      y += 8;
    });

    y += 10;

    // Performance statement
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`Performance Feedback:`, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`You completed all 5 questions with an average score of ${overallScore}%. Great work!`, 15, y + 5);

    y += 18;

    // Questions List Header
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Answer Feedback', 15, y);
    y += 8;

    // Questions
    completedEvals.forEach((evalItem, index) => {
      if (y > 250) {
        doc.addPage();
        y = 25;
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      const qText = questions[index]?.text || '';
      doc.text(`Q${index + 1}: ${qText.substring(0, 85)}${qText.length > 85 ? '...' : ''}`, 15, y);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`Score: ${evalItem.overall_score}/100  |  Type: ${questions[index]?.type || 'General'}`, 15, y + 5);
      
      // Wrap text for Strength/Improvement
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Strength:', 15, y + 10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      const strengthText = doc.splitTextToSize(evalItem.strength, 175);
      doc.text(strengthText, 35, y + 10);
      
      const lines = strengthText.length;
      const offset = 10 + (lines * 4);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Improvement:', 15, y + offset);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      const impText = doc.splitTextToSize(evalItem.improvement, 175);
      doc.text(impText, 35, y + offset);
      
      const impLines = impText.length;
      y += offset + (impLines * 4) + 6;
    });

    // Save PDF
    doc.save(`WeIntern_Report_${session.domain.replace(/\s+/g, '_')}_${session.difficulty}.pdf`);
  };

  // Helper formats
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // UI rendering conditions
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-center items-center p-6">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-[#6366f1]/5 blur-[120px] pointer-events-none" />
        <div className="glass-card max-w-md w-full p-8 text-center border border-white/10 flex flex-col items-center gap-6 relative">
          <LucideRefreshCw size={40} className="text-[#6366f1] animate-spin" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-white">Preparing Session</h3>
            <p className="text-sm text-white/50 leading-relaxed font-medium">{loadingText}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const currentAnswer = answers[currentIdx] || '';
  const currentWordCount = getWordCount(currentAnswer);
  const currentEval = evaluations[currentIdx];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] relative overflow-hidden py-12 px-6">
      
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#6366f1]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#a855f7]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 z-10 relative">

        {/* ================= HEADER BAR ================= */}
        {mode !== 'summary' && (
          <div className="flex justify-between items-center glass-card border border-white/5 p-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Question</span>
              <span className="text-sm font-black text-white bg-white/10 px-3 py-1 rounded-md">
                {currentIdx + 1} of 5
              </span>
            </div>
            
            {/* Clock Timer */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm">
                <LucideClock size={16} className="text-[#6366f1]" />
                <span>{formatTime(timeLeft)}</span>
              </div>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to quit this interview? Progress will be lost.')) {
                    router.push('/dashboard');
                  }
                }}
                className="text-xs font-extrabold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Quit
              </button>
              {user && <ProfileDropdown />}
            </div>
          </div>
        )}

        {/* ================= MODE: QUESTION ANSWER WORKSPACE ================= */}
        {mode === 'question' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Answer Input Left Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card border border-white/10 p-8 space-y-6 relative">
                
                {/* Question metadata tag */}
                <div className="inline-flex px-3 py-1 rounded-md bg-[#6366f1]/10 border border-[#6366f1]/25 text-[#6366f1] text-[10px] font-bold uppercase tracking-wider">
                  {currentQuestion?.type || 'General'}
                </div>

                {/* Question string */}
                <h2 className="text-2xl font-bold text-white leading-snug">
                  {currentQuestion?.text}
                </h2>

                {/* Textarea answer input */}
                <div className="space-y-2">
                  <textarea
                    placeholder="Type your answer here... (Minimum 50 words recommended to receive a thorough evaluation)"
                    value={currentAnswer}
                    onChange={handleTextChange}
                    rows={8}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none text-white text-sm font-medium leading-relaxed resize-none transition-all"
                  />
                  
                  {/* Textarea footer */}
                  <div className="flex justify-between items-center text-xs font-medium text-white/40">
                    <div className="flex items-center gap-2">
                      <span className={currentWordCount >= 50 ? 'text-emerald-400 font-bold' : ''}>
                        {currentWordCount} words
                      </span>
                      <span>/ min 50 words</span>
                    </div>

                    {/* Speech recording button */}
                    <button
                      onClick={toggleRecording}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        isRecording 
                          ? 'bg-red-500/20 border-red-500 text-red-400 font-bold animate-pulse' 
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {isRecording ? <LucideMicOff size={14} /> : <LucideMic size={14} />}
                      <span>{isRecording ? 'Recording...' : 'Answer with Voice'}</span>
                    </button>
                  </div>
                </div>

                {/* Submit actions */}
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <button
                    disabled={currentIdx === 0}
                    onClick={handlePrev}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-bold text-white/70 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <LucideChevronLeft size={16} />
                    <span>Previous</span>
                  </button>

                  <button
                    disabled={evaluating}
                    onClick={handleSubmitAnswer}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold text-sm transition-all shadow-lg shadow-[#6366f1]/20 disabled:opacity-50 cursor-pointer"
                  >
                    {evaluating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>AI Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <LucideSparkles size={16} />
                        <span>Submit & Evaluate</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>

            {/* Sidebar Interview Tips Right Section */}
            <div className="space-y-6">
              
              {/* Tip box */}
              <div className="glass-card border border-white/5 p-6 space-y-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <LucideLightbulb size={20} />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Tips</h3>
                </div>
                <p className="text-xs text-white/50 font-bold">Structure your answer:</p>
                <ul className="space-y-2.5">
                  {[
                    'Structure your response using the STAR method (Situation, Task, Action, Result).',
                    'Provide a clear, brief opening definition.',
                    'Use concrete, real-life examples from projects.',
                    'Summarize the core impact clearly.'
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/60 leading-relaxed font-medium">
                      <LucideCheck size={14} className="text-[#6366f1] mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Need help box */}
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-white/40">
                  <LucideHelpCircle size={18} />
                  <span className="font-bold text-xs uppercase tracking-wider">Need Help?</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  Be confident and express your answer step-by-step. Remember that Communication Clarity counts just as much as Technical Accuracy!
                </p>
              </div>

            </div>

          </div>
        )}

        {/* ================= MODE: SINGLE QUESTION EVALUATION VIEW ================= */}
        {mode === 'evaluation' && (
          <div className="glass-card border border-white/10 p-8 space-y-8">
            
            {/* Top evaluation title */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-white/5">
              <div>
                <span className="text-[10px] font-extrabold text-[#6366f1] uppercase tracking-wider">AI Evaluation</span>
                <h3 className="text-xl font-bold text-white mt-1">Question {currentIdx + 1} Review</h3>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                <LucideCheckCircle size={14} />
                <span>Graded</span>
              </div>
            </div>

            {/* Scores and circular gauge */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              
              {/* Left scores bars */}
              <div className="md:col-span-2 space-y-6">
                {[
                  { label: 'Communication Clarity', val: currentEval?.communication_score || 0 },
                  { label: 'Technical Accuracy', val: currentEval?.technical_score || 0 },
                  { label: 'Confidence & Tone', val: currentEval?.tone_score || 0 }
                ].map((crit, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-white/60">
                      <span>{crit.label}</span>
                      <span>{crit.val} / 10</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <div 
                        className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full transition-all duration-1000"
                        style={{ width: `${crit.val * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Circular Gauge right */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background track circle */}
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    {/* Foreground progress circle */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="url(#grad)" 
                      strokeWidth="8" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * (currentEval?.overall_score || 0)) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Inside Circle Score Text */}
                  <div className="absolute text-center">
                    <span className="text-3xl font-black tracking-tight text-white">{currentEval?.overall_score}</span>
                    <span className="text-white/40 text-[10px] block font-bold mt-0.5">/ 100</span>
                  </div>
                </div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  {(currentEval?.overall_score ?? 0) >= 80 ? 'Excellent' : (currentEval?.overall_score ?? 0) >= 60 ? 'Good' : 'Needs Practice'}
                </div>
              </div>

            </div>

            {/* AI qualitative notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              
              {/* Strength card */}
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <LucideAward size={18} />
                  <span className="font-extrabold text-xs uppercase tracking-wider">Strength</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  {currentEval?.strength}
                </p>
              </div>

              {/* Improvement card */}
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <LucideTrendingUp size={18} />
                  <span className="font-extrabold text-xs uppercase tracking-wider">Improvement Area</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  {currentEval?.improvement}
                </p>
              </div>

            </div>

            {/* Model answer snippet */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-white/60">
                  <LucideSparkles size={16} className="text-[#6366f1]" />
                  <span className="font-extrabold text-xs uppercase tracking-wider">Ideal Model Answer Snippet</span>
                </div>
                <button
                  onClick={() => setViewingFullAnswer(!viewingFullAnswer)}
                  className="text-xs font-bold text-[#6366f1] hover:underline cursor-pointer"
                >
                  {viewingFullAnswer ? 'Hide Details' : 'View Full Answer'}
                </button>
              </div>
              
              <div className={`text-xs text-white/70 font-medium leading-relaxed transition-all ${
                viewingFullAnswer ? '' : 'line-clamp-2'
              }`}>
                {currentEval?.example_answer}
              </div>
            </div>

            {/* Bottom navigation actions */}
            <div className="flex justify-between items-center pt-6 border-t border-white/5">
              <button
                disabled={currentIdx === 0}
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-bold text-white/70 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <LucideChevronLeft size={16} />
                <span>Previous Question</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold text-sm transition-all shadow-lg shadow-[#6366f1]/20 cursor-pointer"
              >
                <span>{currentIdx < 4 ? 'Next Question' : 'Finish Interview'}</span>
                <LucideChevronRight size={16} />
              </button>
            </div>

          </div>
        )}

        {/* ================= MODE: INTERVIEW SESSION SUMMARY SCORECARD ================= */}
        {mode === 'summary' && (
          <div className="space-y-6">
            
            {/* Top overview card */}
            <div className="glass-card border border-white/10 p-8 space-y-6">
              
              {/* Header metrics */}
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 pb-6 border-b border-white/5">
                <div>
                  <span className="text-[10px] font-extrabold text-[#6366f1] uppercase tracking-wider">Interview Complete</span>
                  <h2 className="text-3xl font-black text-white mt-1">Your Interview Summary</h2>
                  <p className="text-xs text-white/40 mt-1 font-medium">
                    {session?.domain} &bull; {session?.difficulty} {session?.section ? `(Section ${session.section})` : ''} &bull; {new Date(session?.created_at || '').toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => router.push('/interview/select')}
                    className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm transition-all cursor-pointer"
                  >
                    Retake Interview
                  </button>
                  <button
                    onClick={generatePDFReport}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold text-sm transition-all shadow-lg shadow-[#6366f1]/20 cursor-pointer"
                  >
                    <LucideFileText size={16} />
                    <span>Download PDF Report</span>
                  </button>
                  {user && <ProfileDropdown />}
                </div>
              </div>

              {/* Large stats gauges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center pt-2">
                
                {/* 1. Large Circle Score Gauge */}
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-xs font-extrabold text-white/50 uppercase tracking-wider">Overall Score</span>
                  
                  {/* Gauge */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="none" 
                        stroke="url(#summaryGrad)" 
                        strokeWidth="8" 
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * (session?.overall_score || 0)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="summaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-black tracking-tight text-white">{session?.overall_score}</span>
                      <span className="text-white/40 text-[10px] block font-bold mt-0.5">/ 100</span>
                    </div>
                  </div>
                </div>

                {/* 2. Score Category Averages Sliders */}
                <div className="md:col-span-2 space-y-5">
                  <span className="text-xs font-extrabold text-white/50 uppercase tracking-wider block">Score Breakdown</span>
                  
                  {[
                    { 
                      label: 'Communication Clarity', 
                      val: Math.round(evaluations.filter(e => e !== null).reduce((sum, e) => sum + e.communication_score, 0) / evaluations.filter(e => e !== null).length) 
                    },
                    { 
                      label: 'Technical Accuracy', 
                      val: Math.round(evaluations.filter(e => e !== null).reduce((sum, e) => sum + e.technical_score, 0) / evaluations.filter(e => e !== null).length) 
                    },
                    { 
                      label: 'Confidence & Tone', 
                      val: Math.round(evaluations.filter(e => e !== null).reduce((sum, e) => sum + e.tone_score, 0) / evaluations.filter(e => e !== null).length) 
                    }
                  ].map((crit, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-white/60">
                        <span>{crit.label}</span>
                        <span>{crit.val * 10} / 100</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-[#6366f1] rounded-full"
                          style={{ width: `${crit.val * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Performance statement */}
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4">
                <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
                  <LucideAward size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm mb-1">Performance Overview</h4>
                  <p className="text-xs text-white/55 leading-relaxed font-medium">
                    You performed better than 65% of other candidates in the &quot;{session?.domain}&quot; field! Download your full PDF Report above to read detail analysis recommendations.
                  </p>
                </div>
              </div>

            </div>

            {/* Tabular Question Summary */}
            <div className="glass-card border border-white/10 p-6 space-y-4">
              <span className="text-xs font-extrabold text-white/50 uppercase tracking-wider block">Question Summary</span>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-extrabold text-white/40 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Q#</th>
                      <th className="pb-3 pr-4">Question</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Score</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-white/70 font-medium">
                    {evaluations.map((evalItem, index) => {
                      if (!evalItem) return null;
                      return (
                        <tr key={index} className="group">
                          <td className="py-4 pr-4 text-white font-black">{index + 1}</td>
                          <td className="py-4 pr-4 max-w-xs sm:max-w-sm truncate text-white/80">{questions[index]?.text}</td>
                          <td className="py-4 pr-4">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wide">
                              {questions[index]?.type}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-emerald-400 font-bold">{evalItem.overall_score}/100</td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => {
                                setCurrentIdx(index);
                                setMode('evaluation');
                              }}
                              className="text-xs font-bold text-[#6366f1] group-hover:underline cursor-pointer"
                            >
                              View Feedback
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Back to Dashboard Link */}
            <div className="flex justify-center pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-bold cursor-pointer"
              >
                <span>Return to Dashboard</span>
                <LucideArrowRight size={16} />
              </Link>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
