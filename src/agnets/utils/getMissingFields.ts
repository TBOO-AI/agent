import { SajuType } from '@/agnets/types'

const getMissingFields = (saju: SajuType | undefined): string[] => {
  const missing: string[] = []
  if (!saju?.birth_date) missing.push('birth_date')
  if (!saju?.birth_time) missing.push('birth_time')
  if (!saju?.birth_place) missing.push('birth_place')
  if (!saju?.gender) missing.push('gender')
  return missing
}

export { getMissingFields }
