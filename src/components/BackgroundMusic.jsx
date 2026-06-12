import { useState, useRef, useEffect } from 'react'

// Playlist of ambient tracks — loops through in order.
// Add your own: drop MP3s in public/audio/ and add the path below.
// You can also use external CDN URLs (e.g. 'https://cdn.example.com/track.mp3')
const PLAYLIST = [
  '/audio/Interstellar - Main Theme - Hans Zimmer (Epic instrumentalpiano cover).mp3',
  '/audio/Einaudi - Experience (Cover).mp3',
  '/audio/Harry Styles - Sign of the Times (Piano Cover).mp3',
]

export default function BackgroundMusic() {
  const [muted, setMuted] = useState(() => {
    const saved = localStorage.getItem('quiziverse-music-muted')
    return saved === 'true'
  })
  const [started, setStarted] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const audioRef = useRef(null)

  // Create audio element once
  useEffect(() => {
    const audio = new Audio(PLAYLIST[0])
    audio.loop = PLAYLIST.length === 1
    audio.volume = 0.3
    audio.preload = 'auto'
    audioRef.current = audio

    // When track ends, play next in playlist
    audio.addEventListener('ended', () => {
      if (PLAYLIST.length > 1) {
        setTrackIndex(prev => (prev + 1) % PLAYLIST.length)
      }
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Handle track changes (for multi-track playlists)
  useEffect(() => {
    if (!audioRef.current || !started) return
    audioRef.current.src = PLAYLIST[trackIndex]
    if (!muted) audioRef.current.play().catch(() => {})
  }, [trackIndex])

  // Handle mute state changes
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = muted
    localStorage.setItem('quiziverse-music-muted', muted)
  }, [muted])

  // Start playback on first user interaction (browser autoplay policy)
  useEffect(() => {
    if (started) return

    const handleInteraction = () => {
      if (!audioRef.current) return
      setStarted(true)
      if (!muted) {
        audioRef.current.play().catch(() => {})
      }
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }

    document.addEventListener('click', handleInteraction)
    document.addEventListener('keydown', handleInteraction)
    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }
  }, [started, muted])

  const toggleMute = () => {
    const newMuted = !muted
    setMuted(newMuted)
    if (!audioRef.current) return

    if (!started) {
      setStarted(true)
    }

    if (newMuted) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
  }

  return (
    <button
      onClick={toggleMute}
      className="fixed bottom-20 right-5 z-50 glass glow-border rounded-full w-10 h-10 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200"
      title={muted ? 'Unmute music' : 'Mute music'}
      aria-label={muted ? 'Unmute background music' : 'Mute background music'}
    >
      {muted ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-400">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-cyan-300">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  )
}
