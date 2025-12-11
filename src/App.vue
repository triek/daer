<script setup>
import { onMounted, ref } from 'vue'

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const apiUrl = `${apiBaseUrl}/items`
const books = ref([])
const formName = ref('')
const editingId = ref(null)
const statusMessage = ref('Use this shelf to exercise the API while dreaming about books to read next.')
const loading = ref(false)

const resetForm = () => {
  formName.value = ''
  editingId.value = null
}

const setMessage = (text) => {
  statusMessage.value = text
}

const fetchBooks = async () => {
  loading.value = true
  setMessage('Fetching your reading list...')
  try {
    const response = await fetch(apiUrl)
    if (!response.ok) throw new Error('Unable to load books')
    const data = await response.json()
    books.value = data
    setMessage('Reading list refreshed. Ready for more stories!')
  } catch (error) {
    setMessage(error.message)
  } finally {
    loading.value = false
  }
}

const saveBook = async () => {
  if (!formName.value.trim()) {
    setMessage('Give the book a title before saving.')
    return
  }

  const payload = { name: formName.value.trim() }
  const isEditing = Boolean(editingId.value)
  const url = isEditing ? `${apiUrl}/${editingId.value}` : apiUrl
  const method = isEditing ? 'PATCH' : 'POST'

  setMessage(isEditing ? 'Updating that book note...' : 'Adding a new book to the shelf...')

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error('Request failed. Check the API and try again.')

    const data = isEditing ? await response.json() : await response.json()

    if (!isEditing) {
      books.value.push(data)
      setMessage(`"${data.name}" added. Keep the reading streak alive!`)
    } else {
      const index = books.value.findIndex((book) => book.id === editingId.value)
      if (index !== -1) books.value[index] = data
      setMessage('Book note updated. Turn the next page!')
    }
    resetForm()
  } catch (error) {
    setMessage(error.message)
  }
}

const startEdit = (book) => {
  editingId.value = book.id
  formName.value = book.name
  setMessage(`Editing "${book.name}". Make your changes and save.`)
}

const removeBook = async (id) => {
  setMessage('Sending this book back to the library...')
  try {
    const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' })
    if (!response.ok && response.status !== 204) {
      throw new Error('Could not remove the book. Is the API running?')
    }
    books.value = books.value.filter((book) => book.id !== id)
    setMessage('Book removed. Shelf is a little lighter now.')
    if (editingId.value === id) resetForm()
  } catch (error) {
    setMessage(error.message)
  }
}

onMounted(fetchBooks)

console.log("API URL TEST:", import.meta.env.VITE_API_URL)

</script>

<template>
  <main class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">Reading room · API practice</p>
        <h1>Book Track CRUD Test</h1>

      </div>
      <div class="bookmark">REST CRUD</div>
    </header>

    <section class="message" aria-live="polite">{{ statusMessage }}</section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>{{ editingId ? 'Update a book note' : 'Add a book to the shelf' }}</h2>
        </div>
        <button class="ghost" type="button" :disabled="loading" @click="fetchBooks">
          {{ loading ? 'Refreshing...' : 'Refresh list' }}
        </button>
      </div>

      <form class="form" @submit.prevent="saveBook">
        <label class="field">
          <p>Book title or note</p>
          <p>
            <input
              v-model="formName"
              type="text"
              name="title"
              placeholder="E.g. The Night Library — start chapter 3"
              :disabled="loading"
              required
            />
          </p>
        </label>
        <div class="actions">
          <button class="primary" type="submit" :disabled="loading">
            {{ editingId ? 'Save changes' : 'Add book' }}
          </button>
          <button class="ghost" type="button" :disabled="!editingId || loading" @click="resetForm">
            Cancel edit
          </button>
        </div>
      </form>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Reading list</h2>
          <p class="muted">Tap edit or delete to exercise PATCH and DELETE requests.</p>
        </div>
        <span class="pill">{{ books.length }} item{{ books.length === 1 ? '' : 's' }}</span>
      </div>

      <ul class="book-list" v-if="books.length">
        <li v-for="book in books" :key="book.id" class="book-card">
          <div>
            <p class="book-title">{{ book.name }}</p>
            <p class="book-meta">ID: {{ book.id }}</p>
          </div>
          <div class="card-actions">
            <button class="ghost" type="button" :disabled="loading" @click="startEdit(book)">Edit</button>
            <button class="danger" type="button" :disabled="loading" @click="removeBook(book.id)">
              Delete
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="empty">No books yet. Add one to start testing the API.</p>
    </section>
  </main>
</template>
