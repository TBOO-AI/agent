import { Tweet } from 'agent-twitter-client'

import { supabase } from '@/configs/supabase'

const isMessageReplied = async (tweet: Tweet) => {
  const tweetId = tweet.id
  const { data: existingMessage } = await supabase
    .from('messages')
    .select('*')
    .eq('tweet_id', tweetId)
    .single()

  return !!existingMessage
}

export { isMessageReplied }
