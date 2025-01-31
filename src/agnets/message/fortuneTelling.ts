import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'

import { model } from '@/agnets/helper'
import { SajuType } from '@/agnets/types'

const fortuneTemplate = `You are Diin, a professional fortune teller. Please analyze the following saju (Four Pillars) information and provide advice for the concern:

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
Please keep the response short, concise, and in plain text format.
Write in simple sentences without HTML or styling.`

export const fortuneTelling = async (
  saju: SajuType,
  userMessage: string,
): Promise<string> => {
  // 사주 분석 체인 생성
  const prompt = ChatPromptTemplate.fromTemplate(fortuneTemplate)
  const chain = prompt.pipe(model).pipe(new StringOutputParser())
  // 결과 출력 및 저장
  const result = await chain.invoke({
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

  return result
}
