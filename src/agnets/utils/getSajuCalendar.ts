import { SajuType } from '@/agnets/types'

const getSajuCalendar = async (userInfo: SajuType) => {
  const { birth_date, birth_time, gender } = userInfo
  const saju = await fetch(
    `https://api.tboo.ai/saju/calendar?birth_date=${birth_date}&birth_time=${birth_time}&gender=${gender}`,
    {
      headers: {
        'X-API-KEY': process.env.X_API_KEY || '',
      },
    },
  )
  const sajuData = await saju.json()
  return sajuData.data
}

export { getSajuCalendar }
