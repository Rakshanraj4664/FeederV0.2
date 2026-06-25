import { useState } from 'react'
import { HomePage } from '@/pages/HomePage'
import { SplashScreen } from '@/components/common/SplashScreen'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      <SplashScreen onFinish={() => setShowSplash(false)} />
      {!showSplash && <HomePage />}
    </>
  )
}

export default App
