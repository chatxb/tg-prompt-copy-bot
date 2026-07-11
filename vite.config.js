import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tg-prompt-copy-bot/', // এখানে আপনার গিটহাব রিপোজিটরির নাম দিন
})
