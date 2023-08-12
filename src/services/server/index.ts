import express, { Request } from 'express'
import { Browser } from 'services/browser'
import { PORT } from 'services/config'
import { ZodError } from 'zod'

const browser = new Browser()
const app = express()

const apiRouter = express.Router()
const apiV1Router = express.Router()
apiV1Router.use(express.json())

apiV1Router.post('/:method', async (req: Request<{ method: keyof Browser }>, res) => {
  const method = req.params.method
  const params = req.body as Parameters<Browser[typeof method]>[0]
  console.log('New operation:', { method, params })
  try {
    const methodToCall = browser[method]?.bind(browser)
    if (!methodToCall) return res.status(404).send({ ok: false, error: 'METHOD_NOT_FOUND' })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = (await methodToCall(params)) ?? null
    return res.json({ ok: true, result }).send()
  } catch (error) {
    console.error('Error on operation:', { method, params }, error)
    return res
      .status(500)
      .json({
        ok: false,
        error: {
          type: (error as Error)?.constructor?.name,
          msg: error instanceof ZodError ? error : (error as Error).message,
        },
      })
      .send()
  }
})

apiRouter.use('/v1', apiV1Router)
app.use('/api', apiRouter)

export const start = async () => {
  return app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })
}
