import { Tweet } from 'agent-twitter-client'

import { message } from '@/agents/message'
import {
  createMessages,
  getUserInfo,
  isMessageReplied,
} from '@/agents/supabase'

const agentMessage = async (tweet: Tweet) => {
  const userMessage = tweet.text?.replace('@tboo_diin', '')
  const messageReplied = await isMessageReplied(tweet)
  let assistantMessage,
    userInfo,
    status = 400
  console.log('isMessageReplied : ', messageReplied)
  if (!messageReplied) {
    userInfo = await getUserInfo(tweet)
    console.log(userInfo)
    if (userInfo.is_saju_active) {
      console.log('Saju Info is Active')
      assistantMessage = await message.fortuneTelling(
        userInfo.saju,
        userMessage!,
      )
    } else {
      assistantMessage = await message.userInfo(
        userInfo.id,
        userInfo.saju,
        String(userMessage),
      )
    }
    status = 200
  }
  return {
    userInfo,
    userMessage,
    assistantMessage,
    status,
  }
}

export { agentMessage, createMessages }
