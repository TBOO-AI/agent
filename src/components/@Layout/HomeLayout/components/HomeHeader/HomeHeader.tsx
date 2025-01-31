import { Link } from '@chakra-ui/next-js'
import {
  Button,
  Container,
  ContainerProps,
  HStack,
  Spinner,
} from '@chakra-ui/react'

import { LogoIcon } from 'generated/icons/MyIcons'

import ClientOnly from '@/components/ClientOnly'
import { ROUTES } from '@/generated/path/routes'
import { useAuth } from '@/hooks/useAuth'
import { useLocalStorage } from '@/stores/local/state'

const HomeHeader = ({ ...props }: ContainerProps) => {
  const { isLogin } = useAuth()
  const resetToken = useLocalStorage((store) => store.reset)

  return (
    <Container
      display={'flex'}
      w={'100%'}
      alignItems={'center'}
      justifyContent="space-between"
      {...props}
    >
      <Link variant={'unstyled'} href={ROUTES.MAIN}>
        <LogoIcon boxSize={'74px'} color={'content.1'} />
      </Link>
      <HStack spacing="16px">
        <ClientOnly fallback={<Spinner size={'sm'} />}>
          {isLogin ?
            <Button
              variant={'line'}
              size={'sm'}
              onClick={() => resetToken('token')}
            >
              Logout
            </Button>
          : <Link
              color={'content.1'}
              variant={'line'}
              size={'sm'}
              href={ROUTES.LOGIN_MAIN}
            >
              Login
            </Link>
          }
        </ClientOnly>
      </HStack>
    </Container>
  )
}

export default HomeHeader
