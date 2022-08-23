import 'dotenv/config'

export const PILOT_URI = process.env.PILOT_URI || 'http://localhost:3001'

export const CREDENTIALS = {
  DISNEYPLUS: {
    EMAIL: process.env.DISNEYPLUS_EMAIL!,
    PASSWORD: process.env.DISNEYPLUS_PASSWORD!,
  },
  NETFLIX: {
    EMAIL: process.env.NETFLIX_EMAIL!,
    PASSWORD: process.env.NETFLIX_PASSWORD!,
  },
}
