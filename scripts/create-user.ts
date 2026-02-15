import 'dotenv/config'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import bcrypt from 'bcryptjs'

async function createUser() {
  const email = process.argv[2] || 'admin@laundryco.com'
  const password = process.argv[3] || 'password123'
  const role = process.argv[4] || 'admin'
  const name = process.argv[5] || 'Admin User'

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const [user] = await db.insert(users).values({
      email,
      name,
      role,
      hashedPassword,
      phone: '+1234567890',
    }).returning()

    console.log('✅ User created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Email:', user.email)
    console.log('Password:', password)
    console.log('Role:', user.role)
    console.log('Name:', user.name)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\nYou can now login at http://localhost:3000/auth/login')
  } catch (error) {
    console.error('❌ Error creating user:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

createUser()
