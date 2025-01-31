import { Tweet } from 'agent-twitter-client'

import { supabase } from '@/configs/supabase'

const isSajuComplete = (saju: any) => {
  try {
    return saju.birth_date && saju.birth_time && saju.birth_place && saju.gender
  } catch (error) {
    return false
  }
}

const getUserInfo = async (tweet: Tweet) => {
  const userId = String(tweet.userId)
  let user = null

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (existingUser) {
    const [{ data: sajuData }, { data: threadsData }] = await Promise.all([
      supabase.from('saju').select('*').eq('user_id', userId).single(),
      supabase.from('threads').select('*').eq('user_id', userId).single(),
    ])

    user = {
      ...existingUser,
      is_saju_active: isSajuComplete(sajuData),
      saju: sajuData,
      threads: threadsData,
    }
  } else {
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          name: tweet.name,
          username: tweet.username,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('사용자 생성 중 오류:', insertError)
      throw insertError
    }

    const { data: newThreads, error: threadError } = await supabase
      .from('threads')
      .insert([
        {
          user_id: userId,
        },
      ])
      .select()
      .single()

    if (threadError) {
      console.error('threadError : ', threadError)
      throw threadError
    }

    user = {
      ...newUser,
      is_saju_active: false,
      saju: null,
      threads: newThreads,
    }
  }
  return user
}

export { getUserInfo }
