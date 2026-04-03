import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const IMAGES_DIR = 'C:/Users/Admin/Downloads'
const BUCKET = 'product-images'

const mappings = [
  { file: 'mk_gold_diamond_leopard.png', productName: 'MK Gold with Diamond Leopard Strap' },
  { file: 'mk_gold_1.png', productName: 'MK Gold 1' },
  { file: 'mk_silver_1.png', productName: 'MK Silver 1' },
  { file: 'mk_pure_black_leather.png', productName: 'MK Pure Black Leather Strap' },
  { file: 'mk_all_black_men.png', productName: 'MK All Black for Men' },
]

for (const { file, productName } of mappings) {
  const filePath = resolve(IMAGES_DIR, file)
  const fileBuffer = readFileSync(filePath)

  console.log(`Uploading ${file}...`)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(file, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) {
    console.error(`  Upload failed: ${uploadError.message}`)
    continue
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(file)
  const publicUrl = urlData.publicUrl

  const { error: updateError } = await supabase
    .from('products')
    .update({ img: publicUrl })
    .eq('name', productName)

  if (updateError) {
    console.error(`  DB update failed for "${productName}": ${updateError.message}`)
  } else {
    console.log(`  ✓ ${productName} → ${publicUrl}`)
  }
}

console.log('\nDone!')
