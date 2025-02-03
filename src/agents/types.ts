export interface SajuType {
  birth_date?: string
  birth_time?: string
  birth_place?: string
  gender?: string
  year_stem?: string
  year_branch?: string
  month_stem?: string
  month_branch?: string
  day_stem?: string
  day_branch?: string
  time_stem?: string
  time_branch?: string
  element_fire?: string
  element_earth?: string
  element_metal?: string
  element_water?: string
  element_wood?: string
  ten_sin_year?: string
  ten_sin_month?: string
  ten_sin_day?: string
  ten_sin_time?: string
  dae_won?: string
}

export interface MessageType {
  role: string
  content: string
  threads_id: string
  tweet_id: string | null
}
