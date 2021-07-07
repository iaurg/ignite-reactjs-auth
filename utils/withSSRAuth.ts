import { AuthTokenError } from './../services/errors/AuthTokenError';
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import { destroyCookie, parseCookies } from "nookies"
import decode from 'jwt-decode';
import { validateUserPermissions } from './validateUserPermissions';

type WithSRROptions = {
  permissions?: string[]
  roles?: string[]
}

type TokenDecode = {
  permissions: string[]
  roles: string[]
}

export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: WithSRROptions): GetServerSideProps {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {      
    const cookies = parseCookies(ctx)
    const token = cookies['nextauth.token']

    if(!token)
    {
      return {
        redirect:{
          destination: '/',
          permanent: false
        }
      }
    }

    if (options)
    {
      const user = decode<TokenDecode | undefined>(token)

      const { permissions, roles } = options

      const userHasPermission = validateUserPermissions({ user, permissions,roles })

      if(!userHasPermission)
      {
        return {
          redirect:{
            destination: '/dashboard',
            permanent: false
          }
        }
      }
    }

    try {
      return await fn(ctx)
    } catch (error) {
      if(error instanceof AuthTokenError)
      {
        destroyCookie(ctx, 'nextauth.token') 
        destroyCookie(ctx, 'nextauth.refreshToken')
       
        return {
          redirect: {
            destination: '/',
            permanent: false
          }
        }
      }
      else {
        return error
      }
    }
  }
}