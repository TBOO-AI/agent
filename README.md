# TBOO AI Agent 🤖

TBOO AI Agent is an AI-based service that provides personalized fortune-telling consultations to users through Twitter.

## 🌟 Key Features

- Automatic collection of Twitter users' fortune data
- LangChain-based AI consultation agent
- Fortune analysis through fortune-telling algorithm
- Continuous conversation history management and AI improvement

## 🛠 Tech Stack

- **Framework**: Next.js
- **AI/ML**: LangChain
- **Database**: Supabase
- **Deployment**: Vercel
- **Other Libraries**:
  - saju-algorithm
  - agent-twitter-client (by Eliza)

## 🏗 System Architecture

### 1. Data Collection Pipeline

```typescript
// Twitter data collection
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

    await updateSajuInDatabase(userId, currentSaju)

    missingFields = getMissingFields(currentSaju)

    if (missingFields.length === 0) {
      await updateSajuWithCalendar(userId, currentSaju)
      return DEFAULT_RESPONSE
    }

    return await getQuestionContext(JSON.stringify(currentSaju), missingFields)
  } catch (error) {
    return ERROR_MESSAGE
  }
}
```

### 2. AI Agent Logic Configuration

```typescript
import { message } from '@/agnets/message'
import {
  createMessages,
  getUserInfo,
  isMessageReplied,
} from '@/agnets/supabase'

const agentMessage = async (tweet: Tweet) => {
  const userMessage = tweet.text?.replace('@tboo_diin', '')
  const messageReplied = await isMessageReplied(tweet)
  let assistantMessage,
    userInfo,
    status = 400
  if (!messageReplied) {
    userInfo = await getUserInfo(tweet)
    if (userInfo.is_saju_active) {
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
```

## 🔄 How It Works

1. **Data Collection** (2-minute intervals)

   - Vercel Cron Job calls API endpoint
   - User information collection through Twitter API
   - Data storage in Supabase

2. **Fortune Analysis**

   - Extract fortune data from collected information
   - Apply fortune-telling algorithm
   - Store analysis results

3. **AI Consultation**
   - Utilize LangChain-based AI model
   - Reference previous conversation context
   - Generate personalized responses

## 🔧 Setup and Execution

1. Environment Variable Setup

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

CRON_SECRET=
X_API_KEY=

TWITTER_USERNAME=
TWITTER_PASSWORD=

OPENAI_API_KEY=
```

2. Development Server Execution

```bash
yarn install
yarn dev
```

## 🔄 Vercel Cron Job Setup

```typescript
// pages/api/cron.ts
import type { NextApiRequest, NextApiResponse } from 'next'

import { Scraper, SearchMode } from 'agent-twitter-client'

import { agentMessage, createMessages } from '@/agnets'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const results = await scraper.fetchSearchTweets(
    username,
    20,
    SearchMode.Latest,
  )

  const tweets = results.tweets.filter(
    (tweet) => tweet.username !== 'tboo_diin',
  )

  for (const tweet of tweets.slice(0, 1)) {
    // 로직 실행
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
}
```

## 🚀 Future Plans

1. AI Model Enhancement

   - Pattern learning through conversation analysis
   - Improvement of personalized consultation quality

2. Data Analysis Enhancement

   - User feedback collection and analysis
   - Development of consultation quality metrics

3. Service Expansion
   - Support for various social media platforms
   - API service consideration
