import { MessageType } from '@/agnets/types'
import { supabase } from '@/configs/supabase'

const createMessages = async (messages: MessageType[]) => {
  console.log('call createMessages')
  console.log('messages : ', messages)
  const { data: messagesData } = await supabase
    .from('messages')
    .insert(messages)
    .select()

  return !!messagesData
}

export { createMessages }
