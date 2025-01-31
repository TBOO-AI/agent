import type { NextApiRequest, NextApiResponse } from 'next'

import { Scraper, SearchMode } from 'agent-twitter-client'

import { agentMessage, createMessages } from '@/agnets'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const authHeader = req.headers['authorization']

  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(403).json({ error: 'Forbidden: Unauthorized' })
  }
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
  console.log('Start Cron Job')
  for (const tweet of tweets.slice(0, 1)) {
    const { userInfo, userMessage, assistantMessage, status } =
      await agentMessage(tweet)
    if (status === 200) {
      const sendTweetResults = await sendSplitTweets(
        scraper,
        tweet.username!,
        assistantMessage!,
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
            content: assistantMessage!,
            threads_id: userInfo.threads.id,
            tweet_id: null,
          },
        ])
      }
    }
  }

  const result = {
    message: 'Cron Job is Done',
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

  // Split into sentence units (based on periods, exclamation marks, question marks)
  const cleanedMessage = assistantMessage
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const sentences = cleanedMessage.match(/[^.!?]+[.!?]+/g) || [cleanedMessage]

  let currentTweet = ''
  let previousTweetId = replyToTweetId

  for (const sentence of sentences) {
    // Check if adding the next sentence exceeds 280 characters
    const nextTweet =
      currentTweet ?
        `@${username} ${currentTweet}${sentence}`
      : `@${username} ${sentence}`

    if (nextTweet.length > MAX_LENGTH) {
      if (currentTweet) {
        messages.push(`@${username} ${currentTweet.trim()}`)
      }
      currentTweet = sentence
    } else {
      currentTweet = currentTweet ? `${currentTweet}${sentence}` : sentence
    }
  }

  if (currentTweet) {
    messages.push(`@${username} ${currentTweet.trim()}`)
  }

  const length = messages.length
  for (let i = 0; i < length; i++) {
    try {
      const result = await scraper.sendTweet(messages[i], previousTweetId)
      const body = await result.json()

      const tweetResult = body.data.create_tweet.tweet_results.result
      previousTweetId = tweetResult.rest_id
      await new Promise((resolve) => setTimeout(resolve, 5000))

      if (result.status !== 200) {
        return { status: result.status }
      }
    } catch (error) {
      console.error('Error sending tweet: ', error)
      return { status: 500 }
    }
  }

  return { status: 200 }
}
