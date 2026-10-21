(() => {
  const hero = document.querySelector('#page-header.full_page')
  const posts = document.getElementById('recent-posts')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const navigation = performance.getEntriesByType('navigation')[0]
  if (!hero || !posts || reducedMotion.matches || location.hash ||
      navigation?.type === 'back_forward' || window.scrollY > 0) return

  let timer
  let frame
  let stopped = false
  let expectedTop = window.scrollY
  const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown']

  const stop = () => {
    stopped = true
    clearTimeout(timer)
    cancelAnimationFrame(frame)
    inputEvents.forEach(event => window.removeEventListener(event, stop, true))
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', stop)
    window.removeEventListener('pagehide', stop)
    document.removeEventListener('visibilitychange', onVisibility)
    reducedMotion.removeEventListener('change', stop)
    window.removeEventListener('load', schedule)
  }

  const onScroll = () => {
    // Let manual scrolling and other navigation take over without pulling back.
    if (Math.abs(window.scrollY - expectedTop) > 2) stop()
  }
  const onVisibility = () => {
    if (document.hidden) stop()
  }

  const start = () => {
    if (stopped || window.scrollY > 0 || document.hidden) return stop()
    const amplitude = Math.min(120, window.innerHeight * 0.16)
    const duration = 1600
    let started

    const animate = now => {
      if (stopped) return
      if (started === undefined) started = now
      const elapsed = now - started
      if (elapsed >= duration) {
        window.scrollTo({ top: 0, behavior: 'instant' })
        stop()
        return
      }
      const progress = elapsed / duration
      expectedTop = Math.round(amplitude * Math.sin(Math.PI * progress) ** 2)
      window.scrollTo({ top: expectedTop, behavior: 'instant' })
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
  }

  function schedule () {
    timer = setTimeout(start, 900)
  }

  inputEvents.forEach(event => window.addEventListener(event, stop, { capture: true, passive: true }))
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', stop, { once: true })
  window.addEventListener('pagehide', stop, { once: true })
  document.addEventListener('visibilitychange', onVisibility)
  reducedMotion.addEventListener('change', stop, { once: true })
  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })
})()
