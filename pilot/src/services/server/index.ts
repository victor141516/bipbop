import express, { Request } from 'express'
import { Browser } from 'services/browser'
import { PORT } from 'services/config'

const browser = new Browser()
const app = express()

const apiRouter = express.Router()
const apiV1Router = express.Router()
apiV1Router.use(express.json())

apiV1Router.post('/:method', async (req: Request<{ method: keyof Browser }>, res) => {
  const method = req.params.method
  const params = (Object.keys({}).length === 0 ? [] : req.body) as Parameters<Browser[typeof method]>
  console.log('New operation:', { method, params })
  try {
    const methodToCall = browser[method]
    if (!methodToCall) return res.status(404).send({ ok: false, error: 'METHOD_NOT_FOUND' })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = await methodToCall(...params)
    return res.json({ ok: true, result }).send()
  } catch (error) {
    console.error('Error on operation:', { method, params }, error)
    return res.status(500).json({ ok: false, error }).send()
  }
})

apiRouter.use('/v1', apiV1Router)
app.use('/api', apiRouter)

export const start = async () => {
  return app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })
}
