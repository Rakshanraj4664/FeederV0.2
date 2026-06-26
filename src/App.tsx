import { useState, useEffect } from 'react'
import { HomePage } from '@/pages/HomePage'
import { SplashScreen } from '@/components/common/SplashScreen'
import { useProfileStore } from '@/store/profileStore'
import { wsService } from '@/services/websocket'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const loadProfilesFromServer = useProfileStore((s) => s.loadProfilesFromServer)

  useEffect(() => {
    loadProfilesFromServer()

    const unsubMessage = wsService.onMessage((msg) => {
      if (msg.type === 'profiles_changed') {
        loadProfilesFromServer()
      }
    })

    const unsubStatus = wsService.onStatus((connected) => {
      if (connected) {
        loadProfilesFromServer()
      }
    })

    return () => {
      unsubMessage()
      unsubStatus()
    }
  }, [loadProfilesFromServer])

  return (
    <>
      <SplashScreen onFinish={() => setShowSplash(false)} />
      {!showSplash && <HomePage />}
    </>
  )
}

export default App
