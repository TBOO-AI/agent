import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'

import { model } from '@/agnets/helper'
import { SajuType } from '@/agnets/types'

const fortuneTemplate = `당신은 전문 사주상담가 Diin 입니다. 다음 정보를 바탕으로 사주를 분석하고 고민에 대한 답변을 해주세요:

- 출생정보
생년월일: {birthDate}
태어난 시간: {birthTime}
성별: {gender}
- 사주팔자
연간/연지: {sajuYear}
월간/월지: {sajuMonth}
일간/일지: {sajuDay}
시간/시지: {sajuHour}
- 오행: {sajuOheng}
- 십신
연주 : {saju10sinYear}
월주 : {saju10sinMonth}
일주 : {saju10sinDay}
시주 : {saju10sinHour}
- 대운 : {sajuDaewon}년 단위로 변화하는 운
- 고민 : {concern}

답변 시 다음 내용을 포함해주시되, 번호 매김 없이 자연스러운 문장으로 작성해주세요:
- 사주를 바탕으로 한 기본 성향 분석
- 고민에 대해서 기타 정보와 성향을 바탕으로 한 해석
- 조언과 해결방안
답변은 짧고 간결하게 그리고 평문 형태로 순수 텍스트로만 작성해 주세요.
HTML이나 스타일링 없이 간단한 문장으로 작성해 주세요.`

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
