import {getPublicKey} from 'nostr-tools'
import {normalizeRelayURL} from 'nostr-tools/relay'
import {
  generateSeedWords,
  seedFromWords,
  privateKeyFromSeed
} from 'nostr-tools/nip06'

export function setKeys(state, {mnemonic, priv, pub} = {}) {
  if (!mnemonic && !priv && !pub) {
    mnemonic = generateSeedWords()
  }

  if (mnemonic) {
    let seed = seedFromWords(mnemonic)
    priv = privateKeyFromSeed(seed)
  }

  if (priv) {
    pub = getPublicKey(priv)
  }

  state.keys = {mnemonic, priv, pub}
}

export function addRelay(state, url) {
  try {
    normalizeRelayURL(url)
    new URL(url)
  } catch (err) {
    return
  }

  state.relays[url] = {
    read: true,
    write: true
  }
}

export function removeRelay(state, url) {
  delete state.relays[url]
}

export function setRelayOpt(state, {url, opt, value}) {
  if (url in state.relays) {
    state.relays[url][opt] = value
  }
}

export function follow(state, key) {
  if (state.keys.pub === key) return
  if (state.following.includes(key)) return
  state.following.push(key)
}

export function unfollow(state, key) {
  let idx = state.following.indexOf(key)
  if (idx >= 0) state.following.splice(idx, 1)
}

export function addProfileToCache(state, event) {
  if (event.pubkey in state.profilesCache) {
    // was here already, remove from LRU (will readd next)
    state.profilesCacheLRU.splice(
      state.profilesCacheLRU.indexOf(event.pubkey),
      0
    )
  }

  // replace the event in cache
  try {
    state.profilesCache[event.pubkey] = JSON.parse(event.content)
  } catch (err) {
    return
  }

  // adding to LRU
  if (event.pubkey === state.keys.pub) {
    // if it's our own profile, we'll never remove from the cache
  } else {
    state.profilesCacheLRU.push(event.pubkey)
  }

  // removing older stuff if necessary
  if (state.profilesCacheLRU.length > 150) {
    let oldest = state.profilesCacheLRU.shift()
    delete state.profilesCache[oldest]
  }
}

export function haveReadNotifications(state) {
  state.lastNotificationRead = Math.round(Date.now() / 1000)
}
