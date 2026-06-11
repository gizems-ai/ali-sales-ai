import { cookies } from 'next/headers'

export type Segment = 'kurumsal' | 'bireysel'

const COOKIE_NAME = 'emlak_segment'

export async function getSegment(): Promise<Segment> {
  const jar = await cookies()
  const val = jar.get(COOKIE_NAME)?.value
  return val === 'bireysel' ? 'bireysel' : 'kurumsal'
}
