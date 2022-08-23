import { CREDENTIALS } from 'services/config'
import { DisneyPlus } from 'services/providers/disneyplus'
// import { Netflix } from 'services/providers/netflix'

const disneyPlus = new DisneyPlus({ email: CREDENTIALS.DISNEYPLUS.EMAIL, password: CREDENTIALS.DISNEYPLUS.PASSWORD })
// const netflix = new Netflix({ email: CREDENTIALS.NETFLIX.EMAIL, password: CREDENTIALS.NETFLIX.PASSWORD })

;(async () => {
  await disneyPlus.login()
  await disneyPlus.unsubscribe()
  // await netflix.login()
  // await netflix.unsubscribe()
})()
