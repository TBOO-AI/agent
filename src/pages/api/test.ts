//@delete:file
import type { NextApiRequest, NextApiResponse } from 'next'

import { fortuneTelling } from '@/agents/message/fortuneTelling'

export default async function test(req: NextApiRequest, res: NextApiResponse) {
  const data = req.body
  console.log(data)
  const message = data.message
  // const result = await fortuneTelling(, message)
  res.status(200).json({ result: 'test' })
}
