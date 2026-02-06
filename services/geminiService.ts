import { GoogleGenAI, Type } from "@google/genai";
import { Story, Episode } from "@/types";
import { supabase } from "@/src/lib/supabase";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

/**
 * RAG: 멤버별 상세 지식 및 고유 에피소드를 검색합니다.
 */
/*
const fetchMemberKnowledge = async (memberNames: string[]) => {
  try {
    const { data: members } = await supabase
      .from('idol_members')
      .select('id')
      .in('name_kr', memberNames);
    
    if (!members || members.length === 0) return "";

    const { data: knowledge } = await supabase
      .from('member_knowledge')
      .select('content')
      .in('member_id', members.map(m => m.id))
      .limit(5);

    return knowledge?.map(k => k.content).join("\n") || "";
  } catch (error) {
    console.error("RAG Fetch Error:", error);
    return "";
  }
};
*/


export const generateEpisode = async (
  story: Story,
  userInput: string,
  currentEpisodeNum: number
): Promise<{ content: string; suggestions: string[]; storyTitle?: string }> => {
  const isFirstEpisode = currentEpisodeNum === 1;

  // 1. DB에서 가이드라인 가져오기
  const { data: config } = await supabase
    .from('app_config')
    .select('config_value')
    .eq('config_key', 'writing_guidelines')
    .single();

  // 2. DB 실패 시 사용할 실제 가이드라인 전문 (백업)
  const fallbackGuidelines = `
    You are PIKFIC, a highly creative and popular K-pop fanfiction writer.
    
    [WRITING RULES]
   1. EXTENSIVE LENGTH: 2500-3000 Korean characters. (Secure sufficient length to ensure the narrative flow remains uninterrupted.)
   2. SHOW, DON'T TELL (ABSOLUTE): Do not describe a character's personality directly. Mentioning specific profile data (Height, Nationality, MBTI, Hometown, Official Position) in the narrative is considered a TECHNICAL WRITING FAILURE. Instead of writing "He has a calm personality," describe his steady hands as he quietly sets down a teacup in a tense situation. Make the reader 'see' the scene rather than just reading information. 
   3. EMOTIONAL SUBTEXT: Focus on the 'subtext'—the silence between lines, the shifting gaze, or the slight tremor of a finger—rather than just the dialogue. The fluttering heart (Butterflies) stems from the tension of a 'near-touching' distance, not from direct confessions.
   4. ORGANIC PERSONA INTEGRATION (SECRET DOSSIER): The provided character data (Traits, Background) is a "Secret Dossier" for your internal reference only. NEVER reveal these specific keywords, numbers, or facts in the story. Simply listing information is strictly prohibited. Use this data ONLY as internal logic to shape the character's actions and speech patterns, so that fans will think, "If it were really them, they would have acted exactly like this in this situation."
   5. NEXT STEPS (IMPORTANT!!): At the very end, provide exactly 3 diverse plot suggestions for the next chapter.
   6. RELATIONSHIP & ADDRESS CONSISTENCY:
    - Do not address the other person by their name or title in every sentence. Take advantage of the nuances of the Korean language; if the target of the dialogue is clear from the context, omit titles and write the lines naturally to mimic real conversation.
    - Peer & Same-age relations: If members are the same age or the seniority is unclear, avoid titles like 'Hyung' or 'Sunbae.' Address them by name and use natural informal speech.
    - Hierarchy Accuracy: Use titles like Hyung/Noona/Unnie/Oppa/Sunbaenim only when age differences or debut years are verified. If unknown, do not invent titles; use names and the speech style established in Chapter 1.
    - Do not arbitrarily create 'Sunbae' or 'Hubae' titles if the relationship is unknown.
   7. RELATIONSHIP & ADDRESS EVOLUTION: Maintain the settings from Chapter 1 as the foundation. Allow natural transitions, such as moving to informal speech or using nicknames, only as the relationship deepens through the narrative. However, once a level of intimacy is established, do not regress to formal speech without a specific narrative reason.
   8. NARRATIVE CONTINUITY: Treat every detail, setting, and emotional development from previous chapters as absolute facts. Do not contradict past events. Ensure the story flows as one seamless, long-form novel.
   9. FORMATTING: Use double newline characters (\n\n) for paragraph breaks. Strictly prohibited from using HTML tags such as <br> or <p>. Ensure all line breaks are plain text newlines.
    `;

  const baseGuidelines = config?.config_value || fallbackGuidelines;

  // 3. RAG 데이터 및 인물 컨텍스트 준비
  /*
  const ragKnowledge = await fetchMemberKnowledge([story.leftMember, story.rightMember]);
 */

  const characterContext = story.isNafes 
    ? `The character '${story.rightMember}' is a self-insert representation of the user (나페스). The story must focus exclusively on the interaction between '${story.leftMember}' and '${story.rightMember}'.`
    : `The main relationship is between ${story.leftMember} and ${story.rightMember}.`;

  const systemInstruction = `
    ${baseGuidelines}
    
    [CHARACTER PROFILE GUIDELINES - REFERENCE ONLY]
    - BACKGROUND: Use this as the foundational context for the character's life and history. It should inform their current situation and overall 'vibe' in the story.
    - TRAITS: Refer only to **strictly necessary** elements that are essential to the specific scene. Do not feel obligated to include every trait. Use them as a very subtle reference only when they naturally enhance the narrative atmosphere.
    
    [CHARACTER DATA]
    - ${story.leftMember}: ${story.leftMemberContext || 'No data'}
    - ${story.rightMember}: ${story.rightMemberContext || 'No data'}

    [STORY PROFILE]
    - Involved Groups: ${story.groupName}
    - Genre/Theme: ${story.theme}
    - Language: ${story.language === 'en' ? 'English' : 'Korean'}
    - Current Episode: ${currentEpisodeNum} / ${story.totalEpisodes}
    ${isFirstEpisode ? "\n[SPECIAL] generate a poetic title '[Member X Member] Title'." : ""}
  `;

  // 이전 컨텍스트 요약 유지
  const previousContext = story.episodes
    .map((ep) => `[Chapter ${ep.episodeNumber}]\n${ep.content.substring(Math.max(0, ep.content.length - 2000))}`)
    .join("\n\n");

  const prompt = isFirstEpisode
    ? `Create the first episode based on: "${userInput}".`
    : `Continuing the narrative from:
      ${previousContext}
      
      User chose: "${userInput}". Write the ${currentEpisodeNum}th episode.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.85, // 문학적 창의성을 위해 약간 높임
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            storyTitle: { type: Type.STRING }
          },
          required: ["content", "suggestions"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw new Error("Failed to generate content.");
  }
};