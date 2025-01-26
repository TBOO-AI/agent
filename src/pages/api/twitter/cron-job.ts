import type { NextApiRequest, NextApiResponse } from 'next'

import { Scraper, SearchMode } from 'agent-twitter-client'

import { message } from '@/agnets/message'
import {
  createMessages,
  getUserInfo,
  isMessageReplied,
} from '@/agnets/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const username = process.env.TWITTER_USERNAME!
  const scraper = new Scraper()
  await scraper.login(username, process.env.TWITTER_PASSWORD!)

  const isLoggedIn = await scraper.isLoggedIn()

  const results = await scraper.fetchSearchTweets(
    username,
    20,
    SearchMode.Latest,
  )

  const tweets = results.tweets.filter(
    (tweet) => tweet.username !== 'tboo_diin',
  )
  // 스케줄링 작업 로직
  console.log('Cron job 실행됨!')
  for (const tweet of tweets.slice(0, 1)) {
    // User 정보 여부 확인하기
    const userMessage = tweet.text?.replace('@tboo_diin', '')
    const _isMessageReplied = await isMessageReplied(tweet)
    console.log('isMessageReplied : ', _isMessageReplied)
    if (!_isMessageReplied) {
      const userInfo = await getUserInfo(tweet)
      console.log(userInfo)
      if (userInfo.is_saju_active) {
        // 사주 정보를 수집 완료한 상태
        console.log('사주 정보를 수집 완료한 상태')
        const assistantMessage = await message.fortuneTelling(
          userInfo.saju,
          userMessage!,
        )
        console.log('assistantMessage : ', assistantMessage)
        const sendTweetResults = await sendSplitTweets(
          scraper,
          tweet.username!,
          assistantMessage,
          tweet.id!,
        )
        console.log('sendTweetResults : ', sendTweetResults)
        if (sendTweetResults.status === 200) {
          await createMessages([
            {
              role: 'user',
              content: userMessage!,
              threads_id: userInfo.threads.id,
              tweet_id: tweet.id!,
            },
            {
              role: 'assistant',
              content: assistantMessage,
              threads_id: userInfo.threads.id,
              tweet_id: null,
            },
          ])
        }
      } else {
        // 사주 정보를 수집하지 않은 상태
        console.log('사주 정보를 수집하지 않은 상태')
        const assistantMessage = await message.userInfo(
          userInfo.id,
          userInfo.saju,
          String(userMessage),
        )
        const sendTweetResults = await sendSplitTweets(
          scraper,
          tweet.username!,
          assistantMessage,
          tweet.id!,
        )
        if (sendTweetResults.status === 200) {
          await createMessages([
            {
              role: 'user',
              content: userMessage!,
              threads_id: userInfo.threads.id,
              tweet_id: tweet.id!,
            },
            {
              role: 'assistant',
              content: assistantMessage,
              threads_id: userInfo.threads.id,
              tweet_id: null,
            },
          ])
        }
      }
    } else {
      console.log('이미 답변이 완료된 상태')
    }
  }

  // 예: 데이터베이스 업데이트, API 호출 등
  const result = {
    message: '스케줄링 작업 완료',
    tweets: tweets,
    isLoggedIn: isLoggedIn,
  }

  res.status(200).json(result)
}

async function sendSplitTweets(
  scraper: Scraper,
  username: string,
  assistantMessage: string,
  replyToTweetId: string,
): Promise<{ status: number }> {
  const MAX_LENGTH = 150
  const messages = []

  // 문장 단위로 나누기 (마침표, 느낌표, 물음표 기준)
  const cleanedMessage = assistantMessage
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const sentences = cleanedMessage.match(/[^.!?]+[.!?]+/g) || [cleanedMessage]

  let currentTweet = ''
  let previousTweetId = replyToTweetId

  for (const sentence of sentences) {
    // 다음 문장을 추가했을 때 길이가 280자를 초과하는지 확인
    const nextTweet =
      currentTweet ?
        `@${username} ${currentTweet}${sentence}`
      : `@${username} ${sentence}`

    if (nextTweet.length > MAX_LENGTH) {
      // 현재까지의 내용을 메시지 배열에 추가
      if (currentTweet) {
        messages.push(`@${username} ${currentTweet.trim()}`)
      }
      currentTweet = sentence
    } else {
      currentTweet = currentTweet ? `${currentTweet}${sentence}` : sentence
    }
  }

  // 마지막 남은 내용 처리
  if (currentTweet) {
    messages.push(`@${username} ${currentTweet.trim()}`)
  }

  // 나눈 메시지들을 순차적으로 전송
  const length = messages.length
  for (let i = 0; i < length; i++) {
    try {
      // Promise를 반환하는 새로운 함수를 만들어 실제 딜레이 구현
      const result = await scraper.sendTweet(messages[i], previousTweetId)
      const body = await result.json()

      const tweetResult = body.data.create_tweet.tweet_results.result
      previousTweetId = tweetResult.rest_id
      await new Promise((resolve) => setTimeout(resolve, 5000))

      if (result.status !== 200) {
        return { status: result.status }
      }
    } catch (error) {
      console.error('트윗 전송 중 에러 발생:', error)
      return { status: 500 }
    }
  }

  return { status: 200 }
}
