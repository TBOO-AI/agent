import { NextApiRequest, NextApiResponse } from 'next'

import { ChatOpenAI } from '@langchain/openai'

import { supabase } from '@/configs/supabase'

const chat = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY!,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { threadId, userId, message } = req.body

  // 유저 확인
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError) {
    return res.status(400).json({ error: 'User not found' })
  }

  // 쓰레드 확인 또는 생성
  let thread = await supabase
    .from('threads')
    .select('*')
    .eq('id', threadId)
    .single()
  if (!thread.data) {
    const { data: newThread, error: threadError } = await supabase
      .from('threads')
      .insert({ user_id: userId })
      .select()
      .single()
    if (threadError) {
      return res.status(500).json({ error: 'Failed to create thread' })
    }
    thread = newThread
  }

  // LangChain으로 대화 생성
  const response = await chat.call([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: message },
  ])

  // 메시지 저장
  const { error: messageError } = await supabase.from('messages').insert([
    { thread_id: threadId, sender: 'user', content: message },
    { thread_id: threadId, sender: 'assistant', content: response.text },
  ])

  if (messageError) {
    return res.status(500).json({ error: 'Failed to save messages' })
  }

  res.status(200).json({ assistantMessage: response.text })
}
