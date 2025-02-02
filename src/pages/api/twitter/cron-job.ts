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
  // const password = process.env.TWITTER_PASSWORD!
  // const email = process.env.TWITTER_EMAIL!
  // const twoFactorSecret = process.env.TWITTER_2FA_SECRET!
  // const accessToken = process.env.TWITTER_ACCESS_TOKEN!
  // const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET!
  // const appKey = process.env.TWITTER_API_KEY!
  // const appSecret = process.env.TWITTER_API_SECRET_KEY!

  const scraper = new Scraper()
  const cookies = JSON.parse(process.env.TWITTER_COOKIES!)

  const cookieStrings = cookies.map(
    (cookie: any) =>
      `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
        cookie.path
      }; ${cookie.secure ? 'Secure' : ''}; ${
        cookie.httpOnly ? 'HttpOnly' : ''
      }; SameSite=${cookie.sameSite || 'Lax'}`,
  )
  console.log('cookieStrings : ', cookieStrings)
  await scraper.setCookies(cookieStrings)

  // await scraper.login(username, password, email, twoFactorSecret, appKey, appSecret, accessToken, accessSecret)
  // await scraper.login(username, password, email)

  const isLoggedIn = await scraper.isLoggedIn()
  console.log('isLoggedIn : ', isLoggedIn)
  const results = await scraper.fetchSearchTweets(
    username,
    30,
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
  const MAX_LENGTH = 250
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
      await new Promise((resolve) => setTimeout(resolve, 300))

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
