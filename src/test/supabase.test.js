import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase mocken – kein echter Datenbankaufruf
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [{ id: '1', title: 'Rotes Kleid', category: 'Kleid' }],
        error: null,
      })),
    })),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}))

import { supabase } from '../supabase'

describe('Supabase API - Items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt Items aus der Datenbank zurueck', async () => {
    const { data, error } = await supabase.from('items').select()
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].title).toBe('Rotes Kleid')
  })
})

describe('Supabase API - Auth', () => {
  it('ruft signInWithPassword mit Email und Passwort auf', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'abc', email: 'test@test.com' } },
      error: null,
    })

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@test.com',
      password: '123456',
    })

    expect(error).toBeNull()
    expect(data.user.email).toBe('test@test.com')
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledOnce()
  })

  it('gibt error zurueck bei falschem Login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    const { error } = await supabase.auth.signInWithPassword({
      email: 'falsch@test.com',
      password: 'falsch',
    })

    expect(error).not.toBeNull()
    expect(error.message).toBe('Invalid login credentials')
  })
})