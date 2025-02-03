import {
  JsonOutputParser,
  StringOutputParser,
} from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'

import { model } from '@/agents/helper'
import { SajuType } from '@/agents/types'

const COLLECT_INFO_PROMPT = `You are Diin, an assistant that helps people based on Saju (Four Pillars of Destiny).

Ask them what kind of help they need.

Required information: concern

Continue the conversation naturally while gathering the necessary details.
Please write a text within 200 characters.`
const PARSE_RESPONSE_PROMPT = `Extract information from the user's response:
Response: {userResponse}
Information to find: concern

Output in JSON format:
Example:
{{
  "concern": "I want to know my fortune"
}}

Do not collect data that the user has not provided.
Exclude any information that cannot be found.`

const FORTUNE_PROMPT = `You are Diin, a professional fortune teller. Please analyze the following saju (Four Pillars) information and provide advice for the concern:

- Birth Information
Date of Birth: {birthDate}
Birth Time: {birthTime}
Gender: {gender}
- Four Pillars
Year Pillar: {sajuYear}
Month Pillar: {sajuMonth}
Day Pillar: {sajuDay}
Hour Pillar: {sajuHour}
- Five Elements: {sajuOheng}
- Ten Gods
Year: {saju10sinYear}
Month: {saju10sinMonth}
Day: {saju10sinDay}
Hour: {saju10sinHour}
- Major Fortune Cycle: Changes in {sajuDaewon}-year cycles
- Concern: {concern}

Please include the following in your response without numbering, in natural sentences:
- Basic personality analysis based on the Four Pillars
- Interpretation of the concern based on other information and personality traits
- Advice and solutions
- When using terms related to fortune-telling, Chinese characters must be used
Please keep the response short, concise, and in plain text format.
Write in simple sentences without HTML or styling.`

interface ParsedResponse {
  concern?: string
}

const parseUserResponse = async (
  userMessage: string,
): Promise<ParsedResponse> => {
  const parsePrompt = ChatPromptTemplate.fromTemplate(PARSE_RESPONSE_PROMPT)
  return parsePrompt
    .pipe(model)
    .pipe(new JsonOutputParser<ParsedResponse>())
    .invoke({
      userResponse: userMessage,
    })
}

const getQuestionContext = async () => {
  const collectPrompt = ChatPromptTemplate.fromTemplate(COLLECT_INFO_PROMPT)
  return collectPrompt.pipe(model).pipe(new StringOutputParser()).invoke({})
}

export const fortuneTelling = async (
  saju: SajuType,
  userMessage: string,
): Promise<string> => {
  const parsedResponse = await parseUserResponse(userMessage)
  let result = ''
  console.log(parsedResponse)
  if (parsedResponse?.concern) {
    // 사주 분석 체인 생성
    const prompt = ChatPromptTemplate.fromTemplate(FORTUNE_PROMPT)
    const chain = prompt.pipe(model).pipe(new StringOutputParser())
    // 결과 출력 및 저장
    result = await chain.invoke({
      birthDate: saju.birth_date,
      birthTime: saju.birth_time,
      gender: saju.gender,
      sajuYear: `${saju.year_stem} ${saju.year_branch}`,
      sajuMonth: `${saju.month_stem} ${saju.month_branch}`,
      sajuDay: `${saju.day_stem} ${saju.day_branch}`,
      sajuHour: `${saju.time_stem} ${saju.time_branch}`,
      sajuOheng: `fire : ${saju.element_fire}, earth : ${saju.element_earth}, metal : ${saju.element_metal}, water : ${saju.element_water}, wood : ${saju.element_wood}`,
      saju10sinYear: `${saju.ten_sin_year}`,
      saju10sinMonth: `${saju.ten_sin_month}`,
      saju10sinDay: `${saju.ten_sin_day}`,
      saju10sinHour: `${saju.ten_sin_time}`,
      sajuDaewon: saju.dae_won,
      concern: userMessage,
    })
  } else {
    result = await getQuestionContext()
  }

  return result
}
