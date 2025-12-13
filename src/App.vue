<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const apiUrl = `${apiBaseUrl}/books`
const books = ref([])
const colorMap = ref({})
const formTitle = ref('')
const formAuthor = ref('')
const formTotalPages = ref('')
const statusMessage = ref('Use this shelf to try the books API with fresh titles.')
const loading = ref(false)
const bannerVisible = ref(false)
const bannerMessage = ref('')
const bannerCountdown = ref(null)
const bannerPhase = ref('')
const bannerFailureMessage = ref('Failed to fetch')
let bannerDelayTimer = null

let countdownTimer = null
let graceTimer = null
let finalTimer = null
let bannerFetchInFlight = false

const GOLDEN_ANGLE = 137.508
const BASE_SATURATION = 78
const BASE_LIGHTNESS = 56
const GRADIENT_STEP = 22
const defaultGradient = 'linear-gradient(135deg, hsl(215 20% 40%), hsl(215 25% 32%))'

const gradientFromIndex = (index) => {
  const hue = (index * GOLDEN_ANGLE) % 360
  const midHue = (hue + GRADIENT_STEP) % 360
  const endHue = (hue + GRADIENT_STEP * 2) % 360

  return `linear-gradient(135deg, hsl(${hue} ${BASE_SATURATION}% ${BASE_LIGHTNESS + 8}%), hsl(${midHue} ${BASE_SATURATION}% ${BASE_LIGHTNESS}%), hsl(${endHue} ${BASE_SATURATION - 6}% ${BASE_LIGHTNESS - 10}%))`
}

const nextColorIndex = () => Object.keys(colorMap.value).length

const assignColors = (items = []) => {
  let colorIndex = nextColorIndex()
  items.forEach((item) => {
    if (!colorMap.value[item.id]) {
      colorMap.value[item.id] = gradientFromIndex(colorIndex)
      colorIndex += 1
    }
  })
}

const resetForm = () => {
  formTitle.value = ''
  formAuthor.value = ''
  formTotalPages.value = ''
}

const setMessage = (text) => {
  statusMessage.value = text
}

const clearBannerTimers = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (graceTimer) {
    clearInterval(graceTimer)
    graceTimer = null
  }
  if (finalTimer) {
    clearTimeout(finalTimer)
    finalTimer = null
  }
}

const hideBanner = () => {
  bannerVisible.value = false
  bannerCountdown.value = null
  bannerMessage.value = ''
  bannerPhase.value = ''
  clearBannerTimers()
}

const fetchBooks = async ({
  silent = false,
  triggerBannerOnFailure = false,
  allowImmediateFailure = true,
} = {}) => {
  let response
  let bannerKickoffPending = Boolean(triggerBannerOnFailure)

  if (!silent) {
    loading.value = true
    setMessage('Fetching your reading list...')
  }

  if (triggerBannerOnFailure) {
    bannerDelayTimer = setTimeout(() => {
      if (!bannerVisible.value && loading.value) {
        startServerWakeBanner({ failureMessage: 'Unable to load books' })
      }
      bannerKickoffPending = false
      bannerDelayTimer = null
    }, 1200)
  }

  try {
    response = await fetch(apiUrl)
    if (!response.ok) throw new Error('Unable to load books')
    const data = await response.json()
    books.value = data
    assignColors(data)
    setMessage('Reading list refreshed. Ready for more stories!')
    hideBanner()
    return true
  } catch (error) {
    if (!silent) setMessage(error.message)
    if (triggerBannerOnFailure && !bannerVisible.value) {
      if (bannerDelayTimer) {
        clearTimeout(bannerDelayTimer)
        bannerDelayTimer = null
      }
      const immediateFailure = allowImmediateFailure && (!response || error?.message === 'Failed to fetch')
      const bannerAlreadyStarted = !bannerKickoffPending
      startServerWakeBanner({
        immediateFailure,
        failureMessage: bannerAlreadyStarted ? bannerFailureMessage.value : error.message,
      })
    }
    return false
  } finally {
    if (bannerDelayTimer) {
      clearTimeout(bannerDelayTimer)
      bannerDelayTimer = null
    }
    if (!silent) loading.value = false
  }
}

const tryFetchDuringBanner = async () => {
  if (bannerFetchInFlight) return
  bannerFetchInFlight = true
  await fetchBooks({ silent: true })
  bannerFetchInFlight = false
}

const startGracePeriod = () => {
  let secondsLeft = 10
  bannerPhase.value = 'grace'
  bannerMessage.value = 'The server is starting...'
  graceTimer = setInterval(async () => {
    secondsLeft -= 1
    await tryFetchDuringBanner()
    if (secondsLeft <= 0 && bannerVisible.value) {
      clearInterval(graceTimer)
      graceTimer = null
      bannerPhase.value = 'failed'
      bannerMessage.value = bannerFailureMessage.value
      finalTimer = setTimeout(() => hideBanner(), 3000)
    }
  }, 1000)
}

const startServerWakeBanner = ({ immediateFailure = false, failureMessage = 'Failed to fetch' } = {}) => {
  bannerVisible.value = true
  bannerFailureMessage.value = failureMessage

  if (immediateFailure) {
    bannerPhase.value = 'failed'
    bannerMessage.value = bannerFailureMessage.value
    bannerCountdown.value = null
    finalTimer = setTimeout(() => hideBanner(), 3000)
    return
  }

  bannerPhase.value = 'countdown'
  bannerMessage.value = 'Starting server, it usually takes'
  bannerCountdown.value = 25
  tryFetchDuringBanner()

  countdownTimer = setInterval(async () => {
    if (bannerCountdown.value > 1) {
      bannerCountdown.value -= 1
      await tryFetchDuringBanner()
    } else {
      clearInterval(countdownTimer)
      countdownTimer = null
      bannerCountdown.value = null
      startGracePeriod()
    }
  }, 1000)
}

const buildPayload = () => {
  const payload = {
    title: formTitle.value.trim(),
    totalPages: Number(formTotalPages.value),
  }

  if (formAuthor.value.trim()) {
    payload.author = formAuthor.value.trim()
  }

  return payload
}

const saveBook = async () => {
  const payload = buildPayload()

  if (!payload.title) {
    setMessage('Give the book a title before saving.')
    return
  }

  if (!Number.isInteger(payload.totalPages) || payload.totalPages <= 0) {
    setMessage('Total pages must be a positive integer.')
    return
  }

  setMessage('Adding a new book to the shelf...')

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error('Request failed. Check the API and try again.')

    const data = await response.json()
    books.value.push(data)
    colorMap.value[data.id] = gradientFromIndex(nextColorIndex())
    setMessage(`"${data.title}" added. Keep the reading streak alive!`)
    resetForm()
  } catch (error) {
    setMessage(error.message)
  }
}

const initializeBooks = async () => {
  await fetchBooks({ triggerBannerOnFailure: true })
}

onMounted(initializeBooks)
onUnmounted(clearBannerTimers)
</script>

<template>
  <main class="min-h-screen pb-16 text-slate-100">
    <div class="mx-auto flex max-w-5xl flex-col gap-4 px-2 pt-6 sm:px-4 lg:px-8">
      <div v-if="bannerVisible" class="sticky top-0 z-50 -mx-2 sm:-mx-4 lg:-mx-8">
        <div class="bg-gradient-to-r from-indigo-500/70 via-purple-500/70 to-pink-500/70 px-4 py-3 text-white shadow-xl backdrop-blur">
          <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 text-sm">
            <span
              class="inline-flex h-3 w-3 rounded-full"
              :class="bannerPhase === 'failed' ? 'bg-rose-200' : 'bg-amber-200 animate-pulse'"
            ></span>
            <div class="flex items-center gap-2">
              <p class="font-semibold">{{ bannerMessage }}</p>
              <span
                v-if="bannerCountdown !== null"
                class="font-semibold"
              >
                {{ bannerCountdown }}s...
              </span>
            </div>
          </div>
        </div>
      </div>

      <header
        class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-800/60 p-6 shadow-2xl backdrop-blur"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-sm uppercase tracking-[0.2em] text-slate-400">Reading room · API practice</p>
            <h1 class="mt-2 text-3xl font-semibold text-white sm:text-4xl">Book Track CRUD Test</h1>
            <p class="mt-3 max-w-2xl text-base text-slate-300">
              Add, read, and explore the books you post to the API. Perfect for validating the POST and GET endpoints.
            </p>
          </div>
          <div class="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            REST CRUD
          </div>
        </div>
      </header>

      <section class="rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-xl backdrop-blur">
        <div class="flex items-center gap-3 text-sm text-slate-200">
          <span class="inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
          <p>{{ statusMessage }}</p>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">
                Add a book to the shelf
              </h2>
              <p class="mt-1 text-sm text-slate-300">Create new books to test POST /books validation.</p>
            </div>
            <button
              class="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
              type="button"
              :disabled="loading"
              @click="fetchBooks({ triggerBannerOnFailure: true, allowImmediateFailure: false })"
            >
              {{ loading ? 'Refreshing...' : 'Refresh list' }}
            </button>
          </div>

          <form class="mt-6 space-y-5" @submit.prevent="saveBook">
            <label class="block space-y-2 text-sm font-medium text-slate-200">
              <span>Book title</span>
              <input
                v-model="formTitle"
                type="text"
                name="title"
                placeholder="E.g. The Night Library"
                :disabled="loading"
                required
                class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-400 shadow-inner outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40 disabled:opacity-70"
              />
            </label>

            <label class="block space-y-2 text-sm font-medium text-slate-200">
              <span>Author (optional)</span>
              <input
                v-model="formAuthor"
                type="text"
                name="author"
                placeholder="E.g. Adriana Tome"
                :disabled="loading"
                class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-400 shadow-inner outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40 disabled:opacity-70"
              />
            </label>

            <label class="block space-y-2 text-sm font-medium text-slate-200">
              <span>Total pages</span>
              <input
                v-model="formTotalPages"
                type="number"
                min="1"
                step="1"
                name="totalPages"
                placeholder="E.g. 320"
                :disabled="loading"
                required
                class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-400 shadow-inner outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40 disabled:opacity-70"
              />
            </label>

            <div class="flex flex-wrap gap-3">
              <button
                class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-500/50 disabled:opacity-70"
                type="submit"
                :disabled="loading"
              >
                Add book
              </button>
              <button
                class="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white disabled:opacity-70"
                type="button"
                :disabled="loading"
                @click="resetForm"
              >
                Clear form
              </button>
            </div>
          </form>
        </div>

        <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Reading list</h2>
              <p class="mt-1 text-sm text-slate-300">Newly created books appear here from GET /books.</p>
            </div>
            <span class="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200">
              {{ books.length }} item{{ books.length === 1 ? '' : 's' }}
            </span>
          </div>

          <ul class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" v-if="books.length">
            <li
              v-for="book in books"
              :key="book.id"
              class="flex flex-col justify-between gap-4 rounded-2xl p-5 text-white shadow-2xl transition hover:-translate-y-0.5 hover:shadow-3xl"
              :style="{ backgroundImage: colorMap[book.id] || defaultGradient }"
            >
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-lg font-semibold leading-tight">{{ book.title }}</p>
                  <span class="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]">{{ book.totalPages }} pages</span>
                </div>
                <div class="space-y-1 text-sm text-white/80">
                  <p v-if="book.author" class="flex items-center gap-2">
                    <span class="text-xs uppercase tracking-[0.2em] text-white/70">Author</span>
                    <span class="font-medium">{{ book.author }}</span>
                  </p>
                  <p class="flex items-center gap-2">
                    <span class="text-xs uppercase tracking-[0.2em] text-white/70">Created</span>
                    <span>{{ new Date(book.createdAt).toLocaleString() }}</span>
                  </p>
                  <p class="flex items-center gap-2">
                    <span class="text-xs uppercase tracking-[0.2em] text-white/70">Updated</span>
                    <span>{{ new Date(book.updatedAt).toLocaleString() }}</span>
                  </p>
                </div>
                <p class="text-xs uppercase tracking-[0.1em] text-white/80">ID: {{ book.id }}</p>
              </div>
            </li>
          </ul>
          <p v-else class="mt-6 rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center text-sm text-slate-200">
            No books yet. Add one to start testing the API.
          </p>
        </div>
      </section>
    </div>
  </main>
</template>
