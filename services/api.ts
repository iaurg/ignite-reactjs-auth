import { AuthTokenError } from './errors/AuthTokenError';
import axios, { AxiosError } from "axios"
import { parseCookies, setCookie } from 'nookies'
import { signOut } from "../contexts/AuthContext"
import { GetServerSidePropsContext } from 'next';

let isRefreshing = false
let failedRequestQueue:any = []

export function setupAPIClient(ctx: GetServerSidePropsContext) {  
  let cookies = parseCookies(ctx)

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  })

  api.interceptors.response.use(response => {
    return response
  }, (error: AxiosError) => {
    if(error.response?.status === 401)
    {
      if(error.response.data?.code === 'token.expired')
      {
        cookies = parseCookies(ctx)

        const { 'nextauth.refreshToken': refreshToken } = cookies
        const originalConfig = error.config

        if(!isRefreshing)
        {
          isRefreshing = true

          api.post('/refresh', {
            refreshToken
          }).then(response => {
            const { token } = response.data
    
            setCookie(ctx, 'nextauth.token', token, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/'
            })
        
            setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/'
            })  
    
            api.defaults.headers['Authorization'] = `Bearer ${token}`

            failedRequestQueue.forEach((request:any) => request.onSucess(token))

            failedRequestQueue = []
          }).catch(err => {
            failedRequestQueue.forEach((request:any) => request.onFailure(err))
            failedRequestQueue = []

            if(process.browser)
            {
              signOut()
            }
            else 
            {
              Promise.reject(new AuthTokenError())
            }
          })        
          .finally(() => {
            isRefreshing = false
          })
        }
        
        return new Promise((resolve, reject) => {
          failedRequestQueue.push({
            onSucess: (token: string) => {
              originalConfig.headers['Authorization'] = `Bearer ${token}`

              resolve(api(originalConfig))
            },
            onFailure: (err: AxiosError) => {
              reject(err)
            }
          })
        })
      }
      else 
      {     
        if(process.browser)
        {
          signOut()
        }
      }
    }

    return Promise.reject(error)
  })
  return api
}