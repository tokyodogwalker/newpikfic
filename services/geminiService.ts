import { GoogleGenAI, Type } from "@google/genai";
import { Story, Episode } from "../types";
import { supabase } from '../src/lib/supabase'; // Supabase 클라이언트 임포트

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

/**
 * RAG: 사용자의 입력과 관련된 추가 지식을 검색합니다.
 */
const fetchMemberKnowledge = async (memberNames: string[], query: string) => {
  try {
    // 1. member_id 조회
    const { data: members } = await supabase
      .from('idol_members')
      .select('id')
      .in('name_kr', memberNames);
    
    if (!members || members.length === 0) return "";

    const memberIds = members.map(m => m.id);

    // 2. 관련 지식 검색 (단순 텍스트 검색 또는 Embedding 기반 검색)
    // 여기서는 간단하게 관련 멤버의 지식 리스트를 가져오는 방식을 예시로 듭니다.
    const { data: knowledge } = await supabase
      .from('member_knowledge')
      .select('content')
      .in('member_id', memberIds)
      .limit(5);

    return knowledge?.map(k => k.content).join("\n") || "";
  } catch (error) {
    console.error("RAG Fetch Error:", error);
    return "";
  }
};

export const generateEpisode = async (
  story: Story,
  userInput: string,
  currentEpisodeNum: number
): Promise<{ content: string; suggestions: string[]; storyTitle?: string }> => {
  const isFirstEpisode = currentEpisodeNum === 1;

  // 1. DB에서 동적으로 프롬프트 및 설정 가져오기
  const { data: config } = await supabase
    .from('app_config')
    .select('config_value')
    .eq('config_key', 'writing_guidelines')
    .single();

  const baseGuidelines = config?.config_value || "기존의 하드코딩된 가이드라인 내용...";

  // 2. RAG 데이터 가져오기 (고증 정확도 향상)
  const ragContext = await fetchMemberKnowledge([story.leftMember, story.rightMember], userInput);
  
  const characterContext = story.isNafes 
    ? `The character '${story.rightMember}' is a self-insert representation of the user (나페스).`
    : `The main relationship is between ${story.leftMember} and ${story.rightMember}.`;

  const systemInstruction = `
    ${baseGuidelines}
    
    [CHARACTER DEEP DATA]
    ${story.leftMember}: ${story.leftMemberContext || 'N/A'}
    ${story.rightMember}: ${story.rightMemberContext || 'N/A'}
    
    [ADDITIONAL KNOWLEDGE (RAG)]
    ${ragContext}
    
    [CURRENT CONTEXT]
    - Characters: ${story.leftMember} & ${story.rightMember}
    - Setting: ${story.groupName}
    - Theme/Genre: ${story.theme}
    - Language: ${story.language === 'en' ? 'English' : 'Korean'}
    - Progress: ${currentEpisodeNum} / ${story.totalEpisodes}
  `;

  // 이전 에피소드 요약 (토큰 절약을 위해 2000자로 제한하는 로직 유지)
  const previousContext = story.episodes
    .map((ep) => {
      const content = ep.content.length > 2000 
        ? `...${ep.content.substring(ep.content.length - 2000)}` 
        : ep.content;
      return `[Chapter ${ep.episodeNumber}]\n${content}`;
    })
    .join("\n\n");

  const prompt = isFirstEpisode
    ? `Create the prologue/first episode based on: "${userInput}".`
    : `Continue the narrative based on the user's choice: "${userInput}".\n\n[Previous History]\n${previousContext}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
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
    if (!text) throw new Error("Empty response");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate content.");
  }
};