import openai from './openai';
import { transcribeAudio } from '../services/assemblyAI';
import { MeetingType } from '../types/meeting';

export async function generateSummary(
  transcript: string, 
  meetingType: string,
  includeEmojis: boolean = true
): Promise<string> {
  try {
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured in environment variables');
    }

    if (!transcript || !meetingType) {
      throw new Error('Missing required parameters for summary generation');
    }

    console.log('Starting summary generation for meeting type:', meetingType);

    let systemPrompt = includeEmojis
      ? 'You are an AI assistant that creates concise, well-structured meeting summaries. Use appropriate emojis to highlight key points and make the summary more engaging. Format the output in HTML with proper paragraph tags and bullet points for action items.'
      : 'You are an AI assistant that creates concise, well-structured meeting summaries. Format the output in HTML with proper paragraph tags and bullet points for action items. Do not use any emojis.';

    // Special prompt for 360° Content Summary
    if (meetingType === '360-summary') {
      systemPrompt = `You are an AI assistant that creates comprehensive 360° content summaries. Follow this specific structure:

1. Table of Contents (list all sections)
2. 📊 Is This Content Clickbait? (2-3 sentences evaluating title vs content)
3. ⚡ Quick Takes (2-3 bullet points of high-level impressions)
4. 📝 Sentence Summary (1-2 sentences maximum)
5. 💬 Favorite Quote (most impactful quote)
6. 🔍 tl;dr (1 paragraph, 3-4 sentences)
7. 📌 Key Ideas (4-5 bullet points)
8. 🎓 Lessons Learned (4-5 bullet points)
9. 🔗 Conclusion (1 paragraph)
10. 🧐 In-Depth Sections
    a. All Key Ideas (3-4 detailed paragraphs)
    b. All Lessons Learned (3-4 detailed paragraphs)

Format in HTML with proper headings and structure. Maintain objectivity while providing insightful analysis.`;
    }
    // Special prompt for Quiz Generator
    else if (meetingType === 'quiz-generator') {
      systemPrompt = `You are an expert quiz creator that generates engaging and educational quizzes from content. Follow this specific structure:

1. 📚 Introduction
   - Brief overview of the quiz content
   - Number of questions and format explanation

2. Multiple Choice Questions (Create 5 questions)
   - Each question should have 4 options (A, B, C, D)
   - Questions should test different levels of understanding
   - Mix factual and analytical questions
   - Format each question in HTML with proper numbering

3. Fill in the Blank Questions (Create 5 questions)
   - Create blanks for key terms or concepts
   - Ensure blanks are challenging but fair
   - Format in HTML with underscores for blanks

4. ✅ Answer Key
   - List all correct answers
   - Include brief explanations for each answer
   - Format in a clean, easy-to-read HTML table

Guidelines:
- Questions should progress from easier to more challenging
- Cover different aspects of the content
- Use clear, unambiguous language
- Include both factual recall and conceptual understanding
- Make questions engaging and thought-provoking

Format the entire output in clean, well-structured HTML with appropriate spacing and sections.`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Please ${meetingType === 'quiz-generator' ? 'create an educational quiz based on' : 'summarize'} this ${meetingType} meeting transcript:\n\n${transcript}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('No summary content received from the API');
    }

    console.log('Summary generated successfully');
    return response.choices[0].message.content;
  } catch (error: any) {
    const enhancedError = new Error(
      `Summary generation failed: ${error.message || 'Unknown error'}`,
      { cause: error }
    );
    console.error('Detailed summary generation error:', {
      message: error.message,
      status: error.status,
      stack: error.stack,
      cause: error.cause
    });
    throw enhancedError;
  }
}

export { transcribeAudio };