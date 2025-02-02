import {
  JsonOutputParser,
  StringOutputParser,
} from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'

import { model } from '@/agnets/helper'
import { SajuType } from '@/agnets/types'
import { getMissingFields, getSajuCalendar } from '@/agnets/utils'
import { supabase } from '@/configs/supabase'

const COLLECT_INFO_PROMPT = `
You are Diin! Your role is to analyze people's Four Pillars of Destiny (Asian Fortune) and provide consultation based on their concerns.
Please naturally ask the user for the required information (date of birth, birth time, birth place, gender).
Previously received information: {existingInfo}
Still needed information: {missingFields}

Please ask for the missing information while maintain a casual and natural conversation while gathering the missing details.`

const PARSE_RESPONSE_PROMPT = `Please extract the following information from the user's response:
Response: {userResponse}
Information to find: {missingFields}

The following various formats are also accepted:
- Birth date: "1990-01-01", "January 1, 1890", "20010101" etc.
- Time: "09:30", "9:30 AM", "9:30 in the morning" etc.
- Location: "Seoul", "Gangnam-gu, Seoul", "Gangnam" etc.
- Gender: please output only as "male" or "female"

Please output in JSON format. Example:
{{
  "birth_date": "1990-01-01",
  "birth_time": "09:30",
  "birth_place": "Seoul",
  "gender": "male"
}}

- The date of birth must be extracted in the same format as YYYY-MM-DD.
- Only output 00:00 for birth time if the user explicitly states they don't know the exact time.
- Don't collect data that the user hasn't provided in their response.
- Make sure to exclude any information that couldn't be found.`
const DEFAULT_RESPONSE = 'What concerns would you like to discuss?'
const ERROR_MESSAGE =
  'An error occurred while collecting information. Please try again.'

const updateSajuInDatabase = async (userId: string, saju: SajuType) => {
  const { data, error } = await supabase
    .from('saju')
    .upsert({ ...saju, user_id: userId })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating saju:', error)
    throw error
  }

  return data
}

const updateSajuWithCalendar = async (userId: string, saju: SajuType) => {
  const sajuCalendar = await getSajuCalendar(saju)

  const { error } = await supabase
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

  if (error) {
    console.error('Error updating saju with calendar:', error)
    throw error
  }
}

const parseUserResponse = async (
  userMessage: string,
  missingFields: string[],
) => {
  const parsePrompt = ChatPromptTemplate.fromTemplate(PARSE_RESPONSE_PROMPT)
  return parsePrompt
    .pipe(model)
    .pipe(new JsonOutputParser())
    .invoke({
      userResponse: userMessage,
      missingFields: missingFields.join(', '),
    })
}

const getQuestionContext = async (
  existingInfo: string,
  missingFields: string[],
) => {
  const collectPrompt = ChatPromptTemplate.fromTemplate(COLLECT_INFO_PROMPT)
  return collectPrompt
    .pipe(model)
    .pipe(new StringOutputParser())
    .invoke({
      existingInfo,
      missingFields: missingFields.join(', '),
    })
}

export const collectUserInfo = async (
  userId: string,
  saju: SajuType | undefined,
  userMessage: string,
): Promise<string> => {
  const currentSaju = saju || {}
  let missingFields = getMissingFields(saju)

  if (missingFields.length === 0) {
    return DEFAULT_RESPONSE
  }

  try {
    const parsedResponse = await parseUserResponse(userMessage, missingFields)

    Object.keys(parsedResponse).forEach((key) => {
      if (parsedResponse[key]) {
        currentSaju[key as keyof SajuType] = parsedResponse[key]
      }
    })

    console.log('After Update Saju Status:', currentSaju)
    await updateSajuInDatabase(userId, currentSaju)

    missingFields = getMissingFields(currentSaju)

    if (missingFields.length === 0) {
      await updateSajuWithCalendar(userId, currentSaju)
      return DEFAULT_RESPONSE
    }

    return await getQuestionContext(JSON.stringify(currentSaju), missingFields)
  } catch (error) {
    console.error('Error in collectUserInfo:', error)
    return ERROR_MESSAGE
  }
}
