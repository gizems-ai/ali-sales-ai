import { getPipelineKolonuSayisi } from '@/lib/airtable'

export async function ColumnCount({ asama }: { asama: string }) {
  const count = await getPipelineKolonuSayisi(asama)
  return <>{count}</>
}
