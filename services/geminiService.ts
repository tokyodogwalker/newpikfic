import { GoogleGenAI, Type } from "@google/genai";
import { Story, Episode } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

export const generateEpisode = async (
  story: Story,
  userInput: string,
  currentEpisodeNum: number
): Promise<{ content: string; suggestions: string[]; storyTitle?: string }> => {
  const isFirstEpisode = currentEpisodeNum === 1;
  
  const characterContext = story.isNafes 
    ? `The character '${story.rightMember}' is a self-insert representation of the user (나페스). The story must focus exclusively on the interaction between '${story.leftMember}' and '${story.rightMember}'. No other K-pop idol should be treated as a primary romantic or main partner other than '${story.leftMember}'. Write the story in a way that allows the user to deeply project themselves onto '${story.rightMember}'.`
    : `The main relationship is between ${story.leftMember} and ${story.rightMember}.`;

  const systemInstruction = `
    You are 'PIKFIC', the world's most sophisticated K-Pop fanfiction AI.
    Your writing style is highly literary, emotive, and focuses on character psychology and sensory details.
    
    Current Story Profile:
    - Main Characters: ${story.leftMember} and ${story.rightMember}
    - Character Type: ${characterContext}
    - Setting/Involved Groups: ${story.groupName}
    - Genre/Theme: ${story.theme}
    - Episodes Progress: ${currentEpisodeNum} / ${story.totalEpisodes}
    
    Writing Guidelines:
    1. EXTENSIVE LENGTH: You must write a very long episode. Aim for approximately 2000-2500 Korean characters. 
    2. STYLE: Use everyday, warm language rather than artificial or overly flowery rhetoric. Maintain a comfortable tone, as if whispering right beside the reader, while meticulously describing the background where the character's gaze lingers—such as the temperature of the room, the scent in the air, and the specific arrangement of objects—to maximize the sense of immersion.
    3. EMOTION: Focus on the "butterflies" and the comfortable bond shared between the two characters, even in the absence of major events. Richly depict internal monologues and moments that exude "loveliness," such as a slight shift in a gaze, an accidental brush of hands, or the shared atmosphere of a sudden laugh. However, if a dark, serious, or angst-filled theme is requested, incorporate it subtly while prioritizing the emotional connection between characters over pure fear or despair.
    4. ACCURACY: Naturally weave the idol members' actual habits, signature speech patterns, and small quirks known only to fans into their dialogue and actions. This ensures the characters feel vividly alive and authentic to their real-life personas.
    5. NEXT STEPS: At the very end, provide exactly 3 diverse plot suggestions for the next chapter.
    6. RELATIONSHIP & ADDRESS CONSISTENCY: 
       - 대화 시 매 문장마다 상대의 이름이나 호칭(형, OO씨 등)을 부르지 마세요. 한국어의 특성을 살려 맥락상 대화 상대가 분명하다면 호칭을 과감히 생략하고 대사만 작성하여 실제 대화처럼 자연스럽게 구성하세요.
       - 동갑 및 피어(Peer) 관계: 멤버 간 나이가 같거나 선후배 관계가 명확하지 않은 경우, '형'이나 '선배' 같은 호칭 대신 이름(예: '성훈', '제이')만 부르며 자연스러운 반말(평서문)을 사용하세요.
       - 서열 고증: 나이 차이나 데뷔 연도가 확실할 때만 형/누나/언니/오빠/선배님 호칭을 사용하되, 모르면 임의로 지어내지 말고 이름을 부르는 평어체로 작성하십시오.
       - 관계를 정확히 모른다면 '선배'나 '후배'라는 호칭을 임의로 지어내지 마세요. 1화에서 확립된 말투를 따르거나 일반적인 존칭을 사용하십시오.
    7. RELATIONSHIP & ADDRESS EVOLUTION: 
       - 1화 설정을 기본으로 하되, 서사가 진행되며 관계가 깊어질 때만 자연스럽게 말을 놓거나 애칭(nicknames)을 사용하는 변화를 허용합니다. 단, 한번 친밀해진 후에는 특별한 이유 없이 다시 격식을 차리는 퇴보가 일어나지 않게 하세요.
    8. NARRATIVE CONTINUITY: 
       - Treat every detail, setting, and emotional development from previous chapters as absolute facts. 
       - Do not contradict past events. Ensure the story flows as one seamless, long-form novel.
    ${isFirstEpisode ? "9. TITLE: Since this is the first episode, generate a creative and poetic title for the story in the format '[Member X Member] Title'. Use the names provided in the story profile." : ""}
    10. FIRST EPISODE SPECIAL DIRECTION: 
       - Focus heavily on immersive world-building and atmospheric setting descriptions. 
       - Provide deep, sensory details about the background and the characters' initial emotional states. 
       - Establish a compelling "hook" to draw readers in, but refrain from advancing the main plot significantly. 
       - Prioritize the "Introduction" and "The Calm Before the Storm"—let the story breathe through its environment and the depth of its beginning rather than rushing the action.
    
    Response Format:
    - Return strictly JSON with 'content' (string), 'suggestions' (string array of 3 items), and optional 'storyTitle' (string) if first episode.
  `;

  const previousContext = story.episodes
  .map((ep) => {
    const content = ep.content.length > 2000 
      ? `...${ep.content.substring(ep.content.length - 2000)}` 
      : ep.content;
    return `[Chapter ${ep.episodeNumber}]\n${content}`;
  })
  .join("\n\n");

  const prompt = isFirstEpisode
    ? `Create the prologue/first episode of the story based on the concept: "${userInput}". Establish the atmosphere and the first encounter or key situation between ${story.leftMember}, ${story.rightMember}, and any mentioned extra members.`
    : `[IMPORTANT CONTEXT]
  - **Spare Name Usage**: Do not repeat names or titles in every sentence. Only use them when calling the person or for specific emphasis.
  - If characters are the same age or their seniority is unclear, use their names directly and use casual speech (Banmal/Plain style). Do NOT use 'Hyung' or 'Sunbae' unless it was explicitly established in Chapter 1.
  - **Seniority & Age**: Respect the actual age and debut hierarchy of the idols. If the specific relationship is unknown, Do not invent senior/junior hierarchies if not certain. Default to a comfortable, equal relationship.
  - **Current Intimacy**: Check the latest interactions to decide if they should use established titles or evolved nicknames.
  
  Continuing the narrative from previous chapters:
  ${previousContext}
  
  The user has chosen: "${userInput}".
  Write the ${currentEpisodeNum}th episode.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        maxOutputTokens: 8192,
        temperature: 0.8,
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
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate content.");
  }
};
