import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false)
      setTimeout(onFinish, 500)
    }, 5000)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ backgroundColor: '#0a1628' }}
        >
          <h1
            className="text-white font-bold tracking-[0.15em] select-none"
            style={{ fontSize: 32 }}
          >
            BANNARIAMMAN TEX
          </h1>
          <svg className="mt-10 w-10 h-10 animate-spin" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
            <path
              d="M36 20a16 16 0 0 1-16 16"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
