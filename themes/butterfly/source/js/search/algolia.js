document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('algolia-search-status')
  const retry = document.getElementById('algolia-search-retry')
  const dialog = document.querySelector('#algolia-search .search-dialog')
  const opener = document.querySelector('#search-button > .search')
  const backgrounds = ['body-wrap', 'sidebar-menus', 'rightside'].map(id => document.getElementById(id)).filter(Boolean)
  let backgroundStates
  let previousFocus
  let previousOverflow
  let closeTimer
  let searchReady
  let searchOpen = false

  const loadSearch = () => {
    if (!searchReady) {
      searchReady = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Search download timed out')), 15000)
        getScript(GLOBAL_CONFIG.algolia.script).then(() => {
          clearTimeout(timer)
          resolve()
        }, error => {
          clearTimeout(timer)
          reject(error)
        })
      }).then(initializeSearch).catch(error => {
        searchReady = null
        throw error
      })
    }
    return searchReady
  }

  const openSearch = async () => {
    clearTimeout(closeTimer)
    if (!searchOpen) {
      previousFocus = opener
      previousOverflow = document.body.style.overflow || ''
      backgroundStates = backgrounds.map(element => Boolean(element.inert))
    }
    searchOpen = true
    document.body.style.overflow = 'hidden'
    dialog.style.display = 'block'
    dialog.style.animation = ''
    dialog.inert = false
    dialog.setAttribute('aria-hidden', 'false')
    dialog.setAttribute('aria-busy', 'true')
    opener.setAttribute('aria-expanded', 'true')
    dialog.focus()
    backgrounds.forEach(element => { element.inert = true })
    status.hidden = false
    status.textContent = '搜索加载中…'
    retry.hidden = true
    btf.fadeIn(document.getElementById('search-mask'), 0.5)
    try {
      await loadSearch()
      status.hidden = true
      if (searchOpen) document.querySelector('#algolia-search .ais-search-box--input').focus()
    } catch (error) {
      status.textContent = '搜索加载失败，请重试。'
      retry.hidden = false
    } finally {
      dialog.setAttribute('aria-busy', 'false')
    }
  }

  const closeSearch = () => {
    if (!searchOpen) return
    searchOpen = false
    backgrounds.forEach((element, index) => { element.inert = backgroundStates[index] })
    document.body.style.overflow = previousOverflow
    opener.setAttribute('aria-expanded', 'false')
    if (previousFocus?.isConnected) previousFocus.focus()
    dialog.inert = true
    dialog.setAttribute('aria-hidden', 'true')
    dialog.style.animation = 'search_close .5s'
    closeTimer = setTimeout(() => { dialog.style.cssText = 'display: none; animation: ' }, 500)
    btf.fadeOut(document.getElementById('search-mask'), 0.5)
  }

  const searchClickFn = () => {
    document.querySelector('#search-button > .search').addEventListener('click', openSearch)
    document.getElementById('search-mask').addEventListener('click', closeSearch)
    document.querySelector('#algolia-search .search-close-button').addEventListener('click', closeSearch)
  }

  searchClickFn()
  retry.addEventListener('click', openSearch)
  document.addEventListener('keydown', event => {
    if (!searchOpen) return
    if (event.code === 'Escape') {
      event.preventDefault()
      closeSearch()
      return
    }
    if (event.key !== 'Tab') return
    const controls = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden && element.getClientRects().length)
    const first = controls[0]
    const last = controls[controls.length - 1]
    const active = document.activeElement
    if (!first || active === dialog || !dialog.contains(active)) {
      event.preventDefault()
      ;(event.shiftKey ? last || dialog : first || dialog).focus()
    } else if (event.shiftKey && active === first || !event.shiftKey && active === last) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    }
  })

  window.addEventListener('pjax:complete', function () {
    getComputedStyle(document.querySelector('#algolia-search .search-dialog')).display === 'block' && closeSearch()
    searchClickFn()
  })

  function initializeSearch () {
    const algolia = GLOBAL_CONFIG.algolia
    const isAlgoliaValid = algolia.appId && algolia.apiKey && algolia.indexName
    if (!isAlgoliaValid) {
      throw new Error('Algolia setting is invalid')
    }

    const search = instantsearch({
      appId: algolia.appId,
      apiKey: algolia.apiKey,
      indexName: algolia.indexName,
      searchParameters: {
        hitsPerPage: algolia.hits.per_page || 10
      },
      searchFunction: function (helper) {
        const searchInput = document.querySelector('#algolia-search-input input')

        if (searchInput.value) {
          helper.search()
        }
      }
    })

    search.addWidget(
      instantsearch.widgets.searchBox({
        container: '#algolia-search-input',
        reset: false,
        magnifier: false,
        placeholder: GLOBAL_CONFIG.algolia.languages.input_placeholder
      })
    )
    search.addWidget(
      instantsearch.widgets.hits({
        container: '#algolia-hits',
        templates: {
          item: function (data) {
            const link = data.permalink ? data.permalink : (GLOBAL_CONFIG.root + data.path)
            return (
              '<a href="' + link + '" class="algolia-hit-item-link">' +
              data._highlightResult.title.value +
              '</a>'
            )
          },
          empty: function (data) {
            return (
              '<div id="algolia-hits-empty">' +
              GLOBAL_CONFIG.algolia.languages.hits_empty.replace(/\$\{query}/, data.query) +
              '</div>'
            )
          }
        },
        cssClasses: {
          item: 'algolia-hit-item'
        }
      })
    )

    search.addWidget(
      instantsearch.widgets.stats({
        container: '#algolia-stats',
        templates: {
          body: function (data) {
            const stats = GLOBAL_CONFIG.algolia.languages.hits_stats
              .replace(/\$\{hits}/, data.nbHits)
              .replace(/\$\{time}/, data.processingTimeMS)
            return (
              '<hr>' +
              stats +
              '<span class="algolia-logo pull-right">' +
              '  <img src="' + GLOBAL_CONFIG.root + 'img/algolia.svg" alt="Algolia" />' +
              '</span>'
            )
          }
        }
      })
    )

    search.addWidget(
      instantsearch.widgets.pagination({
        container: '#algolia-pagination',
        scrollTo: false,
        showFirstLast: false,
        labels: {
          first: '<i class="fas fa-angle-double-left"></i>',
          last: '<i class="fas fa-angle-double-right"></i>',
          previous: '<i class="fas fa-angle-left"></i>',
          next: '<i class="fas fa-angle-right"></i>'
        },
        cssClasses: {
          root: 'pagination',
          item: 'pagination-item',
          link: 'page-number',
          active: 'current',
          disabled: 'disabled-item'
        }
      })
    )
    search.start()
    document.querySelector('#algolia-search .ais-search-box--input').setAttribute('aria-label', algolia.languages.input_placeholder || '搜索文章')

    window.pjax && search.on('render', () => {
      window.pjax.refresh(document.getElementById('algolia-hits'))
    })
  }

}, { once: true })
