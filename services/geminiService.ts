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
    1. EXTENSIVE LENGTH: You must write a very long episode. Aim for approximately 2500-3000 Korean characters. 
    2. SHOW, DON'T TELL: 인물의 성격을 직접적으로 설명하지 마세요. "침착한 성격이다"라고 쓰는 대신, 장면과 행동으로 묘사하십시오.
    3. STYLE: Use everyday, warm language. Maintain a comfortable tone, meticulously describing the background (temperature, scent, arrangement of objects) to maximize immersion.
    4. EMOTION: Focus on the "butterflies" and the subtext between characters. Richly depict internal monologues and moments that exude "loveliness."
    5. ORGANIC PERSONA: 인물 고증 데이터는 캐릭터의 행동 속에 자연스럽게 녹여내야 합니다. 정보의 나열은 엄격히 금지하며, 팬들이 보기에 실제 인물처럼 느껴지도록 생동감을 부여하세요.
    6. RELATIONSHIP & ADDRESS: 대화 상대가 분명하다면 호칭을 생략하고 실제 대화처럼 구성하세요. 서열 고증을 철저히 하되, 모르면 이름만 부르는 평어체를 사용하십시오.
    7. NARRATIVE CONTINUITY: 이전 챕터의 모든 설정과 감정선을 절대적인 사실로 취급하고 모순되지 않게 작성하세요.
    8. NEXT STEPS: At the very end, provide exactly 3 diverse plot suggestions for the next chapter.
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