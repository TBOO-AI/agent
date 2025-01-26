import {
  JsonOutputParser,
  StringOutputParser,
} from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'

import { model } from '@/agnets/helper'
import { SajuType } from '@/agnets/types'
import { getSajuCalendar } from '@/agnets/utils'
import { supabase } from '@/configs/supabase'

const collectInfoPrompt = `당신은 사주상담을 위한 친절한 접수 도우미입니다. 
사용자에게 필요한 정보(생년월일, 태어난 시간, 태어난 지역, 성별)를 자연스럽게 물어보세요.
이전에 받은 정보: {existingInfo}
아직 필요한 정보: {missingFields}

자연스럽게 대화하면서 빠진 정보들을 물어보세요.`

const parseResponsePrompt = `사용자의 답변에서 다음 정보들을 추출해주세요:
답변: {userResponse}
찾아야 할 정보: {missingFields}

다음과 같은 다양한 형식도 허용합니다:
- 생년월일: "1990-01-01", "90년 1월 1일", "900101" 등
- 시간: "09:30", "오전 9시 30분", "아침 9시반" 등
- 지역: "서울", "서울시 강남구", "강남" 등
- 성별: "male" 또는 "female" 로만 해주세요

JSON 형식으로 출력해주세요. 예시:
{{
  "birth_date": "1990-01-01",
  "birth_time": "09:30",
  "birth_place": "서울",
  "gender": "male"
}}

- 답변에서 태어난 시간에 대해서 정확하게 모른다고 하는 경우에만 00:00으로 출력하세요.
- 유저가 답변하지 않은 데이터에 대해서는 수집하지 마세요.
- 찾지 못한 정보는 꼭 제외하고 출력하세요.`

const getMissingFields = (saju: SajuType | undefined): string[] => {
  const missing: string[] = []
  if (!saju?.birth_date) missing.push('birth_date')
  if (!saju?.birth_time) missing.push('birth_time')
  if (!saju?.birth_place) missing.push('birth_place')
  if (!saju?.gender) missing.push('gender')
  return missing
}

export const collectUserInfo = async (
  userId: string,
  saju: SajuType | undefined,
  userMessage: string,
): Promise<string> => {
  console.log('saju : ', saju)
  const currentSaju = saju ? saju : {}
  const collectPrompt = ChatPromptTemplate.fromTemplate(collectInfoPrompt)
  const parsePrompt = ChatPromptTemplate.fromTemplate(parseResponsePrompt)

  let missingFields = getMissingFields(saju)
  console.log('비어있는 필드 : ', missingFields)
  if (missingFields.length === 0) return '어떤 고민이 있으신가요?'

  try {
    // AI가 응답 파싱
    const parsedResponse = await parsePrompt
      .pipe(model)
      .pipe(new JsonOutputParser())
      .invoke({
        userResponse: userMessage,
        missingFields: missingFields.join(', '),
      })
    // 파싱된 정보를 saju에 업데이트
    try {
      Object.keys(parsedResponse).forEach((key) => {
        if (parsedResponse[key]) {
          currentSaju[key as keyof SajuType] = parsedResponse[key]
        }
      })
      console.log('업데이트 후 saju 상태:', currentSaju) // 디버깅을 위한 로그 추가
      const { data, error } = await supabase
        .from('saju')
        .upsert({ ...currentSaju, user_id: userId })
        .eq('user_id', userId)

      console.log('data : ', data)
      if (error) {
        console.log('saju 업데이트 오류 : ', error)
      }

      missingFields = getMissingFields(currentSaju)

      //   supabase에서 saju 정보 업데이트
      console.log('missingFields : ', missingFields)
      if (missingFields.length === 0) {
        // 정보 수집 완료에 대한 응답
        const sajuCalendar = await getSajuCalendar(currentSaju)
        console.log('sajuCalendar : ', sajuCalendar)
        await supabase
          .from('saju')
          .update({
            year_stem: sajuCalendar.stem_branch.year_stem,
            year_branch: sajuCalendar.stem_branch.year_branch,
            month_stem: sajuCalendar.stem_branch.month_stem,
            month_branch: sajuCalendar.stem_branch.month_branch,
            day_stem: sajuCalendar.stem_branch.day_stem,
            day_branch: sajuCalendar.stem_branch.day_branch,
            time_stem: sajuCalendar.stem_branch.time_stem,
            time_branch: sajuCalendar.stem_branch.time_branch,
            element_fire: sajuCalendar.oheng.fire,
            element_earth: sajuCalendar.oheng.earth,
            element_metal: sajuCalendar.oheng.metal,
            element_water: sajuCalendar.oheng.water,
            element_wood: sajuCalendar.oheng.wood,
            ten_sin_year: `${sajuCalendar['10sin'].year.join(', ')}`,
            ten_sin_month: `${sajuCalendar['10sin'].month.join(', ')}`,
            ten_sin_day: `${sajuCalendar['10sin'].day.join(', ')}`,
            ten_sin_time: `${sajuCalendar['10sin'].time.join(', ')}`,
            dae_won: sajuCalendar.dae_won,
          })
          .eq('user_id', userId)
        return '어떤 고민이 있으신가요?'
      }
    } catch (error) {
      console.log('응답 파싱 중 오류가 발생했습니다. 다시 시도합니다.')
      console.log('error : ', error)
    }

    console.log('missingFields : ', missingFields)
    // AI가 자연스럽게 질문 생성
    const questionContext = await collectPrompt
      .pipe(model)
      .pipe(new StringOutputParser())
      .invoke({
        existingInfo: JSON.stringify(currentSaju),
        missingFields: missingFields.join(', '),
      })
    // 사용자 응답 받기
    console.log('questionContext : ', questionContext)
    return questionContext
  } catch (error) {
    console.log('정보 수집 중 오류가 발생했습니다. 다시 시도합니다.')
    console.log('error : ', error)
    return '정보 수집 중 오류가 발생했습니다. 다시 시도 해주세요.'
  }
}
