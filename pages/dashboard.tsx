import { useContext, useEffect } from "react"
import { Can } from "../components/Can"
import { AuthContext } from "../contexts/AuthContext"
import { useCan } from "../hooks/useCan"
import { setupAPIClient } from "../services/api"
import { api } from "../services/apiClient"
import { withSSRAuth } from "../utils/withSSRAuth"

export default function Dashboard()
{
  const { user, signOut } = useContext(AuthContext)
  
  const userCanSee = useCan({
    permissions: ['metrics.list']
  })

  useEffect(() => {
    api.get('/me').then(response => console.log(response)).catch(err => console.log(err))
  }, [])

  return(
    <>
    <h1>Dashboard {user?.email}</h1>
    <button onClick={signOut}>Sign Out</button>
    {userCanSee && <h2>Métricas</h2>}
    <Can permissions={['metrics.list']}>
      <div>Visivel</div>
    </Can>
    </>
  )
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
 const apiClient = setupAPIClient(ctx)
 const response = await apiClient.get('/me')
 console.log(response.data) 
 return {
   props: {}
 }
})