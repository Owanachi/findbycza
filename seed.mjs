import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const products = [
  {
    name: 'Coach Silver Leather Bag',
    category: 'Bags',
    price: 5599,
    qty: 1,
    low_stock: 1,
    remarks: 'LAST - Super Sale ₱4,999',
  },
  {
    name: 'Coach Brown Leather Bag',
    category: 'Bags',
    price: 5599,
    qty: 1,
    low_stock: 1,
    remarks: 'LAST - Super Sale ₱4,999',
  },
]

const { data, error } = await supabase.from('products').insert(products).select()

if (error) {
  console.error('Insert failed:', error)
  process.exit(1)
} else {
  console.log('Inserted', data.length, 'products:')
  data.forEach((p) => console.log(` - ${p.name} (id: ${p.id})`))
}
